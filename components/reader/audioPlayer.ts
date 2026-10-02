// ─── Types ───────────────────────────────────────────────────────────────────

export type PanelSound = {
  sound: string;
  soundStartTime?: number;
  soundEndTime?: number;
  soundConfig?: {
    volume?: number;
    playbackRate?: number;
    loop?: boolean;
    fadeIn?: number;
    fadeOut?: number;
    delay?: number;
  };
};

export type SceneFadeType = "fade" | "wipeUp" | "wipeDown" | "wipeLeft" | "wipeRight" | "iris" | "cut";

export type ZoomRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  fadeOut?: number;
  fadeOutType?: SceneFadeType;
};

export type PanelStop = {
  focusY: number;
  dialogue?: any[]; // DialogueLine[]
  zoomRect?: ZoomRect;
  zoomRects?: ZoomRect[];
  duration?: number;
  hideUntilReached?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  fadeInType?: SceneFadeType;
  fadeOutType?: SceneFadeType;
  audioFade?: boolean;
  sound?: string; // Path to the audio file
  soundStartTime?: number; // in seconds
  soundEndTime?: number; // in seconds
  soundConfig?: {
    volume?: number; // 0 to 1 (default: 1)
    playbackRate?: number; // 0.5 to 2 (default: 1)
    loop?: boolean; // default: false
    fadeIn?: number; // duration in ms (default: 0)
    fadeOut?: number; // duration in ms (default: 0)
    delay?: number; // delay before playing in ms (default: 0)
  };
  sounds?: PanelSound[];
};

export type AudioTrackStopTrigger =
  | { type: "panelStart"; pageKey: string; panelIdx: number }
  | { type: "panelEnd"; pageKey: string; panelIdx: number }
  | { type: "pageStart"; pageKey: string }
  | { type: "pageEnd"; pageKey: string };

export type AudioTrack = {
  id: string;
  layer: "music" | "sfx";
  src: string;
  title?: string;
  artist?: string;
  startPageKey: string;
  startPanelIdx: number;
  stopTrigger?: AudioTrackStopTrigger;
  soundConfig?: {
    volume?: number;       // 0–1, default 1
    playbackRate?: number; // 0.5–2, default 1
    loop?: boolean;        // default false
    fadeIn?: number;       // fade-in duration in ms
    fadeOut?: number;      // fade-out duration in ms
    delay?: number;        // delay before playing in ms
    startTime?: number;    // seek to this offset when starting
    endTime?: number;      // stop at this timestamp (seconds)
  };
  /** If true, pause (don't kill) this track when a page/stop fade happens. */
  pauseOnFade?: boolean;
};

export type ChapterSettings = {
  clearReadDialogues?: boolean;
  appearanceAnimation?: "spring" | "fade" | "slide" | "zoom";
  fadeOutAnimation?: "fade" | "slide" | "zoom";
  dialogueDepth?: number;
};

export type PageData = {
  panels: PanelStop[];
  fadeIn?: number;
  fadeOut?: number;
  fadeInType?: SceneFadeType;
  fadeOutType?: SceneFadeType;
  audioFade?: boolean;
};

export type Dialogues = {
  settings?: ChapterSettings;
  audioTracks?: AudioTrack[];
  pages?: Record<string, PageData>;
};

export type AudioPlaybackController = {
  audio: HTMLAudioElement;
  stop: (fadeOutDuration: number) => void;
  pause: (fadeOutDuration?: number) => void;
  resume: (fadeInDuration?: number) => void;
  setGainMultiplier: (multiplier: number, transitionDuration?: number) => void;
};

// ─── Web Audio API Helpers for Mobile/iOS Compatibility ──────────────────────

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass();
    }
  }
  return sharedAudioContext;
}

// Automatically resume suspended AudioContext on user interaction
if (typeof window !== "undefined") {
  const resumeCtx = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(console.error);
    }
  };
  window.addEventListener("click", resumeCtx, { capture: true, passive: true });
  window.addEventListener("touchstart", resumeCtx, { capture: true, passive: true });
}

export function playAudioWithGain(
  src: string,
  options: {
    volume?: number;
    playbackRate?: number;
    loop?: boolean;
    fadeIn?: number;
    fadeOut?: number;
    startTime?: number;
    endTime?: number;
  },
  onEnded?: () => void
): AudioPlaybackController {
  const ctx = getAudioContext();
  const volume = options.volume ?? 1;
  const targetVolume = volume * volume; // logarithmic scaling
  const playbackRate = options.playbackRate ?? 1;
  const loop = options.loop ?? false;
  const fadeIn = options.fadeIn ?? 0;
  const startTime = options.startTime ?? 0;
  const endTime = options.endTime;

  const audio = new Audio(src);
  audio.crossOrigin = "anonymous";
  audio.loop = loop;

  let gainNode: GainNode | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let usingGainNode = false;
  let gainMultiplier = 1;
  let nativeVolumeInterval: ReturnType<typeof setInterval> | null = null;

  const effectiveTargetVolume = () => Math.max(0, Math.min(1, targetVolume * gainMultiplier));

  const clearNativeVolumeInterval = () => {
    if (nativeVolumeInterval) {
      clearInterval(nativeVolumeInterval);
      nativeVolumeInterval = null;
    }
  };

  const rampNativeVolume = (nextVolume: number, duration: number) => {
    clearNativeVolumeInterval();
    const safeVolume = Math.max(0, Math.min(1, nextVolume));
    if (duration <= 0) {
      audio.volume = safeVolume;
      return;
    }

    const initialVolume = audio.volume;
    const steps = Math.max(1, Math.round(duration / 20));
    let currentStep = 0;
    nativeVolumeInterval = setInterval(() => {
      currentStep += 1;
      const progress = Math.min(1, currentStep / steps);
      audio.volume = initialVolume + (safeVolume - initialVolume) * progress;
      if (progress >= 1) clearNativeVolumeInterval();
    }, duration / steps);
  };

  const setGainMultiplier = (multiplier: number, transitionDuration = 0) => {
    gainMultiplier = Math.max(0, Math.min(1, multiplier));
    const nextVolume = effectiveTargetVolume();

    if (usingGainNode && gainNode && ctx) {
      const now = ctx.currentTime;
      const currentGain = gainNode.gain.value;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(currentGain, now);
      if (transitionDuration > 0) {
        gainNode.gain.linearRampToValueAtTime(nextVolume, now + transitionDuration / 1000);
      } else {
        gainNode.gain.setValueAtTime(nextVolume, now);
      }
      return;
    }

    rampNativeVolume(nextVolume, transitionDuration);
  };

  if (ctx) {
    try {
      sourceNode = ctx.createMediaElementSource(audio);
      gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(fadeIn > 0 ? 0 : targetVolume, ctx.currentTime);
      sourceNode.connect(gainNode);
      gainNode.connect(ctx.destination);
      // When using GainNode, native volume must be 1.0 (GainNode controls the actual level)
      audio.volume = 1.0;
      usingGainNode = true;
    } catch (e) {
      console.error("Error creating MediaElementSource, falling back to native volume:", e);
      // Fallback: use native audio.volume
      audio.volume = fadeIn > 0 ? 0 : targetVolume;
    }
  } else {
    // No Web Audio API: use native audio.volume
    audio.volume = fadeIn > 0 ? 0 : targetVolume;
  }

  // Apply playbackRate after metadata is available to avoid browsers ignoring/resetting it
  const applyPlaybackRate = () => {
    audio.playbackRate = playbackRate;
  };
  if (audio.readyState >= 1) {
    applyPlaybackRate();
  } else {
    audio.addEventListener("loadedmetadata", applyPlaybackRate, { once: true });
  }

  if (startTime > 0) {
    if (audio.readyState >= 1) {
      audio.currentTime = startTime;
    } else {
      audio.addEventListener("loadedmetadata", () => {
        audio.currentTime = startTime;
      }, { once: true });
    }
  }

  if (onEnded) {
    audio.onended = onEnded;
  }

  let checkInterval: any = null;
  if (endTime !== undefined) {
    checkInterval = setInterval(() => {
      if (audio.currentTime >= endTime) {
        clearInterval(checkInterval);
        audio.pause();
        if (onEnded) onEnded();
      }
    }, 100);
  }

  audio.addEventListener("playing", () => {
    // Reinforce playbackRate when playback actually starts (some browsers reset it)
    audio.playbackRate = playbackRate;

    if (usingGainNode && gainNode && ctx) {
      // GainNode controls volume — apply fade or target gain
      const nextVolume = effectiveTargetVolume();
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      if (fadeIn > 0) {
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(nextVolume, ctx.currentTime + fadeIn / 1000);
      } else {
        gainNode.gain.setValueAtTime(nextVolume, ctx.currentTime);
      }
    } else if (!usingGainNode) {
      // Native volume fallback with optional fade-in
      if (fadeIn > 0) {
        audio.volume = 0;
        rampNativeVolume(effectiveTargetVolume(), fadeIn);
      } else {
        audio.volume = effectiveTargetVolume();
      }
    }
  }, { once: true });

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((error) => {
      console.error("[playAudioWithGain] Play blocked or failed:", error);
    });
  }

  return {
    audio,
    setGainMultiplier,
    pause: (fadeOutDuration = 0) => {
      clearNativeVolumeInterval();
      if (fadeOutDuration > 0) {
        setGainMultiplier(0, fadeOutDuration);
        setTimeout(() => {
          audio.pause();
        }, fadeOutDuration);
      } else {
        audio.pause();
      }
    },
    resume: (fadeInDuration = 0) => {
      if (fadeInDuration > 0) {
        setGainMultiplier(0);
      }
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("[playAudioWithGain] Resume blocked or failed:", error);
        });
      }
      setGainMultiplier(1, fadeInDuration);
    },
    stop: (fadeOutDuration: number) => {
      if (checkInterval) clearInterval(checkInterval);
      clearNativeVolumeInterval();
      if (ctx && gainNode && fadeOutDuration > 0) {
        const currentGain = gainNode.gain.value;
        gainNode.gain.cancelScheduledValues(ctx.currentTime);
        gainNode.gain.setValueAtTime(currentGain, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutDuration / 1000);
        setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
          try {
            sourceNode?.disconnect();
            gainNode?.disconnect();
          } catch (e) {}
        }, fadeOutDuration + 50);
      } else {
        audio.pause();
        audio.currentTime = 0;
        try {
          sourceNode?.disconnect();
          gainNode?.disconnect();
        } catch (e) {}
      }
    }
  };
}

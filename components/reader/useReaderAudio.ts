import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import {
  PanelSound,
  PanelStop,
  AudioTrack,
  AudioPlaybackController,
  Dialogues,
  playAudioWithGain,
} from "./audioPlayer";
import { getComicAssetUrl, getPageKeyFromUrl } from "./readerUtils";
import { isReaderSystemSound } from "@/lib/readerSystemSounds";

const BACKGROUND_DUCK_GAIN = 0.3;
const DUCK_ATTACK_MS = 300;
const DUCK_RELEASE_MS = 700;

interface UseReaderAudioProps {
  mode: "read" | "edit";
  panelIdx: number;
  pageIdx: number;
  zoomIdx?: number;
  pages: string[];
  localDialogues: Dialogues;
  activePanel: PanelStop;
}

export function useReaderAudio({
  mode,
  panelIdx,
  pageIdx,
  zoomIdx = 0,
  pages,
  localDialogues,
  activePanel,
}: UseReaderAudioProps) {
  const activePanelAudiosRef = useRef<Set<AudioPlaybackController>>(new Set());
  const activePanelTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const prevPageIdxRef = useRef<number>(pageIdx);
  const activeTracksRef = useRef<Map<string, AudioPlaybackController>>(new Map());
  const duckedTrackIdsRef = useRef<Set<string>>(new Set());
  const updateTrackDuckingRef = useRef<() => void>(() => undefined);
  const [activeMusicTrack, setActiveMusicTrack] = useState<AudioTrack | null>(null);
  const [isMusicPaused, setIsMusicPaused] = useState(false);
  const prevPanelAudioRef = useRef<{ audioFade?: boolean; fadeOut?: number } | null>(null);

  // Gather and memoize all sounds config for this panel with stable dependencies
  const soundsToPlay = useMemo((): PanelSound[] => {
    const list: PanelSound[] = [];
    if (!activePanel) return list;
    if (activePanel.sounds && Array.isArray(activePanel.sounds) && activePanel.sounds.length > 0) {
      list.push(...activePanel.sounds);
    } else if (activePanel.sound) {
      list.push({
        sound: activePanel.sound,
        soundStartTime: activePanel.soundStartTime,
        soundEndTime: activePanel.soundEndTime,
        soundConfig: activePanel.soundConfig,
      });
    }
    return list;
  }, [
    activePanel?.sound,
    activePanel?.soundStartTime,
    activePanel?.soundEndTime,
    JSON.stringify(activePanel?.soundConfig),
    JSON.stringify(activePanel?.sounds),
  ]);

  // Stop panel SFX only when changing pages or changing mode
  useEffect(() => {
    if (mode !== "read" || prevPageIdxRef.current !== pageIdx) {
      activePanelAudiosRef.current.forEach((soundObj) => {
        soundObj.stop(0);
      });
      activePanelAudiosRef.current.clear();

      activePanelTimersRef.current.forEach((t) => clearTimeout(t));
      activePanelTimersRef.current.clear();

      prevPageIdxRef.current = pageIdx;
    }
  }, [pageIdx, mode]);

  // Play sound effect(s) when panel changes without cutting off previous panel SFX on the same page
  useEffect(() => {
    if (mode !== "read" || soundsToPlay.length === 0) return;

    soundsToPlay.forEach((soundItem) => {
      if (!soundItem.sound || isReaderSystemSound(soundItem.sound)) return;

      const config = soundItem.soundConfig || {};
      const panelFade = activePanel?.audioFade;
      const {
        volume = 1,
        playbackRate = 1,
        loop = false,
        fadeIn = panelFade ? activePanel.fadeIn ?? 0 : 0,
        fadeOut = panelFade ? activePanel.fadeOut ?? 0 : 0,
        delay = 0,
      } = config;
      const soundStartTime = soundItem.soundStartTime || 0;
      const soundEndTime = soundItem.soundEndTime || undefined;

      let soundObj: AudioPlaybackController | null = null;

      const playWithDelay = () => {
        try {
          soundObj = playAudioWithGain(
            getComicAssetUrl(soundItem.sound),
            {
              volume,
              playbackRate,
              loop,
              fadeIn,
              fadeOut,
              startTime: soundStartTime,
              endTime: soundEndTime,
            },
            () => {
              if (soundObj) {
                activePanelAudiosRef.current.delete(soundObj);
              }
            }
          );
          if (soundObj) {
            activePanelAudiosRef.current.add(soundObj);
          }
        } catch (error) {
          console.error("Error playing audio item (sync):", error);
        }
      };

      if (delay > 0) {
        let delayTimeout: NodeJS.Timeout;
        delayTimeout = setTimeout(() => {
          activePanelTimersRef.current.delete(delayTimeout);
          playWithDelay();
        }, delay);
        activePanelTimersRef.current.add(delayTimeout);
      } else {
        playWithDelay();
      }
    });
  }, [panelIdx, pageIdx, mode, soundsToPlay]);

  useEffect(() => {
    const prev = prevPanelAudioRef.current;
    if (prev?.audioFade) {
      activePanelAudiosRef.current.forEach((soundObj) => soundObj.stop(prev.fadeOut ?? 0));
      activePanelAudiosRef.current.clear();
    }
    prevPanelAudioRef.current = { audioFade: activePanel?.audioFade, fadeOut: activePanel?.fadeOut };
  }, [panelIdx, pageIdx, activePanel?.audioFade, activePanel?.fadeOut]);

  // ─── Multi-span Audio Track Engine ───────────────────────────────────────

  const pageKeyOrder = useMemo(() => {
    const map = new Map<string, number>();
    pages.forEach((p, i) => {
      const key = getPageKeyFromUrl(p);
      if (key) map.set(key, i);
    });
    return map;
  }, [pages]);

  const comparePositions = useCallback(
    (pageKeyA: string, panelIdxA: number, pageKeyB: string, panelIdxB: number): number => {
      const idxA = pageKeyOrder.get(pageKeyA) ?? 0;
      const idxB = pageKeyOrder.get(pageKeyB) ?? 0;
      if (idxA !== idxB) return idxA - idxB;
      return panelIdxA - panelIdxB;
    },
    [pageKeyOrder]
  );

  const isPositionInTrackRange = useCallback(
    (track: AudioTrack, currentPageKey: string, currentPanelIdx: number): boolean => {
      const startCompare = comparePositions(currentPageKey, currentPanelIdx, track.startPageKey, track.startPanelIdx);
      if (startCompare < 0) {
        return false;
      }

      if (!track.stopTrigger) {
        return true;
      }

      const t = track.stopTrigger;
      switch (t.type) {
        case "panelStart":
          return comparePositions(currentPageKey, currentPanelIdx, t.pageKey, t.panelIdx) < 0;
        case "panelEnd":
          return comparePositions(currentPageKey, currentPanelIdx, t.pageKey, t.panelIdx) <= 0;
        case "pageStart":
          return comparePositions(currentPageKey, 0, t.pageKey, 0) < 0;
        case "pageEnd":
          return comparePositions(currentPageKey, 0, t.pageKey, 0) <= 0;
        default:
          return true;
      }
    },
    [comparePositions]
  );

  const tracksListString = JSON.stringify(localDialogues.audioTracks || []);

  useEffect(() => {
    if (mode !== "read") {
      setActiveMusicTrack(null);
      return;
    }
    const tracks = (localDialogues.audioTracks || []).filter((t) => !isReaderSystemSound(t.src));
    const activeTracks = activeTracksRef.current;
    const currentPageKey = getPageKeyFromUrl(pages[pageIdx]) || "";

    const updateTrackDucking = () => {
      const playingTracks = tracks.filter(
        (track) => activeTracks.has(track.id)
          && isPositionInTrackRange(track, currentPageKey, panelIdx)
      );

      playingTracks.forEach((track) => {
        const shouldDuck = track.layer === "music" && playingTracks.some((otherTrack) => (
          otherTrack.id !== track.id
          && comparePositions(
            otherTrack.startPageKey,
            otherTrack.startPanelIdx,
            track.startPageKey,
            track.startPanelIdx
          ) > 0
        ));
        const isDucked = duckedTrackIdsRef.current.has(track.id);
        if (shouldDuck === isDucked) return;

        activeTracks.get(track.id)?.setGainMultiplier(
          shouldDuck ? BACKGROUND_DUCK_GAIN : 1,
          shouldDuck ? DUCK_ATTACK_MS : DUCK_RELEASE_MS
        );
        if (shouldDuck) duckedTrackIdsRef.current.add(track.id);
        else duckedTrackIdsRef.current.delete(track.id);
      });

      duckedTrackIdsRef.current.forEach((trackId) => {
        if (!activeTracks.has(trackId)) duckedTrackIdsRef.current.delete(trackId);
      });
    };
    updateTrackDuckingRef.current = updateTrackDucking;

    tracks.forEach((track: AudioTrack) => {
      const inRange = isPositionInTrackRange(track, currentPageKey, panelIdx);
      const isPlaying = activeTracks.has(track.id);

      if (inRange && isPlaying) {
        const soundObj = activeTracks.get(track.id);
        if (soundObj && track.pauseOnFade && soundObj.audio.paused) {
          soundObj.resume(track.soundConfig?.fadeIn ?? 0);
        }
      } else if (inRange && !isPlaying) {
        const config = track.soundConfig || {};
        const {
          volume = 1,
          playbackRate = 1,
          loop = false,
          fadeIn = 0,
          delay = 0,
          startTime = 0,
          endTime,
        } = config;

        const playTrack = () => {
          try {
            const soundObj = playAudioWithGain(
              getComicAssetUrl(track.src),
              {
                volume,
                playbackRate,
                loop,
                fadeIn,
                startTime,
                endTime
              },
              () => {
                activeTracks.delete(track.id);
                duckedTrackIdsRef.current.delete(track.id);
                updateTrackDuckingRef.current();
              }
            );
            activeTracks.set(track.id, soundObj);
            updateTrackDucking();
          } catch (err) {
            console.error("[AudioTrack] Error playing track:", track.id, err);
          }
        };

        if (delay > 0) {
          setTimeout(playTrack, delay);
        } else {
          playTrack();
        }

      } else if (!inRange && isPlaying) {
        const soundObj = activeTracks.get(track.id)!;
        const fadeOut = track.soundConfig?.fadeOut ?? 0;
        if (track.pauseOnFade) {
          soundObj.pause(fadeOut);
        } else {
          soundObj.stop(fadeOut);
          activeTracks.delete(track.id);
          duckedTrackIdsRef.current.delete(track.id);
        }
      }
    });

    activeTracks.forEach((soundObj, trackId: string) => {
      const exists = tracks.some((t) => t.id === trackId);
      if (!exists) {
        soundObj.stop(0);
        activeTracks.delete(trackId);
        duckedTrackIdsRef.current.delete(trackId);
      }
    });

    updateTrackDucking();

    // Determine current active music track for HUD/mini-player display
    const currentPlayingMusic = tracks
      .filter((track) => (
        track.layer === "music"
        && activeTracks.has(track.id)
        && isPositionInTrackRange(track, currentPageKey, panelIdx)
      ))
      .reduce<AudioTrack | null>((latest, track) => {
        if (!latest) return track;
        return comparePositions(
          track.startPageKey,
          track.startPanelIdx,
          latest.startPageKey,
          latest.startPanelIdx
        ) > 0 ? track : latest;
      }, null);
    setActiveMusicTrack(currentPlayingMusic || null);
  }, [panelIdx, pageIdx, mode, tracksListString, isPositionInTrackRange, comparePositions, pages]);

  useEffect(() => {
    if (mode !== "read") return;
    const currentPageKey = getPageKeyFromUrl(pages[pageIdx]) || "";
    const page = localDialogues.pages?.[currentPageKey];
    const rects = activePanel?.zoomRects || (activePanel?.zoomRect ? [activePanel.zoomRect] : []);
    const mask = rects[zoomIdx];
    const fadeMs = Math.max(page?.fadeOut ?? 0, activePanel?.fadeOut ?? 0, mask?.fadeOut ?? 0, 0);
    if (fadeMs <= 0) return;

    const timers: NodeJS.Timeout[] = [];
    const tracks = (localDialogues.audioTracks || []).filter((t) => !isReaderSystemSound(t.src));
    tracks.forEach((track) => {
      if (!track.pauseOnFade) return;
      const ctrl = activeTracksRef.current.get(track.id);
      if (!ctrl) return;
      ctrl.pause(Math.min(fadeMs, track.soundConfig?.fadeOut ?? fadeMs));
      setIsMusicPaused(true);
      timers.push(
        setTimeout(() => {
          if (activeTracksRef.current.has(track.id)) {
            ctrl.resume(track.soundConfig?.fadeIn ?? 0);
            setIsMusicPaused(false);
          }
        }, fadeMs)
      );
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [panelIdx, pageIdx, zoomIdx, mode, pages, localDialogues.pages, localDialogues.audioTracks, activePanel]);

  const pauseActiveMusic = useCallback(() => {
    if (!activeMusicTrack) return;
    activeTracksRef.current.get(activeMusicTrack.id)?.pause(activeMusicTrack.soundConfig?.fadeOut ?? 0);
    setIsMusicPaused(true);
  }, [activeMusicTrack]);

  const resumeActiveMusic = useCallback(() => {
    if (!activeMusicTrack) return;
    activeTracksRef.current.get(activeMusicTrack.id)?.resume(activeMusicTrack.soundConfig?.fadeIn ?? 0);
    setIsMusicPaused(false);
  }, [activeMusicTrack]);

  useEffect(() => {
    if (mode === "read") return;
    activeTracksRef.current.forEach((soundObj) => {
      soundObj.stop(0);
    });
    activeTracksRef.current.clear();
    duckedTrackIdsRef.current.clear();
    setActiveMusicTrack(null);
  }, [mode]);

  useEffect(() => {
    return () => {
      activeTracksRef.current.forEach((soundObj) => {
        soundObj.stop(0);
      });
      activeTracksRef.current.clear();
      duckedTrackIdsRef.current.clear();

      activePanelAudiosRef.current.forEach((soundObj) => {
        soundObj.stop(0);
      });
      activePanelAudiosRef.current.clear();

      activePanelTimersRef.current.forEach((t) => clearTimeout(t));
      activePanelTimersRef.current.clear();

      setActiveMusicTrack(null);
    };
  }, []);

  return { activeMusicTrack, isMusicPaused, pauseActiveMusic, resumeActiveMusic };
}

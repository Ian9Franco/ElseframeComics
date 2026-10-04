"use client";

import { useCallback, useEffect, useState } from "react";
import type { AudioPlaybackController, SoundPlaybackConfig } from "@/components/reader/audioPlayer";
import { playAudioWithGain } from "@/components/reader/audioPlayer";
import { getComicAssetUrl } from "@/components/reader/readerUtils";

type PreviewState = {
  id: string | null;
  src: string | null;
  config: SoundPlaybackConfig;
  controller: AudioPlaybackController | null;
  delayTimer: ReturnType<typeof setTimeout> | null;
};

const previewState: PreviewState = {
  id: null,
  src: null,
  config: {},
  controller: null,
  delayTimer: null,
};

const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

function clearDelayTimer() {
  if (previewState.delayTimer) {
    clearTimeout(previewState.delayTimer);
    previewState.delayTimer = null;
  }
}

function stopPreviewInternal() {
  clearDelayTimer();
  previewState.controller?.stop(0);
  previewState.controller = null;
  previewState.id = null;
  previewState.src = null;
  previewState.config = {};
  notify();
}

export function configToPlayOptions(config: SoundPlaybackConfig) {
  return {
    volume: config.volume ?? 1,
    playbackRate: config.playbackRate ?? 1,
    loop: config.loop ?? false,
    fadeIn: config.fadeIn ?? 0,
    fadeOut: config.fadeOut ?? 0,
    startTime: config.startTime,
    endTime: config.endTime,
  };
}

function needsRestart(prev: SoundPlaybackConfig, next: SoundPlaybackConfig): boolean {
  return (
    (prev.fadeIn ?? 0) !== (next.fadeIn ?? 0) ||
    (prev.fadeOut ?? 0) !== (next.fadeOut ?? 0) ||
    (prev.delay ?? 0) !== (next.delay ?? 0) ||
    (prev.loop ?? false) !== (next.loop ?? false) ||
    (prev.startTime ?? 0) !== (next.startTime ?? 0) ||
    (prev.endTime ?? undefined) !== (next.endTime ?? undefined)
  );
}

export function startEditorSoundPreview(id: string, src: string, config: SoundPlaybackConfig) {
  stopPreviewInternal();
  previewState.id = id;
  previewState.src = src;
  previewState.config = { ...config };

  const delay = config.delay ?? 0;
  const play = () => {
    previewState.controller = playAudioWithGain(getComicAssetUrl(src), configToPlayOptions(config), () => {
      if (previewState.id === id) stopPreviewInternal();
    });
    notify();
  };

  if (delay > 0) {
    previewState.delayTimer = setTimeout(play, delay);
  } else {
    play();
  }
  notify();
}

export function stopEditorSoundPreview() {
  stopPreviewInternal();
}

export function stopEditorSoundPreviewIf(id: string) {
  if (previewState.id === id) stopPreviewInternal();
}

export function updateEditorSoundPreviewConfig(id: string, config: SoundPlaybackConfig) {
  if (previewState.id !== id || !previewState.src) return;

  const prev = previewState.config;
  previewState.config = { ...config };

  if (!previewState.controller) return;

  if (needsRestart(prev, config)) {
    startEditorSoundPreview(id, previewState.src, config);
    return;
  }

  if ((config.volume ?? 1) !== (prev.volume ?? 1)) {
    previewState.controller.setVolume(config.volume ?? 1, 80);
  }
  if ((config.playbackRate ?? 1) !== (prev.playbackRate ?? 1)) {
    previewState.controller.setPlaybackRate(config.playbackRate ?? 1);
  }
}

export function useEditorSoundPreview() {
  const [, bump] = useState(0);
  useEffect(() => {
    const sub = () => bump((n) => n + 1);
    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  const previewId = previewState.id;

  const isPreviewing = useCallback((id: string) => previewId === id, [previewId]);

  const togglePreview = useCallback((id: string, src: string, config: SoundPlaybackConfig) => {
    if (previewId === id) {
      stopEditorSoundPreview();
    } else {
      startEditorSoundPreview(id, src, config);
    }
  }, [previewId]);

  const stopPreview = useCallback(() => {
    stopEditorSoundPreview();
  }, []);

  return {
    previewId,
    isPreviewing,
    startPreview: startEditorSoundPreview,
    stopPreview,
    togglePreview,
    updatePreviewConfig: updateEditorSoundPreviewConfig,
  };
}

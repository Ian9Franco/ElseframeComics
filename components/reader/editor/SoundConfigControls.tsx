"use client";

import React, { useEffect, useRef } from "react";
import type { SoundPlaybackConfig } from "@/components/reader/audioPlayer";
import { stopEditorSoundPreviewIf, useEditorSoundPreview } from "./useEditorSoundPreview";

export function mergeSoundConfig(
  prev: SoundPlaybackConfig | undefined,
  patch: Partial<SoundPlaybackConfig>
): SoundPlaybackConfig {
  const next = { ...prev, ...patch };
  (Object.keys(next) as (keyof SoundPlaybackConfig)[]).forEach((key) => {
    if (next[key] === undefined) delete next[key];
  });
  return next;
}

export function SoundConfigControls({
  src,
  config,
  onChange,
  compact,
  previewId,
}: {
  src: string;
  config?: SoundPlaybackConfig;
  onChange: (next: SoundPlaybackConfig) => void;
  compact?: boolean;
  /** Unique id for shared preview session (one sound at a time in editor). */
  previewId: string;
}) {
  const { isPreviewing, togglePreview, updatePreviewConfig } = useEditorSoundPreview();
  const livePreviewStartedRef = useRef(false);
  const playing = isPreviewing(previewId);

  const volume = config?.volume ?? 1;
  const fadeIn = config?.fadeIn ?? 0;
  const fadeOut = config?.fadeOut ?? 0;
  const delay = config?.delay ?? 0;
  const playbackRate = config?.playbackRate ?? 1;
  const loop = config?.loop ?? false;

  useEffect(() => {
    return () => {
      stopEditorSoundPreviewIf(previewId);
    };
  }, [previewId]);

  const applyChange = (patch: Partial<SoundPlaybackConfig>) => {
    const next = mergeSoundConfig(config, patch);
    onChange(next);
    if (playing) {
      updatePreviewConfig(previewId, next);
    }
  };

  const startLivePreviewIfNeeded = () => {
    if (playing) return;
    if (!livePreviewStartedRef.current) {
      livePreviewStartedRef.current = true;
      togglePreview(previewId, src, mergeSoundConfig(config, {}));
    }
  };

  const labelClass = compact ? "text-[10px] text-zinc-500" : "text-xs text-zinc-400";
  const rowClass = compact ? "space-y-1" : "space-y-2";

  return (
    <div className={rowClass}>
      <div className="flex items-center justify-between gap-2">
        <label className={labelClass}>
          Volumen <span className="text-rose-300 font-mono">{Math.round(volume * 100)}%</span>
        </label>
        <button
          type="button"
          onClick={() => {
            livePreviewStartedRef.current = false;
            togglePreview(previewId, src, mergeSoundConfig(config, {}));
          }}
          className="text-[10px] px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 font-bold"
        >
          {playing ? "Detener" : "Probar"}
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onPointerDown={startLivePreviewIfNeeded}
        onChange={(e) => applyChange({ volume: parseFloat(e.target.value) })}
        className="w-full accent-[#e8185a]"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Fade in (ms)</label>
          <input
            type="number"
            min={0}
            step={50}
            value={fadeIn}
            onChange={(e) => applyChange({ fadeIn: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            className="w-full text-xs bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className={labelClass}>Fade out (ms)</label>
          <input
            type="number"
            min={0}
            step={50}
            value={fadeOut}
            onChange={(e) => applyChange({ fadeOut: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            className="w-full text-xs bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Retardo (ms)</label>
          <input
            type="number"
            min={0}
            step={50}
            value={delay}
            onChange={(e) => applyChange({ delay: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            className="w-full text-xs bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className={labelClass}>Velocidad</label>
          <input
            type="number"
            min={0.5}
            max={2}
            step={0.05}
            value={playbackRate}
            onChange={(e) => applyChange({ playbackRate: parseFloat(e.target.value) || 1 })}
            className="w-full text-xs bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
          />
        </div>
      </div>

      <label className={`flex items-center gap-2 ${labelClass}`}>
        <input type="checkbox" checked={loop} onChange={(e) => applyChange({ loop: e.target.checked })} />
        Loop
      </label>
      <p className="text-[10px] text-zinc-600 leading-snug">
        Mové el volumen con preview activo para oír el nivel en vivo. Cambiar fades puede reiniciar el preview.
      </p>
    </div>
  );
}

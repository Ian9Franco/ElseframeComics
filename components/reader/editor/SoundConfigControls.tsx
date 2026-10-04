"use client";

import React, { useRef } from "react";
import type { SoundPlaybackConfig } from "@/components/reader/audioPlayer";
import { playAudioWithGain } from "@/components/reader/audioPlayer";
import { getComicAssetUrl } from "@/components/reader/readerUtils";

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
}: {
  src: string;
  config?: SoundPlaybackConfig;
  onChange: (next: SoundPlaybackConfig) => void;
  compact?: boolean;
}) {
  const previewRef = useRef<ReturnType<typeof playAudioWithGain> | null>(null);
  const volume = config?.volume ?? 1;
  const fadeIn = config?.fadeIn ?? 0;
  const fadeOut = config?.fadeOut ?? 0;
  const delay = config?.delay ?? 0;
  const playbackRate = config?.playbackRate ?? 1;
  const loop = config?.loop ?? false;

  const patch = (p: Partial<SoundPlaybackConfig>) => onChange(mergeSoundConfig(config, p));

  const preview = () => {
    previewRef.current?.stop(0);
    const play = () => {
      previewRef.current = playAudioWithGain(getComicAssetUrl(src), {
        volume,
        playbackRate,
        loop,
        fadeIn,
        fadeOut,
        startTime: config?.startTime,
        endTime: config?.endTime,
      });
    };
    if (delay > 0) window.setTimeout(play, delay);
    else play();
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
          onClick={preview}
          className="text-[10px] px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 font-bold"
        >
          Probar
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => patch({ volume: parseFloat(e.target.value) })}
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
            onChange={(e) => patch({ fadeIn: Math.max(0, parseInt(e.target.value, 10) || 0) })}
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
            onChange={(e) => patch({ fadeOut: Math.max(0, parseInt(e.target.value, 10) || 0) })}
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
            onChange={(e) => patch({ delay: Math.max(0, parseInt(e.target.value, 10) || 0) })}
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
            onChange={(e) => patch({ playbackRate: parseFloat(e.target.value) || 1 })}
            className="w-full text-xs bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
          />
        </div>
      </div>

      <label className={`flex items-center gap-2 ${labelClass}`}>
        <input type="checkbox" checked={loop} onChange={(e) => patch({ loop: e.target.checked })} />
        Loop
      </label>
      <p className="text-[10px] text-zinc-600 leading-snug">
        El % de volumen coincide con la lectura. «También fade de audio» en la parada usa fades de escena si no definís fade acá.
      </p>
    </div>
  );
}

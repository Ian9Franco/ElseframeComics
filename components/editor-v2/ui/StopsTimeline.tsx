"use client";

import React from "react";
import type { PanelStop } from "@/components/reader/audioPlayer";

export function StopsTimeline({
  panels,
  activePanelIdx,
  onSelect,
  onReorder,
}: {
  panels: PanelStop[];
  activePanelIdx: number;
  onSelect: (idx: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const dragFrom = React.useRef<number | null>(null);

  return (
    <div className="h-24 shrink-0 bg-[#12121c] border-t border-white/10 flex items-center gap-2 px-3 overflow-x-auto">
      <span className="text-[10px] font-bold text-zinc-500 uppercase shrink-0">Paradas</span>
      {panels.map((panel, i) => {
        const count = panel.dialogue?.length || 0;
        return (
          <div
            key={i}
            draggable
            onDragStart={() => {
              dragFrom.current = i;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom.current !== null && dragFrom.current !== i) {
                onReorder(dragFrom.current, i);
              }
              dragFrom.current = null;
            }}
            onClick={() => onSelect(i)}
            className={`min-w-[88px] px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing shrink-0 transition-all ${
              activePanelIdx === i
                ? "bg-[#e8185a]/20 border-[#e8185a] text-white"
                : "bg-[#0a0a0f] border-white/10 text-zinc-300 hover:border-white/25"
            }`}
          >
            <div className="font-[var(--font-bangers)] text-sm">Parada {i + 1}</div>
            <div className="text-[10px] font-mono text-zinc-500">{count} globo{count !== 1 ? "s" : ""}</div>
            {panel.sound && <div className="text-[9px] text-emerald-400 truncate max-w-[80px]">🔊 SFX</div>}
          </div>
        );
      })}
      {panels.length === 0 && (
        <span className="text-xs text-zinc-500 italic">Dibujá una viñeta (M) sobre la página</span>
      )}
    </div>
  );
}

"use client";

import React from "react";
import type { PanelStop } from "@/components/reader/audioPlayer";
import type { Selection } from "../types";

export function StopsTimeline({
  panels,
  activePanelIdx,
  selection,
  onSelect,
  onReorder,
  onAddStop,
  onDelete,
  onPickSound,
}: {
  panels: PanelStop[];
  activePanelIdx: number;
  selection: Selection;
  onSelect: (idx: number) => void;
  onReorder: (from: number, to: number) => void;
  onAddStop: () => void;
  onDelete: () => void;
  onPickSound: () => void;
}) {
  const dragFrom = React.useRef<number | null>(null);
  const canDelete = selection.kind !== "none";
  const deleteLabel =
    selection.kind === "bubble" || selection.kind === "bubbles"
      ? "Eliminar diálogo"
      : selection.kind === "mask"
        ? "Eliminar máscara"
        : selection.kind === "stop"
          ? "Eliminar parada"
          : "Eliminar";

  return (
    <div className="h-[120px] shrink-0 bg-[#12121c] border-t border-white/10 flex items-center gap-3 px-4 overflow-x-auto">
      <div className="flex flex-col gap-2 shrink-0">
        <span className="text-xs font-bold text-zinc-400 uppercase">Paradas</span>
        <button
          type="button"
          onClick={onAddStop}
          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
        >
          + Parada
        </button>
      </div>
      {panels.map((panel, i) => {
        const count = panel.dialogue?.length || 0;
        const masks = panel.zoomRects?.length || (panel.zoomRect ? 1 : 0);
        const hasSound = Boolean(panel.sound || (panel.sounds && panel.sounds.length > 0));
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
            className={`min-w-[120px] px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing shrink-0 transition-all ${
              activePanelIdx === i
                ? "bg-[#e8185a]/20 border-[#e8185a] text-white"
                : "bg-[#0a0a0f] border-white/10 text-zinc-300 hover:border-white/25"
            }`}
          >
            <div className="font-[var(--font-bangers)] text-base">Parada {i + 1}</div>
            <div className="text-xs font-mono text-zinc-500">
              {count} globo{count !== 1 ? "s" : ""} · {masks} másc.
            </div>
            {hasSound && <div className="text-xs text-emerald-400">SFX</div>}
          </div>
        );
      })}
      {panels.length === 0 && (
        <span className="text-sm text-zinc-500 italic">Agregá una parada para colocar diálogos</span>
      )}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onPickSound}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
        >
          Pista / SFX
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className="px-3 py-2 rounded-lg bg-red-900/80 hover:bg-red-800 text-white text-xs font-bold disabled:opacity-40"
        >
          {deleteLabel}
        </button>
      </div>
    </div>
  );
}

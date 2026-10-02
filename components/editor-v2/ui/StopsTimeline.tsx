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
  onPickSfx,
  onPickTrack,
  variant = "default",
}: {
  panels: PanelStop[];
  activePanelIdx: number;
  selection: Selection;
  onSelect: (idx: number) => void;
  onReorder: (from: number, to: number) => void;
  onAddStop: () => void;
  onDelete: () => void;
  onPickSfx: () => void;
  onPickTrack: () => void;
  variant?: "default" | "compact";
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

  const actionRow = (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onPickSfx}
        className="px-3 py-2 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 text-amber-50 text-xs font-bold border border-amber-700/40"
      >
        SFX parada
      </button>
      <button
        type="button"
        onClick={onPickTrack}
        className="px-3 py-2 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 text-purple-50 text-xs font-bold border border-purple-700/40"
      >
        Pista capítulo
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
  );

  if (variant === "compact") {
    return (
      <div className="shrink-0 bg-[#12121c] border-t border-white/10 p-3 flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold text-zinc-400 shrink-0">Parada</label>
          <select
            value={activePanelIdx}
            onChange={(e) => onSelect(parseInt(e.target.value, 10))}
            className="flex-1 min-w-[8rem] text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-2"
            disabled={panels.length === 0}
          >
            {panels.length === 0 ? (
              <option value={0}>Sin paradas</option>
            ) : (
              panels.map((panel, i) => {
                const count = panel.dialogue?.length || 0;
                const masks = panel.zoomRects?.length || (panel.zoomRect ? 1 : 0);
                return (
                  <option key={i} value={i}>
                    Parada {i + 1} · {count} globo{count !== 1 ? "s" : ""} · {masks} másc.
                  </option>
                );
              })
            )}
          </select>
          <button
            type="button"
            onClick={onAddStop}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0"
          >
            + Parada
          </button>
        </div>
        {panels.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 overflow-x-auto pb-1">
            {panels.map((panel, i) => {
              const count = panel.dialogue?.length || 0;
              const masks = panel.zoomRects?.length || (panel.zoomRect ? 1 : 0);
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
                  className={`min-w-[100px] px-2 py-2 rounded-lg border cursor-grab shrink-0 text-left ${
                    activePanelIdx === i
                      ? "bg-[#e8185a]/20 border-[#e8185a] text-white"
                      : "bg-[#0a0a0f] border-white/10 text-zinc-300"
                  }`}
                >
                  <div className="font-[var(--font-bangers)] text-sm">Parada {i + 1}</div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    {count}g · {masks}m
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {panels.length === 0 && (
          <p className="text-xs text-zinc-500 italic">Agregá una parada para colocar diálogos y máscaras.</p>
        )}
        {actionRow}
      </div>
    );
  }

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
      <div className="ml-auto">{actionRow}</div>
    </div>
  );
}

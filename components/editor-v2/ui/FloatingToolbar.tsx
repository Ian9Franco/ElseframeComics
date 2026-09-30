"use client";

import React from "react";
import type { DialogueLine } from "@/components/reader/DialogueBubble";
import { BUBBLE_PALETTE, type BubbleStylePreset } from "../types";

export function FloatingToolbar({
  line,
  onUpdate,
  onDuplicate,
  onDelete,
  speakers,
}: {
  line: DialogueLine;
  onUpdate: (fields: Partial<DialogueLine>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  speakers: string[];
}) {
  const style = (line.style ?? "normal") as BubbleStylePreset;

  return (
    <div
      className="absolute z-[200] flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-[#161622] border border-white/15 rounded-lg shadow-xl max-w-[min(420px,90vw)]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        value={style}
        onChange={(e) => onUpdate({ style: e.target.value as DialogueLine["style"] })}
        className="text-[10px] bg-[#0a0a0f] text-white border border-white/10 rounded px-1 py-0.5"
      >
        {BUBBLE_PALETTE.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <input
        list="editor-v2-speakers"
        value={line.speaker ?? ""}
        onChange={(e) => onUpdate({ speaker: e.target.value })}
        placeholder="Personaje"
        className="text-[10px] bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-0.5 w-24"
      />
      <datalist id="editor-v2-speakers">
        {speakers.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button
        type="button"
        onClick={() => onUpdate({ fontSize: Math.max(8, (line.fontSize ?? 14) - 2) })}
        className="w-7 h-7 rounded bg-zinc-800 text-white text-xs font-bold"
      >
        A−
      </button>
      <button
        type="button"
        onClick={() => onUpdate({ fontSize: Math.min(120, (line.fontSize ?? 14) + 2) })}
        className="w-7 h-7 rounded bg-zinc-800 text-white text-xs font-bold"
      >
        A+
      </button>
      <input
        type="color"
        value={line.customColor?.startsWith("#") ? line.customColor : "#0a0a0f"}
        onChange={(e) => onUpdate({ customColor: e.target.value })}
        className="w-7 h-7 rounded cursor-pointer border-0 p-0"
        title="Color borde"
      />
      <button type="button" onClick={onDuplicate} className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-white">
        Duplicar
      </button>
      <button type="button" onClick={onDelete} className="text-[10px] px-2 py-1 rounded bg-red-900/80 text-white">
        Borrar
      </button>
    </div>
  );
}

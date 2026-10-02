"use client";

import React from "react";
import type { DialogueLine } from "@/components/reader/DialogueBubble";
import { BUBBLE_FONT_OPTIONS } from "@/components/reader/bubbles/bubbleHelpers";
import { BUBBLE_PALETTE, type BubbleStylePreset } from "../types";

function hexOr(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function FloatingToolbar({
  line,
  onUpdate,
  onDuplicate,
  onDelete,
  speakers,
  variant = "default",
  hideStyleSelect = false,
}: {
  line: DialogueLine;
  onUpdate: (fields: Partial<DialogueLine>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  speakers: string[];
  variant?: "default" | "compact";
  hideStyleSelect?: boolean;
}) {
  const style = (line.style ?? "normal") as BubbleStylePreset;
  const speakerInput = (
    <>
      <input
        list="editor-v2-speakers"
        value={line.speaker ?? ""}
        onChange={(e) => onUpdate({ speaker: e.target.value })}
        placeholder="Personaje"
        className="text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-1.5 w-full"
      />
      <datalist id="editor-v2-speakers">
        {speakers.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <label className="flex items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={!!line.showSpeakerName}
          onChange={(e) => onUpdate({ showSpeakerName: e.target.checked })}
        />
        Nombre en el texto
      </label>
    </>
  );

  const colorControls = (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1 text-xs text-zinc-400">
        Fondo
        <input
          type="color"
          value={hexOr(line.customBg, "#ffffff")}
          onChange={(e) => onUpdate({ customBg: e.target.value })}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-zinc-400">
        Borde
        <input
          type="color"
          value={hexOr(line.customColor, "#0a0a0f")}
          onChange={(e) => onUpdate({ customColor: e.target.value })}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-zinc-400">
        Texto
        <input
          type="color"
          value={hexOr(line.textColor, "#000000")}
          onChange={(e) => onUpdate({ textColor: e.target.value })}
          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
        />
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onUpdate({ fontSize: Math.max(8, (line.fontSize ?? 14) - 2) })}
          className="w-8 h-8 rounded bg-zinc-800 text-white text-sm font-bold"
        >
          A−
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ fontSize: Math.min(120, (line.fontSize ?? 14) + 2) })}
          className="w-8 h-8 rounded bg-zinc-800 text-white text-sm font-bold"
        >
          A+
        </button>
      </div>
    </div>
  );

  const actionButtons = (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onDuplicate} className="text-sm px-3 py-1.5 rounded bg-zinc-800 text-white font-bold">
        Duplicar
      </button>
      <button type="button" onClick={onDelete} className="text-sm px-3 py-1.5 rounded bg-red-900/80 text-white font-bold">
        Borrar
      </button>
    </div>
  );

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
        <details className="rounded border border-white/10 bg-[#0a0a0f]/80">
          <summary className="px-3 py-2 text-xs font-bold text-zinc-300 cursor-pointer">Personaje y fuente</summary>
          <div className="px-3 pb-3 flex flex-col gap-2">
            {speakerInput}
            <select
              value={line.fontFamily || ""}
              onChange={(e) =>
                onUpdate({ fontFamily: (e.target.value || undefined) as DialogueLine["fontFamily"] })
              }
              className="text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-1.5 w-full"
            >
              {BUBBLE_FONT_OPTIONS.map((f) => (
                <option key={f.id || "default"} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </details>
        <details className="rounded border border-white/10 bg-[#0a0a0f]/80">
          <summary className="px-3 py-2 text-xs font-bold text-zinc-300 cursor-pointer">Colores y tamaño</summary>
          <div className="px-3 pb-3">{colorControls}</div>
        </details>
        <details className="rounded border border-white/10 bg-[#0a0a0f]/80">
          <summary className="px-3 py-2 text-xs font-bold text-zinc-300 cursor-pointer">Acciones</summary>
          <div className="px-3 pb-3 flex flex-col gap-2">
            {actionButtons}
            <span className="text-[10px] text-zinc-500 font-mono">*negrita* · _cursiva_ · ~~tachado~~</span>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-1" onPointerDown={(e) => e.stopPropagation()}>
      {!hideStyleSelect && (
        <select
          value={style}
          onChange={(e) => onUpdate({ style: e.target.value as DialogueLine["style"] })}
          className="text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-1"
        >
          {BUBBLE_PALETTE.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      <select
        value={line.fontFamily || ""}
        onChange={(e) =>
          onUpdate({ fontFamily: (e.target.value || undefined) as DialogueLine["fontFamily"] })
        }
        className="text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-1"
        title="Fuente"
      >
        {BUBBLE_FONT_OPTIONS.map((f) => (
          <option key={f.id || "default"} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <input
        list="editor-v2-speakers"
        value={line.speaker ?? ""}
        onChange={(e) => onUpdate({ speaker: e.target.value })}
        placeholder="Personaje"
        className="text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-1 w-32"
      />
      <datalist id="editor-v2-speakers">
        {speakers.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <label className="flex items-center gap-1 text-xs text-zinc-300 whitespace-nowrap" title="El nombre va dentro del texto, no como título">
        <input
          type="checkbox"
          checked={!!line.showSpeakerName}
          onChange={(e) => onUpdate({ showSpeakerName: e.target.checked })}
        />
        Nombre en el texto
      </label>
      {colorControls}
      {actionButtons}
      <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">
        *negrita* · _cursiva_ · ~~tachado~~
      </span>
    </div>
  );
}

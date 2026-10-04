"use client";

import React, { useEffect, useRef } from "react";
import type { DialogueLine } from "@/components/reader/DialogueBubble";
import { suggestBubbleWidth } from "@/components/reader/readerUtils";
import { BUBBLE_PALETTE } from "../types";

export function BubbleDialoguePanel({
  panelIdx,
  bubbleIdx,
  line,
  onTextLive,
  onTextCommit,
  onFitWidth,
}: {
  panelIdx: number;
  bubbleIdx: number;
  line: DialogueLine;
  onTextLive: (text: string) => void;
  onTextCommit: (fields: Partial<DialogueLine>) => void;
  onFitWidth: (width: number) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusKeyRef = useRef(`${panelIdx}-${bubbleIdx}`);
  const styleLabel = BUBBLE_PALETTE.find((p) => p.id === (line.style ?? "normal"))?.label ?? "Normal";

  useEffect(() => {
    const key = `${panelIdx}-${bubbleIdx}`;
    if (focusKeyRef.current === key) return;
    focusKeyRef.current = key;
    const el = textareaRef.current;
    if (!el) return;
    const root = el.closest("[data-inspector-root]");
    const active = document.activeElement;
    if (active && root?.contains(active) && active !== el && active.tagName !== "BODY") {
      return;
    }
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [panelIdx, bubbleIdx]);

  const handleBlur = () => {
    const suggested = suggestBubbleWidth(line);
    const current = line.width ?? suggested;
    if (current > suggested * 1.35) {
      onTextCommit({ text: line.text, width: suggested });
    } else {
      onTextCommit({ text: line.text });
    }
  };

  const fitWidth = () => {
    const w = suggestBubbleWidth(line);
    onFitWidth(w);
  };

  return (
    <div className="p-4 border-b border-[#e8185a]/40 bg-[#161622] space-y-2 sticky top-0 z-10 shadow-lg shadow-black/30">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-white">Diálogo seleccionado</div>
          <div className="text-[11px] text-zinc-400 font-mono">
            Parada {panelIdx + 1} · Globo #{bubbleIdx + 1} · {styleLabel}
            {line.speaker ? ` · ${line.speaker}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={fitWidth}
          className="text-[10px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 font-bold shrink-0"
          title="Ajusta el ancho del globo al texto"
        >
          Ajustar ancho
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={line.text}
        onChange={(e) => onTextLive(e.target.value)}
        onBlur={handleBlur}
        rows={6}
        placeholder="Escribí el diálogo aquí…"
        className="w-full min-h-[7rem] resize-y rounded border border-white/15 bg-[#0a0a0f] text-white px-3 py-2 text-sm leading-relaxed font-[var(--font-marker)] focus:outline-none focus:ring-2 focus:ring-[#e8185a]/60"
      />
      <p className="text-[10px] text-zinc-500">Markdown: **negrita**, *cursiva*, ~~tachado~~</p>
    </div>
  );
}

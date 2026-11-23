"use client";

import React, { useEffect, useState } from "react";

export function BubbleTransferBar({
  panelCount,
  activePanelIdx,
  selectedPanelIdx,
  clipboardCount,
  onMoveToPanel,
  onCopy,
  onPaste,
}: {
  panelCount: number;
  activePanelIdx: number;
  selectedPanelIdx: number | null;
  clipboardCount: number;
  onMoveToPanel: (panelIdx: number) => void;
  onCopy: () => void;
  onPaste: (panelIdx: number) => void;
}) {
  const [pasteTarget, setPasteTarget] = useState(activePanelIdx);

  useEffect(() => {
    setPasteTarget(activePanelIdx);
  }, [activePanelIdx]);

  const safePasteTarget = panelCount === 0 ? 0 : Math.min(pasteTarget, panelCount - 1);

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
      {selectedPanelIdx !== null && panelCount > 0 && (
        <label className="flex items-center gap-2 text-xs font-bold text-zinc-300">
          Mover a
          <select
            value={selectedPanelIdx}
            onChange={(e) => onMoveToPanel(parseInt(e.target.value, 10))}
            className="text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-1.5 font-normal"
          >
            {Array.from({ length: panelCount }, (_, idx) => (
              <option key={idx} value={idx}>
                Parada {idx + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={onCopy}
        disabled={selectedPanelIdx === null}
        className="text-sm px-3 py-1.5 rounded bg-zinc-800 text-white font-bold disabled:opacity-40"
      >
        Copiar
      </button>
      <label className="flex items-center gap-2 text-xs font-bold text-zinc-300">
        Pegar en
        <select
          value={safePasteTarget}
          onChange={(e) => setPasteTarget(parseInt(e.target.value, 10))}
          disabled={panelCount === 0}
          className="text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-1.5 font-normal"
        >
          {panelCount === 0 ? (
            <option value={0}>Sin paradas</option>
          ) : (
            Array.from({ length: panelCount }, (_, idx) => (
              <option key={idx} value={idx}>
                Parada {idx + 1}
              </option>
            ))
          )}
        </select>
      </label>
      <button
        type="button"
        onClick={() => onPaste(safePasteTarget)}
        disabled={clipboardCount === 0 || panelCount === 0}
        className="text-sm px-3 py-1.5 rounded bg-[#e8185a] text-white font-bold disabled:opacity-40"
      >
        Pegar{clipboardCount > 1 ? ` (${clipboardCount})` : ""}
      </button>
      <span className="text-[10px] text-zinc-500">Doble clic crea el globo en la parada actual.</span>
    </div>
  );
}

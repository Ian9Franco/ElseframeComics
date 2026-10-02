"use client";

import React from "react";
import type { PanelStop } from "@/components/reader/audioPlayer";
import { SoundFolderPicker } from "./SoundFolderPicker";
import { isReaderSystemSound } from "@/lib/readerSystemSounds";
import { formatParadaPosition } from "@/lib/editorAudioHelpers";
import { getPageKeyFromUrl } from "@/components/reader/readerUtils";

export function ParadaSfxEditor({
  pages,
  pageIdx,
  activePanelIdx,
  panel,
  onUpdatePanel,
}: {
  pages: string[];
  pageIdx: number;
  activePanelIdx: number;
  panel: PanelStop | undefined;
  onUpdatePanel: (pIdx: number, u: Partial<PanelStop>) => void;
}) {
  const pageKey = getPageKeyFromUrl(pages[pageIdx]) || "";
  const positionLabel = formatParadaPosition(pages, pageKey, activePanelIdx);

  const rawList =
    panel?.sounds || (panel?.sound ? [{ sound: panel.sound, soundConfig: panel.soundConfig }] : []);
  const sfxList = rawList.filter((s) => s.sound && !isReaderSystemSound(s.sound));

  const addSfx = (path: string) => {
    if (!panel || isReaderSystemSound(path)) return;
    const existing = panel.sounds || (panel.sound ? [{ sound: panel.sound, soundConfig: panel.soundConfig }] : []);
    onUpdatePanel(activePanelIdx, {
      sound: undefined,
      sounds: [...existing, { sound: path }],
    });
  };

  const removeAt = (index: number) => {
    if (!panel) return;
    const list = [...(panel.sounds || (panel.sound ? [{ sound: panel.sound }] : []))];
    list.splice(index, 1);
    onUpdatePanel(activePanelIdx, { sounds: list, sound: undefined });
  };

  if (!panel) {
    return (
      <p className="text-sm text-zinc-500 italic">Seleccioná una parada para agregar SFX.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-950/15 p-3">
      <div>
        <div className="text-xs font-bold text-amber-200 uppercase tracking-wider">SFX de parada</div>
        <p className="text-[11px] text-amber-100/80 mt-1 leading-snug">
          Solo suena en <span className="font-bold text-white">{positionLabel}</span>. No continúa en otras páginas ni paradas.
        </p>
      </div>

      {sfxList.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">Sin SFX en esta parada.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sfxList.map((s, i) => (
            <li
              key={`${s.sound}-${i}`}
              className="flex items-center gap-2 text-sm bg-[#0a0a0f] border border-white/10 rounded px-2 py-2"
            >
              <span className="truncate flex-1 text-zinc-200">{s.sound.split("/").pop()}</span>
              <button
                type="button"
                className="text-xs font-bold text-red-400 shrink-0 px-2 py-1 rounded bg-red-950/50"
                onClick={() => removeAt(i)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Agregar SFX</span>
        <SoundFolderPicker onPick={addSfx} compact />
      </div>
    </div>
  );
}

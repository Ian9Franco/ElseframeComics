"use client";

import React from "react";
import type { PanelStop, PanelSound } from "@/components/reader/audioPlayer";
import { SoundFolderPicker } from "./SoundFolderPicker";
import { isReaderSystemSound } from "@/lib/readerSystemSounds";
import { formatParadaPosition } from "@/lib/editorAudioHelpers";
import { getPageKeyFromUrl } from "@/components/reader/readerUtils";
import { SoundConfigControls } from "@/components/reader/editor/SoundConfigControls";

function panelSoundsList(panel: PanelStop): PanelSound[] {
  return panel.sounds || (panel.sound ? [{ sound: panel.sound, soundConfig: panel.soundConfig }] : []);
}

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

  const rawList = panel ? panelSoundsList(panel) : [];
  const hasSfx = rawList.some((s) => s.sound && !isReaderSystemSound(s.sound));

  const setSounds = (list: PanelSound[]) => {
    onUpdatePanel(activePanelIdx, {
      sound: undefined,
      soundConfig: undefined,
      sounds: list.length > 0 ? list : undefined,
    });
  };

  const addSfx = (path: string) => {
    if (!panel || isReaderSystemSound(path)) return;
    setSounds([
      ...panelSoundsList(panel),
      { sound: path, soundConfig: { volume: 1, fadeIn: 0, fadeOut: 0 } },
    ]);
  };

  const removeAt = (index: number) => {
    if (!panel) return;
    const list = [...panelSoundsList(panel)];
    list.splice(index, 1);
    setSounds(list);
  };

  const updateSoundConfig = (index: number, soundConfig: PanelSound["soundConfig"]) => {
    if (!panel) return;
    const list = [...panelSoundsList(panel)];
    list[index] = { ...list[index], soundConfig };
    setSounds(list);
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

      {!hasSfx ? (
        <p className="text-xs text-zinc-500 italic">Sin SFX en esta parada.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rawList
            .map((s, idx) => ({ s, idx }))
            .filter(({ s }) => s.sound && !isReaderSystemSound(s.sound))
            .map(({ s, idx }) => (
              <li
                key={`${s.sound}-${idx}`}
                className="flex flex-col gap-2 text-sm bg-[#0a0a0f] border border-white/10 rounded p-2"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate flex-1 text-zinc-200 font-medium">{s.sound.split("/").pop()}</span>
                  <button
                    type="button"
                    className="text-xs font-bold text-red-400 shrink-0 px-2 py-1 rounded bg-red-950/50"
                    onClick={() => removeAt(idx)}
                  >
                    Quitar
                  </button>
                </div>
                <SoundConfigControls
                  previewId={`parada-${pageKey}-${activePanelIdx}-${idx}`}
                  src={s.sound}
                  config={s.soundConfig}
                  compact
                  onChange={(soundConfig) => updateSoundConfig(idx, soundConfig)}
                />
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

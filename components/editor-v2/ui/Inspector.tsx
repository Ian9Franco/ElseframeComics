"use client";

import React, { useState } from "react";
import type { DialogueLine } from "@/components/reader/DialogueBubble";
import type { Dialogues, PanelStop } from "@/components/reader/audioPlayer";
import { EditorAudioTracks } from "@/components/reader/EditorAudioTracks";
import { EditorDialogueGenerator } from "@/components/reader/EditorDialogueGenerator";
import { EditorBubbleVisualsForm } from "@/components/reader/editor/EditorBubbleVisualsForm";
import { EditorBubbleLayoutForm } from "@/components/reader/editor/EditorBubbleLayoutForm";
import { EditorBubbleTailForm } from "@/components/reader/editor/EditorBubbleTailForm";
import type { AiDialogueProposal } from "@/components/reader/dialogueAi";

export function Inspector({
  chapterId,
  sagaTitle,
  chapterTitle,
  pageIdx,
  pages,
  localDialogues,
  panels,
  activePanelIdx,
  activeBubbleIdx,
  onUpdateBubble,
  onUpdatePanel,
  onUpdateAudioTracks,
  onApplyGenerated,
}: {
  chapterId: string;
  sagaTitle: string;
  chapterTitle: string;
  pageIdx: number;
  pages: string[];
  localDialogues: Dialogues;
  panels: PanelStop[];
  activePanelIdx: number;
  activeBubbleIdx: number | null;
  onUpdateBubble: (pIdx: number, bIdx: number, u: Partial<DialogueLine>) => void;
  onUpdatePanel: (pIdx: number, u: Partial<PanelStop>) => void;
  onUpdateAudioTracks: (tracks: NonNullable<Dialogues["audioTracks"]>) => void;
  onApplyGenerated: (p: AiDialogueProposal[]) => void;
}) {
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const panel = panels[activePanelIdx];
  const line = activeBubbleIdx !== null ? panel?.dialogue?.[activeBubbleIdx] : null;

  return (
    <div className="w-72 shrink-0 bg-[#0e0e14] border-l border-white/10 overflow-y-auto flex flex-col text-zinc-200">
      <div className="p-3 border-b border-white/10 font-[var(--font-bangers)] text-lg text-white">Inspector</div>

      <div className="p-3 border-b border-white/10">
        <EditorDialogueGenerator
          chapterId={chapterId}
          sagaTitle={sagaTitle}
          chapterTitle={chapterTitle}
          pageIdx={pageIdx}
          pages={pages}
          currentPanels={panels}
          localDialogues={localDialogues}
          onApply={onApplyGenerated}
        />
      </div>

      {panel && (
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="text-xs font-bold text-zinc-400 uppercase">Parada {activePanelIdx + 1}</div>
          <label className="text-[10px] text-zinc-500 block">Sonido (ruta)</label>
          <input
            type="text"
            value={panel.sound ?? ""}
            onChange={(e) => onUpdatePanel(activePanelIdx, { sound: e.target.value || undefined })}
            className="w-full text-xs bg-[#0a0a0f] border border-white/10 rounded px-2 py-1 text-white"
            placeholder="/audio/..."
          />
        </div>
      )}

      <details className="border-b border-white/10">
        <summary className="p-3 text-xs font-bold cursor-pointer text-zinc-400 uppercase">Pistas de audio</summary>
        <div className="p-2">
          <EditorAudioTracks
            audioTracks={localDialogues.audioTracks ?? []}
            pages={pages}
            localDialogues={localDialogues}
            onUpdate={onUpdateAudioTracks}
            currentPageIdx={pageIdx}
            activePanelIdx={activePanelIdx}
          />
        </div>
      </details>

      {line && activeBubbleIdx !== null && (
        <details open={openAdvanced} onToggle={(e) => setOpenAdvanced((e.target as HTMLDetailsElement).open)}>
          <summary className="p-3 text-xs font-bold cursor-pointer text-zinc-400 uppercase">Avanzado (globo)</summary>
          <div className="p-2 space-y-3 editor-dark-theme">
            <EditorBubbleVisualsForm
              bubble={line}
              activePanelIdx={activePanelIdx}
              activeBubbleIdx={activeBubbleIdx}
              handleUpdateBubble={onUpdateBubble}
            />
            <EditorBubbleLayoutForm
              bubble={line}
              activePanelIdx={activePanelIdx}
              activeBubbleIdx={activeBubbleIdx}
              currentPanels={panels}
              handleUpdateBubble={onUpdateBubble}
            />
            <EditorBubbleTailForm
              bubble={line}
              activePanelIdx={activePanelIdx}
              activeBubbleIdx={activeBubbleIdx}
              handleUpdateBubble={onUpdateBubble}
            />
          </div>
        </details>
      )}
    </div>
  );
}

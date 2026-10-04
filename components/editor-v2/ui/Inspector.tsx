"use client";

import React, { useState } from "react";
import type { DialogueLine } from "@/components/reader/DialogueBubble";
import type { Dialogues, PageData, PanelStop, SceneFadeType, ZoomRect } from "@/components/reader/audioPlayer";
import { EditorBubbleVisualsForm } from "@/components/reader/editor/EditorBubbleVisualsForm";
import { EditorBubbleLayoutForm } from "@/components/reader/editor/EditorBubbleLayoutForm";
import { EditorBubbleTailForm } from "@/components/reader/editor/EditorBubbleTailForm";
import { ParadaSfxEditor } from "./ParadaSfxEditor";
import { EditorAudioTracks } from "@/components/reader/EditorAudioTracks";
import type { EditorV2Tool, Selection } from "../types";
import { SCENE_FADE_OPTIONS } from "@/components/reader/sceneFade";
import { BubbleDialoguePanel } from "./BubbleDialoguePanel";

export type InspectorViewMode = "full" | "stops" | "bubble" | "mask" | "page" | "audio";

function FadeSliders({
  fadeIn,
  fadeOut,
  fadeInType,
  fadeOutType,
  audioFade,
  showIn = true,
  onChange,
}: {
  fadeIn?: number;
  fadeOut?: number;
  fadeInType?: SceneFadeType;
  fadeOutType?: SceneFadeType;
  audioFade?: boolean;
  showIn?: boolean;
  onChange: (u: {
    fadeIn?: number;
    fadeOut?: number;
    fadeInType?: SceneFadeType;
    fadeOutType?: SceneFadeType;
    audioFade?: boolean;
  }) => void;
}) {
  return (
    <div className="space-y-2">
      {showIn && (
        <>
          <label className="flex items-center justify-between text-sm text-zinc-300">
            Fade in
            <span className="font-mono text-xs">{fadeIn ?? 0}ms</span>
          </label>
          <input
            type="range"
            min={0}
            max={4000}
            step={50}
            value={fadeIn ?? 0}
            onChange={(e) => onChange({ fadeIn: parseInt(e.target.value, 10) })}
            className="w-full accent-[#e8185a]"
          />
          <select
            value={fadeInType ?? "fade"}
            onChange={(e) => onChange({ fadeInType: e.target.value as SceneFadeType })}
            className="w-full text-sm bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
          >
            {SCENE_FADE_OPTIONS.map((o) => (
              <option key={`in-${o.id}`} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </>
      )}
      <label className="flex items-center justify-between text-sm text-zinc-300">
        Fade out
        <span className="font-mono text-xs">{fadeOut ?? 0}ms</span>
      </label>
      <input
        type="range"
        min={0}
        max={4000}
        step={50}
        value={fadeOut ?? 0}
        onChange={(e) => onChange({ fadeOut: parseInt(e.target.value, 10) })}
        className="w-full accent-[#e8185a]"
      />
      <select
        value={fadeOutType ?? "fade"}
        onChange={(e) => onChange({ fadeOutType: e.target.value as SceneFadeType })}
        className="w-full text-sm bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
      >
        {SCENE_FADE_OPTIONS.map((o) => (
          <option key={`out-${o.id}`} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {audioFade !== undefined && (
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={!!audioFade}
            onChange={(e) => onChange({ audioFade: e.target.checked })}
          />
          También fade de audio
        </label>
      )}
    </div>
  );
}

export function Inspector({
  pageIdx,
  pages,
  pageData,
  localDialogues,
  panels,
  activePanelIdx,
  selection,
  activeTool,
  onUpdateBubble,
  onUpdateBubbleLive,
  onUpdatePanel,
  onUpdateAudioTracks,
  onUpdatePage,
  onUpdateMask,
  viewMode = "full",
  showHeader = true,
}: {
  pageIdx: number;
  pages: string[];
  pageData: PageData;
  localDialogues: Dialogues;
  panels: PanelStop[];
  activePanelIdx: number;
  selection: Selection;
  activeTool: EditorV2Tool;
  onUpdateBubble: (pIdx: number, bIdx: number, u: Partial<DialogueLine>) => void;
  onUpdateBubbleLive: (pIdx: number, bIdx: number, u: Partial<DialogueLine>) => void;
  onUpdatePanel: (pIdx: number, u: Partial<PanelStop>) => void;
  onUpdateAudioTracks: (tracks: NonNullable<Dialogues["audioTracks"]>) => void;
  onUpdatePage: (u: Partial<PageData>) => void;
  onUpdateMask: (pIdx: number, rIdx: number, rect: ZoomRect) => void;
  viewMode?: InspectorViewMode;
  showHeader?: boolean;
}) {
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const panel = panels[activePanelIdx];
  const maskPanelIdx = selection.kind === "mask" ? selection.panelIdx : activePanelIdx;
  const maskPanel = panels[maskPanelIdx];
  const maskRects = maskPanel?.zoomRects || (maskPanel?.zoomRect ? [maskPanel.zoomRect] : []);
  const selectedBubble =
    selection.kind === "bubble"
      ? { panelIdx: selection.panelIdx, bubbleIdx: selection.bubbleIdx }
      : selection.kind === "bubbles" && selection.items.length > 0
        ? selection.items[0]
        : null;
  const selectedLine =
    selectedBubble != null
      ? panels[selectedBubble.panelIdx]?.dialogue?.[selectedBubble.bubbleIdx]
      : null;
  const showPage = viewMode === "full" || viewMode === "page";
  const showStopPanel = viewMode === "full" || viewMode === "stops";
  const showMask = viewMode === "full" || viewMode === "mask";
  const showAudio = viewMode === "full" || viewMode === "audio";
  const showBubbleAdvanced = viewMode === "full" || viewMode === "bubble";

  const pageSection = showPage ? (
    <div className="p-4 border-b border-white/10 space-y-2">
      <div className="text-sm font-bold text-zinc-300">Página {pageIdx + 1}</div>
      <FadeSliders
        fadeIn={pageData.fadeIn}
        fadeOut={pageData.fadeOut}
        fadeInType={pageData.fadeInType}
        fadeOutType={pageData.fadeOutType}
        audioFade={pageData.audioFade ?? false}
        onChange={(u) => onUpdatePage(u)}
      />
    </div>
  ) : null;

  const stopSection = showStopPanel ? (
    <div id="inspector-parada-sfx" className="p-4 border-b border-white/10 space-y-3 scroll-mt-4">
      <div className="text-sm font-bold text-zinc-300">Parada {activePanelIdx + 1}</div>
      {panel ? (
        <>
          <FadeSliders
            fadeIn={panel.fadeIn}
            fadeOut={panel.fadeOut}
            fadeInType={panel.fadeInType}
            fadeOutType={panel.fadeOutType}
            audioFade={panel.audioFade ?? false}
            onChange={(u) => onUpdatePanel(activePanelIdx, u)}
          />
          <ParadaSfxEditor
            pages={pages}
            pageIdx={pageIdx}
            activePanelIdx={activePanelIdx}
            panel={panel}
            onUpdatePanel={onUpdatePanel}
          />
        </>
      ) : (
        <p className="text-sm text-zinc-500 italic">Agregá una parada para editar fades y SFX.</p>
      )}
    </div>
  ) : null;

  const maskSection =
    showMask && (activeTool === "mask" || selection.kind === "mask" || viewMode === "mask") ? (
      maskRects.length > 0 ? (
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="text-sm font-bold text-zinc-300">Máscaras · parada {maskPanelIdx + 1}</div>
          {maskRects.map((mask, rIdx) => (
            <div key={`mask-fade-${maskPanelIdx}-${rIdx}`} className="space-y-2 rounded border border-white/10 p-2">
              <div className="text-xs font-bold text-cyan-300">Máscara {rIdx + 1}</div>
              <FadeSliders
                showIn={false}
                fadeOut={mask.fadeOut}
                fadeOutType={mask.fadeOutType}
                onChange={(u) => onUpdateMask(maskPanelIdx, rIdx, { ...mask, fadeOut: u.fadeOut, fadeOutType: u.fadeOutType })}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 border-b border-white/10 text-sm text-zinc-400">
          Dibujá o seleccioná una máscara en el lienzo para editar sus fades.
        </div>
      )
    ) : null;

  const audioSection = showAudio ? (
    <div id="inspector-chapter-tracks" className="border-b border-white/10 scroll-mt-4">
      <div className="px-4 pt-4 pb-2 space-y-1">
        <div className="text-sm font-bold text-zinc-300">Pistas del capítulo</div>
        <p className="text-[11px] text-zinc-400 leading-snug">
          Música o ambientes con <span className="text-zinc-200">inicio y fin</span> en la página/parada que elijas. Cada tarjeta muestra el tramo completo (ej. Pág 2 · Parada 1 → al salir de Parada 3).
        </p>
      </div>
      <EditorAudioTracks
        audioTracks={localDialogues.audioTracks ?? []}
        pages={pages}
        localDialogues={localDialogues}
        onUpdate={onUpdateAudioTracks}
        currentPageIdx={pageIdx}
        activePanelIdx={activePanelIdx}
      />
    </div>
  ) : null;

  const bubbleDialogueSection =
    showBubbleAdvanced && selectedBubble && selectedLine ? (
      <BubbleDialoguePanel
        panelIdx={selectedBubble.panelIdx}
        bubbleIdx={selectedBubble.bubbleIdx}
        line={selectedLine}
        onTextLive={(text) => onUpdateBubbleLive(selectedBubble.panelIdx, selectedBubble.bubbleIdx, { text })}
        onTextCommit={(fields) => onUpdateBubble(selectedBubble.panelIdx, selectedBubble.bubbleIdx, fields)}
        onFitWidth={(width) => onUpdateBubble(selectedBubble.panelIdx, selectedBubble.bubbleIdx, { width })}
      />
    ) : null;

  const bubbleAdvancedSection =
    showBubbleAdvanced &&
    selectedLine &&
    selectedBubble &&
    (activeTool === "bubble" || viewMode === "bubble") ? (
      <details open={openAdvanced} onToggle={(e) => setOpenAdvanced((e.target as HTMLDetailsElement).open)}>
        <summary className="p-4 text-sm font-bold cursor-pointer text-zinc-400 uppercase">Avanzado (globo)</summary>
        <div className="p-3 space-y-3 editor-dark-theme">
          <EditorBubbleVisualsForm
            bubble={selectedLine}
            activePanelIdx={selectedBubble.panelIdx}
            activeBubbleIdx={selectedBubble.bubbleIdx}
            handleUpdateBubble={onUpdateBubble}
          />
          <EditorBubbleLayoutForm
            bubble={selectedLine}
            activePanelIdx={selectedBubble.panelIdx}
            activeBubbleIdx={selectedBubble.bubbleIdx}
            currentPanels={panels}
            handleUpdateBubble={onUpdateBubble}
          />
          <EditorBubbleTailForm
            bubble={selectedLine}
            activePanelIdx={selectedBubble.panelIdx}
            activeBubbleIdx={selectedBubble.bubbleIdx}
            handleUpdateBubble={onUpdateBubble}
          />
        </div>
      </details>
    ) : null;

  return (
    <div className="w-full lg:w-[360px] shrink-0 bg-[#0e0e14] border-l border-white/10 overflow-y-auto flex flex-col text-zinc-200">
      {showHeader && (
        <div className="p-4 border-b border-white/10 font-[var(--font-bangers)] text-xl text-white">Inspector</div>
      )}

      {bubbleDialogueSection}
      {pageSection}
      {stopSection}
      {maskSection}
      {audioSection}
      {bubbleAdvancedSection}
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Dialogues } from "@/components/reader/audioPlayer";
import { getPageKeyFromUrl } from "@/components/reader/readerUtils";
import type { AiDialogueProposal } from "@/components/reader/dialogueAi";
import { useEditorV2Store } from "./useEditorV2Store";
import { useCanvasTransform } from "./useCanvasTransform";
import { PageCanvas } from "./canvas/PageCanvas";
import { ToolRail } from "./ui/ToolRail";
import { BubblePalette } from "./ui/BubblePalette";
import { PageStrip } from "./ui/PageStrip";
import { StopsTimeline } from "./ui/StopsTimeline";
import { FloatingToolbar } from "./ui/FloatingToolbar";
import { Inspector } from "./ui/Inspector";
import type { BubbleStylePreset } from "./types";

export function EditorV2({
  pages,
  pageIdx,
  resetPage,
  chapter,
  saga,
  localDialogues,
  setLocalDialogues,
  handleSaveChanges,
  isSaving,
  saveStatus,
  hasUnsavedChanges,
  handleApplyGeneratedDialogues,
  onPreview,
}: {
  pages: string[];
  pageIdx: number;
  resetPage: (idx: number) => void;
  chapter: { id: string; title: string };
  saga: { title: string };
  localDialogues: Dialogues;
  setLocalDialogues: React.Dispatch<React.SetStateAction<Dialogues>>;
  handleSaveChanges: () => void;
  isSaving: boolean;
  saveStatus: "idle" | "success" | "error";
  hasUnsavedChanges?: boolean;
  handleApplyGeneratedDialogues: (proposals: AiDialogueProposal[]) => void;
  onPreview: () => void;
}) {
  const pageKey = getPageKeyFromUrl(pages[pageIdx]) || "";
  const store = useEditorV2Store(localDialogues, setLocalDialogues, pageKey);
  const canvas = useCanvasTransform();
  const [dragStyle, setDragStyle] = useState<BubbleStylePreset | null>(null);
  const [guides, setGuides] = useState<{ axis: "x" | "y"; value: number }[]>([]);
  const [activePanelIdx, setActivePanelIdx] = useState(0);

  const pageData = store.getPage();
  const panels = pageData.panels || [];

  useEffect(() => {
    if (store.selection.kind === "bubble") setActivePanelIdx(store.selection.panelIdx);
    if (store.selection.kind === "stop") setActivePanelIdx(store.selection.panelIdx);
  }, [store.selection]);

  const speakers = useMemo(() => {
    const set = new Set<string>();
    Object.values(localDialogues.pages || {}).forEach((pg) => {
      pg.panels?.forEach((p) => p.dialogue?.forEach((d) => d.speaker && set.add(d.speaker)));
    });
    return [...set].sort();
  }, [localDialogues]);

  const selectedLine = useMemo(() => {
    if (store.selection.kind !== "bubble") return null;
    return panels[store.selection.panelIdx]?.dialogue?.[store.selection.bubbleIdx] ?? null;
  }, [store.selection, panels]);

  const wrapApplyGenerated = useCallback(
    (proposals: AiDialogueProposal[]) => {
      handleApplyGeneratedDialogues(proposals);
    },
    [handleApplyGeneratedDialogues]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;
      if (e.code === "Space" && !typing) {
        e.preventDefault();
        canvas.setSpaceHeld(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && store.selection.kind === "bubble") {
        e.preventDefault();
        store.duplicateBubble(store.selection.panelIdx, store.selection.bubbleIdx);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (typing) return;
        store.copySelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (typing) return;
        store.pasteClipboard(activePanelIdx, { posX: 50, posY: 50 });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b" && store.selection.kind === "bubble" && !typing) {
        e.preventDefault();
        const { panelIdx, bubbleIdx } = store.selection;
        const line = panels[panelIdx]?.dialogue?.[bubbleIdx];
        if (line) store.updateBubble(panelIdx, bubbleIdx, { text: `${line.text}**` });
      }
      if (e.key === "Delete" && store.selection.kind === "bubble") {
        store.removeBubble(store.selection.panelIdx, store.selection.bubbleIdx);
      }
      if (!typing && !e.ctrlKey && !e.metaKey) {
        if (e.key.toLowerCase() === "v") store.setActiveTool("select");
        if (e.key.toLowerCase() === "b") store.setActiveTool("bubble");
        if (e.key.toLowerCase() === "m") store.setActiveTool("stop");
        if (e.key.toLowerCase() === "h") store.setActiveTool("hand");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") canvas.setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [canvas, store, activePanelIdx]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0f] text-zinc-200">
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-[#12121c]">
        <div className="flex items-center gap-2">
          <span className="font-[var(--font-bangers)] text-lg text-white tracking-wide">Editor 2.0</span>
          {hasUnsavedChanges && (
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">Sin guardar</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => store.undo()}
            disabled={!store.canUndo}
            className="text-xs px-2 py-1 rounded bg-zinc-800 disabled:opacity-40"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={() => store.redo()}
            disabled={!store.canRedo}
            className="text-xs px-2 py-1 rounded bg-zinc-800 disabled:opacity-40"
          >
            ↷ Redo
          </button>
          <button type="button" onClick={onPreview} className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 font-bold">
            ▶ Probar
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`font-[var(--font-bangers)] text-sm px-4 py-1.5 rounded ${
              saveStatus === "success" ? "bg-green-600" : saveStatus === "error" ? "bg-red-600" : "bg-[#e8185a]"
            } text-white`}
          >
            {isSaving ? "Guardando…" : saveStatus === "success" ? "Guardado ✓" : "Guardar JSON"}
          </button>
        </div>
      </div>

      {(store.activeTool === "bubble" || store.activeTool === "select" || dragStyle) && (
        <BubblePalette
          activeStyle={store.pendingBubbleStyle}
          onStyleChange={store.setPendingBubbleStyle}
          onDragStartStyle={(s, e) => {
            e.dataTransfer.setData("text/plain", s);
            setDragStyle(s);
          }}
        />
      )}

      <div className="flex-1 flex min-h-0">
        <PageStrip pages={pages} pageIdx={pageIdx} onSelect={resetPage} />
        <ToolRail activeTool={store.activeTool} onToolChange={store.setActiveTool} />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <PageCanvas
            pageUrl={pages[pageIdx]}
            panels={panels}
            activePanelIdx={activePanelIdx}
            store={store}
            scale={canvas.scale}
            pan={canvas.pan}
            spaceHeld={canvas.spaceHeld}
            onPanChange={canvas.setPan}
            onWheelZoom={canvas.zoomBy}
            dragBubbleStyle={dragStyle}
            onDropBubbleStyle={() => setDragStyle(null)}
            guides={guides}
            setGuides={setGuides}
          />
          {selectedLine && store.selection.kind === "bubble" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[300]">
              <FloatingToolbar
                line={selectedLine}
                speakers={speakers}
                onUpdate={(fields) => {
                  const { panelIdx, bubbleIdx } = store.selection as { kind: "bubble"; panelIdx: number; bubbleIdx: number };
                  store.updateBubble(panelIdx, bubbleIdx, fields);
                }}
                onDuplicate={() => {
                  const { panelIdx, bubbleIdx } = store.selection as { kind: "bubble"; panelIdx: number; bubbleIdx: number };
                  store.duplicateBubble(panelIdx, bubbleIdx);
                }}
                onDelete={() => {
                  const { panelIdx, bubbleIdx } = store.selection as { kind: "bubble"; panelIdx: number; bubbleIdx: number };
                  store.removeBubble(panelIdx, bubbleIdx);
                }}
              />
            </div>
          )}
        </div>
        <Inspector
          chapterId={chapter.id}
          sagaTitle={saga.title}
          chapterTitle={chapter.title}
          pageIdx={pageIdx}
          pages={pages}
          localDialogues={localDialogues}
          panels={panels}
          activePanelIdx={activePanelIdx}
          activeBubbleIdx={store.selection.kind === "bubble" ? store.selection.bubbleIdx : null}
          onUpdateBubble={store.updateBubble}
          onUpdatePanel={store.updatePanel}
          onUpdateAudioTracks={store.updateAudioTracks}
          onApplyGenerated={wrapApplyGenerated}
        />
      </div>

      <StopsTimeline
        panels={panels}
        activePanelIdx={activePanelIdx}
        onSelect={(idx) => {
          setActivePanelIdx(idx);
          store.setSelection({ kind: "stop", panelIdx: idx });
        }}
        onReorder={store.reorderPanels}
      />
    </div>
  );
}

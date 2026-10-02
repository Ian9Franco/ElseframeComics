"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Dialogues } from "@/components/reader/audioPlayer";
import { getPageKeyFromUrl } from "@/components/reader/readerUtils";
import { useEditorV2Store } from "./useEditorV2Store";
import { useCanvasTransform } from "./useCanvasTransform";
import { PageCanvas } from "./canvas/PageCanvas";
import { ToolRail } from "./ui/ToolRail";
import { BubblePalette } from "./ui/BubblePalette";
import { PageStrip } from "./ui/PageStrip";
import { StopsTimeline } from "./ui/StopsTimeline";
import { FloatingToolbar } from "./ui/FloatingToolbar";
import { Inspector } from "./ui/Inspector";
import { MetaPanel } from "./ui/MetaPanel";
import { Settings2 } from "lucide-react";
import type { BubbleStylePreset, EditorV2Tool } from "./types";

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
  onPreview,
}: {
  pages: string[];
  pageIdx: number;
  resetPage: (idx: number) => void;
  chapter: { id: string; title: string };
  saga: { id: string; title: string };
  localDialogues: Dialogues;
  setLocalDialogues: React.Dispatch<React.SetStateAction<Dialogues>>;
  handleSaveChanges: () => void;
  isSaving: boolean;
  saveStatus: "idle" | "success" | "error";
  hasUnsavedChanges?: boolean;
  onPreview: () => void;
}) {
  const pageKey = getPageKeyFromUrl(pages[pageIdx]) || "";
  const store = useEditorV2Store(localDialogues, setLocalDialogues, pageKey);
  const canvas = useCanvasTransform();
  const [dragStyle, setDragStyle] = useState<BubbleStylePreset | null>(null);
  const [guides, setGuides] = useState<{ axis: "x" | "y"; value: number }[]>([]);
  const [activePanelIdx, setActivePanelIdx] = useState(0);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const setTool = (t: EditorV2Tool) => {
    store.setActiveTool(t);
    if (t !== "bubble" && (store.selection.kind === "bubble" || store.selection.kind === "bubbles")) {
      store.setSelection({ kind: "none" });
    }
  };

  const pageData = store.getPage();
  const panels = pageData.panels || [];

  useEffect(() => {
    if (store.selection.kind === "bubble" || store.selection.kind === "stop" || store.selection.kind === "mask") {
      setActivePanelIdx(store.selection.panelIdx);
    }
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

  const deleteSelection = () => {
    const s = store.selection;
    if (s.kind === "bubble") store.removeBubble(s.panelIdx, s.bubbleIdx);
    else if (s.kind === "stop") store.removePanel(s.panelIdx);
    else if (s.kind === "mask") store.removeMaskRect(s.panelIdx, s.rectIdx);
    else if (s.kind === "bubbles") {
      [...s.items].reverse().forEach((item) => store.removeBubble(item.panelIdx, item.bubbleIdx));
    }
  };

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
      if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
        deleteSelection();
      }
      if (!typing && !e.ctrlKey && !e.metaKey) {
        if (e.key.toLowerCase() === "p") setTool("stops");
        if (e.key.toLowerCase() === "b") setTool("bubble");
        if (e.key.toLowerCase() === "m") setTool("mask");
        if (e.key.toLowerCase() === "h") setTool("hand");
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
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0f] text-zinc-200 relative">
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-[#12121c]">
        <div className="flex items-center gap-2">
          <span className="font-[var(--font-bangers)] text-xl text-white tracking-wide">Editor 2.0</span>
          {hasUnsavedChanges && (
            <span className="text-xs font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">Sin guardar</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMetaOpen(true)}
            className="text-sm px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 font-bold inline-flex items-center gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            Config
          </button>
          <button
            type="button"
            onClick={() => store.undo()}
            disabled={!store.canUndo}
            className="text-sm px-3 py-1.5 rounded bg-zinc-800 disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => store.redo()}
            disabled={!store.canRedo}
            className="text-sm px-3 py-1.5 rounded bg-zinc-800 disabled:opacity-40"
          >
            Redo
          </button>
          <button type="button" onClick={onPreview} className="text-sm px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 font-bold">
            Probar
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`font-[var(--font-bangers)] text-base px-4 py-1.5 rounded ${
              saveStatus === "success" ? "bg-green-600" : saveStatus === "error" ? "bg-red-600" : "bg-[#e8185a]"
            } text-white`}
          >
            {isSaving ? "Guardando…" : saveStatus === "success" ? "Guardado" : "Guardar JSON"}
          </button>
        </div>
      </div>

      {(store.activeTool === "bubble" || dragStyle) && (
        <div className="shrink-0 border-b border-white/10 bg-[#14141e]">
          <BubblePalette
            activeStyle={store.pendingBubbleStyle}
            onStyleChange={store.setPendingBubbleStyle}
            onDragStartStyle={(s, e) => {
              e.dataTransfer.setData("text/plain", s);
              setDragStyle(s);
            }}
          />
          {selectedLine && store.selection.kind === "bubble" && (
            <div className="px-3 pb-3 pt-1 flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Globo</span>
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
      )}

      <div className="flex-1 flex min-h-0">
        <PageStrip pages={pages} pageIdx={pageIdx} onSelect={resetPage} />
        <ToolRail
          activeTool={store.activeTool}
          onToolChange={setTool}
          onAddStop={() => {
            store.addPanel();
            setActivePanelIdx(panels.length);
          }}
        />
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
        </div>
        <Inspector
          pageIdx={pageIdx}
          pages={pages}
          pageData={pageData}
          localDialogues={localDialogues}
          panels={panels}
          activePanelIdx={activePanelIdx}
          selection={store.selection}
          activeTool={store.activeTool}
          soundPickerOpen={soundPickerOpen}
          onCloseSoundPicker={() => setSoundPickerOpen(false)}
          onUpdateBubble={store.updateBubble}
          onUpdatePanel={store.updatePanel}
          onUpdateAudioTracks={store.updateAudioTracks}
          onUpdatePage={store.updatePage}
          onUpdateMask={store.updateMaskRect}
        />
      </div>

      <StopsTimeline
        panels={panels}
        activePanelIdx={activePanelIdx}
        selection={store.selection}
        onSelect={(idx) => {
          setActivePanelIdx(idx);
          store.setSelection({ kind: "stop", panelIdx: idx });
        }}
        onReorder={store.reorderPanels}
        onAddStop={() => {
          store.addPanel();
          setActivePanelIdx(panels.length);
        }}
        onDelete={deleteSelection}
        onPickSound={() => setSoundPickerOpen(true)}
      />
      {metaOpen && (
        <MetaPanel sagaId={saga.id} chapterId={chapter.id} onClose={() => setMetaOpen(false)} />
      )}
    </div>
  );
}

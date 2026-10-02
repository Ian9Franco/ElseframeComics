"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Dialogues } from "@/components/reader/audioPlayer";
import { getPageKeyFromUrl } from "@/components/reader/readerUtils";
import { useEditorV2Store } from "./useEditorV2Store";
import { useCanvasTransform } from "./useCanvasTransform";
import { PageCanvas } from "./canvas/PageCanvas";
import { ToolRail } from "./ui/ToolRail";
import { BubblePalette, BubbleStyleSelect } from "./ui/BubblePalette";
import { PageStrip } from "./ui/PageStrip";
import { StopsTimeline } from "./ui/StopsTimeline";
import { FloatingToolbar } from "./ui/FloatingToolbar";
import { Inspector, type InspectorViewMode } from "./ui/Inspector";
import { MetaPanel } from "./ui/MetaPanel";
import { PageManager } from "./PageManager";
import { MobileToolNav } from "./ui/MobileToolNav";
import { useEditorBreakpoint } from "./useEditorBreakpoint";
import { Settings2, Images, MoreHorizontal } from "lucide-react";
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
  saveMessage,
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
  saveStatus: "idle" | "success" | "error" | "conflict";
  saveMessage?: string | null;
  hasUnsavedChanges?: boolean;
  onPreview: () => void;
}) {
  const pageKey = getPageKeyFromUrl(pages[pageIdx]) || "";
  const store = useEditorV2Store(localDialogues, setLocalDialogues, pageKey);
  const canvas = useCanvasTransform();
  const { isMobile } = useEditorBreakpoint();
  const [dragStyle, setDragStyle] = useState<BubbleStylePreset | null>(null);
  const [guides, setGuides] = useState<{ axis: "x" | "y"; value: number }[]>([]);
  const [activePanelIdx, setActivePanelIdx] = useState(0);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const [optionsViewMode, setOptionsViewMode] = useState<InspectorViewMode>("stops");

  const setTool = (t: EditorV2Tool) => {
    store.setActiveTool(t);
    if (t !== "bubble" && (store.selection.kind === "bubble" || store.selection.kind === "bubbles")) {
      store.setSelection({ kind: "none" });
    }
  };

  const openMobileOptions = (mode: InspectorViewMode) => {
    setOptionsViewMode(mode);
    setMobileOptionsOpen(true);
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

  const saveButtonClass = `${
    saveStatus === "success" ? "bg-green-600" : saveStatus === "conflict" ? "bg-amber-500 text-black" : saveStatus === "error" ? "bg-red-600" : "bg-[#e8185a]"
  } text-white`;

  const updateSelectedBubble = (fields: Parameters<typeof store.updateBubble>[2]) => {
    if (store.selection.kind !== "bubble") return;
    const { panelIdx, bubbleIdx } = store.selection;
    store.updateBubble(panelIdx, bubbleIdx, fields);
  };

  const inspectorCommon = {
    pageIdx,
    pages,
    pageData,
    localDialogues,
    panels,
    activePanelIdx,
    selection: store.selection,
    activeTool: store.activeTool,
    soundPickerOpen,
    onCloseSoundPicker: () => setSoundPickerOpen(false),
    onUpdateBubble: store.updateBubble,
    onUpdatePanel: store.updatePanel,
    onUpdateAudioTracks: store.updateAudioTracks,
    onUpdatePage: store.updatePage,
    onUpdateMask: store.updateMaskRect,
  };

  const stopsTimelineProps = {
    panels,
    activePanelIdx,
    selection: store.selection,
    onSelect: (idx: number) => {
      setActivePanelIdx(idx);
      store.setSelection({ kind: "stop", panelIdx: idx });
    },
    onReorder: store.reorderPanels,
    onAddStop: () => {
      store.addPanel();
      setActivePanelIdx(panels.length);
    },
    onDelete: deleteSelection,
    onPickSound: () => {
      setSoundPickerOpen(true);
      if (isMobile) openMobileOptions("stops");
    },
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-zinc-200 relative pb-[env(safe-area-inset-bottom)]">
      {/* Header — desktop: full toolbar; mobile: compact + overflow menu */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/10 bg-[#12121c] pt-[max(0.6rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-[var(--font-bangers)] text-lg lg:text-xl text-white tracking-wide shrink-0">Editor 2.0</span>
          {hasUnsavedChanges ? (
            <span className="text-[10px] lg:text-xs font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full shrink-0">
              Sin guardar
            </span>
          ) : saveStatus === "success" ? (
            <span className="text-[10px] lg:text-xs font-mono text-green-300 bg-green-500/15 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
              ✓ Guardado
            </span>
          ) : saveStatus !== "error" ? (
            <span className="text-[10px] lg:text-xs font-mono text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
              ✓ En servidor
            </span>
          ) : null}
          {saveStatus === "error" && saveMessage && (
            <span className="text-[10px] text-red-300 max-w-[8rem] lg:max-w-[14rem] truncate hidden sm:inline" title={saveMessage}>
              {saveMessage}
            </span>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setPagesOpen(true)}
            className="text-sm px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 font-bold inline-flex items-center gap-1.5 min-h-11"
          >
            <Images className="w-4 h-4" />
            Páginas
          </button>
          <button
            type="button"
            onClick={() => setMetaOpen(true)}
            className="text-sm px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 font-bold inline-flex items-center gap-1.5 min-h-11"
          >
            <Settings2 className="w-4 h-4" />
            Config
          </button>
          <button type="button" onClick={() => store.undo()} disabled={!store.canUndo} className="text-sm px-3 py-1.5 rounded bg-zinc-800 disabled:opacity-40 min-h-11">
            Undo
          </button>
          <button type="button" onClick={() => store.redo()} disabled={!store.canRedo} className="text-sm px-3 py-1.5 rounded bg-zinc-800 disabled:opacity-40 min-h-11">
            Redo
          </button>
          <button type="button" onClick={onPreview} className="text-sm px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 font-bold min-h-11">
            Probar
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`font-[var(--font-bangers)] text-base px-4 py-1.5 rounded min-h-11 ${saveButtonClass}`}
          >
            {isSaving ? "Guardando…" : saveStatus === "success" ? "Guardado" : saveStatus === "conflict" ? "Conflicto" : "Guardar JSON"}
          </button>
        </div>

        <div className="flex lg:hidden items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`font-[var(--font-bangers)] text-sm px-3 py-2 rounded min-h-10 ${saveButtonClass}`}
          >
            {isSaving ? "…" : saveStatus === "success" ? "✓" : "Guardar"}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="min-h-10 min-w-10 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700"
              aria-label="Más opciones"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {mobileMenuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-[155]" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-[156] min-w-[11rem] rounded-lg border border-white/10 bg-[#161622] shadow-xl py-1 flex flex-col">
                  <button
                    type="button"
                    className="text-left px-4 py-2.5 text-sm font-bold hover:bg-white/5"
                    onClick={() => {
                      setPagesOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Páginas
                  </button>
                  <button
                    type="button"
                    className="text-left px-4 py-2.5 text-sm font-bold hover:bg-white/5"
                    onClick={() => {
                      setMetaOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Config capítulo
                  </button>
                  <button
                    type="button"
                    className="text-left px-4 py-2.5 text-sm font-bold hover:bg-white/5"
                    onClick={() => {
                      openMobileOptions("page");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Fades de página
                  </button>
                  <button
                    type="button"
                    className="text-left px-4 py-2.5 text-sm font-bold hover:bg-white/5"
                    onClick={() => {
                      openMobileOptions("audio");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Audio del capítulo
                  </button>
                  <button
                    type="button"
                    className="text-left px-4 py-2.5 text-sm font-bold hover:bg-white/5 disabled:opacity-40"
                    disabled={!store.canUndo}
                    onClick={() => {
                      store.undo();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    className="text-left px-4 py-2.5 text-sm font-bold hover:bg-white/5 disabled:opacity-40"
                    disabled={!store.canRedo}
                    onClick={() => {
                      store.redo();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Redo
                  </button>
                  <button
                    type="button"
                    className="text-left px-4 py-2.5 text-sm font-bold hover:bg-white/5"
                    onClick={() => {
                      onPreview();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Probar lectura
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: bubble palette + inline toolbar */}
      {(store.activeTool === "bubble" || dragStyle) && (
        <div className="hidden lg:block shrink-0 border-b border-white/10 bg-[#14141e]">
          <BubblePalette
            activeStyle={store.pendingBubbleStyle}
            onStyleChange={store.setPendingBubbleStyle}
            onDragStartStyle={(s, e) => {
              e.dataTransfer.setData("text/plain", s);
              setDragStyle(s);
            }}
          />
          {selectedLine && store.selection.kind === "bubble" && (
            <div className="px-3 pb-3 pt-1 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Globo</span>
              <FloatingToolbar
                line={selectedLine}
                speakers={speakers}
                onUpdate={updateSelectedBubble}
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

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 flex min-h-0">
          <div className="hidden lg:flex">
            <PageStrip pages={pages} pageIdx={pageIdx} onSelect={resetPage} />
          </div>
          <div className="hidden lg:flex">
            <ToolRail
              activeTool={store.activeTool}
              onToolChange={setTool}
              onAddStop={stopsTimelineProps.onAddStop}
            />
          </div>
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
          <div className="hidden lg:contents">
            <Inspector {...inspectorCommon} viewMode="full" />
          </div>
        </div>

        {/* Mobile contextual layer panel */}
        <div className="lg:hidden shrink-0 flex flex-col border-t border-white/10">
          {store.activeTool === "stops" && (
            <>
              <StopsTimeline {...stopsTimelineProps} variant="compact" />
              <button
                type="button"
                className="mx-3 mb-2 text-xs font-bold text-[#e8185a] text-left py-1"
                onClick={() => openMobileOptions("stops")}
              >
                Fades y SFX de parada →
              </button>
            </>
          )}

          {store.activeTool === "bubble" && (
            <div className="p-3 flex flex-col gap-2 max-h-[40vh] overflow-y-auto bg-[#14141e]">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-bold text-zinc-400 shrink-0">Parada</label>
                <select
                  value={activePanelIdx}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    setActivePanelIdx(idx);
                    store.setSelection({ kind: "stop", panelIdx: idx });
                  }}
                  className="flex-1 text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-2"
                  disabled={panels.length === 0}
                >
                  {panels.length === 0 ? (
                    <option value={0}>Creá una parada primero</option>
                  ) : (
                    panels.map((_, idx) => (
                      <option key={idx} value={idx}>
                        Parada {idx + 1}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Tipo de globo</span>
                <BubbleStyleSelect activeStyle={store.pendingBubbleStyle} onStyleChange={store.setPendingBubbleStyle} />
                <p className="text-[10px] text-zinc-500 mt-1">Tocá el lienzo para colocar con este tipo.</p>
              </div>
              {selectedLine && store.selection.kind === "bubble" ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Texto</label>
                    <textarea
                      value={selectedLine.text || ""}
                      onChange={(e) => updateSelectedBubble({ text: e.target.value })}
                      rows={3}
                      className="w-full text-sm bg-[#0a0a0f] text-white border border-white/15 rounded px-2 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#e8185a]"
                      placeholder="Escribí el diálogo…"
                    />
                  </div>
                  <FloatingToolbar
                    variant="compact"
                    hideStyleSelect
                    line={selectedLine}
                    speakers={speakers}
                    onUpdate={updateSelectedBubble}
                    onDuplicate={() => {
                      const { panelIdx, bubbleIdx } = store.selection as { kind: "bubble"; panelIdx: number; bubbleIdx: number };
                      store.duplicateBubble(panelIdx, bubbleIdx);
                    }}
                    onDelete={() => {
                      const { panelIdx, bubbleIdx } = store.selection as { kind: "bubble"; panelIdx: number; bubbleIdx: number };
                      store.removeBubble(panelIdx, bubbleIdx);
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs font-bold text-[#e8185a] text-left py-1"
                    onClick={() => openMobileOptions("bubble")}
                  >
                    Opciones avanzadas del globo →
                  </button>
                </>
              ) : (
                <p className="text-xs text-zinc-500 italic">Seleccioná un globo en el lienzo para editar texto y estilo.</p>
              )}
            </div>
          )}

          {store.activeTool === "mask" && (
            <div className="p-3 flex flex-col gap-2 bg-[#14141e]">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-zinc-400 shrink-0">Parada</label>
                <select
                  value={activePanelIdx}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    setActivePanelIdx(idx);
                    store.setSelection({ kind: "stop", panelIdx: idx });
                  }}
                  className="flex-1 text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-2"
                >
                  {panels.map((_, idx) => (
                    <option key={idx} value={idx}>
                      Parada {idx + 1}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-zinc-400">Dibujá rectángulos de máscara en el lienzo. Seleccioná uno para ajustar fades.</p>
              <button
                type="button"
                className="text-sm font-bold py-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-left"
                onClick={() => openMobileOptions("mask")}
              >
                Opciones de máscara →
              </button>
            </div>
          )}
        </div>
      </div>

      <MobileToolNav activeTool={store.activeTool} onToolChange={setTool} />

      <div className="hidden lg:block">
        <StopsTimeline {...stopsTimelineProps} variant="default" />
      </div>

      {metaOpen && <MetaPanel sagaId={saga.id} chapterId={chapter.id} onClose={() => setMetaOpen(false)} />}
      {pagesOpen && (
        <PageManager
          pages={pages}
          pageIdx={pageIdx}
          chapterId={chapter.id}
          localDialogues={localDialogues}
          hasUnsavedChanges={hasUnsavedChanges}
          onClose={() => setPagesOpen(false)}
          onApplied={() => window.location.reload()}
        />
      )}

      {mobileOptionsOpen && (
        <div className="lg:hidden fixed inset-0 z-[160] bg-black/60 flex items-end">
          <div className="w-full max-h-[85vh] bg-[#12121c] rounded-t-2xl overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 sticky top-0 bg-[#12121c] z-10">
              <span className="font-bold font-[var(--font-bangers)] text-lg tracking-wide">Opciones</span>
              <button type="button" className="min-h-11 min-w-11 text-2xl leading-none" onClick={() => setMobileOptionsOpen(false)}>
                ×
              </button>
            </div>
            <Inspector {...inspectorCommon} viewMode={optionsViewMode} showHeader={false} />
          </div>
        </div>
      )}
    </div>
  );
}

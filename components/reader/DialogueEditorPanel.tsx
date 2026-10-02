"use client";

import React, { useEffect, useState } from "react";
import type { DialogueLine } from "./DialogueBubble";
import type { AudioTrack, Dialogues, PanelSound } from "./audioPlayer";
import { EditorTabSettings } from "./EditorTabSettings";
import { EditorTabPanels } from "./EditorTabPanels";
import { EditorTabStops } from "./EditorTabStops";
import { EditorTabMasks } from "./EditorTabMasks";
import { EditorTabDialogues } from "./EditorTabDialogues";
import { EditorAudioTracks } from "./EditorAudioTracks";
import type { AiDialogueProposal } from "./dialogueAi";

export interface PanelConfig {
  focusY: number; // 0 to 1
  dialogue?: DialogueLine[];
  zoomRect?: { x: number; y: number; w: number; h: number };
  zoomRects?: { x: number; y: number; w: number; h: number }[];
  duration?: number;
  hideUntilReached?: boolean;
  sound?: string; // Path to audio file
  soundStartTime?: number; // in seconds
  soundEndTime?: number; // in seconds
  soundConfig?: {
    volume?: number; // 0 to 1
    playbackRate?: number; // 0.5 to 2
    loop?: boolean;
    fadeIn?: number; // ms
    fadeOut?: number; // ms
    delay?: number; // ms
  };
  sounds?: PanelSound[];
}

export interface ChapterSettings {
  clearReadDialogues?: boolean;
  appearanceAnimation?: "spring" | "fade" | "slide" | "zoom";
  fadeOutAnimation?: "fade" | "slide" | "zoom";
  dialogueDepth?: number;
}

export interface DialogueEditorPanelProps {
  mode: "read" | "edit";
  chapterId: string;
  sagaTitle: string;
  chapterTitle: string;
  currentPanels: PanelConfig[];
  activeLayer?: "paradas" | "mascaras" | "dialogos";
  setActiveLayer?: (layer: "paradas" | "mascaras" | "dialogos") => void;
  activePanelIdx: number;
  activeBubbleIdx: number | null;
  pageIdx: number;
  pagesLength: number;
  /** Ordered pages array for audio track page selectors */
  pages: string[];
  /** Full localDialogues for audio track panel counts */
  localDialogues: Dialogues;
  isSaving: boolean;
  saveStatus: "success" | "error" | "idle" | "conflict" | null;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  settings: ChapterSettings;
  
  // Handlers
  handleSaveChanges: () => void;
  resetPage: (idx: number) => void;
  setShowGrid: (val: boolean) => void;
  setSnapToGrid: (val: boolean) => void;
  setGridSize: (val: number) => void;
  handleAddPanel: () => void;
  setActivePanelIdx: (idx: number) => void;
  setActiveBubbleIdx: (idx: number | null) => void;
  handleRemovePanel: (idx: number) => void;
  handleUpdatePanelParams: (pIdx: number, updates: Partial<PanelConfig>) => void;
  handleAddBubble: (pIdx: number, defaultPosition?: { posX: number; posY: number }, defaultStyle?: "normal" | "caption" | "cinematic") => void;
  handleDuplicateBubble: (pIdx: number, bIdx: number) => void;
  handleRemoveBubble: (pIdx: number, bIdx: number) => void;
  handleUpdateBubble: (pIdx: number, bIdx: number, updates: Partial<DialogueLine>) => void;
  handleUpdateSettings: (updates: Partial<ChapterSettings>) => void;
  handleUpdateAudioTracks: (tracks: AudioTrack[]) => void;
  presetMode: "standard" | "custom";
  setPresetMode: (mode: "standard" | "custom") => void;
  handleMoveBubbleToPanel: (fromPanelIdx: number, bubbleIdx: number, toPanelIdx: number) => void;
  handleReorderPanels: (startIndex: number, endIndex: number) => void;
  handleReorderBubbles: (pIdx: number, startIndex: number, endIndex: number) => void;
  handleApplyGeneratedDialogues: (proposals: AiDialogueProposal[]) => void;
  hasUnsavedChanges?: boolean;
  hasLocalBackup?: boolean;
  backupTimestamp?: number | null;
  restoreLocalBackup?: () => void;
  discardLocalBackup?: () => void;
}

/**
 * DialogueEditorPanel Component
 * Main sidebar controller for editing panels, dialogues, and chapter settings.
 * Relies on EditorTabSettings, EditorTabStops, EditorTabMasks, and EditorTabDialogues subcomponents.
 */
export function DialogueEditorPanel({
  mode,
  chapterId,
  sagaTitle,
  chapterTitle,
  currentPanels,
  activeLayer = "dialogos",
  setActiveLayer,
  activePanelIdx,
  activeBubbleIdx,
  pageIdx,
  pagesLength,
  pages,
  localDialogues,
  isSaving,
  saveStatus,
  showGrid,
  snapToGrid,
  gridSize,
  settings,
  handleSaveChanges,
  resetPage,
  setShowGrid,
  setSnapToGrid,
  setGridSize,
  handleAddPanel,
  setActivePanelIdx,
  setActiveBubbleIdx,
  handleRemovePanel,
  handleUpdatePanelParams,
  handleDuplicateBubble,
  handleAddBubble,
  handleRemoveBubble,
  handleUpdateBubble,
  handleUpdateSettings,
  handleUpdateAudioTracks,
  presetMode,
  setPresetMode,
  handleMoveBubbleToPanel,
  handleReorderPanels,
  handleReorderBubbles,
  handleApplyGeneratedDialogues,
  hasUnsavedChanges,
  hasLocalBackup,
  backupTimestamp,
  restoreLocalBackup,
  discardLocalBackup,
}: DialogueEditorPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // A phone in landscape does not have enough width for both sidebars and the
  // canvas. Keep the editor available as a drawer instead of squeezing the
  // comic into the remaining space.
  useEffect(() => {
    const syncDrawerForViewport = () => {
      setIsOpen(window.innerWidth >= 1200);
    };
    syncDrawerForViewport();
    window.addEventListener("resize", syncDrawerForViewport);
    return () => window.removeEventListener("resize", syncDrawerForViewport);
  }, []);

  if (mode !== "edit") return null;

  const isLastPage = pageIdx >= pagesLength - 1;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="editor-dialogue-toggle fixed right-3 bottom-3 z-[170] bg-[#e8185a] text-white border-2 border-[#0a0a0f] shadow-[3px_3px_0_#0a0a0f] rounded px-3 py-2 font-[var(--font-bangers)] text-sm tracking-wide"
          aria-label="Abrir editor de diálogos"
        >
          💬 Diálogos
        </button>
      )}
      <div
        className={`editor-dialogue-drawer w-full md:w-[680px] shrink-0 bg-[#0e0e14] border-t md:border-t-0 md:border-l border-white/10 flex flex-col overflow-y-auto z-40 text-zinc-200 editor-dark-theme ${isOpen ? "editor-dialogue-drawer-open" : "editor-dialogue-drawer-closed"}`}
        style={{ maxHeight: "calc(100vh - 64px)", touchAction: "pan-y" }}
      >
      <style>{`
        @media (max-width: 1199px) {
          .editor-dialogue-drawer {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: min(520px, 52vw) !important;
            max-height: none !important;
            border-top: 0;
            box-shadow: -12px 0 30px rgba(0, 0, 0, 0.45);
            transition: transform 180ms ease, visibility 180ms ease;
          }
          .editor-dialogue-drawer-closed {
            transform: translateX(105%);
            visibility: hidden;
            pointer-events: none;
          }
          .editor-dialogue-toggle { display: block; }
        }
        @media (min-width: 1200px) {
          .editor-dialogue-toggle, .editor-dialogue-close { display: none; }
        }
        @media (max-width: 767px) and (orientation: portrait) {
          .editor-dialogue-drawer {
            top: auto;
            width: 100% !important;
            height: min(68vh, 620px);
            border-left: 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.45);
          }
          .editor-dialogue-drawer-closed { transform: translateY(105%); }
        }
        /* Scoped editor dark theme overrides */
        .editor-dark-theme::-webkit-scrollbar {
          width: 6px;
        }
        .editor-dark-theme::-webkit-scrollbar-track {
          background: #0e0e14;
        }
        .editor-dark-theme::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 3px;
        }
        .editor-dark-theme::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }

        .editor-dark-theme select,
        .editor-dark-theme input:not([type="checkbox"]):not([type="range"]):not([type="color"]),
        .editor-dark-theme textarea {
          background-color: #0a0a0f !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 4px !important;
          font-size: 12px !important;
          padding: 6px 10px !important;
        }

        .editor-dark-theme select option {
          background-color: #0a0a0f !important;
          color: #ffffff !important;
        }

        .editor-dark-theme label,
        .editor-dark-theme .text-zinc-600,
        .editor-dark-theme .text-zinc-700,
        .editor-dark-theme .text-zinc-500 {
          color: #a1a1aa !important;
        }

        .editor-dark-theme .bg-white,
        .editor-dark-theme .bg-zinc-50,
        .editor-dark-theme .bg-zinc-50\\/50,
        .editor-dark-theme .bg-[#f3f4f6],
        .editor-dark-theme .bg-zinc-100,
        .editor-dark-theme .bg-zinc-100\\/50 {
          background-color: #14141e !important;
          color: #f4f4f5 !important;
        }

        .editor-dark-theme .border-zinc-200,
        .editor-dark-theme .border-zinc-300,
        .editor-dark-theme .border-b-2,
        .editor-dark-theme .border-b-3,
        .editor-dark-theme .border-t-3,
        .editor-dark-theme .border-2,
        .editor-dark-theme .border,
        .editor-dark-theme .border-\\[\\#0a0a0f\\] {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }

        .editor-dark-theme input[type="range"] {
          accent-color: #e8185a !important;
        }

        /* Details list marker hide */
        .editor-dark-theme details summary::-webkit-details-marker {
          display: none !important;
        }
        .editor-dark-theme details summary {
          list-style: none !important;
        }
      `}</style>

      {/* Header / Save Block */}
      <div className="p-4 border-b border-white/10 bg-[#161622] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-[var(--font-bangers)] text-xl tracking-wider text-white whitespace-nowrap">
            Editor de Diálogos
          </span>
          {hasUnsavedChanges && (
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full animate-pulse">
              ⚡ Respaldado en Local
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`font-[var(--font-bangers)] text-sm px-4 py-2 border border-white/20 shadow-[2px_2px_0_rgba(0,0,0,0.3)] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,0.3)] rounded cursor-pointer ${
              saveStatus === "success"
                ? "bg-green-600 text-white"
                : saveStatus === "conflict"
                ? "bg-amber-500 text-black"
                : saveStatus === "error"
                ? "bg-red-600 text-white"
                : "bg-[#e8185a] text-white hover:bg-rose-700"
            }`}
          >
            {isSaving
              ? "Guardando..."
              : saveStatus === "success"
                ? "Guardado ✓"
                : saveStatus === "conflict"
                  ? "Conflicto — recargar"
                  : "Guardar JSON"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="editor-dialogue-close w-9 h-9 border border-white/15 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold"
            aria-label="Cerrar editor de diálogos"
          >
            ×
          </button>
        </div>
      </div>

      {/* Local Backup Notification & Recovery Banner */}
      {hasLocalBackup && (
        <div className="p-3 border-b border-amber-500/30 bg-amber-950/40 text-amber-200 text-xs flex flex-col gap-2 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-amber-300 font-[var(--font-marker)]">
              ⚡ Respaldo Automático Guardado en Local
            </span>
            {backupTimestamp && (
              <span className="text-[10px] font-mono text-amber-400/80">
                {new Date(backupTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-200/90 leading-tight">
            Tus cambios se guardan solos en tiempo real en tu navegador. Si refrescas por accidente, puedes recuperar todo con un clic.
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            {restoreLocalBackup && (
              <button
                type="button"
                onClick={restoreLocalBackup}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-1 rounded text-xs transition-colors cursor-pointer"
              >
                🔄 Cargar Backup Local
              </button>
            )}
            {discardLocalBackup && (
              <button
                type="button"
                onClick={discardLocalBackup}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer"
              >
                Descartar Backup
              </button>
            )}
          </div>
        </div>
      )}

      {/* Page Navigation */}
      <div className="p-4 border-b border-white/10 bg-[#14141e] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => pageIdx > 0 && resetPage(pageIdx - 1)}
          disabled={pageIdx === 0}
          className="bg-zinc-800 border border-white/10 hover:bg-zinc-700 text-white text-xs py-1.5 px-3 rounded disabled:opacity-50 cursor-pointer"
        >
          Pág Ant
        </button>
        <span className="font-[var(--font-marker)] text-sm text-white">
          Página {pageIdx + 1}
        </span>
        <button
          type="button"
          onClick={() => pageIdx < pagesLength - 1 && resetPage(pageIdx + 1)}
          disabled={isLastPage}
          className="bg-zinc-800 border border-white/10 hover:bg-zinc-700 text-white text-xs py-1.5 px-3 rounded disabled:opacity-50 cursor-pointer"
        >
          Pág Sig
        </button>
      </div>

      {/* 3-Layer Navigation Switcher */}
      <div className="p-3 border-b border-white/10 bg-[#12121c] flex items-center justify-between gap-1.5 sticky top-0 z-20 shadow-md">
        <button
          type="button"
          onClick={() => setActiveLayer?.("paradas")}
          className={`flex-1 py-2 px-1.5 text-xs font-bold font-[var(--font-bangers)] tracking-wide rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeLayer === "paradas"
              ? "bg-[#e8185a] text-white shadow-md border border-rose-400/40"
              : "bg-[#0a0a0f] text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          <span>📍 1. Paradas y SFX</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLayer?.("mascaras")}
          className={`flex-1 py-2 px-1.5 text-xs font-bold font-[var(--font-bangers)] tracking-wide rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeLayer === "mascaras"
              ? "bg-[#e8185a] text-white shadow-md border border-rose-400/40"
              : "bg-[#0a0a0f] text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          <span>🎭 2. Máscaras</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLayer?.("dialogos")}
          className={`flex-1 py-2 px-1.5 text-xs font-bold font-[var(--font-bangers)] tracking-wide rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeLayer === "dialogos"
              ? "bg-[#e8185a] text-white shadow-md border border-rose-400/40"
              : "bg-[#0a0a0f] text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          <span>💬 3. Diálogos</span>
        </button>
      </div>

      {/* Preset Mode & Grid Controls (Collapsible/compact header) */}
      <details className="group border-b border-white/10 bg-[#14141e]">
        <summary className="p-3 text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between cursor-pointer select-none hover:bg-white/5">
          <span>📏 Opciones de Edición y Grid</span>
          <span className="text-[10px] font-mono group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-3 border-t border-white/5 flex flex-col gap-3 bg-[#0a0a0f]/40">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-400 font-bold">Modo de Edición:</span>
            <div className="flex bg-[#0a0a0f] p-0.5 rounded border border-white/10">
              <button
                type="button"
                onClick={() => setPresetMode("standard")}
                className={`px-2.5 py-0.5 text-xs font-bold rounded transition-all cursor-pointer ${
                  presetMode === "standard" ? "bg-[#e8185a] text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Estándar
              </button>
              <button
                type="button"
                onClick={() => setPresetMode("custom")}
                className={`px-2.5 py-0.5 text-xs font-bold rounded transition-all cursor-pointer ${
                  presetMode === "custom" ? "bg-[#e8185a] text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400 font-bold">Mostrar Grid:</label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-4 h-4 accent-[#e8185a] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400 font-bold">Ajustar al Grid (Snap):</label>
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="w-4 h-4 accent-[#e8185a] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-zinc-400 font-bold">Paso del Grid (%):</label>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="border border-white/10 px-2 py-1 text-xs font-mono rounded bg-[#0a0a0f] text-white cursor-pointer"
            >
              <option value="2">2%</option>
              <option value="5">5% (Estándar)</option>
              <option value="10">10%</option>
            </select>
          </div>

          {presetMode === "custom" && (
            <EditorTabSettings
              settings={settings}
              handleUpdateSettings={handleUpdateSettings}
            />
          )}
        </div>
      </details>

      {/* LAYER 1: PARADAS & AUDIO SFX */}
      {activeLayer === "paradas" && (
        <div className="flex flex-col gap-4">
          <EditorTabStops
            currentPanels={currentPanels}
            activePanelIdx={activePanelIdx}
            handleAddPanel={handleAddPanel}
            setActivePanelIdx={setActivePanelIdx}
            setActiveBubbleIdx={setActiveBubbleIdx}
            handleRemovePanel={handleRemovePanel}
            handleUpdatePanelParams={handleUpdatePanelParams}
            handleReorderPanels={handleReorderPanels}
          />
          <div className="px-4 pb-4">
            <EditorAudioTracks
              audioTracks={localDialogues.audioTracks ?? []}
              pages={pages}
              localDialogues={localDialogues}
              onUpdate={handleUpdateAudioTracks}
              currentPageIdx={pageIdx}
              activePanelIdx={activePanelIdx}
            />
          </div>
        </div>
      )}

      {/* LAYER 2: MÁSCARAS & ZOOM RECTS */}
      {activeLayer === "mascaras" && (
        <EditorTabMasks
          currentPanels={currentPanels}
          activePanelIdx={activePanelIdx}
          setActivePanelIdx={setActivePanelIdx}
          setActiveBubbleIdx={setActiveBubbleIdx}
          handleUpdatePanelParams={handleUpdatePanelParams}
        />
      )}

      {/* LAYER 3: DIÁLOGOS & BUBBLES */}
      {activeLayer === "dialogos" && (
        <div className="p-4 flex-1">
          <EditorTabDialogues
            chapterId={chapterId}
            sagaTitle={sagaTitle}
            chapterTitle={chapterTitle}
            pageIdx={pageIdx}
            pages={pages}
            localDialogues={localDialogues}
            currentPanels={currentPanels}
            activePanelIdx={activePanelIdx}
            setActivePanelIdx={setActivePanelIdx}
            activeBubbleIdx={activeBubbleIdx}
            setActiveBubbleIdx={setActiveBubbleIdx}
            handleAddBubble={handleAddBubble}
            handleDuplicateBubble={handleDuplicateBubble}
            handleRemoveBubble={handleRemoveBubble}
            handleUpdateBubble={handleUpdateBubble}
            presetMode={presetMode}
            handleMoveBubbleToPanel={handleMoveBubbleToPanel}
            handleReorderBubbles={handleReorderBubbles}
            handleApplyGeneratedDialogues={handleApplyGeneratedDialogues}
          />
        </div>
      )}
      </div>
    </>
  );
}

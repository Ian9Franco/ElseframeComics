"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  HelpCircle,
  Minus,
  Plus,
  Rocket,
  RotateCcw,
  Settings,
  Wrench,
} from "lucide-react";
import { PublishModal } from "./PublishModal";
import { PublishStatusToast } from "./PublishStatusToast";
import type { EditorVersion } from "@/lib/editorVersion";

const fontLabels: Record<number, string> = {
  0.85: "A- Chico",
  1.0: "A Normal",
  1.2: "A+ Grande",
  1.4: "A++ X-Grande",
};

const speedLabels: Record<number, string> = {
  0.5: "🐢 Lento",
  1.0: "⚡ Normal",
  1.5: "⚡⚡ Rápido",
};

interface ReaderTopBarProps {
  saga: { title: string; color: string };
  chapter: { title: string };
  mode: "edit" | "read";
  handleToggleMode: () => void;
  pageIdx: number;
  totalPages: number;
  textScale: number;
  setTextScale: (scale: number) => void;
  autoplay: boolean;
  setAutoplay: (autoplay: boolean) => void;
  speedMultiplier: number;
  setSpeedMultiplier: (value: number) => void;
  resetPage: (idx: number) => void;
  onOpenHelp: () => void;
  focusEnabled?: boolean;
  setFocusEnabled?: (value: boolean) => void;
  zoomScale?: number;
  setZoomScale?: React.Dispatch<React.SetStateAction<number>>;
  panOffset?: { x: number; y: number };
  setPanOffset?: (val: { x: number; y: number }) => void;
  bubbleOpacity?: number;
  setBubbleOpacity?: (val: number) => void;
  editorVersion?: EditorVersion;
  setEditorVersion?: (v: EditorVersion) => void;
}

/**
 * ReaderTopBar Component
 * Renders the top navigation header for the comic reader and editor.
 * In read mode: dark glassmorphism style with saga accent color.
 * In edit mode: bright white pop-art style for editor clarity.
 */
export function ReaderTopBar({
  saga,
  chapter,
  mode,
  handleToggleMode,
  pageIdx,
  totalPages,
  textScale,
  setTextScale,
  autoplay,
  setAutoplay,
  speedMultiplier,
  setSpeedMultiplier,
  resetPage,
  onOpenHelp,
  focusEnabled = true,
  setFocusEnabled,
  zoomScale,
  setZoomScale,
  panOffset,
  setPanOffset,
  bubbleOpacity = 0.90,
  setBubbleOpacity,
  editorVersion = "v1",
  setEditorVersion,
}: ReaderTopBarProps) {
  const [showPublish, setShowPublish] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Keyboard shortcuts (read mode only) ──────────────────────────────────────
  useEffect(() => {
    if (mode !== "read") return;
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input field
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "?" || e.key === "h") onOpenHelp();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, onOpenHelp]);

  // ── Progress bar width ────────────────────────────────────────────────────────
  const progressPct = totalPages > 1 ? ((pageIdx) / (totalPages - 1)) * 100 : 0;

  // ── Styles based on mode ──────────────────────────────────────────────────────
  const isReadMode = mode === "read";
  const barBg = isReadMode
    ? "rgba(10, 10, 15, 0.88)"
    : "#ffffff";
  const barBorder = isReadMode
    ? `1px solid rgba(255,255,255,0.07)`
    : "none";
  const barShadow = isReadMode
    ? `0 2px 0 rgba(0,0,0,0.5), 0 4px 24px rgba(0,0,0,0.4)`
    : "0 3px 0 #0a0a0f";
  const textColor = isReadMode ? "#ffffff" : "#0a0a0f";

  // Button style helpers
  const btnBase = isReadMode
    ? "font-[var(--font-bangers)] text-xs sm:text-sm px-2.5 py-1.5 sm:px-3.5 sm:py-2 border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-all rounded-sm backdrop-blur-sm select-none"
    : "font-[var(--font-bangers)] text-xs sm:text-sm px-2.5 py-1.5 sm:px-4 sm:py-2 border-2 border-[#0a0a0f] bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center gap-1 shadow-[2px_2px_0_#0a0a0f] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#0a0a0f] select-none";

  const dropdownBg = isReadMode
    ? "bg-[#111118] border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.7)]"
    : "bg-white border-2 border-[#0a0a0f] shadow-[4px_4px_0_#0a0a0f]";
  const mobileZoomMin = 0.75;
  const mobileZoomMax = 2.75;
  const mobileZoomStep = 0.25;

  return (
    <>
      <div
        className="shrink-0 z-[200] flex flex-col"
        style={{
          background: barBg,
          borderBottom: barBorder,
          boxShadow: barShadow,
          backdropFilter: isReadMode ? "blur(16px)" : "none",
          WebkitBackdropFilter: isReadMode ? "blur(16px)" : "none",
        }}
      >
        {/* Main bar row */}
        <div className="flex items-center justify-between px-2 sm:px-4 h-14">
          {/* Left — Back + saga info */}
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/"
              className={
                isReadMode
                  ? "font-[var(--font-bangers)] text-xs sm:text-sm px-2.5 py-1.5 border border-white/25 bg-white/10 hover:bg-white/20 text-white transition-all rounded-sm backdrop-blur-sm inline-flex items-center gap-1.5"
                  : "btn btn-dark text-xs sm:text-base px-2.5 py-1.5 sm:px-4 sm:py-2 inline-flex items-center gap-1.5"
              }
            >
              <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              Volver
            </Link>

            {isReadMode && (
              <Link
                href="/lore"
                className="font-[var(--font-bangers)] text-xs sm:text-sm px-2.5 py-1.5 border border-white/25 bg-white/10 hover:bg-white/20 text-white transition-all rounded-sm backdrop-blur-sm uppercase"
              >
                Lore
              </Link>
            )}

            <div className="hidden md:flex items-center gap-2">
              <span
                className="tag text-xs"
                style={{ background: saga.color, color: "white", border: "none", boxShadow: "none" }}
              >
                {saga.title}
              </span>
              <span
                className="font-[var(--font-bangers)] text-base tracking-wider"
                style={{ color: textColor }}
              >
                {chapter.title}
              </span>
            </div>
          </div>

          {/* Right — controls */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Mobile Zoom Controls */}
            {mode === "read" && setZoomScale && zoomScale !== undefined && (
              <div className="flex md:hidden items-center gap-1 bg-black/40 border border-white/20 px-1 py-0.5 rounded-sm shrink-0">
                <button
                  onClick={() => setZoomScale((prev) => Math.max(mobileZoomMin, prev - mobileZoomStep))}
                  disabled={zoomScale <= mobileZoomMin}
                  className="w-7 h-7 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none rounded-sm"
                  title="Alejar"
                >
                  <Minus className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <span className="text-white font-[var(--font-bangers)] text-xs min-w-[20px] text-center select-none leading-none">
                  {zoomScale.toFixed(1)}x
                </span>
                <button
                  onClick={() => setZoomScale((prev) => Math.min(mobileZoomMax, prev + mobileZoomStep))}
                  disabled={zoomScale >= mobileZoomMax}
                  className="w-7 h-7 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none rounded-sm"
                  title="Acercar"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
                {(Math.abs(zoomScale - 1) > 0.01 || (panOffset && (panOffset.x !== 0 || panOffset.y !== 0))) && (
                  <button
                    onClick={() => {
                      setZoomScale(1);
                      if (setPanOffset) setPanOffset({ x: 0, y: 0 });
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white rounded-sm"
                    title="Restablecer zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}

            {/* Read mode settings */}
            {mode === "read" && (
              <div className="relative">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`${btnBase} flex items-center gap-1`}
                  title="Configuración de lectura"
                >
                  <Settings className="w-4 h-4" strokeWidth={2.2} />
                  <span className="hidden sm:inline">Ajustes</span>
                  <ChevronDown className="w-3 h-3 opacity-60" strokeWidth={2.5} />
                </button>

                <AnimatePresence>
                  {isSettingsOpen && (
                    <>
                      <motion.div
                        key="settings-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60]"
                        onClick={() => setIsSettingsOpen(false)}
                      />
                      <motion.div
                        key="settings-dropdown"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`absolute left-auto right-[-60px] sm:right-auto sm:left-0 mt-2 w-60 z-[70] p-3 rounded-md flex flex-col gap-3 ${dropdownBg}`}
                      >

                        {/* Font size */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`font-[var(--font-bangers)] text-[10px] uppercase tracking-wider ${isReadMode ? "text-zinc-400" : "text-zinc-500"}`}>
                              Tamaño de letra:
                            </span>
                            <span className={`font-mono text-[10px] font-bold ${isReadMode ? "text-zinc-300" : "text-[#0a0a0f]"}`}>
                              {Math.round(textScale * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.50"
                            max="1.80"
                            step="0.05"
                            value={textScale}
                            onChange={(e) => setTextScale(parseFloat(e.target.value))}
                            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e8185a] transition-all hover:accent-pink-500"
                          />
                          <div className={`flex gap-1 p-0.5 rounded ${isReadMode ? "bg-white/10" : "border border-[#0a0a0f] bg-zinc-50"}`}>
                            {[0.7, 0.85, 1.0, 1.2, 1.4].map((scale) => {
                              const label = scale === 0.7 ? "A--" : scale === 0.85 ? "A-" : scale === 1.0 ? "A" : scale === 1.2 ? "A+" : "A++";
                              const active = Math.abs(textScale - scale) < 0.03;
                              return (
                                <button
                                  key={scale}
                                  type="button"
                                  onClick={() => setTextScale(scale)}
                                  className={`flex-1 h-6 flex items-center justify-center text-xs font-bold transition-all rounded font-mono ${
                                    active
                                      ? (isReadMode ? "bg-white text-[#0a0a0f]" : "bg-[#0a0a0f] text-white")
                                      : (isReadMode ? "text-white/70 hover:bg-white/15" : "hover:bg-zinc-200 text-[#0a0a0f]")
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dialogue speed */}
                        <div>
                          <span className={`block font-[var(--font-bangers)] text-[10px] uppercase tracking-wider mb-1.5 ${isReadMode ? "text-zinc-400" : "text-zinc-500"}`}>
                            Velocidad de diálogos:
                          </span>
                          <div className={`flex gap-1 p-0.5 rounded ${isReadMode ? "bg-white/10" : "border border-[#0a0a0f] bg-zinc-50"}`}>
                            {[0.5, 1.0, 1.5].map((speed) => (
                              <button
                                key={speed}
                                onClick={() => setSpeedMultiplier(speed)}
                                className={`flex-1 h-6 flex items-center justify-center text-[10px] font-bold transition-all rounded ${
                                  speedMultiplier === speed
                                    ? (isReadMode ? "bg-white text-[#0a0a0f]" : "bg-[#0a0a0f] text-white")
                                    : (isReadMode ? "text-white/70 hover:bg-white/15" : "hover:bg-zinc-200 text-[#0a0a0f]")
                                }`}
                              >
                                {speed === 0.5 ? "🐢" : speed === 1.0 ? "⚡" : "⚡⚡"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Autoplay */}
                        <div className={`flex items-center justify-between pt-2 ${isReadMode ? "border-t border-white/10" : "border-t border-zinc-100"}`}>
                          <span className={`font-[var(--font-bangers)] text-[10px] uppercase tracking-wider ${isReadMode ? "text-zinc-400" : "text-zinc-500"}`}>
                            Auto avance:
                          </span>
                          <button
                            onClick={() => setAutoplay(!autoplay)}
                            className={`font-[var(--font-bangers)] text-xs px-2.5 py-1 border transition-all rounded-sm ${
                              autoplay
                                ? "bg-emerald-500 border-emerald-400 text-white"
                                : "bg-rose-500 border-rose-400 text-white"
                            }`}
                          >
                              {autoplay ? "ON" : "OFF"}
                          </button>
                        </div>

                        {/* Focus */}
                        {setFocusEnabled && (
                          <div className={`flex items-center justify-between pt-2 ${isReadMode ? "border-t border-white/10" : "border-t border-zinc-100"}`}>
                            <span className={`font-[var(--font-bangers)] text-[10px] uppercase tracking-wider ${isReadMode ? "text-zinc-400" : "text-zinc-500"}`}>
                              Enfoque:
                            </span>
                            <button
                              onClick={() => setFocusEnabled(!focusEnabled)}
                              className={`font-[var(--font-bangers)] text-xs px-2.5 py-1 border transition-all rounded-sm ${
                                focusEnabled
                                  ? "bg-emerald-500 border-emerald-400 text-white"
                                  : "bg-rose-500 border-rose-400 text-white"
                              }`}
                            >
                              {focusEnabled ? "ON" : "OFF"}
                            </button>
                          </div>
                        )}

                        {/* Transparency Slider */}
                        {setBubbleOpacity && (
                          <div className={`flex flex-col gap-1.5 pt-2 ${isReadMode ? "border-t border-white/10" : "border-t border-zinc-100"}`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-[var(--font-bangers)] text-[10px] uppercase tracking-wider ${isReadMode ? "text-zinc-400" : "text-zinc-500"}`}>
                                Opacidad globos:
                              </span>
                              <span className={`font-mono text-[10px] font-bold ${isReadMode ? "text-zinc-300" : "text-[#0a0a0f]"}`}>
                                {Math.round(bubbleOpacity * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.10"
                              max="1.00"
                              step="0.05"
                              value={bubbleOpacity}
                              onChange={(e) => setBubbleOpacity(parseFloat(e.target.value))}
                              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#e8185a] transition-all hover:accent-pink-500"
                            />
                          </div>
                        )}

                        {/* Keyboard shortcuts hint */}
                        <div className={`pt-2 ${isReadMode ? "border-t border-white/10" : "border-t border-zinc-100"}`}>
                          <p className={`font-mono text-[9px] ${isReadMode ? "text-zinc-500" : "text-zinc-400"} leading-relaxed`}>
                            <strong>Space / →</strong> Avanzar &nbsp;·&nbsp; <strong>←</strong> Retroceder<br />
                            <strong>A</strong> Autoplay &nbsp;·&nbsp; <strong>?</strong> Ayuda
                          </p>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Editor publish button */}
            {mode === "edit" && (
              <button
                onClick={() => setShowPublish(true)}
                className="font-[var(--font-bangers)] text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 border-2 border-[#0a0a0f] transition-all bg-emerald-400 text-[#0a0a0f] shadow-[2px_2px_0_#0a0a0f] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_#0a0a0f] flex items-center justify-center gap-1"
                title="Publicar capítulo"
              >
                <Rocket className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                <span className="hidden sm:inline">Publicar</span>
              </button>
            )}

            {mode === "edit" && setEditorVersion && (
              <div className="flex bg-zinc-100 border-2 border-[#0a0a0f] shadow-[2px_2px_0_#0a0a0f] rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEditorVersion("v1")}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-[var(--font-bangers)] ${
                    editorVersion === "v1" ? "bg-[#0a0a0f] text-white" : "text-[#0a0a0f] hover:bg-zinc-200"
                  }`}
                >
                  1.0
                </button>
                <button
                  type="button"
                  onClick={() => setEditorVersion("v2")}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-[var(--font-bangers)] ${
                    editorVersion === "v2" ? "bg-[#e8185a] text-white" : "text-[#0a0a0f] hover:bg-zinc-200"
                  }`}
                >
                  2.0
                </button>
              </div>
            )}

            {/* Mode toggle */}
            <button
              onClick={handleToggleMode}
              className={`font-[var(--font-bangers)] text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 transition-all flex items-center justify-center gap-1 ${
                isReadMode
                  ? "border border-white/20 bg-white/10 hover:bg-white/20 text-white rounded-sm"
                  : mode === "edit"
                  ? "bg-[#f5e642] text-[#0a0a0f] border-2 border-[#0a0a0f] shadow-[2px_2px_0_#0a0a0f]"
                  : "bg-[#0a0a0f] text-white border-2 border-[#0a0a0f] hover:bg-zinc-800"
              }`}
              title={mode === "edit" ? "Modo lectura" : "Modo editor"}
            >
              {mode === "edit" ? (
                <Wrench className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              ) : (
                <BookOpen className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              )}
              <span className="hidden sm:inline">{mode === "edit" ? "Editor" : "Lectura"}</span>
            </button>


            {/* Help button */}
            <button
              onClick={onOpenHelp}
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-[var(--font-bangers)] text-xs sm:text-sm transition-all ${
                isReadMode
                  ? "border border-white/20 bg-white/10 hover:bg-white/20 text-white rounded-sm"
                  : "bg-white hover:bg-zinc-100 text-[#0a0a0f] border-2 border-[#0a0a0f] shadow-[2px_2px_0_#0a0a0f] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#0a0a0f]"
              }`}
              title="Ver guía de lectura"
              aria-label="Ayuda"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Progress bar — 7D: thin saga-colored reading progress bar */}
        {mode === "read" && totalPages > 1 && (
          <div className="h-[3px] w-full relative" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: saga.color }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        )}
      </div>

      <PublishModal isOpen={showPublish} onClose={() => setShowPublish(false)} />
      <PublishStatusToast />
    </>
  );
}

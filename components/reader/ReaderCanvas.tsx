"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanelStop, SceneFadeType } from "./audioPlayer";
import { ReaderZoomControls } from "./ReaderZoomControls";
import { getComicPageUrl } from "./readerUtils";
import { SceneFadeLayer } from "./SceneFadeLayer";
import { sceneFadeDurationMs, sceneFadeExit, sceneFadeOrigin } from "./sceneFade";
import { PageEndGesture } from "./PageEndGesture";

interface ReaderCanvasProps {
  mode: "read" | "edit";
  activeLayer?: "paradas" | "mascaras" | "dialogos";
  containerRef: React.RefObject<HTMLDivElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  pages: string[];
  pageIdx: number;
  chapter: any;
  isPanning: boolean;
  zoomScale: number;
  panOffset: { x: number; y: number };
  imgSize: { w: number; h: number } | null;
  imgWidth: number;
  imgHeight: number;
  imgLeft: number;
  imgTop: number;
  showGrid: boolean;
  gridSize: number;
  currentPanels: PanelStop[];
  activePanelIdx: number;
  activeBubbleIdx: number | null;
  panelIdx: number;
  zoomIdx: number;
  maskRevealPanelIdx?: number;
  maskRevealZoomIdx?: number;
  zoomedOut: boolean;
  showAllDialogues: boolean;
  isPageChanging: boolean;
  sceneTransitionMs?: number;
  cameraTransitionMs?: number;
  pageFadeInType?: SceneFadeType;
  pageFadeInMs?: number;
  stopCover?: {
    show: boolean;
    type?: SceneFadeType;
    durationMs: number;
    direction: "in" | "out";
  } | null;
  renderedDialogues: React.ReactNode;
  undoStack: any[];
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  handleWheel: (e: React.WheelEvent) => void;
  handleDoubleClick: (e: React.MouseEvent) => void;
  handleReaderTap: (e: React.MouseEvent) => void;
  handleUndo: () => void;
  handleAddPanel?: () => void;
  handleAddBubble: (pIdx: number, defaultPosition?: { posX: number; posY: number }) => void;
  handleDuplicateBubble?: (pIdx: number, bIdx: number) => void;
  handleRemoveBubble: (pIdx: number, bIdx: number) => void;
  setActivePanelIdx?: (idx: number) => void;
  handlePanelRectDragEnd?: (info: any, pIdx: number, rIdx: number) => void;
  handleFocusYDragEnd?: (info: any, pIdx: number) => void;
  handlePanelRectResizeStart?: (e: React.PointerEvent, handle: string, pIdx: number, rIdx: number) => void;
  resetPage: (idx: number) => void;
  setZoomScale: React.Dispatch<React.SetStateAction<number>>;
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>> | ((val: { x: number; y: number }) => void);
  nextChapter: any;
}

export function ReaderCanvas({
  mode,
  activeLayer = "dialogos",
  containerRef,
  imgRef,
  pages,
  pageIdx,
  chapter,
  isPanning,
  zoomScale,
  panOffset,
  imgSize,
  imgWidth,
  imgHeight,
  imgLeft,
  imgTop,
  showGrid,
  gridSize,
  currentPanels,
  activePanelIdx,
  activeBubbleIdx,
  panelIdx,
  zoomIdx,
  maskRevealPanelIdx,
  maskRevealZoomIdx,
  zoomedOut,
  showAllDialogues,
  isPageChanging,
  sceneTransitionMs = 0,
  cameraTransitionMs,
  pageFadeInType,
  pageFadeInMs = 0,
  stopCover,
  renderedDialogues,
  undoStack,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleWheel,
  handleDoubleClick,
  handleReaderTap,
  handleUndo,
  handleAddPanel,
  handleAddBubble,
  handleDuplicateBubble,
  handleRemoveBubble,
  setActivePanelIdx,
  handlePanelRectDragEnd,
  handleFocusYDragEnd,
  handlePanelRectResizeStart,
  resetPage,
  setZoomScale,
  setPanOffset,
}: ReaderCanvasProps) {
  const isLastPage = pageIdx === pages.length - 1;
  const revealPanel = maskRevealPanelIdx ?? panelIdx;
  const revealZoom = maskRevealZoomIdx ?? zoomIdx;
  const panMs = cameraTransitionMs ?? sceneTransitionMs;
  const panEase = "cubic-bezier(0.22, 1, 0.36, 1)";
  const comicPanTransition =
    mode === "read" && !isPageChanging && panMs > 0
      ? `left ${panMs}ms ${panEase}, top ${panMs}ms ${panEase}, width ${panMs}ms ${panEase}, height ${panMs}ms ${panEase}`
      : "none";

  const renderReadSpoilerMasks = () => {
    if (mode !== "read" || zoomedOut || !imgSize || imgWidth <= 0 || imgHeight <= 0) return null;

    const rawActiveMasks: {
      key: string;
      x: number;
      y: number;
      w: number;
      h: number;
      pIdx: number;
      rIdx: number;
      fadeOut?: number;
      fadeOutType?: SceneFadeType;
    }[] = [];

    currentPanels.forEach((panel: PanelStop, pIdx: number) => {
      const rects = panel.zoomRects || (panel.zoomRect ? [panel.zoomRect] : []);
      rects.forEach((zoom: any, rIdx: number) => {
        let shouldMask = false;
        if (pIdx > revealPanel) {
          shouldMask = panel.hideUntilReached !== false;
        } else if (pIdx === revealPanel) {
          shouldMask = rIdx > revealZoom && panel.hideUntilReached !== false;
        }
        if (shouldMask) {
          rawActiveMasks.push({
            key: `spoiler-mask-${pIdx}-${rIdx}`,
            x: zoom.x ?? 0,
            y: zoom.y ?? 0,
            w: zoom.w ?? 100,
            h: zoom.h ?? 25,
            fadeOut: zoom.fadeOut,
            fadeOutType: zoom.fadeOutType,
            pIdx,
            rIdx,
          });
        }
      });
    });

    if (rawActiveMasks.length === 0) return null;

    const sortedMasks = [...rawActiveMasks].sort((a, b) => a.y - b.y);
    const processedMasks = sortedMasks.map((mask, idx) => {
      let { x, y, w, h } = mask;
      const nextMask = sortedMasks[idx + 1];
      if (nextMask) {
        const maskBottom = y + h;
        const nextTop = nextMask.y;
        if (nextTop > maskBottom && nextTop - maskBottom <= 15) {
          h = nextTop - y + 0.5;
        }
      } else if (y + h >= 75) {
        h = Math.max(h, 100 - y);
      }
      return { ...mask, x, y, w, h };
    });

    return (
      <AnimatePresence>
        {processedMasks.map((zoom) => (
          <motion.div
            key={zoom.key}
            initial={{ opacity: 1, scale: 1, scaleX: 1, scaleY: 1 }}
            animate={{ opacity: 1, scale: 1, scaleX: 1, scaleY: 1 }}
            exit={sceneFadeExit(zoom.fadeOutType, zoom.fadeOut ?? 0)}
            transition={{
              duration: sceneFadeDurationMs(zoom.fadeOutType, zoom.fadeOut ?? 0) / 1000,
              ease: "easeOut",
            }}
            className="absolute brand-grain select-none overflow-hidden"
            style={{
              left: `calc(${zoom.x}% - 2px)`,
              top: `calc(${zoom.y}% - 2px)`,
              width: `calc(${zoom.w}% + 4px)`,
              height: `calc(${zoom.h}% + 4px)`,
              zIndex: 20,
              transformOrigin: sceneFadeOrigin(zoom.fadeOutType),
            }}
          />
        ))}
      </AnimatePresence>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={mode === "read" ? handleMouseDown : undefined}
      onMouseMove={mode === "read" ? handleMouseMove : undefined}
      onMouseUp={mode === "read" ? handleMouseUp : undefined}
      onMouseLeave={mode === "read" ? handleMouseUp : undefined}
      onTouchStart={mode === "read" ? handleTouchStart : undefined}
      onTouchMove={mode === "read" ? handleTouchMove : undefined}
      onTouchEnd={mode === "read" ? handleTouchEnd : undefined}
      onWheel={mode === "read" ? handleWheel : undefined}
      onDoubleClick={mode === "read" ? handleDoubleClick : undefined}
      onClick={mode === "read" ? handleReaderTap : undefined}
      className={`relative flex-1 h-full overflow-hidden select-none ${
        mode === "edit" ? "bg-zinc-900 border-r-3 border-[#0a0a0f]" : "brand-grain"
      } ${
        mode === "read"
          ? isPanning
            ? "cursor-grabbing animate-none"
            : zoomScale > 1
            ? "cursor-grab"
            : "cursor-pointer"
          : ""
      }`}
    >
      {/* Zoom & Pan Wrapper */}
      <div
        style={
          mode === "read"
            ? {
                position: "absolute",
                inset: 0,
                transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)",
                willChange: "transform",
              }
            : undefined
        }
      >
        {/* Comic page frame: image + spoiler masks share the same pan/zoom transform */}
        {imgSize && (
          <div
            style={{
              position: "absolute",
              left: imgLeft,
              top: imgTop,
              width: imgWidth,
              height: imgHeight,
              transition: comicPanTransition,
            }}
          >
            <img
              ref={imgRef}
              key={pages[pageIdx]}
              src={getComicPageUrl(pages[pageIdx])}
              alt={`${chapter.title} — Página ${pageIdx + 1}`}
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "fill",
                display: "block",
                userSelect: "none",
                WebkitUserSelect: "none",
                maxWidth: "none",
                transition: "none",
                boxShadow:
                  mode === "read"
                    ? "0 15px 40px rgba(0, 0, 0, 0.8), 0 8px 16px rgba(0, 0, 0, 0.6)"
                    : "none",
              }}
            />
            {renderReadSpoilerMasks()}
          </div>
        )}

        {/* ── Grid Overlay (Editor Mode only) ── */}
        {mode === "edit" && showGrid && imgSize && imgWidth > 0 && imgHeight > 0 && (
          <div
            style={{
              position: "absolute",
              left: imgLeft - 0.2 * imgWidth,
              top: imgTop - 0.2 * imgHeight,
              width: imgWidth * 1.4,
              height: imgHeight * 1.4,
              pointerEvents: "none",
              zIndex: 10,
              backgroundImage: `
                linear-gradient(to right, rgba(239, 68, 68, 0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(239, 68, 68, 0.12) 1px, transparent 1px)
              `,
              backgroundSize: `${imgWidth * (gridSize / 100)}px ${imgHeight * (gridSize / 100)}px`,
              backgroundPosition: `${imgWidth * 0.2}px ${imgHeight * 0.2}px`,
            }}
          >
            {/* Dashed outer red boundary representing the 0% to 100% page area */}
            <div
              style={{
                position: "absolute",
                left: imgWidth * 0.2,
                top: imgHeight * 0.2,
                width: imgWidth,
                height: imgHeight,
                border: "2px dashed rgba(239, 68, 68, 0.4)",
                pointerEvents: "none",
              }}
            >
              {/* Vertical Center Line */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  backgroundColor: "rgba(239, 68, 68, 0.65)",
                  pointerEvents: "none",
                }}
              />
              {/* Horizontal Center Line */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: "2px",
                  backgroundColor: "rgba(239, 68, 68, 0.65)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        )}

        {/* Visual Focus/Zoom Crop overlay in Editor Mode */}
        {mode === "edit" && imgSize && imgWidth > 0 && imgHeight > 0 && (() => {
          return currentPanels.flatMap((panelStop, pIdx) => {
            const rects = panelStop.zoomRects || (panelStop.zoomRect ? [panelStop.zoomRect] : []);
            const isActivePanel = pIdx === activePanelIdx;

            return rects.map((zoom: any, rIdx: number) => {
              const maskLeft = imgLeft + (zoom.x / 100) * imgWidth;
              const maskTop = imgTop + (zoom.y / 100) * imgHeight;
              const maskWidth = (zoom.w / 100) * imgWidth;
              const maskHeight = (zoom.h / 100) * imgHeight;
              
              return (
                <motion.div
                  key={`edit-zoom-overlay-${pIdx}-${rIdx}-${zoom.x}-${zoom.y}`}
                  drag={activeLayer === "mascaras" && isActivePanel}
                  dragMomentum={false}
                  dragElastic={0}
                  onDragEnd={(_, info) => handlePanelRectDragEnd?.(info, pIdx, rIdx)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePanelIdx?.(pIdx);
                  }}
                  className={`absolute transition-opacity duration-300 ${
                    activeLayer !== "mascaras"
                      ? "opacity-20 pointer-events-none"
                      : isActivePanel
                      ? "opacity-100 pointer-events-auto cursor-move"
                      : "opacity-60 hover:opacity-90 pointer-events-auto cursor-pointer"
                  }`}
                  style={{
                    left: maskLeft,
                    top: maskTop,
                    width: maskWidth,
                    height: maskHeight,
                    border: rIdx === 0 
                      ? (isActivePanel ? "3px dashed #10b981" : "2px dashed rgba(16, 185, 129, 0.4)")
                      : (isActivePanel ? "2.5px dashed #3b82f6" : "2px dashed rgba(59, 130, 246, 0.4)"),
                    boxShadow: (rIdx === 0 && isActivePanel) ? "0 0 0 9999px rgba(0, 0, 0, 0.15)" : "none",
                    backgroundColor: isActivePanel ? "rgba(255, 255, 255, 0)" : "rgba(255, 255, 255, 0.05)",
                    zIndex: isActivePanel ? 40 - rIdx : 15 - rIdx,
                  }}
                  whileHover={!isActivePanel ? { backgroundColor: "rgba(255, 255, 255, 0.15)" } : undefined}
                >
                  <div className={`absolute top-1 left-1 font-mono text-[9px] px-1.5 py-0.5 rounded shadow ${isActivePanel ? 'bg-zinc-900/90 text-white' : 'bg-zinc-900/50 text-zinc-300'} select-none pointer-events-none`}>
                    {rIdx === 0 ? `🎯 V${pIdx + 1}` : `🤫 Máscara ${rIdx + 1}`}
                  </div>

                  {isActivePanel && (
                    <>
                      {/* Edge Resizers */}
                      <div
                        className="absolute top-[-3px] left-[3px] right-[3px] h-[6px] cursor-ns-resize z-50 hover:bg-emerald-400/50 transition-colors"
                        onPointerDown={(e) => handlePanelRectResizeStart?.(e, "t", pIdx, rIdx)}
                      />
                      <div
                        className="absolute bottom-[-3px] left-[3px] right-[3px] h-[6px] cursor-ns-resize z-50 hover:bg-emerald-400/50 transition-colors"
                        onPointerDown={(e) => handlePanelRectResizeStart?.(e, "b", pIdx, rIdx)}
                      />
                      <div
                        className="absolute left-[-3px] top-[3px] bottom-[3px] w-[6px] cursor-ew-resize z-50 hover:bg-emerald-400/50 transition-colors"
                        onPointerDown={(e) => handlePanelRectResizeStart?.(e, "l", pIdx, rIdx)}
                      />
                      <div
                        className="absolute right-[-3px] top-[3px] bottom-[3px] w-[6px] cursor-ew-resize z-50 hover:bg-emerald-400/50 transition-colors"
                        onPointerDown={(e) => handlePanelRectResizeStart?.(e, "r", pIdx, rIdx)}
                      />

                      {/* Corner Resizers */}
                      <div
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-sm cursor-nwse-resize z-50 shadow-sm"
                        onPointerDown={(e) => handlePanelRectResizeStart?.(e, "tl", pIdx, rIdx)}
                      />
                      <div
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-sm cursor-nesw-resize z-50 shadow-sm"
                        onPointerDown={(e) => handlePanelRectResizeStart?.(e, "tr", pIdx, rIdx)}
                      />
                      <div
                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-sm cursor-nesw-resize z-50 shadow-sm"
                        onPointerDown={(e) => handlePanelRectResizeStart?.(e, "bl", pIdx, rIdx)}
                      />
                      <div
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-sm cursor-nwse-resize z-50 shadow-sm"
                        onPointerDown={(e) => handlePanelRectResizeStart?.(e, "br", pIdx, rIdx)}
                      />
                    </>
                  )}
                </motion.div>
              );
            });
          });
        })()}

        {renderedDialogues}

        {/* ── FocusY Indicator line in Editor Mode ── */}
        {mode === "edit" && currentPanels.map((panel, pIdx) => {
          const isActivePanel = pIdx === activePanelIdx;
          const isParadasLayer = activeLayer === "paradas";
          return (
            <motion.div
              key={`focusy-${pIdx}-${panel.focusY}`}
              drag={isParadasLayer && isActivePanel ? "y" : false}
              dragMomentum={false}
              dragElastic={0}
              onDragEnd={(_, info) => handleFocusYDragEnd?.(info, pIdx)}
              className={`absolute left-0 right-0 h-0.5 border-t-2 border-dashed z-20 transition-opacity duration-300 ${
                !isParadasLayer
                  ? "border-red-400/20 opacity-25 pointer-events-none"
                  : isActivePanel
                  ? "border-red-400 opacity-100 cursor-row-resize pointer-events-auto"
                  : "border-red-400/60 opacity-60 hover:opacity-100 pointer-events-auto cursor-pointer"
              }`}
              style={{
                top: imgTop + (panel.focusY ?? 0.5) * imgHeight,
                y: 0,
              }}
            >
              <div
                className={`absolute right-4 -top-6 text-[#0a0a0f] font-mono text-xs px-2 py-0.5 rounded flex items-center gap-2 select-none shadow transition-colors ${
                  !isParadasLayer
                    ? "bg-red-400/30 text-white/50 pointer-events-none"
                    : isActivePanel
                    ? "bg-red-400 cursor-pointer pointer-events-auto"
                    : "bg-red-400/60 hover:bg-red-400/90 cursor-pointer pointer-events-auto"
                }`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setActivePanelIdx?.(pIdx);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePanelIdx?.(pIdx);
                }}
              >
                <span>Parada {pIdx + 1}: focusY {panel.focusY ?? 0.5}</span>
                {isActivePanel && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddBubble(pIdx);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-700 active:scale-95 transition-all"
                  >
                    + Globo
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Zoom & Pan Controls in Reader Mode */}
      {mode === "read" && (
        <ReaderZoomControls
          zoomScale={zoomScale}
          setZoomScale={setZoomScale}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
        />
      )}

      {mode === "read" && zoomedOut && !showAllDialogues && (
        <PageEndGesture
          isFirst={pageIdx === 0}
          isLast={isLastPage}
          onPrev={() => resetPage(pageIdx - 1)}
          onReplay={() => resetPage(pageIdx)}
          onNext={() => resetPage(isLastPage ? 0 : pageIdx + 1)}
        />
      )}

      {mode === "edit" && (
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddBubble(activePanelIdx);
            }}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-[var(--font-bangers)] text-3xl flex items-center justify-center border-3 border-[#0a0a0f] shadow-[3px_3px_0_#0a0a0f] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#0a0a0f] transition-all cursor-pointer"
            title="Añadir globo a la viñeta seleccionada"
          >
            +
          </button>
          <button
            type="button"
            disabled={activeBubbleIdx === null}
            onClick={(e) => {
              e.stopPropagation();
              if (activeBubbleIdx !== null && handleDuplicateBubble) {
                handleDuplicateBubble(activePanelIdx, activeBubbleIdx);
              }
            }}
            className={`w-12 h-12 rounded-full text-xl flex items-center justify-center border-3 border-[#0a0a0f] transition-all ${
              activeBubbleIdx !== null
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-[3px_3px_0_#0a0a0f] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#0a0a0f] cursor-pointer"
                : "bg-zinc-600 text-zinc-400 border-zinc-700 cursor-not-allowed opacity-50 shadow-none"
            }`}
            title="Duplicar globo seleccionado"
          >
            📋
          </button>
          <button
            type="button"
            disabled={activeBubbleIdx === null}
            onClick={(e) => {
              e.stopPropagation();
              if (activeBubbleIdx !== null) {
                handleRemoveBubble(activePanelIdx, activeBubbleIdx);
              }
            }}
            className={`w-12 h-12 rounded-full font-[var(--font-bangers)] text-3xl flex items-center justify-center border-3 border-[#0a0a0f] transition-all ${
              activeBubbleIdx !== null
                ? "bg-red-500 hover:bg-red-600 text-white shadow-[3px_3px_0_#0a0a0f] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#0a0a0f] cursor-pointer"
                : "bg-zinc-600 text-zinc-400 border-zinc-700 cursor-not-allowed opacity-50 shadow-none"
            }`}
            title="Eliminar globo seleccionado"
          >
            −
          </button>
          <button
            type="button"
            disabled={undoStack.length === 0}
            onClick={(e) => {
              e.stopPropagation();
              handleUndo();
            }}
            className={`w-12 h-12 rounded-full font-[var(--font-bangers)] text-3xl flex items-center justify-center border-3 border-[#0a0a0f] transition-all ${
              undoStack.length > 0
                ? "bg-blue-500 hover:bg-blue-600 text-white shadow-[3px_3px_0_#0a0a0f] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#0a0a0f] cursor-pointer"
                : "bg-zinc-600 text-zinc-400 border-zinc-700 cursor-not-allowed opacity-50 shadow-none"
            }`}
            title="Deshacer cambio (Ctrl+Z)"
          >
            ↶
          </button>
        </div>
      )}

      {mode === "read" && stopCover?.show && (
        <SceneFadeLayer
          key={`stop-cover-${stopCover.direction}-${stopCover.type}`}
          show
          type={stopCover.type}
          durationMs={stopCover.durationMs}
          direction={stopCover.direction}
          zIndex={90}
        />
      )}

      {/* Page Preload Overlay Mask — 1A: animated entrance + exit */}
      <AnimatePresence>
        {isPageChanging && (
          <motion.div
            key="page-preload-overlay"
            initial={{ opacity: 1, scale: 1, scaleX: 1, scaleY: 1 }}
            animate={{ opacity: 1, scale: 1, scaleX: 1, scaleY: 1 }}
            exit={sceneFadeExit(pageFadeInType, pageFadeInMs)}
            transition={{ duration: sceneFadeDurationMs(pageFadeInType, pageFadeInMs) / 1000, ease: "easeInOut" }}
            className="absolute inset-0 brand-grain z-[100] flex flex-col items-center justify-center pointer-events-auto cursor-default"
            style={{ transformOrigin: sceneFadeOrigin(pageFadeInType) }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 border-4 border-[#e8185a] border-t-transparent rounded-full animate-spin" />
              <span className="font-[var(--font-bangers)] text-[#e8185a] text-lg tracking-widest">
                CARGANDO PÁGINA...
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

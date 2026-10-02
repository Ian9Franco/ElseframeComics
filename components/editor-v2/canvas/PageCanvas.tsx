"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PanelStop, ZoomRect } from "@/components/reader/audioPlayer";
import { getComicPageUrl } from "@/components/reader/readerUtils";
import { BubbleNode } from "./BubbleNode";
import { SmartGuides, snapWithGuides } from "./SmartGuides";
import { StopRegionFocusHandle } from "./StopRegion";
import type { EditorV2Tool, Selection } from "../types";
import type { BubbleStylePreset } from "../types";

type StoreApi = {
  selection: Selection;
  setSelection: (s: Selection) => void;
  activeTool: EditorV2Tool;
  pendingBubbleStyle: BubbleStylePreset;
  beginGesture: () => void;
  addMaskToPanel: (panelIdx: number, rect: { x: number; y: number; w: number; h: number }) => void;
  addBubble: (panelIdx: number, pos: { posX: number; posY: number }, style?: BubbleStylePreset) => void;
  updateBubble: (pIdx: number, bIdx: number, fields: Partial<import("@/components/reader/DialogueBubble").DialogueLine>) => void;
  updateBubbleLive: (pIdx: number, bIdx: number, fields: Partial<import("@/components/reader/DialogueBubble").DialogueLine>) => void;
  updatePanel: (pIdx: number, u: Partial<PanelStop>) => void;
  updatePanelLive: (pIdx: number, u: Partial<PanelStop>) => void;
  updateMaskLive: (pIdx: number, rIdx: number, rect: { x: number; y: number; w: number; h: number }) => void;
  findPanelForPoint: (x: number, y: number) => number;
};

export function PageCanvas({
  pageUrl,
  panels,
  activePanelIdx,
  store,
  scale,
  pan,
  spaceHeld,
  onPanChange,
  onWheelZoom,
  dragBubbleStyle,
  onDropBubbleStyle,
  guides,
  setGuides,
}: {
  pageUrl: string;
  panels: PanelStop[];
  activePanelIdx: number;
  store: StoreApi;
  scale: number;
  pan: { x: number; y: number };
  spaceHeld: boolean;
  onPanChange: (p: { x: number; y: number }) => void;
  onWheelZoom: (delta: number) => void;
  dragBubbleStyle: BubbleStylePreset | null;
  onDropBubbleStyle: () => void;
  guides: { axis: "x" | "y"; value: number }[];
  setGuides: (g: { axis: "x" | "y"; value: number }[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [drawRect, setDrawRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const stopDrag = useRef<number | null>(null);
  const maskDrag = useRef<{
    pIdx: number;
    rIdx: number;
    mode: "move" | "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    orig: ZoomRect;
  } | null>(null);
  const gestureStarted = useRef(false);
  const [editingBubble, setEditingBubble] = useState<{ pIdx: number; bIdx: number } | null>(null);
  const tool = spaceHeld ? "hand" : store.activeTool;

  useEffect(() => {
    if (tool !== "bubble") setEditingBubble(null);
  }, [tool]);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = getComicPageUrl(pageUrl);
  }, [pageUrl]);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const layout = useMemo(() => {
    if (!imgSize || containerSize.w <= 0) return null;
    const fit = Math.min((containerSize.w * 0.92) / imgSize.w, (containerSize.h * 0.88) / imgSize.h);
    const imgWidth = imgSize.w * fit;
    const imgHeight = imgSize.h * fit;
    const imgLeft = (containerSize.w - imgWidth) / 2;
    const imgTop = (containerSize.h - imgHeight) / 2;
    return { imgWidth, imgHeight, imgLeft, imgTop };
  }, [imgSize, containerSize]);

  const clientToPercent = (clientX: number, clientY: number) => {
    if (!containerRef.current || !layout) return { posX: 50, posY: 50 };
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + pan.x;
    const cy = rect.top + pan.y;
    const x = (clientX - cx - layout.imgLeft * scale) / scale;
    const y = (clientY - cy - layout.imgTop * scale) / scale;
    return {
      posX: (x / layout.imgWidth) * 100,
      posY: (y / layout.imgHeight) * 100,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (tool === "hand") {
      panRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
      return;
    }
    const { posX, posY } = clientToPercent(e.clientX, e.clientY);
    if (tool === "mask") {
      store.beginGesture();
      gestureStarted.current = true;
      setDrawRect({ x1: posX, y1: posY, x2: posX, y2: posY });
      return;
    }
    if (tool === "stops") {
      const pIdx =
        store.selection.kind === "stop" ? store.selection.panelIdx : Math.max(0, activePanelIdx);
      if (panels[pIdx]) {
        store.beginGesture();
        store.setSelection({ kind: "stop", panelIdx: pIdx });
        stopDrag.current = pIdx;
        store.updatePanelLive(pIdx, { focusY: Math.max(0, Math.min(1, posY / 100)) });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (panRef.current) {
      onPanChange({
        x: panRef.current.ox + (e.clientX - panRef.current.sx),
        y: panRef.current.oy + (e.clientY - panRef.current.sy),
      });
      return;
    }
    if (stopDrag.current !== null) {
      const { posY } = clientToPercent(e.clientX, e.clientY);
      store.updatePanelLive(stopDrag.current, { focusY: Math.max(0, Math.min(1, posY / 100)) });
      return;
    }
    if (maskDrag.current && layout) {
      const d = maskDrag.current;
      const dx = ((e.clientX - d.startX) / (layout.imgWidth * scale)) * 100;
      const dy = ((e.clientY - d.startY) / (layout.imgHeight * scale)) * 100;
      let { x, y, w, h } = d.orig;
      if (d.mode === "move") {
        x = Math.max(0, Math.min(100 - w, x + dx));
        y = Math.max(0, Math.min(100 - h, y + dy));
      } else {
        if (d.mode.includes("e")) w = Math.max(4, w + dx);
        if (d.mode.includes("s")) h = Math.max(4, h + dy);
        if (d.mode.includes("w")) {
          const nx = x + dx;
          w = Math.max(4, w - dx);
          x = nx;
        }
        if (d.mode.includes("n")) {
          const ny = y + dy;
          h = Math.max(4, h - dy);
          y = ny;
        }
      }
      store.updateMaskLive(d.pIdx, d.rIdx, { x, y, w, h });
      return;
    }
    const { posX, posY } = clientToPercent(e.clientX, e.clientY);
    if (drawRect) setDrawRect({ ...drawRect, x2: posX, y2: posY });
  };

  const handlePointerUp = () => {
    panRef.current = null;
    maskDrag.current = null;
    stopDrag.current = null;
    gestureStarted.current = false;
    if (drawRect) {
      const x = Math.min(drawRect.x1, drawRect.x2);
      const y = Math.min(drawRect.y1, drawRect.y2);
      const w = Math.abs(drawRect.x2 - drawRect.x1);
      const h = Math.abs(drawRect.y2 - drawRect.y1);
      if (w > 3 && h > 3) {
        store.addMaskToPanel(activePanelIdx, { x, y, w, h });
      }
      setDrawRect(null);
      gestureStarted.current = false;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (tool !== "bubble") return;
    const { posX, posY } = clientToPercent(e.clientX, e.clientY);
    const pIdx = store.findPanelForPoint(posX, posY);
    store.addBubble(pIdx >= 0 ? pIdx : 0, { posX, posY }, store.pendingBubbleStyle);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (dragBubbleStyle && tool === "bubble") e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragBubbleStyle || tool !== "bubble") return;
    const { posX, posY } = clientToPercent(e.clientX, e.clientY);
    const pIdx = store.findPanelForPoint(posX, posY);
    store.addBubble(pIdx >= 0 ? pIdx : 0, { posX, posY }, dragBubbleStyle);
    onDropBubbleStyle();
  };

  if (!layout) {
    return <div ref={containerRef} className="flex-1 bg-[#0a0a0f] flex items-center justify-center text-zinc-500">Cargando página…</div>;
  }

  const { imgWidth, imgHeight, imgLeft, imgTop } = layout;
  const canMoveStops = tool === "stops" || tool === "hand";
  const canMoveMasks = tool === "mask" || tool === "hand";
  const canMoveBubbles = tool === "bubble" || tool === "hand";

  const isSelectedBubble = (pIdx: number, bIdx: number) => {
    const s = store.selection;
    if (s.kind === "bubble") return s.panelIdx === pIdx && s.bubbleIdx === bIdx;
    if (s.kind === "bubbles") return s.items.some((i) => i.panelIdx === pIdx && i.bubbleIdx === bIdx);
    return false;
  };

  const cursor =
    spaceHeld || tool === "hand" ? "grab" : tool === "mask" ? "crosshair" : tool === "stops" ? "ns-resize" : "default";

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-[#0a0a0f] touch-none"
      style={{ cursor }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onWheel={(e) => {
        e.preventDefault();
        onWheelZoom(e.deltaY > 0 ? -0.08 : 0.08);
      }}
    >
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          left: imgLeft,
          top: imgTop,
          width: imgWidth,
          height: imgHeight,
        }}
      >
        <img src={getComicPageUrl(pageUrl)} alt="" className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        {panels.map((panel, pIdx) => {
          const rects = panel.zoomRects || (panel.zoomRect ? [panel.zoomRect] : []);
          return rects.map((r, rIdx) => {
            const selected =
              store.selection.kind === "mask" && store.selection.panelIdx === pIdx && store.selection.rectIdx === rIdx;
            const left = imgLeft + (r.x / 100) * imgWidth * scale;
            const top = imgTop + (r.y / 100) * imgHeight * scale;
            const width = (r.w / 100) * imgWidth * scale;
            const height = (r.h / 100) * imgHeight * scale;
            return (
              <div
                key={`mask-${pIdx}-${rIdx}`}
                className={`absolute border-2 ${canMoveMasks ? "pointer-events-auto" : "pointer-events-none"} ${
                  selected
                    ? "border-cyan-300 bg-cyan-300/15 cursor-move"
                    : activePanelIdx === pIdx
                      ? "border-[#e8185a]/80 bg-[#e8185a]/5 cursor-move"
                      : "border-white/20 bg-white/5 cursor-move"
                } ${canMoveMasks ? "opacity-100" : "opacity-35"}`}
                style={{ left, top, width, height }}
                onPointerDown={(e) => {
                  if (!canMoveMasks) return;
                  e.stopPropagation();
                  store.setSelection({ kind: "mask", panelIdx: pIdx, rectIdx: rIdx });
                  store.beginGesture();
                  maskDrag.current = {
                    pIdx,
                    rIdx,
                    mode: "move",
                    startX: e.clientX,
                    startY: e.clientY,
                    orig: { ...r },
                  };
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                }}
              >
                {selected && canMoveMasks &&
                  (["nw", "ne", "sw", "se"] as const).map((handle) => (
                    <div
                      key={handle}
                      className="absolute w-3 h-3 bg-cyan-300 border border-black rounded-sm z-10"
                      style={{
                        left: handle.includes("w") ? -6 : undefined,
                        right: handle.includes("e") ? -6 : undefined,
                        top: handle.includes("n") ? -6 : undefined,
                        bottom: handle.includes("s") ? -6 : undefined,
                        cursor: `${handle}-resize`,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        store.beginGesture();
                        maskDrag.current = {
                          pIdx,
                          rIdx,
                          mode: handle,
                          startX: e.clientX,
                          startY: e.clientY,
                          orig: { ...r },
                        };
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                    />
                  ))}
              </div>
            );
          });
        })}

        {panels.map((panel, pIdx) =>
          canMoveStops ? (
            <StopRegionFocusHandle
              key={`focus-handle-${pIdx}`}
              focusY={panel.focusY ?? 0.5}
              imgLeft={imgLeft}
              imgTop={imgTop}
              imgWidth={imgWidth}
              imgHeight={imgHeight}
              scale={scale}
              panY={pan.y}
              label={`Parada ${pIdx + 1}`}
              selected={store.selection.kind === "stop" && store.selection.panelIdx === pIdx}
              onBegin={() => {
                store.beginGesture();
                store.setSelection({ kind: "stop", panelIdx: pIdx });
              }}
              onChange={(fy) => store.updatePanelLive(pIdx, { focusY: fy })}
            />
          ) : (
            <div
              key={`focus-${pIdx}`}
              className="absolute w-full h-px bg-cyan-400/25 pointer-events-none"
              style={{
                top: pan.y + imgTop + (panel.focusY ?? 0.5) * imgHeight * scale,
                left: imgLeft,
                width: imgWidth * scale,
              }}
            />
          )
        )}

        {drawRect && (
          <div
            className="absolute border-2 border-dashed border-[#e8185a] bg-[#e8185a]/10 pointer-events-none"
            style={{
              left: imgLeft + (Math.min(drawRect.x1, drawRect.x2) / 100) * imgWidth * scale,
              top: imgTop + (Math.min(drawRect.y1, drawRect.y2) / 100) * imgHeight * scale,
              width: (Math.abs(drawRect.x2 - drawRect.x1) / 100) * imgWidth * scale,
              height: (Math.abs(drawRect.y2 - drawRect.y1) / 100) * imgHeight * scale,
            }}
          />
        )}

        <SmartGuides guides={guides} imgLeft={imgLeft} imgTop={imgTop} imgWidth={imgWidth * scale} imgHeight={imgHeight * scale} />
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: `${imgLeft}px ${imgTop}px`,
          opacity: canMoveBubbles ? 1 : 0.35,
        }}
      >
        {panels.flatMap((panel, pIdx) =>
          (panel.dialogue || []).map((line, bIdx) => {
            const others = (panel.dialogue || [])
              .filter((_, i) => i !== bIdx)
              .map((l) => ({ posX: l.posX ?? 50, posY: l.posY ?? 50 }));
            return (
              <BubbleNode
                key={`${pIdx}-${bIdx}`}
                line={line}
                panel={panel}
                pIdx={pIdx}
                bIdx={bIdx}
                isActive={activePanelIdx === pIdx}
                isSelected={isSelectedBubble(pIdx, bIdx) && (tool === "bubble" || tool === "hand")}
                imgLeft={imgLeft}
                imgTop={imgTop}
                imgWidth={imgWidth}
                imgHeight={imgHeight}
                scale={scale}
                interactive={canMoveBubbles}
                editingText={
                  tool === "bubble" && editingBubble?.pIdx === pIdx && editingBubble?.bIdx === bIdx
                }
                onEditText={() => setEditingBubble({ pIdx, bIdx })}
                onSelect={() => {
                  store.setSelection({ kind: "bubble", panelIdx: pIdx, bubbleIdx: bIdx });
                  if (editingBubble && (editingBubble.pIdx !== pIdx || editingBubble.bIdx !== bIdx)) {
                    setEditingBubble(null);
                  }
                }}
                onMove={(px, py) => {
                  if (!gestureStarted.current) {
                    store.beginGesture();
                    gestureStarted.current = true;
                  }
                  const snapped = snapWithGuides(px, py, others);
                  setGuides(snapped.guides);
                  store.updateBubbleLive(pIdx, bIdx, { posX: snapped.posX, posY: snapped.posY });
                }}
                onTailMove={(tx, ty, linkTo) => {
                  store.updateBubble(pIdx, bIdx, {
                    tailX: tx,
                    tailY: ty,
                    linkedTo: linkTo,
                  });
                }}
                onTextChange={(text) => store.updateBubbleLive(pIdx, bIdx, { text })}
                onResizeWidth={(width) => store.updateBubble(pIdx, bIdx, { width })}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

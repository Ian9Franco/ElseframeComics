"use client";

import React, { useRef } from "react";
import type { DialogueLine } from "@/components/reader/DialogueBubble";
import { DialogueBubble, getBubbleStyles } from "@/components/reader/DialogueBubble";
import { buildTailPath, estimateBubbleSize, findTargetBubble } from "@/components/reader/readerUtils";
import type { PanelStop } from "@/components/reader/audioPlayer";

export function BubbleNode({
  line,
  panel,
  pIdx,
  bIdx,
  isActive,
  isSelected,
  imgLeft,
  imgTop,
  imgWidth,
  imgHeight,
  onSelect,
  onMove,
  onTailMove,
  onTextChange,
  editingText,
  onResizeWidth,
}: {
  line: DialogueLine;
  panel: PanelStop;
  pIdx: number;
  bIdx: number;
  isActive: boolean;
  isSelected: boolean;
  imgLeft: number;
  imgTop: number;
  imgWidth: number;
  imgHeight: number;
  onSelect: () => void;
  onMove: (posX: number, posY: number) => void;
  onTailMove: (tailX: number, tailY: number, linkTo?: number) => void;
  onTextChange: (text: string) => void;
  editingText: boolean;
  onResizeWidth: (width: number) => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const posX = line.posX ?? 50;
  const posY = line.posY ?? (panel.focusY ?? 0.5) * 100;
  const left = imgLeft + (posX / 100) * imgWidth;
  const top = imgTop + (posY / 100) * imgHeight;

  const targetX = line.tailX !== undefined ? imgLeft + (line.tailX / 100) * imgWidth : null;
  const targetY = line.tailY !== undefined ? imgTop + (line.tailY / 100) * imgHeight : null;

  let elasticTailNode = null;
  if (targetX !== null && targetY !== null && line.tail !== "none") {
    const { bgColor } = getBubbleStyles(line);
    const target = findTargetBubble(line.tailX!, line.tailY!, panel.dialogue || [], bIdx, imgWidth, imgHeight, imgLeft, imgTop);
    let finalTargetX = targetX - left;
    let finalTargetY = targetY - top;
    if (target) {
      const tLine = target.line;
      const tLeft = imgLeft + ((tLine.posX ?? 50) / 100) * imgWidth;
      const tTop = imgTop + ((tLine.posY ?? 50) / 100) * imgHeight;
      const bx = tLeft - left;
      const by = tTop - top;
      const dist = Math.sqrt(bx * bx + by * by);
      if (dist > 0.01) {
        const targetSize = estimateBubbleSize(tLine);
        const t = 1 / Math.sqrt((bx / targetSize.halfW) ** 2 + (by / targetSize.halfH) ** 2);
        finalTargetX = bx - bx * t + (bx / dist) * 10;
        finalTargetY = by - by * t + (by / dist) * 10;
      }
    }
    const d = buildTailPath(0, 0, finalTargetX, finalTargetY, line);
    if (d) {
      elasticTailNode = (
        <svg className="absolute pointer-events-none overflow-visible" style={{ left: "50%", top: "50%", zIndex: 0 }}>
          <path d={d} fill={bgColor} />
        </svg>
      );
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editingText) return;
    e.stopPropagation();
    onSelect();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: posX, origY: posY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = ((e.clientX - dragRef.current.startX) / imgWidth) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / imgHeight) * 100;
    onMove(
      Math.max(-20, Math.min(120, dragRef.current.origX + dx)),
      Math.max(-20, Math.min(120, dragRef.current.origY + dy))
    );
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <>
      <div
        className={`absolute ${isActive ? "z-[60]" : "z-[40]"}`}
        style={{ left, top, transform: "translate(-50%, -50%)", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className={`relative ${isSelected ? "outline-dashed outline-2 outline-[#e8185a] outline-offset-2" : ""}`}
        >
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold bg-black/70 text-white px-1.5 rounded whitespace-nowrap">
            P{pIdx + 1}·#{bIdx + 1}
          </span>
          <DialogueBubble
            line={line}
            index={0}
            elasticTailNode={elasticTailNode}
            instant
            textScale={1}
            inlineTextEdit={
              editingText
                ? { value: line.text, onChange: onTextChange, autoFocus: true }
                : undefined
            }
          />
          {isSelected && line.width !== undefined && (
            <div
              className="absolute top-1/2 -right-2 w-2 h-8 -translate-y-1/2 bg-[#e8185a] rounded cursor-ew-resize"
              onPointerDown={(e) => {
                e.stopPropagation();
                const startW = line.width ?? 120;
                const startX = e.clientX;
                const move = (ev: PointerEvent) => {
                  const dw = ev.clientX - startX;
                  onResizeWidth(Math.max(60, Math.min(900, startW + dw)));
                };
                const up = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }}
            />
          )}
        </div>
      </div>

      {isSelected && line.tail !== "none" && line.tailX !== undefined && line.tailY !== undefined && (
        <TailHandle
          imgLeft={imgLeft}
          imgTop={imgTop}
          imgWidth={imgWidth}
          imgHeight={imgHeight}
          tailX={line.tailX}
          tailY={line.tailY}
          onMove={(tx, ty, linkTo) => onTailMove(tx, ty, linkTo)}
        />
      )}
    </>
  );
}

function TailHandle({
  imgLeft,
  imgTop,
  imgWidth,
  imgHeight,
  tailX,
  tailY,
  onMove,
}: {
  imgLeft: number;
  imgTop: number;
  imgWidth: number;
  imgHeight: number;
  tailX: number;
  tailY: number;
  onMove: (tailX: number, tailY: number, linkTo?: number) => void;
}) {
  const ref = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const left = imgLeft + (tailX / 100) * imgWidth;
  const top = imgTop + (tailY / 100) * imgHeight;
  return (
    <div
      className="absolute z-[70] w-8 h-8 flex items-center justify-center cursor-crosshair"
      style={{ left, top, transform: "translate(-50%, -50%)", touchAction: "none" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        ref.current = { sx: e.clientX, sy: e.clientY, ox: tailX, oy: tailY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!ref.current) return;
        const dx = ((e.clientX - ref.current.sx) / imgWidth) * 100;
        const dy = ((e.clientY - ref.current.sy) / imgHeight) * 100;
        const tx = Math.max(-20, Math.min(120, ref.current.ox + dx));
        const ty = Math.max(-20, Math.min(120, ref.current.oy + dy));
        onMove(tx, ty);
      }}
      onPointerUp={() => {
        ref.current = null;
      }}
    >
      <div className="w-3.5 h-3.5 rounded-full bg-blue-400 border-2 border-white shadow-lg" />
    </div>
  );
}

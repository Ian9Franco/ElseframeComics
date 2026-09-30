"use client";

import React, { useRef } from "react";

export function StopRegionFocusHandle({
  focusY,
  imgLeft,
  imgTop,
  imgWidth,
  imgHeight,
  scale,
  panY,
  onChange,
  onBegin,
}: {
  focusY: number;
  imgLeft: number;
  imgTop: number;
  imgWidth: number;
  imgHeight: number;
  scale: number;
  panY: number;
  onChange: (focusY: number) => void;
  onBegin: () => void;
}) {
  const ref = useRef<{ sy: number; oy: number } | null>(null);
  const top = panY + imgTop + focusY * imgHeight * scale;

  return (
    <div
      className="absolute left-0 right-0 h-6 -mt-3 cursor-ns-resize z-[55] pointer-events-auto touch-none"
      style={{ top, marginLeft: imgLeft, width: imgWidth * scale }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onBegin();
        ref.current = { sy: e.clientY, oy: focusY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!ref.current) return;
        const dy = ((e.clientY - ref.current.sy) / (imgHeight * scale)) * 100;
        onChange(Math.max(0, Math.min(1, (ref.current.oy * 100 + dy) / 100)));
      }}
      onPointerUp={() => {
        ref.current = null;
      }}
    >
      <div className="h-0.5 w-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
    </div>
  );
}

"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

export function PageEndGesture({
  isFirst,
  isLast,
  onPrev,
  onReplay,
  onNext,
}: {
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onReplay: () => void;
  onNext: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"undecided" | "x" | "y">("undecided");
  const widthRef = useRef(1);

  const finish = (clientX: number) => {
    const w = widthRef.current || 1;
    const dx = clientX - startX.current;
    const threshold = Math.max(56, w * 0.18);
    if (axis.current === "x") {
      if (dx <= -threshold) onNext();
      else if (dx >= threshold && !isFirst) onPrev();
    } else if (axis.current !== "y") {
      const third = w / 3;
      if (clientX < third) {
        if (!isFirst) onPrev();
      } else if (clientX > third * 2) {
        onNext();
      } else {
        onReplay();
      }
    }
    axis.current = "undecided";
    setDragX(0);
    setDragging(false);
  };

  const iconBtn =
    "pointer-events-auto flex items-center justify-center rounded-full p-3 sm:p-4 text-white hover:bg-white/10 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.12, duration: 0.35 }}
      className="absolute inset-0 z-40 flex flex-col items-center justify-end select-none"
      style={{
        background: "linear-gradient(to top, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.55) 42%, transparent 78%)",
        paddingBottom: "max(5.25rem, calc(2rem + env(safe-area-inset-bottom)))",
        touchAction: "pan-y",
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        startX.current = e.clientX;
        startY.current = e.clientY;
        axis.current = "undecided";
        widthRef.current = e.currentTarget.clientWidth || 1;
        setDragging(true);
        setDragX(0);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const dx = e.clientX - startX.current;
        const dy = e.clientY - startY.current;
        if (axis.current === "undecided" && Math.hypot(dx, dy) > 10) {
          axis.current = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y";
        }
        if (axis.current === "x") {
          setDragX(dx);
        }
      }}
      onPointerUp={(e) => finish(e.clientX)}
      onPointerCancel={() => {
        axis.current = "undecided";
        setDragX(0);
        setDragging(false);
      }}
      onTouchMove={(e) => {
        if (axis.current === "x") e.preventDefault();
      }}
    >
      <div className="pointer-events-none w-full max-w-3xl px-8 flex items-end justify-between gap-4 mb-2">
        {!isFirst ? (
          <button
            type="button"
            className={iconBtn}
            title="Página anterior"
            aria-label="Página anterior"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
          >
            <motion.div
              animate={{
                x: Math.max(0, dragX) * 0.18,
                scale: 1 + Math.max(0, dragX) / 420,
              }}
            >
              <ChevronLeft className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg" strokeWidth={2.4} />
            </motion.div>
          </button>
        ) : (
          <div className="w-14 sm:w-16" aria-hidden />
        )}

        <button
          type="button"
          className={iconBtn}
          title="Volver a ver esta página"
          aria-label="Volver a ver esta página"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onReplay();
          }}
        >
          <motion.div
            animate={{ rotate: [0, -18, 18, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <RotateCcw className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-lg" strokeWidth={2.4} />
          </motion.div>
        </button>

        <button
          type="button"
          className={iconBtn}
          title={isLast ? "Inicio del capítulo" : "Siguiente página"}
          aria-label={isLast ? "Inicio del capítulo" : "Siguiente página"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          <motion.div
            animate={{
              x: Math.min(0, dragX) * 0.18,
              scale: 1 + Math.max(0, -dragX) / 420,
            }}
          >
            <ChevronRight className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg" strokeWidth={2.4} />
          </motion.div>
        </button>
      </div>
    </motion.div>
  );
}

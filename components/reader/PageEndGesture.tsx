"use client";

import React from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

export function PageEndGesture({ onReplay }: { onReplay: () => void }) {
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-stretch justify-end pointer-events-none select-none"
      aria-label="Controles de fin de página"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.35 }}
        className="w-full flex flex-col items-center gap-1"
        style={{
          background:
            "linear-gradient(to top, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0.45) 55%, transparent 100%)",
          paddingTop: "2.5rem",
          paddingBottom: "max(0.85rem, calc(0.35rem + env(safe-area-inset-bottom)))",
        }}
      >
        <button
          type="button"
          className="page-end-controls pointer-events-auto flex items-center justify-center rounded-full p-2 sm:p-2.5 text-white hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation"
          title="Volver a ver esta página"
          aria-label="Volver a ver esta página"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onReplay();
          }}
        >
          <motion.div
            animate={{ rotate: [0, -14, 14, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <RotateCcw className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-md" strokeWidth={2.25} />
          </motion.div>
        </button>
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/45">
          Arrastrá para pasar de página
        </span>
      </motion.div>
    </div>
  );
}

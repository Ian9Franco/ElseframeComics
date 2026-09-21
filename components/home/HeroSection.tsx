"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { RecommendedRead } from "@/components/home/sagaProgress";

const DEFAULT_RECOMMENDED: RecommendedRead = {
  href: "/#sagas",
  label: "Empezá a leer",
  caption: null,
  mode: "browse",
};

export function HeroSection({ recommended = DEFAULT_RECOMMENDED }: { recommended?: RecommendedRead }) {
  const [showLightbox, setShowLightbox] = useState(false);

  return (
    <div className="flex flex-col w-full">
      {/* ── Banner Section (Hero) ── */}
      <section
        className="relative flex flex-col overflow-hidden min-h-[60vh] md:min-h-[75vh] justify-end cursor-zoom-in"
        style={{ background: "#0A0A0A" }}
        onClick={() => setShowLightbox(true)}
      >
        {/* ── Full Banner Background Image ── */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <img 
            src="/Teamup.webp" 
            alt="Elseframe Teamup" 
            className="w-full h-full object-cover opacity-85 grayscale-[0.1] hero-banner-img"
          />
          {/* Soft dark overlay gradients so the background remains highly visible */}
          <div 
            className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent, #0A0A0A)"
            }}
          />
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{
              background: "linear-gradient(to right, rgba(10, 10, 15, 0.5) 30%, rgba(10, 10, 15, 0.1) 70%, rgba(10, 10, 15, 0.4) 100%)"
            }}
          />
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, transparent 30%, rgba(10, 10, 15, 0.6) 90%)"
            }}
          />
        </div>

        {/* ── Background overlays ── */}
        <div className="absolute inset-0 speed-lines opacity-10 pointer-events-none z-10" />
        
        {/* dot-grid accent top-right */}
        <div
          className="absolute right-0 top-0 w-80 h-80 pointer-events-none opacity-[0.04] z-10"
          style={{
            backgroundImage: "radial-gradient(circle, #880D16 1.5px, transparent 1.5px)",
            backgroundSize: "10px 10px",
          }}
        />

        {/* ── Value proposition + primary CTA ── */}
        <div
          className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12 pt-24 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Legibility scrim behind the copy; the art stays fully visible above it */}
          <div
            className="absolute inset-x-0 bottom-0 top-0 pointer-events-none -z-10"
            style={{ background: "linear-gradient(to top, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.7) 55%, transparent 100%)" }}
          />

          <div className="max-w-2xl flex flex-col items-start gap-4 sm:gap-5 text-left">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-[#D7263D]" />
              <span className="font-[var(--font-bangers)] text-[10px] sm:text-xs tracking-[0.3em] text-[#D7263D] uppercase border border-[#D7263D] px-2 py-0.5 bg-black/40">
                Elseframe Comics · Cómic indie
              </span>
            </div>

            <h1
              className="font-[var(--font-bangers)] text-4xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-wider text-white uppercase"
              style={{ textShadow: "4px 4px 0 #D7263D, 6px 6px 0 rgba(0,0,0,0.6)" }}
            >
              Historietas indie,
              <br />
              saga por saga.
            </h1>

            <p className="font-sans text-sm sm:text-base text-gray-200 leading-relaxed max-w-xl">
              Seguí a <strong className="text-white">los pibes</strong> por el Mativerso en sagas de cómic hechas en casa.
              Se lee gratis, capítulo a capítulo, desde el celu o la compu.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                href={recommended.href}
                className="font-[var(--font-bangers)] text-xl sm:text-2xl tracking-wider px-8 py-3.5 border-4 border-white bg-[#D7263D] hover:bg-[#ff3b51] text-white uppercase transition-all shadow-[5px_5px_0_#000] hover:shadow-[7px_7px_0_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:translate-x-0.5 active:shadow-[2px_2px_0_#000] flex items-center justify-center gap-3"
              >
                <img src="/boom-white.webp" alt="" className="w-6 h-6 object-contain" />
                {recommended.label} →
              </Link>

              <div className="flex items-center gap-4 sm:gap-5 pl-1">
                <Link
                  href="/#sagas"
                  className="font-[var(--font-bangers)] text-sm sm:text-base tracking-widest uppercase text-white/80 hover:text-white underline decoration-[#D7263D] decoration-2 underline-offset-4 transition-colors"
                >
                  Ver sagas
                </Link>
                <Link
                  href="/#pibes"
                  className="font-[var(--font-bangers)] text-sm sm:text-base tracking-widest uppercase text-white/80 hover:text-white underline decoration-[#D7263D] decoration-2 underline-offset-4 transition-colors"
                >
                  Conocé a los pibes
                </Link>
              </div>
            </div>

            {recommended.caption && (
              <p className="font-mono text-[10px] sm:text-[11px] text-gray-300 bg-black/50 border border-white/15 px-2.5 py-1 rounded inline-flex items-center gap-1.5 tracking-wide">
                <span className={recommended.mode === "continue" ? "text-[#f5e642]" : "text-[#D7263D]"}>
                  {recommended.mode === "continue" ? "▶ SEGUÍS EN:" : "▶ ARRANCÁS EN:"}
                </span>
                {recommended.caption}
              </p>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {showLightbox && (
          <BannerLightbox 
            src="/Teamup.webp" 
            alt="Elseframe Teamup" 
            onClose={() => setShowLightbox(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Interactive Zoomable/Panable Lightbox ──────────────────────────────────────── */
export function BannerLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 select-none"
    >
      <div 
        className="absolute inset-0 cursor-zoom-out" 
        onClick={onClose} 
      />

      <div className="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
        <motion.img
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: isZoomed ? 1.8 : 1.0, 
            opacity: 1,
            cursor: isZoomed ? 'grab' : 'zoom-in' 
          }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          src={src}
          alt={alt}
          drag={isZoomed}
          dragConstraints={{ left: -600, right: 600, top: -400, bottom: 400 }}
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
          className="max-h-[90vh] max-w-[90vw] object-contain pointer-events-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10"
        />
      </div>

      {/* Floating control badge */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/80 border border-white/20 px-4 py-2 rounded-full text-white text-xs sm:text-sm font-[var(--font-bangers)] tracking-wider">
        <span>{isZoomed ? "ARRASTRÁ PARA NAVEGAR" : "CLICK PARA HACER ZOOM"}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
          className="bg-[#D7263D] hover:bg-[#ff3b51] px-3 py-1 rounded text-white transition-colors"
        >
          {isZoomed ? "LUPA -" : "LUPA +"}
        </button>
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-[#D7263D] border-2 border-white text-white font-[var(--font-bangers)] text-xl shadow-lg z-20 hover:bg-[#ff3b51] transition-colors"
      >
        ✕
      </button>
    </motion.div>
  );
}



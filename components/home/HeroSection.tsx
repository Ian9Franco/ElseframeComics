"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { BookOpen, Users } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  const [showLightbox, setShowLightbox] = useState(false);

  const scrollToSagas = () => {
    document.getElementById("sagas")?.scrollIntoView({ behavior: "smooth" });
  };

  const primaryBtn =
    "font-[var(--font-bungee)] text-sm sm:text-base tracking-[0.12em] uppercase px-6 sm:px-8 py-3 sm:py-3.5 " +
    "bg-[#D7263D] text-white border-2 border-white " +
    "hover:bg-[#ff3b51] hover:border-white " +
    "transition-all shadow-[4px_4px_0_#000] " +
    "active:translate-y-0.5 active:translate-x-0.5 active:shadow-[2px_2px_0_#000] " +
    "flex items-center justify-center gap-2 cursor-pointer";

  const secondaryBtn =
    "font-[var(--font-bungee)] text-xs sm:text-sm tracking-[0.12em] uppercase px-5 py-2.5 " +
    "bg-transparent text-white/90 border-2 border-white/40 " +
    "hover:bg-white/10 hover:border-white/70 hover:text-white " +
    "transition-all shadow-[3px_3px_0_rgba(0,0,0,0.4)] " +
    "active:translate-y-0.5 active:translate-x-0.5 " +
    "flex items-center justify-center gap-2 cursor-pointer";

  return (
    <div className="flex flex-col w-full">
      <section
        className="relative flex flex-col overflow-hidden min-h-[70vh] md:min-h-[80vh] justify-end md:justify-center"
        style={{ background: "#0A0A0A" }}
      >
        {/* Background image — click to zoom */}
        <div
          className="absolute inset-0 z-0 cursor-zoom-in"
          onClick={() => setShowLightbox(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setShowLightbox(true)}
          aria-label="Ampliar imagen del banner"
        >
          <img
            src="/Teamup.webp"
            alt="Elseframe Teamup"
            className="w-full h-full object-cover opacity-85 grayscale-[0.1] hero-banner-img"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-48 md:h-64 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, transparent, #0A0A0A 85%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, rgba(10, 10, 15, 0.75) 0%, rgba(10, 10, 15, 0.35) 50%, rgba(10, 10, 15, 0.55) 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none md:hidden"
            style={{
              background: "linear-gradient(to top, rgba(10, 10, 15, 0.9) 0%, transparent 60%)",
            }}
          />
        </div>

        <div className="absolute inset-0 speed-lines opacity-10 pointer-events-none z-10" />

        <div
          className="absolute right-0 top-0 w-80 h-80 pointer-events-none opacity-[0.04] z-10"
          style={{
            backgroundImage: "radial-gradient(circle, #880D16 1.5px, transparent 1.5px)",
            backgroundSize: "10px 10px",
          }}
        />

        {/* Hero copy + CTAs */}
        <div className="relative z-20 px-5 sm:px-8 md:px-12 pb-10 md:pb-0 pt-24 md:pt-0 max-w-3xl pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-auto"
          >
            <span
              className="inline-block font-[var(--font-bangers)] text-[10px] sm:text-xs tracking-[0.3em] text-[#D7263D] uppercase border border-[#D7263D] px-2.5 py-0.5 mb-4 bg-black/50"
            >
              Cómic indie · Sagas conectadas
            </span>

            <h1
              className="font-[var(--font-bangers)] text-4xl sm:text-5xl md:text-6xl text-white tracking-widest leading-none mb-4"
              style={{ textShadow: "3px 3px 0 #D7263D, 5px 5px 0 #000" }}
            >
              ELSEFRAME COMICS
            </h1>

            <p className="font-sans text-sm sm:text-base text-gray-200 leading-relaxed max-w-xl mb-6 drop-shadow-md">
              Historias de superhéroes, viajes dimensionales y los pibes de siempre.
              Leé las sagas en orden y descubrí personajes, lore y giros que se van armando capítulo a capítulo.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <button type="button" onClick={scrollToSagas} className={primaryBtn}>
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                Empezá a leer
              </button>
              <Link href="/#pibes" className={secondaryBtn}>
                <Users className="w-4 h-4 shrink-0" />
                Conocé a los pibes
              </Link>
            </div>
          </motion.div>
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 select-none"
    >
      <div className="absolute inset-0 cursor-zoom-out" onClick={onClose} />

      <div className="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
        <motion.img
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: isZoomed ? 1.8 : 1.0,
            opacity: 1,
            cursor: isZoomed ? "grab" : "zoom-in",
          }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
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

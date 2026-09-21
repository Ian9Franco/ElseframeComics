"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getComicPageUrl } from "@/components/reader/readerUtils";
import { getSagaProgress, type ChapterHighlight, type SagaProgress } from "@/components/home/sagaProgress";

function getTextColor(hexColor: string) {
  if (!hexColor) return "white";
  const color = hexColor.replace("#", "");
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#001419" : "white";
}

/* ── Start / Next / Complete summary shown above an expanded chapter list ── */
function SagaProgressBanner({ progress, compact = false }: { progress: SagaProgress; compact?: boolean }) {
  const { startChapter, nextChapter, readCount, total, isComplete, hasProgress } = progress;
  if (total === 0) return null;

  const target = startChapter ?? nextChapter;
  const percent = Math.round((readCount / total) * 100);

  const mode: "start" | "next" | "complete" | "blocked" = !hasProgress
    ? "start"
    : isComplete
      ? "complete"
      : nextChapter
        ? "next"
        : "blocked";

  const accent = mode === "start" ? "#f5e642" : mode === "complete" ? "#16a34a" : "#D7263D";
  const accentText = mode === "start" ? "#001419" : "white";

  const eyebrow =
    mode === "start" ? "¿PRIMERA VEZ ACÁ?" :
    mode === "next" ? "TENÉS PROGRESO" :
    mode === "complete" ? "SAGA AL DÍA" :
    "TENÉS PROGRESO";

  const headline =
    mode === "start" ? "Empezá acá" :
    mode === "next" ? "Seguí por acá" :
    mode === "complete" ? "Leíste todo lo publicado" :
    "Nada nuevo por ahora";

  return (
    <div
      className={`relative overflow-hidden border-[3px] border-[#001419] bg-white shadow-[4px_4px_0_#001419] rounded-md ${compact ? "p-3" : "p-4 sm:p-5"} mb-5`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: accent }} />
      <div className={`flex flex-col ${compact ? "gap-3" : "sm:flex-row sm:items-center gap-4"} pl-2`}>
        <div className="flex-1 min-w-0">
          <p className="font-[var(--font-bangers)] text-[10px] tracking-[0.25em] uppercase" style={{ color: mode === "start" ? "#a08a00" : accent }}>
            {eyebrow}
          </p>
          <h5 className={`font-[var(--font-bangers)] ${compact ? "text-xl" : "text-2xl sm:text-3xl"} leading-none tracking-wider text-[#001419] mt-0.5`}>
            {headline}
          </h5>
          {target && (
            <p className="font-sans text-xs sm:text-sm text-gray-700 mt-1.5 truncate">
              Cap. {target.number}: <span className="font-semibold text-[#001419]">{target.title}</span>
            </p>
          )}
          {mode === "complete" && (
            <p className="font-sans text-xs sm:text-sm text-gray-700 mt-1.5">
              Cuando salga un episodio nuevo, va a aparecer acá.
            </p>
          )}

          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 max-w-[220px] bg-[#001419]/10 border border-[#001419]/20 overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width: `${percent}%`, background: accent }} />
            </div>
            <span className="font-mono text-[10px] text-gray-600 tracking-wide whitespace-nowrap">
              {readCount}/{total} leídos
            </span>
          </div>
        </div>

        {target && (
          <Link
            href={`/chapters/${target.id}`}
            className={`shrink-0 font-[var(--font-bangers)] ${compact ? "text-sm px-4 py-2" : "text-base sm:text-lg px-6 py-3"} tracking-wider border-[3px] border-[#001419] uppercase transition-all shadow-[3px_3px_0_#001419] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#001419] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#001419] flex items-center justify-center gap-2`}
            style={{ background: accent, color: accentText }}
          >
            {mode === "start" ? "Leer Cap. 1" : `Leer Cap. ${target.number}`} →
          </Link>
        )}
      </div>
    </div>
  );
}

function FeaturedMobileChapters({
  saga,
  colorPrimary,
  progress,
  onBack,
}: {
  saga: any;
  colorPrimary: string;
  progress: SagaProgress;
  onBack: () => void;
}) {
  const displayChapters = [...progress.publishedChapters].sort((a: any, b: any) => b.number - a.number);

  return (
    <div className="mobile-chapter-view hidden relative z-10 flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-[#001419]/20 pb-4">
        <div>
          <p className="font-[var(--font-bangers)] text-[10px] tracking-[0.22em] text-[#D7263D] uppercase">{saga.title}</p>
          <h4 className="font-[var(--font-bangers)] text-xl tracking-wider text-[#001419]">EPISODIOS</h4>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 font-[var(--font-bangers)] text-sm tracking-wider px-3 py-2 border-2 border-[#001419] bg-white text-[#001419] shadow-[2px_2px_0_#001419] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
        >
          ← VOLVER
        </button>
      </div>

      <SagaProgressBanner progress={progress} compact />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayChapters.map((chapter: any) => {
          return (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              sagaId={saga.id}
              sagaColor={colorPrimary}
              index={chapter.number - 1}
              isLocked={progress.isLocked(chapter)}
              highlight={progress.getHighlight(chapter)}
              unlockAfterTitle={progress.getPrevChapter(chapter)?.title}
              sagaCover={saga.cover}
              compact
            />
          );
        })}
        {/* Mobile special draft block */}
        {saga.chapters.some((c: any) => c.status === "published") && 
         saga.chapters.filter((c: any) => c.status !== "published").slice(0, 1).map((chapter: any) => (
          <div
            key={chapter.id}
            className="flex flex-col h-full overflow-hidden border-2 border-[#001419] bg-gradient-to-br from-[#002229] to-[#001217] shadow-[3px_3px_0_#D7263D] relative rounded p-3 justify-between min-h-[140px]"
          >
            <div className="relative z-10 flex flex-col justify-between h-full flex-1">
              <div>
                <span className="tag text-[8px] font-[var(--font-bangers)] tracking-widest px-1.5 py-0.5 border border-black bg-gradient-to-r from-[#ab1b2c] to-[#D7263D] text-white">
                  EN PRODUCCIÓN
                </span>
                <h3 className="font-[var(--font-bangers)] text-sm leading-tight uppercase tracking-wide text-white/80 mt-1">
                  PARTE {chapter.number}: {chapter.title}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-dashed border-[#D7263D]/20">
                <div className="w-4 h-4 rounded-full flex items-center justify-center bg-[#D7263D]/10 text-[#D7263D] border border-[#D7263D]/25">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="font-[var(--font-bangers)] text-[8px] tracking-wider text-[#D7263D] uppercase">
                  PRÓXIMAMENTE
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SagaBlock({ 
  saga, 
  index, 
  prevSaga,
  onCoverClick,
  isFeatured = false,
  isCollapsed = false,
  onToggleCollapse,
  isDrawerItem = false,
}: { 
  saga: any; 
  index: number; 
  prevSaga?: any;
  onCoverClick?: (coverUrl: string) => void;
  isFeatured?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isDrawerItem?: boolean;
}) {
  const isEven = index % 2 === 0;
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [unlockAll, setUnlockAll] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const read = localStorage.getItem("read-chapters");
      if (read) {
        setReadChapters(JSON.parse(read));
      }
    } catch (e) {
      console.error(e);
    }

    const checkUnlock = () => {
      setUnlockAll(localStorage.getItem("unlock-all") === "true");
    };
    checkUnlock();
    window.addEventListener("unlockAllChanged", checkUnlock);
    return () => {
      window.removeEventListener("unlockAllChanged", checkUnlock);
    };
  }, []);

  const isNuevo = saga.nuevo === true;
  const isProximamente = isDrawerItem || saga.proximamente === true || !saga.chapters.some((c: any) => c.status === "published");

  const progress = getSagaProgress(saga, readChapters, { isClient, unlockAll });

  const colorPrimary = "#D7263D";
  const colorSecondary = "#D7263D";

  const isLightBg = getTextColor(colorPrimary) === "#001419";
  const buttonIconSrc = isLightBg ? "/boom.webp" : "/boom-white.webp";

  // Proximamente siempre usa layout vertical con banda crimson, independientemente de isFeatured
  if (isProximamente) {
    return (
      <div 
        onClick={() => { if (isCollapsed && typeof window !== 'undefined' && window.innerWidth < 768) onToggleCollapse?.(); }}
        className={`reader-page-drop border-4 border-dashed border-[#D7263D]/80 relative overflow-hidden rounded-lg opacity-95 transition-all duration-300 flex flex-row items-stretch min-h-[350px] animate-fadeIn ${showChapters ? "z-50" : ""} ${
          isCollapsed 
            ? "w-12 sm:w-14 h-full min-h-[350px] md:w-full md:h-auto cursor-pointer md:cursor-default select-none md:select-text pl-0 md:pl-12 md:sm:pl-14"
            : "w-full pl-12 sm:pl-14"
        }`}
        style={{
          boxShadow: isCollapsed 
            ? "6px 6px 0 #000, 9px 9px 0 rgba(215, 38, 61, 0.15), 0 10px 20px rgba(0,0,0,0.5)" 
            : "10px 10px 0 #000, 14px 14px 0 rgba(215, 38, 61, 0.25), 0 20px 40px -10px rgba(215, 38, 61, 0.2)",
          background: "linear-gradient(135deg, #011c22 0%, #000c0f 100%)"
        }}
      >
        {/* Absolute Docked Left Banner for perfect full-height alignment */}
        <div 
          onClick={(e) => { 
            if (!isCollapsed && typeof window !== 'undefined' && window.innerWidth < 768) {
              e.stopPropagation();
              onToggleCollapse?.(); 
            }
          }}
          className={`absolute left-0 top-0 bottom-0 w-12 sm:w-14 bg-gradient-to-b from-[#ab1b2c] via-[#D7263D] to-[#ab1b2c] flex items-center justify-center shrink-0 select-none border-r-4 border-black z-20 ${isCollapsed ? "mobile-upcoming-banner" : ""} ${
            isCollapsed 
              ? "cursor-pointer" 
              : "cursor-pointer hover:from-[#D7263D] hover:to-[#ff3b51] transition-all"
          }`}
        >
          <span 
            className="font-[var(--font-bangers)] text-lg sm:text-xl text-white uppercase tracking-widest whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", display: "block", textShadow: "1px 1px 2px #000" }}
          >
            PRÓXIMAMENTE
          </span>
          {isCollapsed && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-black font-bold text-sm animate-pulse md:hidden">
              ◀
            </div>
          )}
        </div>

        {/* Premium Gold Halftone Dots for background texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07] z-0"
          style={{
            backgroundImage: "radial-gradient(circle, #D7263D 1.5px, transparent 1.5px)",
            backgroundSize: "12px 12px",
          }}
        />

        <div className={isCollapsed ? "hidden md:flex flex-1 p-6 sm:p-8 flex-col justify-between h-full relative z-10" : "flex-1 p-6 sm:p-8 flex flex-col justify-between h-full relative z-10"}>
          {/* Main content stack */}
          <div className="flex flex-col gap-6 items-center justify-between h-full w-full relative z-10">
            <div className="flex flex-col items-center text-center w-full">
              {saga.cover && (
                <div 
                  className="relative shrink-0 w-28 sm:w-40 aspect-[3/4] border-4 border-white overflow-hidden rounded bg-zinc-900 shadow-[4px_4px_0_#000,6px_6px_0_#D7263D] group cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCoverClick?.(getComicPageUrl(saga.cover));
                  }}
                >
                  <img 
                    src={getComicPageUrl(saga.cover)} 
                    alt={`Portada de la saga ${saga.title}`} 
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-102" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#D7263D] text-white font-[var(--font-bangers)] text-[9px] sm:text-[11px] tracking-widest px-2.5 py-1 uppercase border-2 border-white shadow-[2px_2px_0_#000] rotate-[-12deg] pointer-events-none select-none z-10 whitespace-nowrap">
                    EN DESARROLLO
                  </div>
                </div>
              )}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <img 
                    src="/comic-book-white.webp" 
                    alt="Saga Icon" 
                    className="w-5 h-5 object-contain" 
                  />
                  <span
                    className="tag text-[10px] font-[var(--font-bangers)] tracking-widest px-2 py-0.5 border-2 border-white"
                    style={{ background: colorPrimary, color: getTextColor(colorPrimary) }}
                  >
                    SAGA
                  </span>
                  <span className="tag text-[10px] font-[var(--font-bangers)] tracking-widest px-2 py-0.5 border-2 border-black bg-[#D7263D] text-black shadow-[1px_1px_0_#000]">
                    EN CAMINO
                  </span>
                </div>
                <h2 className="font-[var(--font-bangers)] text-2xl sm:text-3xl leading-none tracking-wider mb-2 text-white"
                  style={{ textShadow: "2px 2px 0 #D7263D" }}>
                  {saga.title}
                </h2>
                {saga.date && (
                  <p className="font-mono text-[9px] sm:text-[10px] text-emerald-400 bg-black/60 border border-emerald-500/25 px-3 py-1 rounded inline-flex items-center justify-center gap-1.5 mt-3 tracking-wide">
                    <span>📅</span> INICIO: {saga.date} &nbsp;|&nbsp; <span>⏱️</span> DEV: {saga.estimatedTime}
                  </p>
                )}
                <div 
                  className={`font-sans text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl transition-all duration-300 mt-2 ${
                    showDescription ? "block" : "hidden lg:block"
                  }`}
                >
                  {saga.description}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDescription(!showDescription);
                  }}
                  className="lg:hidden text-[10px] font-sans font-bold underline hover:no-underline text-[#D7263D] mt-2 tracking-wide uppercase cursor-pointer"
                >
                  {showDescription ? "Ocultar Sinopsis ▲" : "Leer Sinopsis ▼"}
                </button>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowChapters(!showChapters);
              }}
              className="font-[var(--font-bangers)] text-sm tracking-wider px-5 py-2.5 border-2 border-[#D7263D] bg-[#D7263D] hover:bg-[#ff3b51] text-black uppercase transition-all shadow-[3px_3px_0_#000] active:translate-y-0.5 active:translate-x-0.5 cursor-pointer flex items-center gap-2 mt-4"
            >
              <img 
                src="/comic-page.webp" 
                alt="Icon" 
                className="w-4 h-4 object-contain" 
              />
              {showChapters ? "Ocultar Avance" : "Ver Episodios Planeados"}
            </button>
          </div>

          {/* Chapters list inside collapsible accordion */}
          <AnimatePresence>
            {showChapters && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden relative z-10 w-full"
              >
                <div className="border-t-2 border-dashed border-white/20 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <img 
                      src="/comic-page-white.webp" 
                      alt="Page" 
                      className="w-5 h-5 object-contain" 
                    />
                    <h4 className="font-[var(--font-bangers)] text-lg tracking-wider text-white">
                      EPISODIOS PROYECTADOS
                    </h4>
                    <div className="h-[1px] flex-1 bg-white/20" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 items-stretch">
                    {saga.chapters.map((chapter: any, ci: number) => {
                      return (
                        <ChapterCard
                          key={chapter.id}
                          chapter={chapter}
                          sagaId={saga.id}
                          sagaColor={colorPrimary}
                          index={ci}
                          isLocked={true}
                          sagaCover={saga.cover}
                          isSagaProximamente={true}
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (isFeatured) {
    if (isNuevo) {
      return (
        <div 
          className={`reader-page-drop border-4 border-black relative overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.008] hover:-translate-y-0.5 flex flex-col animate-fadeIn ${showChapters ? "mobile-chapters-open z-50" : ""}`}
          style={{
            boxShadow: "12px 12px 0 #001419, 16px 16px 0 #D7263D, 0 30px 60px -15px rgba(215, 38, 61, 0.3)",
            background: "linear-gradient(135deg, #ecf7f8 0%, #dbeeed 100%)"
          }}
        >
          <FeaturedMobileChapters
            saga={saga}
            colorPrimary={colorPrimary}
            progress={progress}
            onBack={() => setShowChapters(false)}
          />
          {/* Horizontal Banner for nuevo - un poco más grande */}
          <div 
            className="w-full bg-gradient-to-r from-[#ab1b2c] via-[#D7263D] to-[#ab1b2c] text-white border-b-4 border-black py-4 px-4 flex items-center justify-center font-[var(--font-bangers)] text-xl sm:text-2xl tracking-[0.22em] select-none shadow-[inset_0_-4px_0_rgba(0,0,0,0.15)] relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)] pointer-events-none" />
            <span style={{ textShadow: "2px 2px 0px #000" }}>¡ÚLTIMO LANZAMIENTO!</span>
          </div>

          <div className="p-6 sm:p-8 relative z-10 flex flex-col justify-between">
            {/* Halftone pop-art highly visible background pattern */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.06] z-0"
              style={{
                backgroundImage: "radial-gradient(circle, #D7263D 1.5px, transparent 1.5px)",
                backgroundSize: "12px 12px",
              }}
            />
            
            {/* Main content split */}
            <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-stretch w-full relative z-10">
              {saga.cover && (
                <div 
                  className="relative shrink-0 w-28 sm:w-44 aspect-[3/4] border-4 border-[#001419] overflow-hidden rounded bg-zinc-900 shadow-[6px_6px_0_rgba(10,10,15,1)] group cursor-zoom-in self-center"
                  onClick={() => onCoverClick?.(getComicPageUrl(saga.cover))}
                >
                  <img 
                    src={getComicPageUrl(saga.cover)} 
                    alt={`Portada de la saga ${saga.title}`} 
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-102" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#001419]/40 via-transparent to-transparent pointer-events-none" />
                </div>
              )}
              <div className="flex-1 flex flex-col justify-between items-center lg:items-start text-center lg:text-left py-1">
                <div>
                  <div className="flex items-center gap-2 mb-2 justify-center lg:justify-start">
                    <img 
                      src="/comic-book.webp" 
                      alt="Saga Icon" 
                      className="w-5 h-5 object-contain" 
                    />
                    <span
                      className="tag text-[10px] font-[var(--font-bangers)] tracking-widest px-2 py-0.5 border-2 border-black"
                      style={{ background: colorPrimary, color: getTextColor(colorPrimary) }}
                    >
                      SAGA
                    </span>
                    <span className="tag text-[10px] font-[var(--font-bangers)] tracking-widest px-3 py-1 border-2 border-black bg-[#f5e642] text-black shadow-[2px_2px_0_#000] rotate-[-4deg] inline-block animate-bounce">
                      ¡NUEVA!
                    </span>
                  </div>
                  <h2
                    className="font-[var(--font-bangers)] text-2xl sm:text-4xl leading-none tracking-wider mb-2 text-[#001419]"
                    style={{ textShadow: `2px 2px 0 rgba(15, 32, 66, 0.15)` }}
                  >
                    {saga.title}
                  </h2>
                  <div className="font-sans text-xs sm:text-sm text-gray-800 leading-relaxed max-w-md">
                    {saga.description}
                  </div>
                </div>

                <button
                  onClick={() => setShowChapters(!showChapters)}
                  className="font-[var(--font-bangers)] text-sm tracking-wider px-5 py-2.5 border-2 border-[#001419] uppercase transition-all shadow-[3px_3px_0_#001419] active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0_#001419] cursor-pointer flex items-center gap-2 mt-4"
                  style={{ 
                    background: colorPrimary, 
                    color: getTextColor(colorPrimary)
                  }}
                >
                  <img 
                    src={buttonIconSrc} 
                    alt="Boom" 
                    className={`w-4 h-4 object-contain transition-transform duration-300 ${showChapters ? "rotate-45" : ""}`} 
                  />
                  {showChapters ? "Ocultar Episodios" : "Ver Episodios"}
                </button>
              </div>
            </div>

            {/* Chapters list inside collapsible accordion */}
            <AnimatePresence>
              {showChapters && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden relative z-10 w-full"
                >
                  <div className="border-t-2 border-dashed border-[#001419]/20 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <img 
                        src="/comic-page.webp" 
                        alt="Page" 
                        className="w-5 h-5 object-contain" 
                      />
                      <h4 className="font-[var(--font-bangers)] text-lg tracking-wider text-[#001419]">
                        EPISODIOS DISPONIBLES
                      </h4>
                      <div className="h-[1px] flex-1 bg-[#001419]/10" />
                    </div>

                    <SagaProgressBanner progress={progress} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                      {[...progress.publishedChapters]
                        .sort((a: any, b: any) => b.number - a.number)
                        .map((chapter: any) => (
                          <ChapterCard
                            key={chapter.id}
                            chapter={chapter}
                            sagaId={saga.id}
                            sagaColor={colorPrimary}
                            index={chapter.number - 1}
                            isLocked={progress.isLocked(chapter)}
                            highlight={progress.getHighlight(chapter)}
                            unlockAfterTitle={progress.getPrevChapter(chapter)?.title}
                            sagaCover={saga.cover}
                          />
                        ))}
                      {/* Special draft/upcoming block */}
                      {saga.chapters.some((c: any) => c.status === "published") &&
                        saga.chapters.filter((c: any) => c.status !== "published").slice(0, 1).map((chapter: any) => (
                          <Link
                            key={chapter.id}
                            href={`/chapters/${chapter.id}`}
                            className="flex flex-col h-full overflow-hidden border-[3px] border-[#001419] bg-gradient-to-br from-[#002229] to-[#001217] shadow-[5px_5px_0_#D7263D] relative rounded-md min-h-[160px] justify-between p-4 hover:border-[#D7263D] hover:scale-[1.01] transition-all cursor-pointer group"
                          >
                            <div
                              className="absolute inset-0 pointer-events-none opacity-[0.06] z-0"
                              style={{
                                backgroundImage: "radial-gradient(circle, #D7263D 1.5px, transparent 1.5px)",
                                backgroundSize: "10px 10px",
                              }}
                            />
                            <div className="relative z-10 flex flex-col justify-between h-full flex-1">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="tag text-[9px] font-[var(--font-bangers)] tracking-widest px-2 py-0.5 border border-black bg-gradient-to-r from-[#ab1b2c] to-[#D7263D] text-white">
                                    EN PRODUCCIÓN
                                  </span>
                                  {chapter.date && (
                                    <span className="font-mono text-[9px] text-emerald-400">
                                      📅 {chapter.date}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-[var(--font-bangers)] text-2xl leading-tight uppercase tracking-wide text-white/80 group-hover:text-white mt-1 transition-colors">
                                  PARTE {chapter.number}: {chapter.title}
                                </h3>
                                <p className="font-sans text-[11px] text-white/40 mt-1">
                                  Este episodio está en desarrollo y se publicará próximamente. Ingresá para editar o previsualizar.
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-dashed border-[#D7263D]/20">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#D7263D]/10 text-[#D7263D] border border-[#D7263D]/25">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2.5" />
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                  </div>
                                  <span className="font-[var(--font-bangers)] text-[10px] tracking-wider text-[#D7263D] uppercase">
                                    ACCESO CON CONTRASEÑA
                                  </span>
                                </div>
                                <span className="font-[var(--font-bangers)] text-xs text-[#D7263D] group-hover:translate-x-1 transition-transform">
                                  INGRESAR →
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
    } else {
      return (
        <div 
          className={`reader-page-drop border-4 border-[#001419] relative overflow-hidden rounded-lg transition-transform duration-300 hover:scale-[1.002] flex flex-col animate-fadeIn ${showChapters ? "mobile-chapters-open z-50" : ""}`}
          style={{
            boxShadow: `8px 8px 0 #001419, 12px 12px 0 ${colorSecondary}, 0 25px 50px -12px ${colorPrimary}35`,
            background: "#ecf7f8"
          }}
        >
          <FeaturedMobileChapters
            saga={saga}
            colorPrimary={colorPrimary}
            progress={progress}
            onBack={() => setShowChapters(false)}
          />
          <div className="p-6 sm:p-8 relative z-10 flex flex-col justify-between">
            {/* Halftone pop-art highly visible background pattern */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.06] z-0"
              style={{
                backgroundImage: "radial-gradient(circle, #001419 1.5px, transparent 1.5px)",
                backgroundSize: "12px 12px",
              }}
            />
            
            {/* Main content split */}
            <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-stretch w-full relative z-10">
              {saga.cover && (
                <div 
                  className="relative shrink-0 w-40 sm:w-44 aspect-[3/4] border-4 border-[#001419] overflow-hidden rounded bg-zinc-900 shadow-[6px_6px_0_rgba(10,10,15,1)] group cursor-zoom-in self-center"
                  onClick={() => onCoverClick?.(getComicPageUrl(saga.cover))}
                >
                  <img 
                    src={getComicPageUrl(saga.cover)} 
                    alt={`Portada de la saga ${saga.title}`} 
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-102" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#001419]/40 via-transparent to-transparent pointer-events-none" />
                </div>
              )}
              <div className="flex-1 flex flex-col justify-between items-center lg:items-start text-center lg:text-left py-1">
                <div>
                  <div className="flex items-center gap-2 mb-2 justify-center lg:justify-start">
                    <img 
                      src="/comic-book.webp" 
                      alt="Saga Icon" 
                      className="w-5 h-5 object-contain" 
                    />
                    <span
                      className="tag text-[10px] font-[var(--font-bangers)] tracking-widest px-2 py-0.5 border-2 border-black"
                      style={{ background: colorPrimary, color: getTextColor(colorPrimary) }}
                    >
                      SAGA
                    </span>
                    {/* Badge de color secundario si se define en saga.json */}
                    {colorSecondary && (
                      <span
                        className="tag text-[10px] font-[var(--font-bangers)] tracking-widest px-2 py-0.5 border-2 border-black"
                        style={{
                          background: colorSecondary,
                          color: getTextColor(colorSecondary),
                          boxShadow: `1px 1px 0 ${colorSecondary}88`
                        }}
                      >
                        ALT
                      </span>
                    )}
                  </div>
                  <h2
                    className="font-[var(--font-bangers)] text-2xl sm:text-3xl leading-none tracking-wider mb-2 text-[#001419]"
                    style={{ textShadow: `2px 2px 0 rgba(10, 10, 15, 0.05)` }}
                  >
                    {saga.title}
                  </h2>
                  <div className="font-sans text-xs sm:text-sm text-gray-800 leading-relaxed max-w-md">
                    {saga.description}
                  </div>
                </div>

                <button
                  onClick={() => setShowChapters(!showChapters)}
                  className="font-[var(--font-bangers)] text-sm tracking-wider px-5 py-2.5 border-2 border-[#001419] uppercase transition-all shadow-[3px_3px_0_#001419] active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0_#001419] cursor-pointer flex items-center gap-2 mt-4"
                  style={{ 
                    background: colorPrimary, 
                    color: getTextColor(colorPrimary)
                  }}
                >
                  <img 
                    src={buttonIconSrc} 
                    alt="Boom" 
                    className={`w-4 h-4 object-contain transition-transform duration-300 ${showChapters ? "rotate-45" : ""}`} 
                  />
                  {showChapters ? "Ocultar Episodios" : "Ver Episodios"}
                </button>
              </div>
            </div>

            {/* Chapters list inside collapsible accordion */}
            <AnimatePresence>
              {showChapters && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden relative z-10 w-full"
                >
                  <div className="border-t-2 border-dashed border-[#001419]/20 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <img 
                        src="/comic-page.webp" 
                        alt="Page" 
                        className="w-5 h-5 object-contain" 
                      />
                      <h4 className="font-[var(--font-bangers)] text-lg tracking-wider text-[#001419]">
                        EPISODIOS DISPONIBLES
                      </h4>
                      <div className="h-[1px] flex-1 bg-[#001419]/10" />
                    </div>

                    <SagaProgressBanner progress={progress} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                      {[...progress.publishedChapters]
                        .sort((a: any, b: any) => b.number - a.number)
                        .map((chapter: any) => (
                          <ChapterCard
                            key={chapter.id}
                            chapter={chapter}
                            sagaId={saga.id}
                            sagaColor={colorPrimary}
                            index={chapter.number - 1}
                            isLocked={progress.isLocked(chapter)}
                            highlight={progress.getHighlight(chapter)}
                            unlockAfterTitle={progress.getPrevChapter(chapter)?.title}
                            sagaCover={saga.cover}
                          />
                        ))}
                      {/* Special draft/upcoming block */}
                      {saga.chapters.some((c: any) => c.status === "published") &&
                        saga.chapters.filter((c: any) => c.status !== "published").slice(0, 1).map((chapter: any) => (
                          <div
                            key={chapter.id}
                            className="flex flex-col h-full overflow-hidden border-[3px] border-[#001419] bg-gradient-to-br from-[#002229] to-[#001217] shadow-[5px_5px_0_#D7263D] relative rounded-md min-h-[160px] justify-between p-4"
                          >
                            <div
                              className="absolute inset-0 pointer-events-none opacity-[0.06] z-0"
                              style={{
                                backgroundImage: "radial-gradient(circle, #D7263D 1.5px, transparent 1.5px)",
                                backgroundSize: "10px 10px",
                              }}
                            />
                            <div className="relative z-10 flex flex-col justify-between h-full flex-1">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="tag text-[9px] font-[var(--font-bangers)] tracking-widest px-2 py-0.5 border border-black bg-gradient-to-r from-[#ab1b2c] to-[#D7263D] text-white">
                                    EN PRODUCCIÓN
                                  </span>
                                  {chapter.date && (
                                    <span className="font-mono text-[9px] text-emerald-400">
                                      📅 {chapter.date}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-[var(--font-bangers)] text-2xl leading-tight uppercase tracking-wide text-white/80 mt-1">
                                  PARTE {chapter.number}: {chapter.title}
                                </h3>
                                <p className="font-sans text-[11px] text-white/40 mt-1">
                                  Este episodio está en desarrollo y se publicará próximamente.
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dashed border-[#D7263D]/20">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#D7263D]/10 text-[#D7263D] border border-[#D7263D]/25">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2.5" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                  </svg>
                                </div>
                                <span className="font-[var(--font-bangers)] text-[10px] tracking-wider text-[#D7263D] uppercase">
                                  ACCESO RESTRINGIDO
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
    }
  }

  const containerClass = isNuevo
    ? "reader-page-drop border-4 border-black p-6 sm:p-10 relative overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.008] hover:-translate-y-0.5"
    : isProximamente
      ? "reader-page-drop border-4 border-dashed border-[#D7263D] bg-[#021e25] p-6 sm:p-10 relative overflow-hidden rounded-lg opacity-90 transition-opacity hover:opacity-100"
      : "reader-page-drop border-4 border-[#001419] bg-[#ecf7f8] p-6 sm:p-10 relative overflow-hidden rounded-lg";

  return (
    <div 
      className={`${containerClass} ${showChapters ? "z-50" : ""}`}
      style={{
        boxShadow: isNuevo 
          ? "12px 12px 0 #001419, 16px 16px 0 #D7263D, 0 30px 60px -15px rgba(215, 38, 61, 0.30)" 
          : isProximamente 
            ? "10px 10px 0 #000, 14px 14px 0 rgba(215, 38, 61, 0.25), 0 20px 40px -10px rgba(215, 38, 61, 0.2)"
            : `8px 8px 0 #001419, 12px 12px 0 ${colorSecondary}, 0 25px 50px -12px ${colorPrimary}35`,
        background: isProximamente
          ? "linear-gradient(135deg, #011c22 0%, #000c0f 100%)"
          : isNuevo
            ? "linear-gradient(135deg, #ecf7f8 0%, #dbeeed 100%)"
            : "#ecf7f8"
      }}
    >
      {/* Halftone pop-art highly visible background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] z-0"
        style={{
          backgroundImage: isProximamente
            ? "radial-gradient(circle, #D7263D 1.5px, transparent 1.5px)"
            : "radial-gradient(circle, #001419 1.5px, transparent 1.5px)",
          backgroundSize: "12px 12px",
        }}
      />

      {/* Retro sticker/banner highlights */}
      {isNuevo && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-gradient-to-r from-[#ab1b2c] via-[#D7263D] to-[#ab1b2c] text-white font-[var(--font-bangers)] text-xs sm:text-sm px-4 py-2 uppercase tracking-[0.15em] border-2 border-black shadow-[3px_3px_0_#000] z-20 rotate-[3deg] select-none">
          <span style={{ textShadow: "1px 1px 0px #000" }}>¡ÚLTIMO LANZAMIENTO!</span>
        </div>
      )}

      {isProximamente && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-[#D7263D] text-black font-[var(--font-bangers)] text-xs sm:text-sm px-3.5 py-1.5 uppercase tracking-widest border-2 border-black shadow-[3px_3px_0_#000] z-20 -rotate-[3deg] select-none">
          PRÓXIMAMENTE
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-8 sm:gap-12 relative z-10">
        {saga.cover && (
          <div 
            className="relative shrink-0 w-64 sm:w-80 aspect-[3/4] border-4 border-[#001419] overflow-hidden rounded bg-zinc-900 shadow-[8px_8px_0_rgba(10,10,15,1)] group cursor-zoom-in"
            style={{ transform: isEven ? "rotate(-1.5deg)" : "rotate(1.5deg)" }}
            onClick={() => onCoverClick?.(getComicPageUrl(saga.cover))}
          >
            <img 
              src={getComicPageUrl(saga.cover)} 
              alt={`Portada de la saga ${saga.title}`} 
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-102" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#001419]/40 via-transparent to-transparent pointer-events-none" />
          </div>
        )}
        <div className="flex-1 flex flex-col justify-between text-center lg:text-left items-center lg:items-start py-2">
          <div className="flex flex-col items-center lg:items-start">
            <div className="flex items-center gap-2 mb-4">
              <img 
                src="/comic-book.webp" 
                alt="Saga Icon" 
                className="w-6 h-6 object-contain" 
              />
              <span
                className="tag text-xs font-[var(--font-bangers)] tracking-widest px-2.5 py-0.5 border-2 border-black"
                style={{ background: colorPrimary, color: getTextColor(colorPrimary) }}
              >
                SAGA
              </span>
              {/* Badge de color secundario si se define en saga.json */}
              {colorSecondary && !isNuevo && !isProximamente && (
                <span
                  className="tag text-xs font-[var(--font-bangers)] tracking-widest px-2.5 py-0.5 border-2 border-black"
                  style={{
                    background: colorSecondary,
                    color: getTextColor(colorSecondary),
                    boxShadow: `2px 2px 0 ${colorSecondary}88`
                  }}
                >
                  ALT
                </span>
              )}
              {isNuevo && (
                <span className="tag text-xs font-[var(--font-bangers)] tracking-widest px-2.5 py-0.5 border-2 border-black bg-[#D7263D] text-white shadow-[2px_2px_0_#D7263D] animate-bounce">
                  ¡NUEVA!
                </span>
              )}
              {isProximamente && (
                <span className="tag text-xs font-[var(--font-bangers)] tracking-widest px-2.5 py-0.5 border-2 border-black bg-[#D7263D] text-black shadow-[2px_2px_0_#000]">
                  EN CAMINO
                </span>
              )}
            </div>
            <h2
              className="font-[var(--font-bangers)] text-4xl sm:text-6xl leading-none tracking-wider mb-4"
              style={{ color: "#001419", textShadow: `3px 3px 0 ${colorSecondary}44` }}
            >
              {saga.title}
            </h2>
            <div className="font-sans text-base sm:text-lg text-gray-700 leading-relaxed max-w-2xl mb-6">
              {saga.description}
            </div>
          </div>

          <button
            onClick={() => setShowChapters(!showChapters)}
            className="font-[var(--font-bangers)] text-lg sm:text-xl tracking-wider px-8 py-3.5 border-4 border-[#001419] uppercase transition-all shadow-[4px_4px_0_#001419] active:translate-y-0.5 active:translate-x-0.5 active:shadow-[2px_2px_0_#001419] cursor-pointer flex items-center gap-3 mt-4"
            style={{ 
              background: isProximamente ? "#475569" : colorPrimary, 
              color: isProximamente ? "#ffffff" : getTextColor(colorPrimary),
              borderColor: isProximamente ? "#0f172a" : "#001419"
            }}
          >
            <img 
              src={isProximamente ? "/comic-page.webp" : buttonIconSrc} 
              alt="Icon" 
              className={`w-6 h-6 object-contain transition-transform duration-300 ${showChapters ? "rotate-45" : ""}`} 
            />
            {isProximamente 
              ? (showChapters ? "Ocultar Avance" : "Ver Episodios Planeados")
              : (showChapters ? "Ocultar Episodios" : "Ver Episodios")
            }
          </button>
        </div>
      </div>

      {/* Chapters list inside collapsible accordion */}
      <AnimatePresence>
        {showChapters && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 40 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t-4 border-dashed border-[#001419]/20 pt-8">
              <div className="flex items-center gap-3 mb-8">
                <img 
                  src="/comic-page.webp" 
                  alt="Page" 
                  className="w-6 h-6 object-contain" 
                />
                <h4 className="font-[var(--font-bangers)] text-2xl tracking-wider text-[#001419]">
                  {isProximamente ? "EPISODIOS PROYECTADOS" : "EPISODIOS DISPONIBLES"}
                </h4>
                <div className="h-[2px] flex-1 bg-[#001419]/10" />
              </div>

              {!isProximamente && <SagaProgressBanner progress={progress} />}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                {(() => {
                  const filteredChapters = isProximamente
                    ? [...saga.chapters].sort((a: any, b: any) => a.number - b.number)
                    : progress.publishedChapters;

                  const displayChapters = [...filteredChapters].sort((a: any, b: any) => b.number - a.number);

                  return displayChapters.map((chapter: any) => (
                    <ChapterCard
                      key={chapter.id}
                      chapter={chapter}
                      sagaId={saga.id}
                      sagaColor={colorPrimary}
                      index={chapter.number - 1}
                      isLocked={isProximamente ? true : progress.isLocked(chapter)}
                      highlight={isProximamente ? null : progress.getHighlight(chapter)}
                      unlockAfterTitle={isProximamente ? undefined : progress.getPrevChapter(chapter)?.title}
                      sagaCover={saga.cover}
                      isSagaProximamente={isProximamente}
                    />
                  ));
                })()}
                {/* Special draft/upcoming block */}
                {!isProximamente && saga.chapters.some((c: any) => c.status === "published") &&
                  saga.chapters.filter((c: any) => c.status !== "published").slice(0, 1).map((chapter: any) => (
                    <div
                      key={chapter.id}
                      className="flex flex-col h-full overflow-hidden border-[3px] border-[#001419] bg-gradient-to-br from-[#002229] to-[#001217] shadow-[5px_5px_0_#D7263D] relative rounded-md min-h-[160px] justify-between p-4"
                    >
                      <div
                        className="absolute inset-0 pointer-events-none opacity-[0.06] z-0"
                        style={{
                          backgroundImage: "radial-gradient(circle, #D7263D 1.5px, transparent 1.5px)",
                          backgroundSize: "10px 10px",
                        }}
                      />
                      <div className="relative z-10 flex flex-col justify-between h-full flex-1">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="tag text-[9px] font-[var(--font-bangers)] tracking-widest px-2 py-0.5 border border-black bg-gradient-to-r from-[#ab1b2c] to-[#D7263D] text-white">
                              EN PRODUCCIÓN
                            </span>
                            {chapter.date && (
                              <span className="font-mono text-[9px] text-emerald-400">
                                📅 {chapter.date}
                              </span>
                            )}
                          </div>
                          <h3 className="font-[var(--font-bangers)] text-2xl leading-tight uppercase tracking-wide text-white/80 mt-1">
                            PARTE {chapter.number}: {chapter.title}
                          </h3>
                          <p className="font-sans text-[11px] text-white/40 mt-1">
                            Este episodio está en desarrollo y se publicará próximamente.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dashed border-[#D7263D]/20">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#D7263D]/10 text-[#D7263D] border border-[#D7263D]/25">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2.5" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                          </div>
                          <span className="font-[var(--font-bangers)] text-[10px] tracking-wider text-[#D7263D] uppercase">
                            ACCESO RESTRINGIDO
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox rendered at page level */}
    </div>
  );
}

/* ── CHAPTER CARD ── */
const ACCENTS = ["#D7263D", "#D7263D", "#D7263D", "#D7263D", "#D7263D"];

const HIGHLIGHT_STYLES: Record<Exclude<ChapterHighlight, null>, { label: string; bg: string; color: string; ring: string; hint: string }> = {
  start: { label: "EMPEZÁ ACÁ", bg: "#f5e642", color: "#001419", ring: "#f5e642", hint: "Tu punto de partida en esta saga." },
  next: { label: "SEGUÍ POR ACÁ", bg: "#D7263D", color: "white", ring: "#D7263D", hint: "Siguiente episodio para vos." },
  read: { label: "LEÍDO ✓", bg: "#001419", color: "white", ring: "transparent", hint: "" },
};

function ChapterCard({ chapter, sagaId, sagaColor, index, isLocked, sagaCover, isSagaProximamente, compact = false, highlight = null, unlockAfterTitle }: {
  chapter: any;
  sagaId: string;
  sagaColor: string;
  index: number;
  isLocked: boolean;
  sagaCover?: string | null;
  isSagaProximamente?: boolean;
  compact?: boolean;
  highlight?: ChapterHighlight;
  unlockAfterTitle?: string;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const [cover, setCover] = useState<string | null>(null);
  const highlightStyle = highlight ? HIGHLIGHT_STYLES[highlight] : null;
  const isCallToAction = highlight === "start" || highlight === "next";

  useEffect(() => {
    if (chapter.cover) {
      setCover(chapter.cover);
      return;
    }
    fetch(`/api/pages/${sagaId}/${chapter.id}`)
      .then(r => r.json())
      .then((d: { cover: string | null }) => {
        if (d.cover) setCover(d.cover);
      })
      .catch(() => {});
  }, [sagaId, chapter.id, chapter.cover]);

  if (isLocked) {
    // Si el capítulo es draft, permitimos navegar para que aparezca el DraftLockScreen
    const isDraftChapter = chapter.draft;
    const isBlueprintTheme = isDraftChapter || isSagaProximamente;
    const cardContent = (
      <div
        className={`flex flex-col h-full overflow-hidden border-[3px] border-[#001419] ${isDraftChapter ? "cursor-pointer hover:scale-[1.01] transition-transform" : ""}`}
        style={{
          background: isBlueprintTheme ? "linear-gradient(135deg, #002229, #001217)" : "#e5e5eb",
          boxShadow: isBlueprintTheme ? "5px 5px 0 #D7263D" : "5px 5px 0 #001419",
        }}
      >
        {/* Cover image area locked */}
        <div
          className="relative w-full overflow-hidden shrink-0 flex items-center justify-center"
          style={{
            aspectRatio: compact ? "4/3" : "3/4",
            background: isBlueprintTheme 
              ? `repeating-linear-gradient(45deg, #002229, #002229 10px, #003640 10px, #003640 20px)`
              : `repeating-linear-gradient(45deg, #dfdfe5, #dfdfe5 10px, #e8e8ef 10px, #e8e8ef 20px)`,
          }}
        >
          {(cover || chapter.cover || sagaCover) && (
            <img
              src={getComicPageUrl(cover || chapter.cover || sagaCover)}
              alt={`Portada de ${chapter.title}`}
              className="absolute inset-0 w-full h-full object-cover object-top opacity-30 grayscale filter blur-[1px] brightness-[0.25]"
            />
          )}
          <div className="absolute inset-0 speed-lines opacity-20" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${isBlueprintTheme ? "bg-[#D7263D]/20 border-[#D7263D]/50 text-[#D7263D]" : "bg-white/10 border-white/20 text-white/80"}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2.5" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className={`font-[var(--font-bangers)] text-lg tracking-widest uppercase ${isBlueprintTheme ? "text-[#D7263D]" : "text-white/60"}`}>
              {isDraftChapter ? "DRAFT" : isSagaProximamente ? "PLANEADO" : "Bloqueado"}
            </span>
          </div>
        </div>

        {/* Info strip */}
        <div className={`flex-1 p-4 flex flex-col justify-between gap-3 ${isBlueprintTheme ? "bg-[#021e25]" : "bg-[#eef0f4]"}`}>
          <div>
            <p className={`font-[var(--font-bangers)] text-xs tracking-[0.2em] uppercase mb-1 ${isBlueprintTheme ? "text-[#D7263D]/60" : "text-gray-400"}`}>
              {saga_label(index)}
            </p>
            {(chapter.releaseDate || chapter.date) && (
              <p className={`font-sans text-[10px] mb-1.5 flex items-center gap-1.5 ${isBlueprintTheme ? "text-emerald-400/90 font-mono" : "text-gray-500"}`}>
                {chapter.releaseDate ? (
                  <>
                    <span>🚀</span> Lanzado: {chapter.releaseDate}
                    {chapter.estimatedTime && <> | <span>⏱️</span> {chapter.estimatedTime} de dev</>}
                  </>
                ) : (
                  <>
                    <span>📅</span> {chapter.date}
                    {chapter.estimatedTime && ` | ⏱️ ${chapter.estimatedTime}`}
                  </>
                )}
              </p>
            )}
            <h3 className={`font-[var(--font-bangers)] ${compact ? "text-base" : "text-2xl sm:text-3xl"} leading-tight uppercase tracking-wide ${isBlueprintTheme ? "text-white/80" : "text-gray-400"}`}>
              {chapter.title}
            </h3>
            <p className={`font-[var(--font-sans)] text-xs mt-1 ${isBlueprintTheme ? "text-white/50" : "text-gray-500"}`}>
              {isDraftChapter
                ? "Borrador — ingresá la contraseña para previsualizar."
                : isSagaProximamente
                  ? "Este capítulo estará disponible próximamente."
                  : unlockAfterTitle
                    ? <>Se desbloquea al leer <span className="font-semibold text-gray-600">«{unlockAfterTitle}»</span>.</>
                    : "Leé el capítulo anterior para poder desbloquear este."}
            </p>
          </div>
          {isDraftChapter && (
            <div className="text-[10px] font-[var(--font-bangers)] tracking-widest text-[#D7263D] uppercase flex items-center gap-1">
              <span>🔑</span> Acceso con contraseña →
            </div>
          )}
          {isBlueprintTheme && !isDraftChapter && (
            <div className="h-[2px] w-full border-t border-dashed border-[#D7263D]/30" />
          )}
          {!isBlueprintTheme && <div className="h-1 w-12 bg-gray-300" />}
        </div>
      </div>
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ type: "spring", stiffness: 100, damping: 15, delay: index * 0.08 }}
        whileHover={{ y: -4, scale: 1.01 }}
        className={`h-full ${isDraftChapter ? "" : "select-none cursor-not-allowed"}`}
      >
        {isDraftChapter ? (
          <Link href={`/chapters/${chapter.id}`} className="block h-full">
            {cardContent}
          </Link>
        ) : cardContent}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ type: "spring", stiffness: 100, damping: 15, delay: index * 0.08 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="h-full"
    >
      <Link
        href={`/chapters/${chapter.id}`}
        className="group flex flex-col h-full panel panel-lg overflow-hidden"
        style={{
          background: "white",
          ...(isCallToAction && highlightStyle
            ? { boxShadow: `0 0 0 3px ${highlightStyle.ring}, 6px 6px 0 #001419` }
            : {}),
        }}
      >
        {/* Start / Next / Read badge */}
        {highlightStyle && (
          <div
            className={`absolute top-3 left-3 z-30 font-[var(--font-bangers)] ${compact ? "text-[10px] px-2" : "text-xs sm:text-sm px-2.5"} py-0.5 tracking-widest border-2 border-[#001419] ${isCallToAction ? "rotate-[-4deg] animate-pulse" : ""}`}
            style={{ background: highlightStyle.bg, color: highlightStyle.color, boxShadow: "2px 2px 0 #001419" }}
          >
            {highlightStyle.label}
          </div>
        )}
        {/* Cover image — fixed aspect ratio so all cards are the same height */}
        <div
          className="relative w-full overflow-hidden shrink-0"
          style={{
            aspectRatio: compact ? "4/3" : "3/4",
            background: (cover || chapter.cover || sagaCover)
              ? "#001419"
              : `linear-gradient(145deg, #001419 0%, ${accent}33 100%)`,
          }}
        >
          {/* Actual cover image */}
          {(cover || chapter.cover || sagaCover) && (
            <img
              src={getComicPageUrl(cover || chapter.cover || sagaCover || undefined)}
              alt={`Portada de ${chapter.title}`}
              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          )}

          {/* Overlay gradient always present */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: (cover || chapter.cover || sagaCover)
                ? "linear-gradient(to top, rgba(10,10,15,0.85) 0%, rgba(10,10,15,0.1) 50%, transparent 100%)"
                : undefined,
            }}
          />

          {/* No-cover placeholder */}
          {!(cover || chapter.cover || sagaCover) && (
            <div className="absolute inset-0 flex items-center justify-center z-10 speed-lines opacity-30" />
          )}

          {/* Borrador Badge */}
          {chapter.draft && (
            <div
              className="absolute top-3 right-3 z-30 font-[var(--font-bangers)] text-sm px-2.5 py-0.5 tracking-wider rotate-[6deg] animate-pulse"
              style={{
                background: "#D7263D",
                color: "#001419",
                border: "2px solid #001419",
                boxShadow: "3px 3px 0 #D7263D",
              }}
            >
              Borrador
            </div>
          )}

          {/* Hover CTA overlay */}
          <div
            className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-250"
            style={{ background: "rgba(10,10,15,0.5)" }}
          >
            <span
              className="font-[var(--font-bangers)] text-2xl text-white px-6 py-2.5 tracking-widest"
              style={{ background: accent, border: "3px solid white", boxShadow: "4px 4px 0 rgba(0,0,0,0.5)" }}
            >
              LEER →
            </span>
          </div>
        </div>

        {/* Info strip — grows to fill, keeps cards same height */}
        <div className="flex-1 p-4 flex flex-col justify-between gap-3">
          <div>
            <p
              className="font-[var(--font-bangers)] text-xs tracking-[0.2em] uppercase mb-1"
              style={{ color: sagaColor }}
            >
              {saga_label(index)}
            </p>
            {(chapter.releaseDate || chapter.date) && (
              <p className="font-sans text-[10px] text-gray-500 mb-1.5 flex items-center gap-1.5">
                {chapter.releaseDate ? (
                  <>
                    <span>🚀</span> Lanzado: {chapter.releaseDate}
                    {chapter.estimatedTime && <> | <span>⏱️</span> {chapter.estimatedTime} de dev</>}
                  </>
                ) : (
                  <>
                    <span>📅</span> {chapter.date}
                    {chapter.estimatedTime && ` | ⏱️ ${chapter.estimatedTime}`}
                  </>
                )}
              </p>
            )}
            <h3 className={`font-[var(--font-bangers)] ${compact ? "text-base" : "text-2xl sm:text-3xl"} leading-tight uppercase tracking-wide text-[#001419]`}>
              {chapter.title}
            </h3>
            {isCallToAction && highlightStyle && (
              <p className="font-sans text-[11px] text-gray-600 mt-1">{highlightStyle.hint}</p>
            )}
          </div>
          {/* Bottom accent bar */}
          <div className="h-1 w-12" style={{ background: isCallToAction && highlightStyle ? highlightStyle.ring : accent }} />
        </div>
      </Link>
    </motion.div>
  );
}

function saga_label(index: number) {
  const labels = ["Primer número", "Segundo número", "Tercer número", "Cuarto número", "Quinto número"];
  return labels[index] ?? `Número ${index + 1}`;
}






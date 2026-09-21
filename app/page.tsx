"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeroSection } from "@/components/home/HeroSection";
import { SagaBlock } from "@/components/home/SagaBlock";
import { CharacterRoster } from "@/components/home/CharacterRoster";
import { ImageLightbox } from "@/components/home/CharacterModal/ImageLightbox";
import { getRecommendedRead, readReadChapters } from "@/components/home/sagaProgress";

export default function Home() {
  const [sagasList, setSagasList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClassic, setShowClassic] = useState(false);
  const [lightboxSaga, setLightboxSaga] = useState<{ url: string; title: string } | null>(null);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [unlockAll, setUnlockAll] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const checkUnlock = () => setUnlockAll(localStorage.getItem("unlock-all") === "true");
    const load = () => {
      fetch("/api/sagas")
        .then((r) => r.json())
        .then((d) => {
          setSagasList(d);
          setLoading(false);
          // Reader progress drives the hero CTA; read it once the saga data is here.
          setReadChapters(readReadChapters());
          checkUnlock();
          setIsClient(true);
        })
        .catch(() => setLoading(false));
    };
    load();
    window.addEventListener("previewStateChanged", load);
    window.addEventListener("unlockAllChanged", checkUnlock);
    return () => {
      window.removeEventListener("previewStateChanged", load);
      window.removeEventListener("unlockAllChanged", checkUnlock);
    };
  }, []);

  const officialSagas = sagasList.filter((s) => s.order >= 3);
  const classicSagas = sagasList.filter((s) => s.order < 3);

  // Pre-calculate published and upcoming sagas
  const nuevoSagas = officialSagas.filter((s) => s.nuevo === true);
  const rawProximamenteSagas = officialSagas.filter(
    (s) => s.proximamente === true || s.chapters.some((c: any) => c.status !== "published")
  );
  const proximamenteSagas: any[] = [];
  
  rawProximamenteSagas.forEach((saga) => {
    if (saga.chapters && saga.chapters.length > 0) {
      const upcoming = saga.chapters.filter((c: any) => c.status !== "published");
      if (upcoming.length > 0) {
        upcoming.forEach((ch: any) => {
          proximamenteSagas.push({
            ...saga,
            id: ch.id,
            title: `${saga.title} Parte ${ch.number}: ${ch.title}`,
            cover: ch.cover || saga.cover,
            chapters: [ch],
            date: ch.date || saga.date,
            estimatedTime: ch.estimatedTime || saga.estimatedTime,
            proximamente: true,
          });
        });
      } else if (saga.proximamente) {
        proximamenteSagas.push(saga);
      }
    } else if (saga.proximamente) {
      proximamenteSagas.push(saga);
    }
  });

  const otherOfficialSagas = officialSagas.filter(
    (s) => !s.proximamente && !s.nuevo
  );

  const publishedSagas = [...nuevoSagas, ...[...otherOfficialSagas].reverse()];

  const recommendedRead = getRecommendedRead(sagasList, readChapters, { isClient, unlockAll });

  const renderSagaGrid = (sagas: any[], isDrawerItem = false) => (
    <div className={`grid grid-cols-1 items-start gap-5 ${isDrawerItem ? "" : "sm:grid-cols-2 sm:gap-8"}`}>
      {sagas.map((saga) => (
        <SagaBlock
          key={saga.id}
          saga={saga}
          index={sagasList.findIndex((s) => s.id === saga.id || s.id === saga.id.split('-')[0])}
          onCoverClick={(url) => setLightboxSaga({ url, title: saga.title })}
          isFeatured={true}
          isDrawerItem={isDrawerItem}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col" style={{ background: "#002a32" }}>
      <HeroSection recommended={recommendedRead} />
      <section id="sagas" className="brand-grain py-16 px-4 sm:px-6 relative">
        {/* Subtle halftone grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, #D7263D 1.5px, transparent 1.5px)", backgroundSize: "18px 18px" }} />

        <div className="max-w-7xl mx-auto flex flex-col gap-12 relative z-10">
          {loading ? (
            <div className="text-center py-20">
              <span className="font-[var(--font-bangers)] text-4xl text-[#D7263D] animate-pulse tracking-wider">
                Cargando Sagas...
              </span>
            </div>
          ) : sagasList.length === 0 ? (
            <div className="text-center py-20">
              <span className="font-[var(--font-bangers)] text-3xl text-white/40 tracking-wider">
                Aún no hay sagas disponibles.
              </span>
            </div>
          ) : (
            <>
              {/* === ERA CANON OFICIAL === */}
              {officialSagas.length > 0 && (
                <div className="flex flex-col gap-12">
                  {/* Section Header */}
                  <div className="reader-page-drop relative border-4 border-white overflow-hidden shadow-[8px_8px_0_#D7263D]"
                    style={{ background: "linear-gradient(135deg, #0e1a14 0%, #001419 60%, #071510 100%)" }}>
                    {/* Accent bar top */}
                    <div className="h-1 w-full bg-[#D7263D]" />
                    <div className="p-6 md:p-8 relative z-10">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-8 bg-[#D7263D]" />
                            <span className="font-[var(--font-bangers)] text-[10px] tracking-[0.3em] text-[#D7263D] uppercase border border-[#D7263D] px-2 py-0.5">
                              LÍNEA CANON OFICIAL
                            </span>
                          </div>
                          <h2 className="font-[var(--font-bangers)] text-4xl sm:text-5xl text-white tracking-widest leading-none mb-3"
                            style={{ textShadow: "3px 3px 0 #D7263D" }}>
                            HISTORIA PRINCIPAL
                          </h2>
                          <p className="font-sans text-sm text-gray-400 max-w-2xl leading-relaxed">
                            Acá comienza el canon oficial de <strong className="text-white">The Boyz</strong>.{" "}
                            La historia arranca tras un escape desesperado:{" "}
                            <strong className="text-[#D7263D]">Ian</strong> y <strong className="text-[#D7263D]">Uandi</strong> lograron rescatar a{" "}
                            <strong className="text-[#D7263D]">Julián</strong> de un secuestro en los <strong className="text-white">Backrooms</strong>.
                            Al huir, terminaron varados en el <strong className="text-[#D7263D]">Universo 616</strong>.{" "}
                            Mientras tanto, <strong className="text-white">Volvo</strong> vaga perdido en otra realidad y la{" "}
                            <strong className="text-[#D7263D]">Guerra Mativersal</strong> se aproxima.
                          </p>
                        </div>
                        <img src="/comic-book-white.webp" alt="" className="w-10 h-10 object-contain opacity-30 shrink-0 hidden sm:block" />
                      </div>
                    </div>
                    {/* Bottom accent */}
                    <div className="h-1 w-full" style={{ background: "linear-gradient(to right, #D7263D, #D7263D, #D7263D)" }} />
                  </div>

                  {/* featured split grid */}
                  <div className="relative">
                    <div className="pr-10 sm:pr-12">
                      {renderSagaGrid(publishedSagas)}
                    </div>
                  </div>
                </div>
              )}

              {/* === ERA CLÁSICA / PILOTO (COLAPSABLE) === */}
              {classicSagas.length > 0 && (
                <div className="reader-page-drop mt-8 border-4 border-dashed border-white/10 p-6 md:p-8 relative overflow-hidden"
                  style={{ background: "#0d0d12" }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-[var(--font-bangers)] text-2xl tracking-wider text-white/40">
                        ARCHIVOS HISTÓRICOS <span className="text-[10px] text-gray-600 font-sans ml-2">(ETAPA PILOTO)</span>
                      </h3>
                      <p className="font-sans text-xs text-gray-600 mt-1 max-w-xl">
                        Sagas experimentales creadas libremente antes de formalizar el rumbo y los guiones definitivos de la serie.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowClassic(!showClassic)}
                      className="font-[var(--font-bangers)] text-sm tracking-wider px-5 py-2 border-2 border-white/20 bg-transparent hover:bg-white/5 text-white/50 hover:text-white uppercase transition-all shadow-[3px_3px_0_rgba(255,255,255,0.05)] active:translate-y-0.5 active:translate-x-0.5 cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      {showClassic ? "Ocultar Pilotos" : "Ver Etapas Anteriores"}
                    </button>
                  </div>

                  {showClassic && (
                    <div className="mt-12 flex flex-col gap-32 border-t-2 border-dashed border-white/10 pt-12">
                      {classicSagas.map((saga) => {
                        const fullIndex = sagasList.findIndex((s) => s.id === saga.id);
                        const prevSaga = fullIndex > 0 ? sagasList[fullIndex - 1] : null;
                        return (
                          <SagaBlock
                            key={saga.id}
                            saga={saga}
                            index={fullIndex}
                            prevSaga={prevSaga}
                            onCoverClick={(url) => setLightboxSaga({ url, title: saga.title })}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <CharacterRoster />

      {/* Global overlays like upcoming/production drawer */}
      <AnimatePresence>
        {isUpcomingExpanded && (
          <motion.div
            key="upcoming-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-md z-[9999]"
            style={{ zIndex: 9999 }}
            onClick={() => setIsUpcomingExpanded(false)}
          />
        )}
      </AnimatePresence>

      {proximamenteSagas.length > 0 && (
        <motion.aside
          key="upcoming-drawer"
          initial={{ x: "100%" }}
          animate={{ x: isUpcomingExpanded ? "0%" : "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.85 }}
          className="fixed right-0 top-0 h-screen w-[calc(100%-3.5rem)] sm:w-[78%] max-w-3xl border-l-4 border-[#D7263D] bg-[#021e25]/95 p-5 sm:p-7 shadow-[-12px_0_35px_rgba(0,0,0,0.5)] backdrop-blur-xl flex flex-col z-[10000]"
          style={{ zIndex: 10000 }}
        >
          {/* Blueprint grid for drawer background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
            style={{
              backgroundImage: "radial-gradient(circle, #D7263D 1.5px, transparent 1.5px)",
              backgroundSize: "14px 14px",
            }}
          />
          <button
            type="button"
            onClick={() => setIsUpcomingExpanded((isOpen) => !isOpen)}
            aria-label={isUpcomingExpanded ? "Cerrar" : "Ver en producción"}
            className="absolute left-0 top-32 sm:top-40 -translate-x-full h-56 sm:h-64 w-8 sm:w-11 border-4 border-r-0 border-[#D7263D] bg-gradient-to-b from-[#ab1b2c] via-[#D7263D] to-[#ab1b2c] text-white shadow-[-6px_6px_0_#000] hover:text-[#f5e642] hover:from-[#D7263D] hover:to-[#ff3b51] rounded-l-2xl transition-all duration-300 cursor-pointer flex flex-col items-center justify-start pt-6 gap-6 group z-[10010]"
            style={{ zIndex: 10010 }}
          >
            <span className="font-sans text-[10px] font-black animate-pulse transition-transform duration-300 group-hover:-translate-y-1">
              {isUpcomingExpanded ? "▶" : "◀"}
            </span>
            <span
              className="font-[var(--font-bangers)] text-xs sm:text-sm tracking-[0.2em] whitespace-nowrap"
              style={{ writingMode: "vertical-rl" }}
            >
              EN PRODUCCIÓN
            </span>
          </button>

          <div className="relative z-10 flex flex-col h-full overflow-hidden">
            <div className="mb-5 flex items-center justify-between gap-3 border-b-2 border-dashed border-white/20 pb-4 shrink-0">
              <div>
                <p className="font-[var(--font-bangers)] text-[10px] tracking-[0.25em] text-[#D7263D]">ARCHIVO DE AVANCES</p>
                <h3 className="font-[var(--font-bangers)] text-2xl tracking-wider text-white">PRÓXIMAMENTE</h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 pb-8 scrollbar-thin scrollbar-thumb-[#D7263D]/40 scrollbar-track-transparent">
              {renderSagaGrid(proximamenteSagas, true)}
            </div>
          </div>
        </motion.aside>
      )}

      <AnimatePresence>
        {lightboxSaga && (
          <ImageLightbox
            src={lightboxSaga.url}
            alt={`Portada de la saga ${lightboxSaga.title}`}
            onClose={() => setLightboxSaga(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}



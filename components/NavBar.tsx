"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Users, BookOpen, Lock, Unlock, Menu, X, Compass } from "lucide-react";
import { PasswordPromptModal } from "./PasswordPromptModal";
import { isPreviewAuthBypassedClient } from "@/lib/previewAuthClient";

/**
 * NavBar — Elseframe Comics
 *
 * Header sticky con identidad "Light Background" del manual de marca:
 * - Fondo: Paper Crudo texturizado (brand-grain-light) → #E9E2D3 base
 * - Borde inferior: Blood Red #880D16
 * - Tipografía: Bungee (editorial/ink) para nav items — más acorde al wordmark
 * - Logo: logo_light.webp (logo negro sobre crema) en desktop
 *         icono_mini.webp en mobile
 *
 * Paleta de marca:
 *   Ink Black  #0A0A0A
 *   Blood Red  #880D16
 *   Paper Cream #E9E2D3
 */
export default function NavBar() {
  const [menuOpen, setMenuOpen]                 = useState(false);
  const [sagasList, setSagasList]               = useState<any[]>([]);
  const [unlockAll, setUnlockAll]               = useState(false);
  const [pilotsOpen, setPilotsOpen]             = useState(false);
  const [mobilePilotsOpen, setMobilePilotsOpen] = useState(false);
  const [scrolled, setScrolled]                 = useState(false);

  useEffect(() => {
    const loadSagas = () => {
      fetch("/api/sagas")
        .then((r) => r.json())
        .then((d) => setSagasList(d))
        .catch(() => {});
    };
    loadSagas();

    if (isPreviewAuthBypassedClient()) {
      localStorage.setItem("unlock-all", "true");
      setUnlockAll(true);
    } else {
      setUnlockAll(localStorage.getItem("unlock-all") === "true");
    }

    const checkUnlock = () => {
      if (isPreviewAuthBypassedClient()) {
        setUnlockAll(true);
        return;
      }
      setUnlockAll(localStorage.getItem("unlock-all") === "true");
    };
    const onScroll    = () => setScrolled(window.scrollY > 8);

    window.addEventListener("unlockAllChanged",   checkUnlock);
    window.addEventListener("previewStateChanged", loadSagas);
    window.addEventListener("scroll",             onScroll, { passive: true });
    return () => {
      window.removeEventListener("unlockAllChanged",   checkUnlock);
      window.removeEventListener("previewStateChanged", loadSagas);
      window.removeEventListener("scroll",             onScroll);
    };
  }, []);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const toggleUnlockAll = () => {
    const next = !unlockAll;
    if (next) {
      if (isPreviewAuthBypassedClient()) {
        localStorage.setItem("unlock-all", "true");
        setUnlockAll(true);
        window.dispatchEvent(new Event("unlockAllChanged"));
        return;
      }
      setIsPasswordModalOpen(true);
    } else {
      localStorage.setItem("unlock-all", "false");
      setUnlockAll(false);
      window.dispatchEvent(new Event("unlockAllChanged"));
    }
  };

  const handleUnlockSuccess = () => {
    localStorage.setItem("unlock-all", "true");
    setUnlockAll(true);
    window.dispatchEvent(new Event("unlockAllChanged"));
  };

  /* ─── shared nav link style ─────────────────────────────────────────── */
  const navLink =
    "font-[var(--font-bungee)] text-[14px] tracking-[0.12em] text-[#0A0A0A] " +
    "hover:text-[#880D16] transition-colors uppercase " +
    "pb-0.5 border-b-2 border-transparent hover:border-[#880D16]";

  /* ─── CTA button: ink solid (Alto contraste: fondo negro puro) ───────────────────────── */
  const btnInk =
    "font-[var(--font-bungee)] text-[12px] tracking-[0.12em] uppercase px-5 py-2.5 " +
    "bg-[#0A0A0A] text-[#E9E2D3] border-2 border-[#0A0A0A] " +
    "hover:bg-[#880D16] hover:border-[#880D16] hover:text-[#E9E2D3] " +
    "transition-all shadow-[3px_3px_0_rgba(0,0,0,1)] " +
    "active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,1)] " +
    "shrink-0 flex items-center gap-1.5 cursor-pointer";

  /* ─── CTA button: red solid (Alto contraste: rojo puro) ─────────────────────────── */
  const btnRed =
    "font-[var(--font-bungee)] text-[12px] tracking-[0.12em] uppercase px-5 py-2.5 " +
    "bg-[#880D16] text-[#E9E2D3] border-2 border-[#880D16] " +
    "hover:bg-[#0A0A0A] hover:border-[#0A0A0A] hover:text-[#E9E2D3] " +
    "transition-all shadow-[3px_3px_0_rgba(0,0,0,1)] " +
    "active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,1)] " +
    "shrink-0 flex items-center gap-1.5 cursor-pointer";

  /* ─── outline ghost button (Alto contraste: fondo blanco/crema con borde negro) ───────── */
  const btnGhost =
    "font-[var(--font-bungee)] text-[12px] tracking-[0.12em] uppercase px-5 py-2.5 " +
    "bg-[#F3EFE3] text-[#0A0A0A] border-2 border-[#0A0A0A] " +
    "hover:bg-[#0A0A0A] hover:text-[#E9E2D3] " +
    "transition-all shadow-[3px_3px_0_rgba(0,0,0,1)] " +
    "active:translate-y-0.5 active:translate-x-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,1)] " +
    "shrink-0 flex items-center gap-1.5 cursor-pointer";

  return (
    <>
      <header
        className="site-header sticky top-0 z-50 brand-grain-light transition-shadow duration-300"
        style={{
          borderBottom: "3px solid #880D16",
          boxShadow: scrolled
            ? "0 6px 24px rgba(0,0,0,0.18), 0 1px 0 rgba(136,13,22,0.2)"
            : "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 md:h-24 flex items-center justify-between gap-4">

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <Link
          href="/"
          className="flex items-center shrink-0 hover:opacity-85 transition-opacity"
          aria-label="Elseframe Comics — Inicio"
        >
          {/* Mismo logo de desktop para mobile, pero responsivo de mayor tamaño */}
          <img
            src="/marca/logo_light.webp"
            alt="Elseframe Comics"
            className="h-10 sm:h-12 md:h-14 w-auto object-contain"
          />
        </Link>

        {/* ── Desktop Nav ───────────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-7">

          {/* Cómics Dropdown */}
          <div className="relative group">
            <button className={`${navLink} flex items-center gap-1`}>
              Cómics
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
                className="opacity-70 group-hover:opacity-100 transition-all group-hover:translate-y-0.5 mt-px text-[#0A0A0A]">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Invisible bridge + dropdown */}
            <div className="absolute top-full left-0 pt-2 hidden group-hover:flex flex-col z-50">
              <div
                className="flex flex-col gap-3 p-4 min-w-[280px] max-w-[320px] max-h-[70vh] overflow-y-auto"
                style={{
                  background: "#E9E2D3",
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeBlend in='SourceGraphic' mode='multiply'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23g)' opacity='0.38'/%3E%3C/svg%3E\")",
                  backgroundSize: "200px 200px",
                  border: "2px solid #0A0A0A",
                  boxShadow: "6px 6px 0 #880D16",
                }}
              >
                {/* Official Sagas */}
                {sagasList.filter(s => s.order >= 3).map((saga) => (
                  <div key={saga.id} className="flex flex-col gap-0.5 border-b border-black/15 last:border-0 pb-3 last:pb-0">
                    <p className="font-[var(--font-bungee)] text-[11px] tracking-[0.15em] text-[#880D16] uppercase mb-1">
                      {saga.title}
                    </p>
                    {saga.chapters.map((ch: any) => (
                      <Link key={ch.id} href={`/chapters/${ch.id}`}
                        className="font-[var(--font-bungee)] text-[12px] tracking-wide py-1 text-[#0A0A0A] hover:text-[#E9E2D3] hover:bg-[#0A0A0A] transition-all block px-2">
                        <span className="text-[#880D16] mr-2">#{ch.number}</span>{ch.title}
                      </Link>
                    ))}
                  </div>
                ))}

                {/* Pilots — Collapsible */}
                {sagasList.some(s => s.order < 3) && (
                  <div className="flex flex-col pt-1">
                    <button
                      onClick={() => setPilotsOpen(!pilotsOpen)}
                      className="w-full flex items-center justify-between font-[var(--font-bungee)] text-[10px] tracking-[0.12em] text-[#0A0A0A]/65 hover:text-[#880D16] py-2 border-t border-black/15 transition-colors cursor-pointer select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-[9px] bg-black/10 text-black/60 px-1 border border-black/10">PILOTO</span>
                        ANTERIORES
                      </span>
                      <span className={`transition-transform duration-200 text-[10px] ${pilotsOpen ? "rotate-180 text-[#880D16]" : ""}`}>▼</span>
                    </button>

                    {pilotsOpen && (
                      <div className="flex flex-col gap-2 mt-2 pl-1 border-l-2 border-dashed border-black/15 animate-fadeIn">
                        {sagasList.filter(s => s.order < 3).map((saga) => (
                          <div key={saga.id} className="flex flex-col gap-0.5 pb-2 last:pb-0">
                            <p className="font-[var(--font-bungee)] text-[9px] tracking-wider text-[#880D16]/80 uppercase">
                              {saga.title}
                            </p>
                            {saga.chapters.map((ch: any) => (
                              <Link key={ch.id} href={`/chapters/${ch.id}`}
                                className="font-[var(--font-bungee)] text-[11px] tracking-wide py-0.5 text-[#0A0A0A]/70 hover:text-[#E9E2D3] hover:bg-[#0A0A0A] transition-all block px-1.5">
                                <span className="text-[#880D16] mr-1.5 text-[10px]">#{ch.number}</span>{ch.title}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lore */}
          <Link href="/lore" className={navLink}>LORE</Link>

          {/* Personajes */}
          <Link href="/#pibes" className={btnGhost}>
            <Users className="w-4 h-4" />
            PIBES
          </Link>

          {/* Leer Cómic — CTA principal */}
          <Link href="/#sagas" className={btnRed}>
            <BookOpen className="w-4 h-4" />
            LEER
          </Link>

          {/* Spoilers Toggle */}
          <button onClick={toggleUnlockAll} className={btnInk}>
            {unlockAll ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{unlockAll ? "SPOILERS ON" : "SPOILERS"}</span>
          </button>
        </nav>

        {/* ── Mobile Actions (Rediseñados para máximo contraste y tamaño óptimo) ── */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/lore" title="Lore"
            className="p-2.5 border-2 border-[#0A0A0A] bg-[#F3EFE3] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#E9E2D3] transition-all shadow-[2px_2px_0_rgba(0,0,0,1)] active:scale-95 shrink-0">
            <Compass className="w-5 h-5" />
          </Link>
          <Link href="/#pibes" title="Personajes"
            className="p-2.5 border-2 border-[#0A0A0A] bg-[#F3EFE3] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#E9E2D3] transition-all shadow-[2px_2px_0_rgba(0,0,0,1)] active:scale-95 shrink-0">
            <Users className="w-5 h-5" />
          </Link>
          <Link href="/#sagas" title="Leer Cómic"
            className="p-2.5 border-2 border-[#0A0A0A] bg-[#880D16] text-[#E9E2D3] hover:bg-[#0A0A0A] hover:text-[#E9E2D3] transition-all shadow-[2px_2px_0_rgba(0,0,0,1)] active:scale-95 shrink-0">
            <BookOpen className="w-5 h-5" />
          </Link>
          <button onClick={toggleUnlockAll} title={unlockAll ? "Ocultar spoilers" : "Mostrar spoilers"}
            className="p-2.5 border-2 border-[#0A0A0A] bg-[#0A0A0A] text-[#E9E2D3] hover:bg-[#880D16] hover:border-[#880D16] transition-all shadow-[2px_2px_0_rgba(0,0,0,1)] active:scale-95 shrink-0 cursor-pointer">
            {unlockAll ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2.5 border-2 border-[#0A0A0A] bg-[#F3EFE3] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#E9E2D3] transition-colors cursor-pointer"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown ───────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="md:hidden px-5 py-6 flex flex-col gap-4 overflow-y-auto brand-grain-light"
          style={{
            borderTop: "1px solid #880D16",
            maxHeight: "calc(100vh - 64px)",
          }}
        >
          {/* Logo en el drawer */}
          <div className="flex justify-center pb-3 border-b border-black/10">
            <img
              src="/marca/logo_light_mini.webp"
              alt="Elseframe Comics"
              className="h-9 w-auto object-contain"
            />
          </div>

          <Link href="/#sagas" onClick={() => setMenuOpen(false)}
            className="w-full font-[var(--font-bungee)] text-sm text-center tracking-[0.1em] py-3 border-2 border-[#880D16] bg-[#880D16] hover:bg-[#a01020] text-[#E9E2D3] uppercase transition-all shadow-[3px_3px_0_rgba(0,0,0,0.2)] active:translate-y-0.5 active:translate-x-0.5 block">
            Leer Cómic →
          </Link>

          <Link href="/lore" onClick={() => setMenuOpen(false)}
            className="w-full font-[var(--font-bungee)] text-sm text-center tracking-[0.1em] py-3 border-2 border-[#0A0A0A]/25 bg-transparent hover:bg-black/5 text-[#0A0A0A] uppercase transition-all shadow-[3px_3px_0_rgba(0,0,0,0.08)] block">
            LORE
          </Link>

          <button onClick={toggleUnlockAll}
            className="w-full font-[var(--font-bungee)] text-sm tracking-[0.1em] py-3 border-2 uppercase transition-all shadow-[3px_3px_0_rgba(0,0,0,0.15)] cursor-pointer"
            style={{
              borderColor: unlockAll ? "#555" : "#0A0A0A",
              background:  unlockAll ? "#555" : "#0A0A0A",
              color: "#E9E2D3",
            }}
          >
            {unlockAll ? "✕ Ocultar Spoilers" : "🔓 Desbloquear Todo"}
          </button>

          {/* Sagas oficiales */}
          {sagasList.filter(s => s.order >= 3).map((saga) => (
            <div key={saga.id}>
              <p className="font-[var(--font-bungee)] text-sm mb-2 tracking-[0.1em] text-[#880D16] uppercase">
                {saga.title}
              </p>
              {saga.chapters.map((ch: any) => (
                <Link key={ch.id} href={`/chapters/${ch.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="font-[var(--font-bungee)] text-[13px] tracking-wide pl-4 py-1.5 block text-[#0A0A0A]/60 hover:text-[#880D16] hover:pl-6 transition-all border-l-2 border-black/15 hover:border-[#880D16] mb-1">
                  <span className="text-[#880D16] mr-2">#{ch.number}</span>{ch.title}
                </Link>
              ))}
            </div>
          ))}

          {/* Pilots — collapsible */}
          {sagasList.some(s => s.order < 3) && (
            <div className="flex flex-col border-t border-black/10 pt-3">
              <button
                onClick={() => setMobilePilotsOpen(!mobilePilotsOpen)}
                className="w-full flex items-center justify-between font-[var(--font-bungee)] text-sm tracking-[0.1em] text-[#880D16] py-2 cursor-pointer select-none"
              >
                <span className="flex items-center gap-2">
                  <span className="text-[10px] bg-black/10 text-black/50 px-1.5 py-0.5 border border-black/10">PILOTO</span>
                  ANTERIORES
                </span>
                <span className={`transition-transform duration-200 ${mobilePilotsOpen ? "rotate-180" : ""}`}>▼</span>
              </button>

              {mobilePilotsOpen && (
                <div className="flex flex-col gap-3 mt-3 pl-2 border-l-2 border-dashed border-black/15 animate-fadeIn">
                  {sagasList.filter(s => s.order < 3).map((saga) => (
                    <div key={saga.id}>
                      <p className="font-[var(--font-bungee)] text-xs mb-1 tracking-wider text-[#0A0A0A]/70 uppercase">
                        {saga.title}
                      </p>
                      {saga.chapters.map((ch: any) => (
                        <Link key={ch.id} href={`/chapters/${ch.id}`}
                          onClick={() => setMenuOpen(false)}
                          className="font-[var(--font-bungee)] text-[12px] tracking-wide pl-3 py-1 block text-[#0A0A0A]/50 hover:text-[#880D16] transition-all border-l border-black/10 mb-0.5">
                          <span className="text-[#880D16] mr-1.5 text-[10px]">#{ch.number}</span>{ch.title}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handleUnlockSuccess}
      />
    </>
  );
}

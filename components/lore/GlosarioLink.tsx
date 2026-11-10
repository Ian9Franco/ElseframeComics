"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const GLOSARIO_CHARS: Record<string, { name: string; role: string; color: string; image: string; tag: string }> = {
  ian:    { name: "Ian",    role: "Vesperwing",  color: "#10b981", image: "/personajes/CLOSEUP/elseframe/VESPERWING/IAN_FACE.webp",    tag: "Humano / Nexo Estratégico sin poderes biológicos" },
  jaz:    { name: "Jaz",   role: "Sigil",       color: "#f5e642", image: "/personajes/CLOSEUP/elseframe/ORACLE/JAZ_FACE.webp",    tag: "Enlace Dimensional / Soporte Defensivo" },
  julian: { name: "Julián",role: "Bandit",      color: "#3b82f6", image: "/personajes/CLOSEUP/elseframe/WILDCARD/JULIAN_FACE.webp", tag: "Hostigador Energético / Constructos Glitch" },
  mati:   { name: "Mati",  role: "Farsight",    color: "#a855f7", image: "/personajes/CLOSEUP/elseframe/SWAPFIRE/MATI_FACE.webp",   tag: "Nexo Multiversal / Plasma Violeta" },
  uandi:  { name: "Uandi", role: "Aegis",       color: "#ef4444", image: "/personajes/CLOSEUP/elseframe/AEGIS/UANDI_FACE.webp",  tag: "Tanque y protector / Ira Regenerativa" },
  volvo:  { name: "Volvo", role: "Outrider",    color: "#f97316", image: "/personajes/CLOSEUP/elseframe/VECTOR/VOLVO_FACE.webp",  tag: "Movilidad Absoluta / Portales y Velocidad" },
  sofi:   { name: "Sofi",  role: "Dusk",        color: "#06b6d4", image: "/personajes/CLOSEUP/elseframe/HUSH/SOFI_FACE.webp",   tag: "Duelista Acústica / Reconocimiento Avanzado" },
};

export function GlosarioLink({ id, children }: { id: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const charData = GLOSARIO_CHARS[id];
  if (!charData) return <span className="font-bold text-white">{children}</span>;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-character-modal", { detail: { id } }));
  };

  return (
    <span
      className="relative inline-block cursor-pointer group"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={handleClick}
    >
      <strong
        className="underline decoration-dotted decoration-2 transition-all duration-200 hover:text-white"
        style={{ color: charData.color, textDecorationColor: charData.color }}
      >
        {children}
      </strong>
      <AnimatePresence>
        {visible && (
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 p-3 bg-[#13131e] border-2 border-white rounded shadow-[5px_5px_0_#000] w-[210px] text-left leading-normal block cursor-default"
          >
            <span className="flex gap-2.5 items-center">
              <img src={charData.image} alt={charData.name} className="w-10 h-10 rounded-full border border-white/20 object-cover bg-gray-800 shrink-0" />
              <span className="min-w-0 flex flex-col">
                <span className="font-[var(--font-bangers)] text-base text-white tracking-wider leading-none">{charData.name.toUpperCase()}</span>
                <span className="font-[var(--font-marker)] text-[9px] uppercase tracking-wider block mt-0.5" style={{ color: charData.color }}>{charData.role}</span>
              </span>
            </span>
            <span className="font-sans text-[10px] text-gray-400 block mt-2 pt-1.5 border-t border-white/10 uppercase">{charData.tag}</span>
            <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

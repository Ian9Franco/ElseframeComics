"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, X } from "lucide-react";
import { startPublish, usePublishStatus } from "@/lib/publishStatusStore";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PublishModal({ isOpen, onClose }: PublishModalProps) {
  const [message, setMessage] = useState("chore: sync y actualizaciones de diálogos/cómics");
  const publish = usePublishStatus();
  const busy = publish.phase === "starting" || publish.phase === "running";

  if (!isOpen) return null;

  const handlePublish = () => {
    if (busy) return;
    void startPublish(message);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#12121c] text-zinc-100 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-[var(--font-bangers)] text-2xl tracking-wide text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-[#e8185a]" />
            Publicar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/5"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Lleva lo guardado en el editor (diálogos, configuración de saga y capítulo, páginas) a{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-[12px] text-zinc-100">main</code> para que lo vean todos
            los lectores. Podés seguir editando mientras corre; te avisamos arriba cuando termine.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Mensaje del commit</span>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePublish()}
              className="w-full rounded border border-white/10 bg-[#0a0a0f] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#e8185a]"
            />
          </label>

          {busy && (
            <p className="text-xs text-amber-300">Ya hay una publicación en curso. Esperá a que termine.</p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={handlePublish}
            className="min-h-11 w-full rounded bg-[#e8185a] font-[var(--font-bangers)] text-xl tracking-wide text-white transition-colors hover:bg-[#ff2a6d] disabled:opacity-40 disabled:pointer-events-none"
          >
            Publicar ahora
          </button>
        </div>
      </motion.div>
    </div>
  );
}

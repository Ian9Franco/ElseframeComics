"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PublishModal({ isOpen, onClose }: PublishModalProps) {
  const [message, setMessage] = useState("chore: sync y actualizaciones de diálogos/cómics");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);
  const [runId, setRunId] = useState<number | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isOpen && status === "running") {
      interval = setInterval(() => {
        const savedPass = typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "";
        const qs = runId ? `?runId=${runId}` : "";
        fetch(`/api/editor/publish${qs}`, { headers: { "x-editor-password": savedPass } })
          .then((r) => r.json())
          .then((d) => {
            if (d.status) setStatus(d.status);
            if (d.log) setLog(d.log);
            if (d.runId) setRunId(d.runId);
          });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isOpen, status, runId]);

  const handlePublish = async () => {
    setStatus("running");
    setLog(["Iniciando..."]);
    const savedPass = typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "";
    const res = await fetch("/api/editor/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-editor-password": savedPass },
      body: JSON.stringify({ message }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.runId) setRunId(data.runId);
    if (!res.ok) {
      setStatus("error");
      const err = data.error || "No se pudo disparar la publicación";
      setLog([
        err,
        "\n\nSi dice «Bad credentials» o token inválido: en Vercel → Settings → Environment Variables, revisá GITHUB_EDITOR_TOKEN (PAT fine-grained, Contents + Actions en ElseframeComics). No uses un token viejo ni el secret de Actions (ELSEFRAME_PUBLISH_TOKEN) en Vercel.",
      ]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border-4 border-[#0a0a0f] shadow-[8px_8px_0_#0a0a0f] max-w-2xl w-full p-6 flex flex-col gap-4 max-h-[90vh]"
      >
        <div className="flex justify-between items-center border-b-2 border-[#0a0a0f] pb-2">
          <h2 className="font-[var(--font-bangers)] text-2xl text-[#0a0a0f] tracking-wide">
            ⚡ Publicar Proyecto
          </h2>
          <button onClick={onClose} className="font-bold text-xl hover:text-rose-500">×</button>
        </div>
        
        {status === "idle" && (
          <>
            <p className="text-sm text-zinc-600">
              Esto publica el workspace del editor. En local corre <code className="bg-zinc-100 px-1 rounded border border-zinc-300">npm run publish:all</code>. En producción dispara GitHub Actions (WebP, audio, sync, commit y push a main).
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">Mensaje de Commit</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="border-2 border-[#0a0a0f] bg-white text-[#0a0a0f] font-medium p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8185a]"
              />
              <span className="text-[10px] text-zinc-500 italic mt-0.5">
                * Se agregará automáticamente la fecha, la hora y el detalle de los cambios detectados en el repositorio.
              </span>
            </div>
            <button
              onClick={handlePublish}
              className="bg-[#e8185a] text-white font-[var(--font-bangers)] text-xl py-2 px-4 border-2 border-[#0a0a0f] shadow-[3px_3px_0_#0a0a0f] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_#0a0a0f] transition-all"
            >
              🚀 Iniciar Publicación
            </button>
          </>
        )}

        {status !== "idle" && (
          <div className="flex flex-col gap-3 flex-1 overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm uppercase">Estado: {status}</span>
              {status === "running" && <span className="animate-pulse text-[#e8185a]">Ejecutando...</span>}
            </div>
            <div className="bg-[#0a0a0f] text-green-400 p-3 rounded font-mono text-xs h-64 overflow-y-auto whitespace-pre-wrap">
              {log.join("")}
            </div>
            {status !== "running" && (
              <button
                onClick={() => {
                  setStatus("idle");
                  onClose();
                }}
                className="bg-zinc-200 text-[#0a0a0f] font-[var(--font-bangers)] text-xl py-2 px-4 border-2 border-[#0a0a0f] shadow-[3px_3px_0_#0a0a0f] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_#0a0a0f] transition-all mt-2"
              >
                Cerrar
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

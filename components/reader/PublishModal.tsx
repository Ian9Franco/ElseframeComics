"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PublishModal({ isOpen, onClose }: PublishModalProps) {
  const [message, setMessage] = useState("chore: sync y actualizaciones de diálogos/cómics");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);
  const [runId, setRunId] = useState<number | null>(null);
  const [workflowRunUrl, setWorkflowRunUrl] = useState<string | null>(null);
  const publishStartedRef = useRef(false);
  const runIdRef = useRef<number | null>(null);

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    if (!isOpen && status !== "running") {
      setStatus("idle");
      setLog([]);
      setRunId(null);
      setWorkflowRunUrl(null);
      publishStartedRef.current = false;
    }
  }, [isOpen, status]);

  useEffect(() => {
    if (!isOpen || status !== "running") return undefined;

    const interval = setInterval(() => {
      const savedPass = typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "";
      const qs = runIdRef.current ? `?runId=${runIdRef.current}` : "";
      fetch(`/api/editor/publish${qs}`, { headers: { "x-editor-password": savedPass } })
        .then((r) => r.json())
        .then((d) => {
          if (d.status) setStatus(d.status);
          if (d.log) {
            setLog(d.log);
            const logText = Array.isArray(d.log) ? d.log.join("") : String(d.log);
            const urlMatch = logText.match(/https:\/\/github\.com\/[^\s\n]+/);
            setWorkflowRunUrl(urlMatch ? urlMatch[0] : null);
          }
          if (d.runId) {
            runIdRef.current = d.runId;
            setRunId(d.runId);
          }
          if (d.status === "success" || d.status === "error") {
            publishStartedRef.current = false;
          }
        });
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, status]);

  const handlePublish = useCallback(async () => {
    if (publishStartedRef.current || status === "running") return;
    publishStartedRef.current = true;
    setStatus("running");
    setLog(["Iniciando..."]);
    setRunId(null);
    runIdRef.current = null;
    setWorkflowRunUrl(null);

    const savedPass = typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "";
    try {
      const res = await fetch("/api/editor/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-editor-password": savedPass },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.runId) {
        runIdRef.current = data.runId;
        setRunId(data.runId);
      }
      if (!res.ok) {
        const err = data.error || "No se pudo disparar la publicación";
        if (res.status === 409 && data.runId) {
          setStatus("running");
          setLog([err, `\n\nSeguimiento del run ${data.runId}…`]);
          return;
        }
        setStatus("error");
        publishStartedRef.current = false;
        const tokenHint =
          "\n\nToken en Vercel (GITHUB_EDITOR_TOKEN): PAT fine-grained con ElseframeComics + theboyz-comic-v1, Contents y Actions read/write. Luego redeploy.";
        if (/already in progress|ya hay una publicación/i.test(err)) {
          setLog([err, "\n\nSi no hay nada corriendo en GitHub Actions, cerrá el modal y volvé a intentar tras el próximo deploy."]);
        } else if (/credentials|token|accessible/i.test(err)) {
          setLog([err, tokenHint]);
        } else {
          setLog([err]);
        }
        return;
      }
      setLog((prev) => [...prev, data.runId ? `\nRun ${data.runId} en GitHub Actions…` : "\nEsperando run en GitHub Actions…"]);
    } catch (e) {
      publishStartedRef.current = false;
      setStatus("error");
      setLog([e instanceof Error ? e.message : "Error de red al publicar"]);
    }
  }, [message, status]);

  if (!isOpen) return null;

  const publishDisabled = status === "running" || publishStartedRef.current;

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
          <button type="button" onClick={onClose} className="font-bold text-xl hover:text-rose-500">×</button>
        </div>
        
        {status === "idle" && (
          <>
            <p className="text-sm text-zinc-600">
              <strong className="text-[#0a0a0f]">Guardar JSON</strong> guarda en el workspace del editor (rama{" "}
              <code className="bg-zinc-100 px-1 rounded border border-zinc-300">editor-workspace</code>).{" "}
              <strong className="text-[#0a0a0f]">Publicar</strong> lleva ese workspace a{" "}
              <code className="bg-zinc-100 px-1 rounded border border-zinc-300">main</code> para que todos los lectores lo vean.
            </p>
            <p className="text-xs text-zinc-500">
              En local corre <code className="bg-zinc-100 px-0.5 rounded">npm run publish:all</code>. En producción dispara GitHub Actions (sync, commit y push a main + deploy Vercel).
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
              type="button"
              disabled={publishDisabled}
              onClick={handlePublish}
              className="bg-[#e8185a] text-white font-[var(--font-bangers)] text-xl py-2 px-4 border-2 border-[#0a0a0f] shadow-[3px_3px_0_#0a0a0f] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_#0a0a0f] transition-all disabled:opacity-50 disabled:pointer-events-none"
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
            {workflowRunUrl && (
              <a
                href={workflowRunUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#e8185a] font-bold underline"
              >
                Ver ejecución en GitHub Actions
              </a>
            )}
            {status === "success" && (
              <p className="text-xs text-zinc-600">
                Cuando Vercel termine el deploy, abrí el capítulo en modo lectura (sin editor) en otro navegador para confirmar.
              </p>
            )}
            {status !== "running" && (
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setRunId(null);
                  runIdRef.current = null;
                  setWorkflowRunUrl(null);
                  publishStartedRef.current = false;
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

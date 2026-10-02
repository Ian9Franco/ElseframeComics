"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Loader2, X, XCircle } from "lucide-react";
import { dismissPublishStatus, publishRunUrl, usePublishStatus } from "@/lib/publishStatusStore";

const SUCCESS_AUTO_HIDE_MS = 15_000;

export function PublishStatusToast() {
  const publish = usePublishStatus();
  const visible = publish.phase !== "idle";
  const running = publish.phase === "starting" || publish.phase === "running";
  const runUrl = publishRunUrl(publish.runId);

  useEffect(() => {
    if (publish.phase !== "success") return;
    const t = setTimeout(dismissPublishStatus, SUCCESS_AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [publish.phase]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[400] flex justify-center px-3">
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="pointer-events-auto w-full max-w-[26rem]"
          role="status"
          aria-live="polite"
        >
          <div
            className={`rounded-lg border bg-[#12121c]/95 px-4 py-3 text-sm text-zinc-100 shadow-xl shadow-black/50 backdrop-blur ${
              publish.phase === "error"
                ? "border-red-500/40"
                : publish.phase === "success"
                ? "border-emerald-500/40"
                : "border-white/10"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                {running && <Loader2 className="h-4 w-4 animate-spin text-[#e8185a]" />}
                {publish.phase === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {publish.phase === "error" && <XCircle className="h-4 w-4 text-red-400" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold text-white">
                  {running && "Publicando…"}
                  {publish.phase === "success" && "Publicado"}
                  {publish.phase === "error" && "Falló la publicación"}
                </p>

                {running && publish.currentStep && (
                  <p className="mt-0.5 truncate text-xs text-zinc-400">{publish.currentStep}</p>
                )}
                {publish.phase === "success" && (
                  <p className="mt-0.5 text-xs text-zinc-400">Vercel está desplegando; en 1–3 min se ve en el sitio.</p>
                )}
                {publish.phase === "error" && (
                  <div className="mt-1 space-y-1 text-xs text-zinc-300">
                    {publish.failedStep && <p className="text-zinc-400">Paso: {publish.failedStep}</p>}
                    {(publish.errors.length ? publish.errors : ["Revisá el detalle en GitHub Actions."])
                      .slice(0, 2)
                      .map((err) => (
                        <p key={err} className="line-clamp-3 break-words">
                          {err}
                        </p>
                      ))}
                  </div>
                )}
                {publish.warnings.length > 0 && publish.phase !== "running" && (
                  <p className="mt-1 line-clamp-2 break-words text-xs text-amber-300">{publish.warnings[0]}</p>
                )}

                {runUrl && (
                  <a
                    href={runUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#ff4f86] hover:underline"
                  >
                    Ver en GitHub Actions <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {!running && (
                <button
                  type="button"
                  onClick={dismissPublishStatus}
                  className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded text-zinc-400 hover:bg-white/5 hover:text-white"
                  aria-label="Cerrar aviso"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}

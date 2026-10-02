"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  ArrowDown01,
  ArrowDown10,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  MessageSquare,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { getComicPageUrl, getPageKeyFromUrl } from "@/components/reader/readerUtils";
import type { Dialogues } from "@/components/reader/audioPlayer";
import { summarizePageContent } from "@/lib/pageRemap";

type PageItem = {
  id: string;
  /** Clave actual en el repo (null mientras la imagen no se subió). */
  key: string | null;
  src: string;
  file?: File;
  deleted?: boolean;
};

/** Margen bajo el límite de 4.5 MB por request de Vercel (base64 suma ~33%). */
const MAX_UPLOAD_BYTES = 3_000_000;

function editorPass() {
  return typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function toUploadPayload(file: File): Promise<{ fileName: string; data: string }> {
  if (file.type === "image/webp" && file.size <= MAX_UPLOAD_BYTES) {
    return { fileName: "page.webp", data: await blobToBase64(file) };
  }
  const bitmap = await createImageBitmap(file);
  let scale = 1;
  let quality = 0.9;
  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      const ext = blob.type === "image/webp" ? ".webp" : blob.type === "image/png" ? ".png" : ".jpg";
      return { fileName: `page${ext}`, data: await blobToBase64(blob) };
    }
    if (quality > 0.7) quality -= 0.1;
    else scale *= 0.85;
  }
  throw new Error(`"${file.name}" es demasiado grande incluso comprimida`);
}

function compareKeys(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function PageManager({
  pages,
  pageIdx,
  chapterId,
  localDialogues,
  hasUnsavedChanges = false,
  onClose,
  onApplied,
}: {
  pages: string[];
  pageIdx: number;
  chapterId: string;
  localDialogues: Dialogues;
  hasUnsavedChanges?: boolean;
  onClose: () => void;
  onApplied: () => void;
}) {
  const initial = useMemo<PageItem[]>(
    () => pages.map((src) => ({ id: `p-${getPageKeyFromUrl(src)}`, key: getPageKeyFromUrl(src), src })),
    [pages]
  );
  const [items, setItems] = useState<PageItem[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = items.filter((i) => !i.deleted);
  const originalOrder = initial.map((i) => i.key).join("|");
  const stats = useMemo(() => {
    const deleted = items.filter((i) => i.deleted && i.key).length;
    const added = items.filter((i) => i.file && !i.deleted).length;
    const moved = active.filter((item, idx) => item.key && initial[idx]?.key !== item.key).length;
    return { deleted, added, moved };
  }, [items, active, initial]);
  const dirty =
    stats.deleted > 0 || stats.added > 0 || active.map((i) => i.key).join("|") !== originalOrder;

  const moveTo = (id: string, targetIdx: number) => {
    setItems((prev) => {
      const visible = prev.filter((i) => !i.deleted);
      const from = visible.findIndex((i) => i.id === id);
      if (from < 0 || targetIdx < 0 || targetIdx >= visible.length) return prev;
      const next = [...visible];
      const [moved] = next.splice(from, 1);
      next.splice(targetIdx, 0, moved);
      return [...next, ...prev.filter((i) => i.deleted)];
    });
  };

  const sortBy = (direction: "asc" | "desc") => {
    setItems((prev) => {
      const existing = prev.filter((i) => !i.deleted && i.key).sort((a, b) => compareKeys(a.key!, b.key!));
      if (direction === "desc") existing.reverse();
      const added = prev.filter((i) => !i.deleted && !i.key);
      return [...existing, ...added, ...prev.filter((i) => i.deleted)];
    });
  };

  const toggleDelete = (id: string) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.id !== id) return [i];
        if (i.file) return [];
        return [{ ...i, deleted: !i.deleted }];
      })
    );
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = [...fileList].sort((a, b) => compareKeys(a.name, b.name));
    setItems((prev) => {
      const visible = prev.filter((i) => !i.deleted);
      const added = files.map((file, n) => ({
        id: `new-${Date.now()}-${n}`,
        key: null,
        src: URL.createObjectURL(file),
        file,
      }));
      return [...visible, ...added, ...prev.filter((i) => i.deleted)];
    });
  };

  const apply = async () => {
    if (hasUnsavedChanges) {
      setError("Guardá los diálogos (Guardar JSON) antes de reordenar: se remapean en el servidor.");
      return;
    }
    setError(null);
    const pending = active.filter((i) => i.file);
    const uploadedKeys = new Map<string, string>();
    try {
      for (let n = 0; n < pending.length; n++) {
        const item = pending[n];
        setBusy(`Subiendo ${n + 1}/${pending.length}…`);
        const payload = await toUploadPayload(item.file!);
        const res = await fetch("/api/editor/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-editor-password": editorPass() },
          body: JSON.stringify({ action: "upload", chapterId, ...payload }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.key) throw new Error(json.error || `No se pudo subir "${item.file!.name}"`);
        uploadedKeys.set(item.id, String(json.key));
      }

      const orderedKeys = active.map((i) => i.key ?? uploadedKeys.get(i.id)!);
      const deletedKeys = items.filter((i) => i.deleted && i.key).map((i) => i.key!);
      const naturalOrder = [...initial.map((i) => i.key!), ...pending.map((i) => uploadedKeys.get(i.id)!)];
      const needsLayout = deletedKeys.length > 0 || orderedKeys.join("|") !== naturalOrder.join("|");

      if (needsLayout) {
        setBusy("Renumerando y remapeando diálogos…");
        const res = await fetch("/api/editor/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-editor-password": editorPass() },
          body: JSON.stringify({ action: "apply", chapterId, orderedKeys, deletedKeys }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "No se pudo aplicar el orden");
      }
      localStorage.removeItem(`dialogues_backup_${chapterId}`);
      onApplied();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al aplicar cambios";
      setError(
        uploadedKeys.size > 0
          ? `${message} — ${uploadedKeys.size} imagen(es) ya se subieron; recargá antes de reintentar.`
          : message
      );
    } finally {
      setBusy(null);
    }
  };

  const deletedItems = items.filter((i) => i.deleted);

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-4">
      <div className="flex max-h-[94vh] w-full flex-col rounded-t-2xl border border-white/10 bg-[#12121c] pb-[env(safe-area-inset-bottom)] text-zinc-100 md:max-w-5xl md:rounded-xl">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="font-[var(--font-bangers)] text-2xl tracking-wide text-white">Páginas</h2>
            <p className="text-xs text-zinc-400">
              {active.length} páginas · arrastrá o usá las flechas · se guarda en el workspace y se ve al Publicar
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            className="flex min-h-11 min-w-11 items-center justify-center rounded text-zinc-400 hover:bg-white/5 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded bg-[#e8185a] px-3 text-sm font-bold text-white hover:bg-[#ff2a6d]"
          >
            <ImagePlus className="h-4 w-4" /> Subir páginas
          </button>
          <button
            type="button"
            onClick={() => sortBy("asc")}
            className="inline-flex min-h-10 items-center gap-1.5 rounded bg-white/5 px-3 text-sm font-bold text-zinc-200 hover:bg-white/10"
          >
            <ArrowDown01 className="h-4 w-4" /> 1 → N
          </button>
          <button
            type="button"
            onClick={() => sortBy("desc")}
            className="inline-flex min-h-10 items-center gap-1.5 rounded bg-white/5 px-3 text-sm font-bold text-zinc-200 hover:bg-white/10"
          >
            <ArrowDown10 className="h-4 w-4" /> N → 1
          </button>
          <button
            type="button"
            onClick={() => setItems(initial)}
            disabled={!dirty}
            className="inline-flex min-h-10 items-center gap-1.5 rounded bg-white/5 px-3 text-sm font-bold text-zinc-300 hover:bg-white/10 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" /> Deshacer todo
          </button>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-5">
          {active.map((item, idx) => {
            const summary = item.key ? summarizePageContent(localDialogues, item.key) : null;
            const movedFrom = item.key && initial[idx]?.key !== item.key ? item.key : null;
            return (
              <div
                key={item.id}
                draggable={!busy}
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) moveTo(dragId, idx);
                  setDragId(null);
                }}
                className={`group relative overflow-hidden rounded-lg border bg-[#0a0a0f] transition ${
                  dragId === item.id ? "opacity-40" : ""
                } ${item.key && initial[pageIdx]?.key === item.key ? "border-[#e8185a]" : "border-white/10"}`}
              >
                <img
                  src={item.file ? item.src : getComicPageUrl(item.src)}
                  alt={`Página ${idx + 1}`}
                  className="aspect-[3/4] w-full cursor-grab object-cover"
                  draggable={false}
                />
                <span className="absolute left-2 top-2 rounded bg-black/80 px-2 py-0.5 font-[var(--font-bangers)] text-lg leading-none text-white">
                  {idx + 1}
                </span>
                <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
                  {item.file && (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">nueva</span>
                  )}
                  {movedFrom && (
                    <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">era {movedFrom}</span>
                  )}
                  {summary && summary.dialoguesCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-zinc-200">
                      <MessageSquare className="h-3 w-3" /> {summary.dialoguesCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 border-t border-white/10 p-1.5">
                  <button
                    type="button"
                    onClick={() => moveTo(item.id, idx - 1)}
                    disabled={idx === 0 || !!busy}
                    className="flex min-h-10 flex-1 items-center justify-center rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                    aria-label="Mover antes"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTo(item.id, idx + 1)}
                    disabled={idx === active.length - 1 || !!busy}
                    className="flex min-h-10 flex-1 items-center justify-center rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"
                    aria-label="Mover después"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDelete(item.id)}
                    disabled={!!busy}
                    className="flex min-h-10 flex-1 items-center justify-center rounded bg-red-500/15 text-red-300 hover:bg-red-500/30"
                    aria-label="Eliminar página"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {deletedItems.length > 0 && (
          <div className="border-t border-white/10 px-4 py-2">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-red-300">Se eliminarán</p>
            <div className="flex flex-wrap gap-2">
              {deletedItems.map((item) => {
                const s = summarizePageContent(localDialogues, item.key!);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleDelete(item.id)}
                    className="inline-flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-200 hover:bg-red-500/20"
                    title="Restaurar"
                  >
                    <Undo2 className="h-3 w-3" /> Pág. {item.key}
                    {(s.dialoguesCount > 0 || s.audioRefs > 0) && (
                      <span className="text-red-300/80">
                        ({s.dialoguesCount} diálogos{ s.audioRefs ? `, ${s.audioRefs} audio` : ""})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row sm:items-center">
          <div className="flex-1 text-xs text-zinc-400">
            {error ? (
              <span className="text-red-400">{error}</span>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-300">Tenés diálogos sin guardar: guardalos antes de aplicar.</span>
            ) : dirty ? (
              <span>
                {stats.moved > 0 && `${stats.moved} movidas · `}
                {stats.added > 0 && `${stats.added} nuevas · `}
                {stats.deleted > 0 && `${stats.deleted} a eliminar · `}
                Se renumera 1…{active.length} y diálogos, stops y audio siguen a su página.
              </span>
            ) : (
              <span>Sin cambios.</span>
            )}
          </div>
          <button
            type="button"
            disabled={!dirty || !!busy || hasUnsavedChanges}
            onClick={apply}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-[#e8185a] px-6 font-[var(--font-bangers)] text-lg tracking-wide text-white hover:bg-[#ff2a6d] disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {busy}
              </>
            ) : (
              "Aplicar cambios"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

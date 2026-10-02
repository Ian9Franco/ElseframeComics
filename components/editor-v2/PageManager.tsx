"use client";

import React, { useMemo, useRef, useState } from "react";
import { getComicPageUrl, getPageKeyFromUrl } from "@/components/reader/readerUtils";
import type { Dialogues } from "@/components/reader/audioPlayer";
import { summarizePageContent } from "@/lib/pageRemap";

type PageItem = {
  key: string;
  src: string;
  pendingFile?: File;
};

export function PageManager({
  pages,
  pageIdx,
  chapterId,
  localDialogues,
  onClose,
  onApplied,
}: {
  pages: string[];
  pageIdx: number;
  chapterId: string;
  localDialogues: Dialogues;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [items, setItems] = useState<PageItem[]>(() =>
    pages.map((src) => ({ key: getPageKeyFromUrl(src), src }))
  );
  const [deletedKeys, setDeletedKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PageItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pendingUploads = useMemo(() => items.filter((i) => i.pendingFile), [items]);

  const pass = () => (typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "");

  const move = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = [...fileList].sort((a, b) => a.lastModified - b.lastModified);
    setItems((prev) => [
      ...prev,
      ...files.map((file) => ({
        key: `new-${file.name}-${file.lastModified}`,
        src: URL.createObjectURL(file),
        pendingFile: file,
      })),
    ]);
  };

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      if (pendingUploads.length) {
        const form = new FormData();
        form.set("chapterId", chapterId);
        pendingUploads.forEach((item) => item.pendingFile && form.append("files", item.pendingFile));
        const up = await fetch("/api/editor/pages", {
          method: "POST",
          headers: { "x-editor-password": pass() },
          body: form,
        });
        const upJson = await up.json();
        if (!up.ok) throw new Error(upJson.error || "No se pudieron subir las páginas");
      }

      const originalKeys = pages.map((src) => getPageKeyFromUrl(src));
      const existingOrdered = items.filter((i) => !i.pendingFile).map((i) => i.key);
      const orderChanged =
        deletedKeys.length > 0 || existingOrdered.join("|") !== originalKeys.join("|");

      if (orderChanged && existingOrdered.length + deletedKeys.length > 0) {
        const res = await fetch("/api/editor/pages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-editor-password": pass(),
          },
          body: JSON.stringify({
            action: "apply",
            chapterId,
            orderedKeys: existingOrdered,
            deletedKeys,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "No se pudo aplicar el orden");
      }
      onApplied();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[180] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-[#12121c] text-white w-full md:max-w-3xl max-h-[92vh] rounded-t-2xl md:rounded-xl border border-white/10 flex flex-col pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="font-[var(--font-bangers)] text-xl tracking-wide">Páginas</h2>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 text-2xl">
            ×
          </button>
        </div>
        <div className="px-4 py-2 text-xs text-zinc-400">
          Subí desde Fotos/Archivos. El orden inicial usa la fecha del archivo. Aplicar renumera 1, 2, 3… y remapea diálogos/audio.
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, idx) => (
            <div
              key={item.key + idx}
              className={`border rounded-lg overflow-hidden bg-[#161622] ${idx === pageIdx ? "border-[#e8185a]" : "border-white/10"}`}
            >
              <img src={item.pendingFile ? item.src : getComicPageUrl(item.src)} alt="" className="w-full aspect-[3/4] object-cover" />
              <div className="p-2 flex flex-col gap-1">
                <span className="text-[11px] font-bold">
                  #{idx + 1} · {item.pendingFile ? "nueva" : item.key}
                </span>
                <div className="flex gap-1">
                  <button type="button" className="flex-1 min-h-11 bg-zinc-800 rounded" onClick={() => move(idx, -1)}>
                    ↑
                  </button>
                  <button type="button" className="flex-1 min-h-11 bg-zinc-800 rounded" onClick={() => move(idx, 1)}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="flex-1 min-h-11 bg-red-900/70 rounded"
                    onClick={() => setConfirmDelete(item)}
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {error && <p className="px-4 text-sm text-red-400">{error}</p>}
        <div className="p-4 flex flex-col sm:flex-row gap-2 border-t border-white/10">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            className="min-h-11 flex-1 bg-zinc-800 rounded font-bold"
            onClick={() => inputRef.current?.click()}
          >
            Subir imágenes
          </button>
          <button
            type="button"
            disabled={busy}
            className="min-h-11 flex-1 bg-[#e8185a] rounded font-bold disabled:opacity-50"
            onClick={apply}
          >
            {busy ? "Aplicando…" : "Aplicar numeración"}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#1a1a28] border border-white/15 rounded-xl p-4 max-w-sm w-full">
            {(() => {
              const summary = summarizePageContent(localDialogues, confirmDelete.key);
              return (
                <>
                  <p className="font-bold mb-2">¿Eliminar página {confirmDelete.key}?</p>
                  <ul className="text-sm text-zinc-300 mb-4 space-y-1">
                    <li>{summary.dialoguesCount} diálogos</li>
                    <li>{summary.stopsCount} stops</li>
                    <li>{summary.masksCount} máscaras</li>
                    <li>{summary.audioRefs} referencias de audio</li>
                  </ul>
                  <div className="flex gap-2">
                    <button type="button" className="flex-1 min-h-11 bg-zinc-700 rounded" onClick={() => setConfirmDelete(null)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="flex-1 min-h-11 bg-red-700 rounded"
                      onClick={() => {
                        setItems((prev) => prev.filter((i) => i !== confirmDelete));
                        if (!confirmDelete.pendingFile) setDeletedKeys((prev) => [...prev, confirmDelete.key]);
                        setConfirmDelete(null);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

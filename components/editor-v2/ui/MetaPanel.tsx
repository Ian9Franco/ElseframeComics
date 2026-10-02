"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type SagaFields = {
  title: string;
  tagline: string;
  description: string;
  color: string;
  color_secondary: string;
  status: "draft" | "published";
  nuevo: boolean;
  proximamente: boolean;
  date: string;
  estimatedTime: string;
};

type ChapterFields = {
  title: string;
  status: "draft" | "published";
  nuevo: boolean;
  proximamente: boolean;
  date: string;
  releaseDate: string;
  estimatedTime: string;
};

const emptySaga: SagaFields = {
  title: "",
  tagline: "",
  description: "",
  color: "#D7263D",
  color_secondary: "#D7263D",
  status: "published",
  nuevo: false,
  proximamente: false,
  date: "",
  estimatedTime: "",
};

const emptyChapter: ChapterFields = {
  title: "",
  status: "published",
  nuevo: false,
  proximamente: false,
  date: "",
  releaseDate: "",
  estimatedTime: "",
};

function editorPass() {
  return typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full text-sm bg-[#0a0a0f] border border-white/10 rounded px-2 py-1.5 text-zinc-100";

export function MetaPanel({
  sagaId,
  chapterId,
  onClose,
}: {
  sagaId: string;
  chapterId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saga, setSaga] = useState<SagaFields>(emptySaga);
  const [chapter, setChapter] = useState<ChapterFields>(emptyChapter);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle" | "saga" | "chapter">("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<"saga" | "chapter" | null>(null);
  const [shas, setShas] = useState<{ saga: string | null; chapter: string | null }>({ saga: null, chapter: null });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/editor/meta?sagaId=${encodeURIComponent(sagaId)}&chapterId=${encodeURIComponent(chapterId)}`, {
      headers: { "x-editor-password": editorPass() },
    })
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo leer la metadata");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const s = data.saga || {};
        const c = data.chapter || {};
        setShas({ saga: data.sagaSha ?? null, chapter: data.chapterSha ?? null });
        setSaga({
          title: s.title || "",
          tagline: s.tagline || "",
          description: s.description || "",
          color: s.color || "#D7263D",
          color_secondary: s.color_secondary || s.color || "#D7263D",
          status: s.status === "draft" ? "draft" : "published",
          nuevo: !!s.nuevo,
          proximamente: !!s.proximamente,
          date: s.date || "",
          estimatedTime: s.estimatedTime || "",
        });
        setChapter({
          title: c.title || "",
          status: c.status === "draft" ? "draft" : "published",
          nuevo: !!c.nuevo,
          proximamente: !!c.proximamente,
          date: c.date || "",
          releaseDate: c.releaseDate || "",
          estimatedTime: c.estimatedTime || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sagaId, chapterId]);

  const save = async (type: "saga" | "chapter") => {
    setSaving(type);
    setError(null);
    setSavedNotice(null);
    const fields = type === "saga" ? saga : chapter;
    const res = await fetch("/api/editor/meta", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-editor-password": editorPass(),
      },
      body: JSON.stringify({ type, sagaId, chapterId, fields, sha: shas[type] }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving("idle");
    if (!res.ok) {
      setError(data.error || "No se pudo guardar");
      return;
    }
    setShas((prev) => ({ ...prev, [type]: data.sha ?? prev[type] }));
    setSavedNotice(type);
    router.refresh();
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-[#0a0a0f]/70 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#12121c] border-l border-white/10 overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="font-[var(--font-bangers)] text-xl text-white tracking-wide">Configuración</h2>
          <button type="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-zinc-400">Cargando…</div>
        ) : (
          <div className="p-4 space-y-6">
            <p className="text-xs text-zinc-400">
              Guardar deja los cambios en el workspace del editor. Se ven en el sitio cuando usás <strong className="text-zinc-200">Publicar</strong>.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {savedNotice && (
              <p className="text-sm text-emerald-400">
                {savedNotice === "saga" ? "Saga guardada." : "Capítulo guardado."} Pendiente de publicar.
              </p>
            )}

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#e8185a]">Saga</h3>
              <Field label="Título">
                <input className={inputClass} value={saga.title} onChange={(e) => setSaga({ ...saga, title: e.target.value })} />
              </Field>
              <Field label="Tagline">
                <input className={inputClass} value={saga.tagline} onChange={(e) => setSaga({ ...saga, tagline: e.target.value })} />
              </Field>
              <Field label="Descripción">
                <textarea
                  className={`${inputClass} min-h-[88px]`}
                  value={saga.description}
                  onChange={(e) => setSaga({ ...saga, description: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Color primario">
                  <input type="color" className="h-9 w-full bg-transparent" value={saga.color} onChange={(e) => setSaga({ ...saga, color: e.target.value })} />
                </Field>
                <Field label="Color secundario">
                  <input
                    type="color"
                    className="h-9 w-full bg-transparent"
                    value={saga.color_secondary}
                    onChange={(e) => setSaga({ ...saga, color_secondary: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Estado">
                <select
                  className={inputClass}
                  value={saga.status}
                  onChange={(e) => setSaga({ ...saga, status: e.target.value as "draft" | "published" })}
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={saga.nuevo} onChange={(e) => setSaga({ ...saga, nuevo: e.target.checked })} />
                Nuevo
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={saga.proximamente}
                  onChange={(e) => setSaga({ ...saga, proximamente: e.target.checked })}
                />
                Próximamente
              </label>
              <Field label="Fecha">
                <input className={inputClass} value={saga.date} onChange={(e) => setSaga({ ...saga, date: e.target.value })} />
              </Field>
              <Field label="Tiempo estimado">
                <input
                  className={inputClass}
                  value={saga.estimatedTime}
                  onChange={(e) => setSaga({ ...saga, estimatedTime: e.target.value })}
                />
              </Field>
              <button
                type="button"
                onClick={() => save("saga")}
                disabled={saving !== "idle"}
                className="w-full py-2 rounded bg-[#e8185a] text-white font-[var(--font-bangers)] tracking-wide"
              >
                {saving === "saga" ? "Guardando…" : "Guardar saga"}
              </button>
            </section>

            <section className="space-y-3 border-t border-white/10 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#e8185a]">Capítulo</h3>
              <Field label="Título">
                <input className={inputClass} value={chapter.title} onChange={(e) => setChapter({ ...chapter, title: e.target.value })} />
              </Field>
              <Field label="Estado">
                <select
                  className={inputClass}
                  value={chapter.status}
                  onChange={(e) => setChapter({ ...chapter, status: e.target.value as "draft" | "published" })}
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={chapter.nuevo}
                  onChange={(e) => setChapter({ ...chapter, nuevo: e.target.checked })}
                />
                Nuevo
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={chapter.proximamente}
                  onChange={(e) => setChapter({ ...chapter, proximamente: e.target.checked })}
                />
                Próximamente
              </label>
              <Field label="Fecha">
                <input className={inputClass} value={chapter.date} onChange={(e) => setChapter({ ...chapter, date: e.target.value })} />
              </Field>
              <Field label="Fecha de lanzamiento">
                <input
                  className={inputClass}
                  value={chapter.releaseDate}
                  onChange={(e) => setChapter({ ...chapter, releaseDate: e.target.value })}
                />
              </Field>
              <Field label="Tiempo estimado">
                <input
                  className={inputClass}
                  value={chapter.estimatedTime}
                  onChange={(e) => setChapter({ ...chapter, estimatedTime: e.target.value })}
                />
              </Field>
              <button
                type="button"
                onClick={() => save("chapter")}
                disabled={saving !== "idle"}
                className="w-full py-2 rounded bg-[#e8185a] text-white font-[var(--font-bangers)] tracking-wide"
              >
                {saving === "chapter" ? "Guardando…" : "Guardar capítulo"}
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

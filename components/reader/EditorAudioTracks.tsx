"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import type { AudioTrack, AudioTrackStopTrigger, Dialogues } from "./audioPlayer";
import { getPageKeyFromUrl, getComicAssetUrl } from "./readerUtils";
import { filterSoundsForEditorPicker, isReaderSystemSound } from "@/lib/readerSystemSounds";
import {
  describeStopTrigger,
  describeTrackSpan,
  isTrackActiveAtPosition,
  pageNumberFromKey,
} from "@/lib/editorAudioHelpers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditorAudioTracksProps {
  /** Current list of chapter-level audio tracks */
  audioTracks: AudioTrack[];
  /** Ordered pages array (same as what CinematicReader receives) */
  pages: string[];
  /** Full localDialogues object — used to count panels per page */
  localDialogues: Dialogues;
  /** Callback to persist the updated tracks array */
  onUpdate: (tracks: AudioTrack[]) => void;
  /** Current active page index */
  currentPageIdx?: number;
  /** Current active panel index */
  activePanelIdx?: number;
}

type StopTriggerType = "panelEnd" | "panelStart" | "pageStart" | "pageEnd" | "none";

/** Shape of the new-track form state */
interface TrackFormState {
  layer: "music" | "sfx";
  src: string;
  title: string;
  artist: string;
  startPageKey: string;
  startPanelIdx: number;
  stopType: StopTriggerType;
  stopPageKey: string;
  stopPanelIdx: number;
  volume: number;
  playbackRate: number;
  loop: boolean;
  fadeIn: number;
  fadeOut: number;
  delay: number;
  startTime: number;
}

const DEFAULT_FORM: TrackFormState = {
  layer: "music",
  src: "",
  title: "",
  artist: "",
  startPageKey: "",
  startPanelIdx: 0,
  stopType: "none",
  stopPageKey: "",
  stopPanelIdx: 0,
  volume: 0.8,
  playbackRate: 1,
  loop: true,
  fadeIn: 1000,
  fadeOut: 1000,
  delay: 0,
  startTime: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a unique ID for a new audio track */
const genId = () => `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Builds a stopTrigger object from the form state, or returns undefined if "none" */
function buildStopTrigger(form: TrackFormState): AudioTrackStopTrigger | undefined {
  if (form.stopType === "none" || !form.stopPageKey) return undefined;
  if (form.stopType === "panelStart" || form.stopType === "panelEnd") {
    return { type: form.stopType, pageKey: form.stopPageKey, panelIdx: form.stopPanelIdx };
  }
  return { type: form.stopType, pageKey: form.stopPageKey };
}

/** Returns a human-readable description of a stop trigger */
function describeTrigger(trigger?: AudioTrackStopTrigger, pages: string[] = []): string {
  return describeStopTrigger(trigger, pages);
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * EditorAudioTracks
 * Manages chapter-level multi-span audio tracks from within the editor sidebar.
 * Each track can start at a specific panel and stop at any later panel or page boundary.
 * Music and SFX layers are independent and never interrupt each other.
 */
export function EditorAudioTracks({
  audioTracks,
  pages,
  localDialogues,
  onUpdate,
  currentPageIdx,
  activePanelIdx,
}: EditorAudioTracksProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TrackFormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableSounds, setAvailableSounds] = useState<Array<{ name: string; path: string }>>([]);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch available sounds from the API
  useEffect(() => {
    fetch("/api/sounds")
      .then((r) => r.json())
      .then((data) =>
        setAvailableSounds(filterSoundsForEditorPicker(Array.isArray(data) ? data : []))
      )
      .catch((err) => console.error("Error loading sounds:", err));
  }, []);

  // Derive ordered page keys from the pages array
  const pageKeys = pages.map((p) => getPageKeyFromUrl(p)).filter(Boolean) as string[];

  // Count panels for a given pageKey
  const panelCountForPage = (pageKey: string): number =>
    localDialogues.pages?.[pageKey]?.panels?.length ?? 0;

  const editableTracks = useMemo(
    () => audioTracks.filter((t) => !isReaderSystemSound(t.src)),
    [audioTracks]
  );

  // ─── Preview helpers ───────────────────────────────────────────────────────

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setPreviewingId(null);
  };

  const playPreview = (track: AudioTrack) => {
    stopPreview();
    const config = track.soundConfig || {};
    const audio = new Audio(getComicAssetUrl(track.src));
    const targetVolume = Math.max(0, Math.min(1, config.volume ?? 1));
    const playbackRate = config.playbackRate ?? 1;
    const startTime = config.startTime ?? 0;

    audio.volume = targetVolume;
    audio.playbackRate = playbackRate;

    if (startTime > 0) {
      if (audio.readyState >= 1) {
        audio.currentTime = startTime;
      } else {
        audio.addEventListener("loadedmetadata", () => {
          audio.currentTime = startTime;
        }, { once: true });
      }
    }

    audio.addEventListener("playing", () => {
      audio.volume = targetVolume;
      audio.playbackRate = playbackRate;
    }, { once: true });

    previewAudioRef.current = audio;
    setPreviewingId(track.id);
    audio.play().catch(console.error);
    audio.onended = () => setPreviewingId(null);
  };

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const openNewForm = () => {
    const currentKey =
      currentPageIdx !== undefined && pageKeys[currentPageIdx]
        ? pageKeys[currentPageIdx]
        : pageKeys[0] ?? "";
    const currentPanel = activePanelIdx !== undefined ? activePanelIdx : 0;

    setForm({
      ...DEFAULT_FORM,
      startPageKey: currentKey,
      startPanelIdx: currentPanel,
      stopPageKey: currentKey,
      stopPanelIdx: currentPanel,
    });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (track: AudioTrack) => {
    const stopTrigger = track.stopTrigger;
    let stopType: StopTriggerType = "none";
    let stopPageKey = pageKeys[0] ?? "";
    let stopPanelIdx = 0;
    if (stopTrigger) {
      stopType = stopTrigger.type;
      stopPageKey = stopTrigger.pageKey;
      stopPanelIdx = "panelIdx" in stopTrigger ? stopTrigger.panelIdx : 0;
    }
    setForm({
      layer: track.layer,
      src: track.src,
      title: track.title || "",
      artist: track.artist || "",
      startPageKey: track.startPageKey,
      startPanelIdx: track.startPanelIdx,
      stopType,
      stopPageKey,
      stopPanelIdx,
      volume: track.soundConfig?.volume ?? 0.8,
      playbackRate: track.soundConfig?.playbackRate ?? 1,
      loop: track.soundConfig?.loop ?? true,
      fadeIn: track.soundConfig?.fadeIn ?? 1000,
      fadeOut: track.soundConfig?.fadeOut ?? 1000,
      delay: track.soundConfig?.delay ?? 0,
      startTime: track.soundConfig?.startTime ?? 0,
    });
    setEditingId(track.id);
    setShowForm(true);
  };

  const handleFormChange = <K extends keyof TrackFormState>(key: K, val: TrackFormState[K]) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: val };

      // Auto-extract title & artist when user picks a sound src if title is empty
      if (key === "src" && typeof val === "string" && val) {
        const rawFileName = val.split("/").pop() || "";
        const cleanName = decodeURIComponent(rawFileName.split("?")[0]).replace(/\.[^/.]+$/, "");
        if (cleanName.includes(" - ")) {
          const parts = cleanName.split(" - ");
          if (!prev.artist) updated.artist = parts[0].trim();
          if (!prev.title) updated.title = parts[1].trim();
        } else if (!prev.title) {
          updated.title = cleanName;
        }
      }

      return updated;
    });

    // Dynamically update active form preview settings if playing
    if (previewingId === "__form_preview__" && previewAudioRef.current) {
      if (key === "volume") {
        const v = val as number;
        previewAudioRef.current.volume = Math.max(0, Math.min(1, v));
      } else if (key === "playbackRate") {
        previewAudioRef.current.playbackRate = val as number;
      }
    }
  };

  const handlePreviewFormTrack = () => {
    if (!form.src) return;
    const tempTrack: AudioTrack = {
      id: "__form_preview__",
      layer: form.layer,
      src: form.src,
      title: form.title || undefined,
      artist: form.artist || undefined,
      startPageKey: form.startPageKey,
      startPanelIdx: form.startPanelIdx,
      soundConfig: {
        volume: form.volume,
        playbackRate: form.playbackRate,
        loop: form.loop,
        fadeIn: form.fadeIn,
        fadeOut: form.fadeOut,
        delay: form.delay,
        startTime: form.startTime,
      },
    };
    if (previewingId === "__form_preview__") {
      stopPreview();
    } else {
      playPreview(tempTrack);
    }
  };

  const closeForm = () => {
    stopPreview();
    setShowForm(false);
    setEditingId(null);
  };

  const handleSaveTrack = () => {
    if (!form.src || !form.startPageKey) return;

    const newTrack: AudioTrack = {
      id: editingId ?? genId(),
      layer: form.layer,
      src: form.src,
      title: form.title.trim() || undefined,
      artist: form.artist.trim() || undefined,
      startPageKey: form.startPageKey,
      startPanelIdx: form.startPanelIdx,
      stopTrigger: buildStopTrigger(form),
      soundConfig: {
        volume: form.volume,
        playbackRate: form.playbackRate,
        loop: form.loop,
        fadeIn: form.fadeIn,
        fadeOut: form.fadeOut,
        delay: form.delay > 0 ? form.delay : undefined,
        startTime: form.startTime > 0 ? form.startTime : undefined,
      },
    };

    if (editingId) {
      onUpdate(audioTracks.map((t) => (t.id === editingId ? newTrack : t)));
    } else {
      onUpdate([...audioTracks, newTrack]);
    }
    closeForm();
  };

  const handleDeleteTrack = (trackId: string) => {
    stopPreview();
    onUpdate(audioTracks.filter((t) => t.id !== trackId));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const needsPanelSelector = form.stopType === "panelStart" || form.stopType === "panelEnd";
  const stopPanelCount = panelCountForPage(form.stopPageKey);

  return (
    <div className="border-b border-white/10 shrink-0">
      {/* Static Header */}
      <div className="p-4 flex justify-between items-center bg-[#161622]">
        <div className="flex items-center gap-1.5 font-[var(--font-bangers)] text-lg text-zinc-300 tracking-wider">
          <span>🔊 Pistas de Audio</span>
          <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-full border border-white/10">
            {editableTracks.length}
          </span>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openNewForm}
            className="font-[var(--font-bangers)] text-xs bg-blue-600 text-white border border-white/10 px-2 py-1 shadow-lg hover:bg-blue-700 transition-colors rounded cursor-pointer"
          >
            + Nueva Pista
          </button>
        )}
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3 bg-[#0a0a0f] pt-2">
          {/* ── Track List ── */}
          {editableTracks.length === 0 && !showForm && (
            <div className="text-sm text-zinc-500 italic text-center py-4 border border-dashed border-white/10 rounded">
              No hay pistas. Usá "+ Nueva Pista" para agregar música o SFX persistente.
            </div>
          )}

          {editableTracks.map((track) => {
            const isPreviewing = previewingId === track.id;
            const layerColor = track.layer === "music" ? "bg-purple-950/20 border-purple-900/40 text-purple-250" : "bg-amber-950/20 border-amber-900/40 text-amber-250";
            const layerBadge = track.layer === "music"
              ? "bg-purple-650 text-white"
              : "bg-orange-650 text-white";
            const currentKey =
              currentPageIdx !== undefined && pageKeys[currentPageIdx]
                ? pageKeys[currentPageIdx]
                : pageKeys[0] ?? "";
            const activeHere =
              currentKey &&
              activePanelIdx !== undefined &&
              isTrackActiveAtPosition(track, currentKey, activePanelIdx, pages);

            return (
              <div key={track.id} className={`border rounded p-3 flex flex-col gap-2 ${layerColor} ${activeHere ? "ring-1 ring-[#e8185a]/60" : ""}`}>
                {/* Track header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${layerBadge}`}>
                      {track.layer === "music" ? "🎵 Music" : "💥 SFX"}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-300 truncate">
                      {track.src.split("/").pop()}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => isPreviewing ? stopPreview() : playPreview(track)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                        isPreviewing
                          ? "bg-green-600 text-white border-green-700"
                          : "bg-green-950 text-green-300 border-green-800 hover:bg-green-900"
                      }`}
                    >
                      {isPreviewing ? "⏸" : "▶"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(track)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-950 text-blue-300 border-blue-800 hover:bg-blue-900 transition-all cursor-pointer"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrack(track.id)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-red-950 text-red-300 border-red-800 hover:bg-red-900 transition-all cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Track details */}
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] sm:text-xs font-bold text-zinc-200 leading-snug">
                    {describeTrackSpan(track, pages)}
                  </p>
                  {activeHere && (
                    <span className="text-[10px] font-bold text-[#e8185a]">▶ Suena en tu posición actual</span>
                  )}
                  <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500 font-mono">
                    <span>Vol: {Math.round((track.soundConfig?.volume ?? 1) * 100)}%</span>
                    <span>×{track.soundConfig?.playbackRate ?? 1}</span>
                    {track.soundConfig?.loop && <span>🔁 Loop</span>}
                    {(track.soundConfig?.fadeIn ?? 0) > 0 && <span>FI: {track.soundConfig!.fadeIn}ms</span>}
                    {(track.soundConfig?.fadeOut ?? 0) > 0 && <span>FO: {track.soundConfig!.fadeOut}ms</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── New / Edit Form ── */}
          {showForm && (
            <div className="border border-blue-500/40 rounded p-3 bg-[#161622] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  {editingId ? "✏️ Editar Pista" : "➕ Nueva Pista"}
                </span>
                <button
                  type="button"
                  onClick={closeForm}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  ✕ Cancelar
                </button>
              </div>

              {/* Layer selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Capa</label>
                <div className="flex gap-2">
                  {(["music", "sfx"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => handleFormChange("layer", l)}
                      className={`flex-1 text-[9px] font-bold py-1.5 rounded border transition-all cursor-pointer ${
                        form.layer === l
                          ? l === "music" ? "bg-purple-655 text-white border-purple-700" : "bg-orange-655 text-white border-orange-600"
                          : "bg-[#0a0a0f] text-zinc-450 border-white/10 hover:border-white/20"
                      }`}
                    >
                      {l === "music" ? "🎵 Música" : "💥 SFX"}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-zinc-500">
                  {form.layer === "music"
                    ? "No interrumpe pistas SFX activas."
                    : "No interrumpe pistas de música activas."}
                </p>
              </div>

              {/* Sound selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Sonido</label>
                <div className="flex gap-2 w-full min-w-0">
                  <select
                    value={form.src}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFormChange("src", val);
                      if (val) {
                        const tempTrack: AudioTrack = {
                          id: "__form_preview__",
                          layer: form.layer,
                          src: val,
                          startPageKey: form.startPageKey || "1",
                          startPanelIdx: form.startPanelIdx || 0,
                          soundConfig: { volume: form.volume, playbackRate: form.playbackRate, loop: form.loop }
                        };
                        playPreview(tempTrack);
                      } else {
                        stopPreview();
                      }
                    }}
                    className="flex-1 min-w-0 max-w-full truncate text-[8px] px-1.5 py-1 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Seleccioná un archivo --</option>
                    {availableSounds.map((s) => (
                      <option key={s.path} value={s.path}>{s.name}</option>
                    ))}
                  </select>
                  {form.src && (
                    <button
                      type="button"
                      onClick={handlePreviewFormTrack}
                      className={`text-[8px] font-bold px-2.5 py-1 rounded border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                        previewingId === "__form_preview__"
                          ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-700 shadow-inner"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700"
                      }`}
                    >
                      {previewingId === "__form_preview__" ? "⏸ Pausa" : "▶ Preview"}
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Artist fields (for music tracks) */}
              {form.layer === "music" && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-[#0a0a0f] border border-white/5 rounded">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8px] font-bold text-purple-300 uppercase tracking-wider">Nombre Canción</label>
                    <input
                      type="text"
                      placeholder="Ej. Get Low"
                      value={form.title}
                      onChange={(e) => handleFormChange("title", e.target.value)}
                      className="text-[8px] px-1.5 py-1 border border-white/10 rounded font-sans bg-[#13131d] text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8px] font-bold text-purple-300 uppercase tracking-wider">Artista / Banda</label>
                    <input
                      type="text"
                      placeholder="Ej. Lil Jon"
                      value={form.artist}
                      onChange={(e) => handleFormChange("artist", e.target.value)}
                      className="text-[8px] px-1.5 py-1 border border-white/10 rounded font-sans bg-[#13131d] text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Start position */}
              <div className="border border-white/5 rounded p-2 bg-[#0a0a0f] flex flex-col gap-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">▶ Inicio</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8px] font-mono text-zinc-500">Página</label>
                    <select
                      value={form.startPageKey}
                      onChange={(e) => handleFormChange("startPageKey", e.target.value)}
                      className="text-[8px] px-1 py-0.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {pageKeys.map((k) => (
                        <option key={k} value={k}>Pág {pageNumberFromKey(pages, k)} ({k})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8px] font-mono text-zinc-500">Parada</label>
                    <select
                      value={form.startPanelIdx}
                      onChange={(e) => handleFormChange("startPanelIdx", parseInt(e.target.value))}
                      className="text-[8px] px-1 py-0.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {Array.from({ length: Math.max(1, panelCountForPage(form.startPageKey)) }, (_, i) => (
                        <option key={i} value={i}>Viñeta {i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Stop trigger */}
              <div className="border border-white/5 rounded p-2 bg-[#0a0a0f] flex flex-col gap-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">⏹ Stop / Fin</span>
                <select
                  value={form.stopType}
                  onChange={(e) => handleFormChange("stopType", e.target.value as StopTriggerType)}
                  className="text-[8px] px-1.5 py-1 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="none">Nunca (manual / fin del capítulo)</option>
                  <option value="panelEnd">Al salir de una viñeta</option>
                  <option value="panelStart">Al llegar a una viñeta (antes de reproducirla)</option>
                  <option value="pageEnd">Al terminar una página</option>
                  <option value="pageStart">Al comenzar una página</option>
                </select>

                {form.stopType !== "none" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[8px] font-mono text-zinc-500">Página de stop</label>
                      <select
                        value={form.stopPageKey}
                        onChange={(e) => {
                          handleFormChange("stopPageKey", e.target.value);
                          handleFormChange("stopPanelIdx", 0);
                        }}
                        className="text-[8px] px-1 py-0.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {pageKeys.map((k) => (
                          <option key={k} value={k}>Pág {pageNumberFromKey(pages, k)} ({k})</option>
                        ))}
                      </select>
                    </div>
                    {needsPanelSelector && (
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8px] font-mono text-zinc-500">Parada</label>
                        <select
                          value={form.stopPanelIdx}
                          onChange={(e) => handleFormChange("stopPanelIdx", parseInt(e.target.value))}
                          className="text-[8px] px-1 py-0.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          {Array.from({ length: Math.max(1, stopPanelCount) }, (_, i) => (
                            <option key={i} value={i}>Viñeta {i + 1}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sound config */}
              <div className="border border-white/5 rounded p-2 bg-[#0a0a0f] flex flex-col gap-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">⚙️ Configuración</span>

                {/* Volume */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                    <span>Volumen</span>
                    <span className="font-bold">{Math.round(form.volume * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={form.volume}
                    onChange={(e) => handleFormChange("volume", parseFloat(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Playback rate */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                    <span>Velocidad</span>
                    <span className="font-bold">×{form.playbackRate.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min="0.5" max="5" step="0.1"
                    value={form.playbackRate}
                    onChange={(e) => handleFormChange("playbackRate", parseFloat(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Fade In */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                    <span>Fade In</span>
                    <span className="font-bold">{form.fadeIn}ms</span>
                  </div>
                  <input
                    type="range" min="0" max="5000" step="100"
                    value={form.fadeIn}
                    onChange={(e) => handleFormChange("fadeIn", parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Fade Out */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                    <span>Fade Out</span>
                    <span className="font-bold">{form.fadeOut}ms</span>
                  </div>
                  <input
                    type="range" min="0" max="5000" step="100"
                    value={form.fadeOut}
                    onChange={(e) => handleFormChange("fadeOut", parseInt(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Loop, delay, startTime in a grid */}
                <div className="grid grid-cols-2 gap-2 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono text-zinc-550">Loop</span>
                    <input
                      type="checkbox"
                      checked={form.loop}
                      onChange={(e) => handleFormChange("loop", e.target.checked)}
                      className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8px] font-mono text-zinc-500">Delay (ms)</label>
                    <input
                      type="number" min="0" step="100"
                      value={form.delay}
                      onChange={(e) => handleFormChange("delay", parseInt(e.target.value) || 0)}
                      className="text-[8px] px-1 py-0.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[8px] font-mono text-zinc-500">Inicio (seg)</label>
                    <input
                      type="number" min="0" step="0.5"
                      value={form.startTime}
                      onChange={(e) => handleFormChange("startTime", parseFloat(e.target.value) || 0)}
                      className="text-[8px] px-1 py-0.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveTrack}
                  disabled={!form.src || !form.startPageKey}
                  className="flex-1 text-[9px] font-bold py-1.5 rounded border bg-blue-600 hover:bg-blue-700 text-white border-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {editingId ? "✓ Guardar cambios" : "✓ Agregar pista"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="text-[9px] font-bold px-3 py-1.5 rounded border bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

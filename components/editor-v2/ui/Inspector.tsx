"use client";

import React, { useEffect, useState } from "react";
import type { DialogueLine } from "@/components/reader/DialogueBubble";
import type { AudioTrack, Dialogues, PageData, PanelStop, SceneFadeType, ZoomRect } from "@/components/reader/audioPlayer";
import { EditorBubbleVisualsForm } from "@/components/reader/editor/EditorBubbleVisualsForm";
import { EditorBubbleLayoutForm } from "@/components/reader/editor/EditorBubbleLayoutForm";
import { EditorBubbleTailForm } from "@/components/reader/editor/EditorBubbleTailForm";
import { SoundFolderPicker } from "./SoundFolderPicker";
import type { EditorV2Tool, Selection } from "../types";
import { getPageKeyFromUrl } from "@/components/reader/readerUtils";
import { SCENE_FADE_OPTIONS } from "@/components/reader/sceneFade";

export type InspectorViewMode = "full" | "stops" | "bubble" | "mask" | "page" | "audio";

function FadeSliders({
  fadeIn,
  fadeOut,
  fadeInType,
  fadeOutType,
  audioFade,
  showIn = true,
  onChange,
}: {
  fadeIn?: number;
  fadeOut?: number;
  fadeInType?: SceneFadeType;
  fadeOutType?: SceneFadeType;
  audioFade?: boolean;
  showIn?: boolean;
  onChange: (u: {
    fadeIn?: number;
    fadeOut?: number;
    fadeInType?: SceneFadeType;
    fadeOutType?: SceneFadeType;
    audioFade?: boolean;
  }) => void;
}) {
  return (
    <div className="space-y-2">
      {showIn && (
        <>
          <label className="flex items-center justify-between text-sm text-zinc-300">
            Fade in
            <span className="font-mono text-xs">{fadeIn ?? 0}ms</span>
          </label>
          <input
            type="range"
            min={0}
            max={4000}
            step={50}
            value={fadeIn ?? 0}
            onChange={(e) => onChange({ fadeIn: parseInt(e.target.value, 10) })}
            className="w-full accent-[#e8185a]"
          />
          <select
            value={fadeInType ?? "fade"}
            onChange={(e) => onChange({ fadeInType: e.target.value as SceneFadeType })}
            className="w-full text-sm bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
          >
            {SCENE_FADE_OPTIONS.map((o) => (
              <option key={`in-${o.id}`} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </>
      )}
      <label className="flex items-center justify-between text-sm text-zinc-300">
        Fade out
        <span className="font-mono text-xs">{fadeOut ?? 0}ms</span>
      </label>
      <input
        type="range"
        min={0}
        max={4000}
        step={50}
        value={fadeOut ?? 0}
        onChange={(e) => onChange({ fadeOut: parseInt(e.target.value, 10) })}
        className="w-full accent-[#e8185a]"
      />
      <select
        value={fadeOutType ?? "fade"}
        onChange={(e) => onChange({ fadeOutType: e.target.value as SceneFadeType })}
        className="w-full text-sm bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
      >
        {SCENE_FADE_OPTIONS.map((o) => (
          <option key={`out-${o.id}`} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {audioFade !== undefined && (
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={!!audioFade}
            onChange={(e) => onChange({ audioFade: e.target.checked })}
          />
          También fade de audio
        </label>
      )}
    </div>
  );
}

export function Inspector({
  pageIdx,
  pages,
  pageData,
  localDialogues,
  panels,
  activePanelIdx,
  selection,
  activeTool,
  soundPickerOpen,
  onCloseSoundPicker,
  onUpdateBubble,
  onUpdatePanel,
  onUpdateAudioTracks,
  onUpdatePage,
  onUpdateMask,
  viewMode = "full",
  showHeader = true,
}: {
  pageIdx: number;
  pages: string[];
  pageData: PageData;
  localDialogues: Dialogues;
  panels: PanelStop[];
  activePanelIdx: number;
  selection: Selection;
  activeTool: EditorV2Tool;
  soundPickerOpen: boolean;
  onCloseSoundPicker?: () => void;
  onUpdateBubble: (pIdx: number, bIdx: number, u: Partial<DialogueLine>) => void;
  onUpdatePanel: (pIdx: number, u: Partial<PanelStop>) => void;
  onUpdateAudioTracks: (tracks: NonNullable<Dialogues["audioTracks"]>) => void;
  onUpdatePage: (u: Partial<PageData>) => void;
  onUpdateMask: (pIdx: number, rIdx: number, rect: ZoomRect) => void;
  viewMode?: InspectorViewMode;
  showHeader?: boolean;
}) {
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const [pickerMode, setPickerMode] = useState<"sfx" | "track">("sfx");
  const [trackLayer, setTrackLayer] = useState<"music" | "sfx">("music");

  useEffect(() => {
    if (soundPickerOpen) {
      setPickerMode("sfx");
      onCloseSoundPicker?.();
    }
  }, [soundPickerOpen, onCloseSoundPicker]);
  const panel = panels[activePanelIdx];
  const maskPanelIdx = selection.kind === "mask" ? selection.panelIdx : activePanelIdx;
  const maskPanel = panels[maskPanelIdx];
  const maskRects = maskPanel?.zoomRects || (maskPanel?.zoomRect ? [maskPanel.zoomRect] : []);
  const activeBubbleIdx = selection.kind === "bubble" ? selection.bubbleIdx : null;
  const line = activeBubbleIdx !== null ? panel?.dialogue?.[activeBubbleIdx] : null;
  const pageKey = getPageKeyFromUrl(pages[pageIdx]) || "";
  const tracks = localDialogues.audioTracks ?? [];

  const addSfx = (path: string) => {
    if (!panel) return;
    const existing = panel.sounds || (panel.sound ? [{ sound: panel.sound, soundConfig: panel.soundConfig }] : []);
    onUpdatePanel(activePanelIdx, {
      sound: undefined,
      sounds: [...existing, { sound: path }],
    });
  };

  const addTrack = (path: string) => {
    const track: AudioTrack = {
      id: `track-${Date.now()}`,
      layer: trackLayer,
      src: path,
      startPageKey: pageKey,
      startPanelIdx: Math.max(0, activePanelIdx),
      pauseOnFade: trackLayer === "music",
    };
    onUpdateAudioTracks([...tracks, track]);
  };

  const showPage = viewMode === "full" || viewMode === "page";
  const showStopPanel = viewMode === "full" || viewMode === "stops";
  const showMask = viewMode === "full" || viewMode === "mask";
  const showAudio = viewMode === "full" || viewMode === "stops" || viewMode === "audio";
  const showBubbleAdvanced = viewMode === "full" || viewMode === "bubble";

  const pageSection = showPage ? (
    <div className="p-4 border-b border-white/10 space-y-2">
      <div className="text-sm font-bold text-zinc-300">Página {pageIdx + 1}</div>
      <FadeSliders
        fadeIn={pageData.fadeIn}
        fadeOut={pageData.fadeOut}
        fadeInType={pageData.fadeInType}
        fadeOutType={pageData.fadeOutType}
        audioFade={pageData.audioFade ?? false}
        onChange={(u) => onUpdatePage(u)}
      />
    </div>
  ) : null;

  const stopSection =
    panel && showStopPanel ? (
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="text-sm font-bold text-zinc-300">Parada {activePanelIdx + 1}</div>
        <FadeSliders
          fadeIn={panel.fadeIn}
          fadeOut={panel.fadeOut}
          fadeInType={panel.fadeInType}
          fadeOutType={panel.fadeOutType}
          audioFade={panel.audioFade ?? false}
          onChange={(u) => onUpdatePanel(activePanelIdx, u)}
        />
        <div className="space-y-1">
          {(panel.sounds || (panel.sound ? [{ sound: panel.sound }] : [])).map((s, i) => (
            <div key={`${s.sound}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="truncate flex-1 text-zinc-400">{s.sound.split("/").pop()}</span>
              <button
                type="button"
                className="text-red-400 text-xs"
                onClick={() => {
                  const list = [...(panel.sounds || (panel.sound ? [{ sound: panel.sound }] : []))];
                  list.splice(i, 1);
                  onUpdatePanel(activePanelIdx, { sounds: list, sound: undefined });
                }}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const maskSection =
    showMask && (activeTool === "mask" || selection.kind === "mask" || viewMode === "mask") ? (
      maskRects.length > 0 ? (
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="text-sm font-bold text-zinc-300">Máscaras · parada {maskPanelIdx + 1}</div>
          {maskRects.map((mask, rIdx) => (
            <div key={`mask-fade-${maskPanelIdx}-${rIdx}`} className="space-y-2 rounded border border-white/10 p-2">
              <div className="text-xs font-bold text-cyan-300">Máscara {rIdx + 1}</div>
              <FadeSliders
                showIn={false}
                fadeOut={mask.fadeOut}
                fadeOutType={mask.fadeOutType}
                onChange={(u) => onUpdateMask(maskPanelIdx, rIdx, { ...mask, fadeOut: u.fadeOut, fadeOutType: u.fadeOutType })}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 border-b border-white/10 text-sm text-zinc-400">
          Dibujá o seleccioná una máscara en el lienzo para editar sus fades.
        </div>
      )
    ) : null;

  const audioSection = showAudio ? (
    <div className="p-4 border-b border-white/10 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-bold text-zinc-300">Audio</span>
        <select
          value={pickerMode}
          onChange={(e) => setPickerMode(e.target.value as "sfx" | "track")}
          className="text-xs bg-[#0a0a0f] border border-white/10 rounded px-2 py-1"
        >
          <option value="sfx">SFX en parada</option>
          <option value="track">Pista de capítulo</option>
        </select>
      </div>
      {pickerMode === "track" && (
        <label className="flex items-center gap-2 text-sm flex-wrap">
          Tipo de pista
          <select
            value={trackLayer}
            onChange={(e) => setTrackLayer(e.target.value as "music" | "sfx")}
            className="bg-[#0a0a0f] border border-white/10 rounded px-2 py-1 text-sm"
          >
            <option value="music">Música</option>
            <option value="sfx">SFX capítulo</option>
          </select>
        </label>
      )}
      {(pickerMode === "sfx" || pickerMode === "track") && (
        <SoundFolderPicker onPick={pickerMode === "sfx" ? addSfx : addTrack} />
      )}
      {tracks.length > 0 && (
        <div className="space-y-2">
          {tracks.map((track) => (
            <div key={track.id} className="p-2 rounded bg-[#161622] border border-white/10 space-y-1">
              <div className="text-sm truncate">{track.src.split("/").pop()}</div>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={!!track.pauseOnFade}
                  onChange={(e) =>
                    onUpdateAudioTracks(
                      tracks.map((t) => (t.id === track.id ? { ...t, pauseOnFade: e.target.checked } : t))
                    )
                  }
                />
                Pausar en el fade
              </label>
              <button
                type="button"
                className="text-xs text-red-400"
                onClick={() => onUpdateAudioTracks(tracks.filter((t) => t.id !== track.id))}
              >
                Quitar pista
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  const bubbleTextSection =
    showBubbleAdvanced && line && activeBubbleIdx !== null ? (
      <div className="p-4 border-b border-white/10 space-y-2">
        <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Texto del globo</label>
        <textarea
          value={line.text || ""}
          onChange={(e) => onUpdateBubble(activePanelIdx, activeBubbleIdx, { text: e.target.value })}
          rows={4}
          className="w-full text-sm bg-[#0a0a0f] text-white border border-white/15 rounded px-2 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#e8185a]"
          placeholder="Escribí el diálogo…"
        />
      </div>
    ) : null;

  const bubbleAdvancedSection =
    showBubbleAdvanced && activeTool === "bubble" && line && activeBubbleIdx !== null ? (
      <details open={openAdvanced} onToggle={(e) => setOpenAdvanced((e.target as HTMLDetailsElement).open)}>
        <summary className="p-4 text-sm font-bold cursor-pointer text-zinc-400 uppercase">Avanzado (globo)</summary>
        <div className="p-3 space-y-3 editor-dark-theme">
          <EditorBubbleVisualsForm
            bubble={line}
            activePanelIdx={activePanelIdx}
            activeBubbleIdx={activeBubbleIdx}
            handleUpdateBubble={onUpdateBubble}
          />
          <EditorBubbleLayoutForm
            bubble={line}
            activePanelIdx={activePanelIdx}
            activeBubbleIdx={activeBubbleIdx}
            currentPanels={panels}
            handleUpdateBubble={onUpdateBubble}
          />
          <EditorBubbleTailForm
            bubble={line}
            activePanelIdx={activePanelIdx}
            activeBubbleIdx={activeBubbleIdx}
            handleUpdateBubble={onUpdateBubble}
          />
        </div>
      </details>
    ) : null;

  return (
    <div className="w-full lg:w-[360px] shrink-0 bg-[#0e0e14] border-l border-white/10 overflow-y-auto flex flex-col text-zinc-200">
      {showHeader && (
        <div className="p-4 border-b border-white/10 font-[var(--font-bangers)] text-xl text-white">Inspector</div>
      )}

      {viewMode === "bubble" && bubbleTextSection}
      {pageSection}
      {stopSection}
      {maskSection}
      {audioSection}
      {viewMode === "full" && bubbleTextSection}
      {bubbleAdvancedSection}
    </div>
  );
}

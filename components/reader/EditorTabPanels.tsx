"use client";

import React, { useState, useEffect, useRef } from "react";
import type { PanelConfig } from "./DialogueEditorPanel";
import type { PanelSound } from "./audioPlayer";
import { getComicAssetUrl } from "./readerUtils";

/**
 * WaveformVisualizer Component
 * Draws an audio waveform on canvas with trim start/end markers
 */
interface WaveformVisualizerProps {
  soundPath: string;
  startTime?: number;
  endTime?: number;
  height?: number;
}

function WaveformVisualizer({ soundPath, startTime = 0, endTime, height = 60 }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    const analyzeAudio = async () => {
      try {
        const response = await fetch(getComicAssetUrl(soundPath));
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        setDuration(audioBuffer.duration);

        // Sample the audio data
        const samples = 200; // Number of bars in waveform
        const blockSize = Math.floor(audioBuffer.length / samples);
        const filteredData: number[] = [];
        const rawData = audioBuffer.getChannelData(0); // Get mono channel

        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          filteredData.push(sum / blockSize);
        }

        setWaveformData(filteredData);
      } catch (error) {
        console.error("Error analyzing audio:", error);
      }
    };

    if (soundPath) {
      analyzeAudio();
    }
  }, [soundPath]);

  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;

    // Clear canvas
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, h);

    // Draw waveform
    const barWidth = width / waveformData.length;
    const maxValue = Math.max(...waveformData, 0.01);

    ctx.fillStyle = "#e8185a";
    waveformData.forEach((value, index) => {
      const barHeight = (value / maxValue) * (h * 0.8);
      const x = index * barWidth;
      const y = (h - barHeight) / 2;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw trim markers
    if (endTime !== undefined && duration > 0) {
      const startPixel = (startTime / duration) * width;
      const endPixel = (endTime / duration) * width;

      // Start marker (green)
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startPixel, 0);
      ctx.lineTo(startPixel, h);
      ctx.stroke();

      // End marker (red)
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(endPixel, 0);
      ctx.lineTo(endPixel, h);
      ctx.stroke();

      // Fill trimmed area
      ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
      ctx.fillRect(startPixel, 0, endPixel - startPixel, h);
    }
  }, [waveformData, startTime, endTime, duration]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={height}
      className="w-full border border-white/10 rounded bg-[#0a0a0f]"
    />
  );
}

interface EditorTabPanelsProps {
  currentPanels: PanelConfig[];
  activePanelIdx: number;
  activeBubbleIdx: number | null;
  handleAddPanel: () => void;
  setActivePanelIdx: (idx: number) => void;
  setActiveBubbleIdx: (idx: number | null) => void;
  handleRemovePanel: (idx: number) => void;
  handleUpdatePanelParams: (pIdx: number, updates: Partial<PanelConfig>) => void;
  handleAddBubble: (pIdx: number, defaultPosition?: { posX: number; posY: number }, defaultStyle?: "normal" | "caption" | "cinematic") => void;
  presetMode?: "standard" | "custom";
  handleReorderPanels: (startIndex: number, endIndex: number) => void;
  handleReorderBubbles?: (pIdx: number, startIndex: number, endIndex: number) => void;
}

/**
 * EditorTabPanels Component
 * Renders the panels accordion section allowing the editor to add, remove,
 * and rearrange panel stops, their individual zoom & spoiler regions, auto-advance timers,
 * and oclusion/spoiler states.
 */
export function EditorTabPanels({
  currentPanels,
  activePanelIdx,
  activeBubbleIdx,
  handleAddPanel,
  setActivePanelIdx,
  setActiveBubbleIdx,
  handleRemovePanel,
  handleUpdatePanelParams,
  handleAddBubble,
  presetMode = "standard",
  handleReorderPanels,
  handleReorderBubbles,
}: EditorTabPanelsProps) {
  const [availableSounds, setAvailableSounds] = useState<Array<{ name: string; path: string }>>([]);
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [soundMetadata, setSoundMetadata] = useState<Record<string, number>>({});
  // Track which panels have their audio confirmed (for visual feedback only — data updates in real time)
  const [confirmedPanels, setConfirmedPanels] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadSounds = async () => {
      try {
        const response = await fetch("/api/sounds");
        const sounds = await response.json();
        setAvailableSounds(sounds);
      } catch (error) {
        console.error("Error loading sounds:", error);
      }
    };
    loadSounds();
  }, []);

  // Load audio durations for any audio files in the active panel configuration
  useEffect(() => {
    const activePanel = currentPanels[activePanelIdx];
    if (!activePanel) return;

    const paths: string[] = [];
    if (activePanel.sounds && Array.isArray(activePanel.sounds)) {
      activePanel.sounds.forEach((s) => {
        if (s.sound) paths.push(s.sound);
      });
    } else if (activePanel.sound) {
      paths.push(activePanel.sound);
    }

    paths.forEach((path) => {
      const audio = new Audio();
      audio.src = getComicAssetUrl(path);
      audio.onloadedmetadata = () => {
        setSoundMetadata((prev) => {
          if (prev[path] === audio.duration) return prev;
          return { ...prev, [path]: audio.duration };
        });
      };
    });
  }, [activePanelIdx, currentPanels]);

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.volume = 1;
      previewAudioRef.current.playbackRate = 1;
    }
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
    setPreviewingSound(null);
  };

  const playPreview = (
    soundPath: string,
    config?: {
      startTime?: number;
      endTime?: number;
      volume?: number;
      playbackRate?: number;
      fadeIn?: number;
      fadeOut?: number;
      delay?: number;
    }
  ) => {
    stopPreview();

    const {
      startTime = 0,
      endTime,
      volume = 1,
      playbackRate = 1,
      fadeIn = 0,
      fadeOut = 0,
      delay = 0,
    } = config || {};
    const targetVolume = Math.max(0, Math.min(1, volume));

    const audio = new Audio();
    audio.src = getComicAssetUrl(soundPath);
    audio.currentTime = startTime;
    audio.playbackRate = playbackRate;
    audio.volume = fadeIn > 0 ? 0 : targetVolume;
    previewAudioRef.current = audio;
    setPreviewingSound(soundPath);

    const fadeInIntervalsRef: NodeJS.Timeout[] = [];
    const fadeOutIntervalsRef: NodeJS.Timeout[] = [];

    const playWithDelay = () => {
      try {
        audio.play();

        // Fade in
        if (fadeIn > 0) {
          const fadeInSteps = 30;
          const stepDuration = fadeIn / fadeInSteps;
          const volumePerStep = targetVolume / fadeInSteps;
          let currentStep = 0;

          const fadeInInterval = setInterval(() => {
            if (currentStep < fadeInSteps && previewAudioRef.current === audio) {
              audio.volume = Math.min(targetVolume, audio.volume + volumePerStep);
              currentStep++;
            } else {
              if (previewAudioRef.current === audio) {
                audio.volume = targetVolume;
              }
              clearInterval(fadeInInterval);
              fadeInIntervalsRef.splice(fadeInIntervalsRef.indexOf(fadeInInterval), 1);
            }
          }, stepDuration);
          fadeInIntervalsRef.push(fadeInInterval);
        }

        // Check for end time and apply fade out
        if (endTime || fadeOut > 0) {
          const effectiveDuration = endTime ? endTime - startTime : audio.duration;
          const fadeOutStartTime = effectiveDuration - fadeOut / 1000;

          previewIntervalRef.current = setInterval(() => {
            if (previewAudioRef.current !== audio) {
              clearInterval(previewIntervalRef.current!);
              return;
            }

            if (endTime && audio.currentTime >= endTime) {
              stopPreview();
              clearInterval(previewIntervalRef.current!);
              previewIntervalRef.current = null;
            } else if (fadeOut > 0 && audio.currentTime - startTime >= fadeOutStartTime) {
              const timeUntilEnd = endTime ? endTime - audio.currentTime : audio.duration - audio.currentTime;
              const newVolume = Math.max(
                0,
                targetVolume * Math.max(0, timeUntilEnd / (fadeOut / 1000))
              );
              audio.volume = newVolume;

              if (audio.volume <= 0 || (endTime && audio.currentTime >= endTime)) {
                stopPreview();
                clearInterval(previewIntervalRef.current!);
                previewIntervalRef.current = null;
              }
            }
          }, 50);
        }
      } catch (error) {
        console.error("Error playing preview:", error);
        setPreviewingSound(null);
      }
    };

    if (delay > 0) {
      setTimeout(playWithDelay, delay);
    } else {
      playWithDelay();
    }
  };

  return (
    <div className="p-4 shrink-0 flex flex-col gap-3 border-b border-white/10">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5 font-[var(--font-bangers)] text-lg text-zinc-300 tracking-wider">
          <span>🎬 Paradas de Viñetas</span>
          <span className="text-xs font-mono bg-[#161622] border border-white/10 text-zinc-300 px-2 py-0.5 rounded-full">
            {currentPanels.length}
          </span>
        </div>
        <button
          type="button"
          onClick={handleAddPanel}
          className="font-[var(--font-bangers)] text-xs bg-emerald-600 text-white border border-white/10 px-3 py-1.5 shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:bg-emerald-700 transition-colors cursor-pointer rounded"
        >
          + Agregar Viñeta
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 pr-1">
        {currentPanels.length === 0 ? (
          <div className="col-span-2 text-sm text-zinc-500 italic text-center py-8 border border-dashed border-white/10 rounded">
            No hay viñetas definidas en esta página. Agregá una para empezar.
          </div>
        ) : (
          currentPanels.map((panel, pIdx) => {
              const isSelected = activePanelIdx === pIdx;
              const rects = panel.zoomRects || (panel.zoomRect ? [panel.zoomRect] : []);

              return (
                <div
                  key={pIdx}
                  onClick={() => {
                    setActivePanelIdx(pIdx);
                    setActiveBubbleIdx(null);
                  }}
                  className={`p-3.5 border rounded-md transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#1d1d2b] border-[#e8185a] shadow-[0_0_12px_rgba(232,24,90,0.15)]"
                      : "bg-[#14141e] border-white/5 hover:bg-[#1a1a29]"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="font-[var(--font-marker)] text-xs text-white">
                      Viñeta {pIdx + 1}
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {pIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleReorderPanels(pIdx, pIdx - 1)}
                          className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 w-5 h-5 rounded flex items-center justify-center border border-white/5 active:scale-95 transition-all cursor-pointer font-bold"
                          title="Mover viñeta hacia arriba/atrás"
                        >
                          ◀
                        </button>
                      )}
                      {pIdx < currentPanels.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleReorderPanels(pIdx, pIdx + 1)}
                          className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 w-5 h-5 rounded flex items-center justify-center border border-white/5 active:scale-95 transition-all cursor-pointer font-bold"
                          title="Mover viñeta hacia abajo/adelante"
                        >
                          ▶
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePanel(pIdx)}
                        className="text-xs text-red-400 hover:text-red-300 hover:underline font-bold ml-1"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {/* FocusY Slider */}
                  <div className="flex flex-col gap-1 mb-3.5">
                    <div className="flex justify-between text-xs font-mono text-zinc-400">
                      <span>Posición Foco Y:</span>
                      <span className="text-zinc-200">{panel.focusY ?? 0.5}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={panel.focusY ?? 0.5}
                      onChange={(e) =>
                        handleUpdatePanelParams(pIdx, { focusY: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#e8185a] bg-zinc-800"
                    />
                  </div>

                  {presetMode === "standard" && (
                    <div className="border border-white/10 rounded bg-[#0d0d12]/40 p-2 flex flex-col gap-2 mt-1 mb-2.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        💬 Globos de Diálogo ({panel.dialogue?.length || 0})
                      </span>
                      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                        {panel.dialogue?.map((bub, bIdx) => {
                          const isBubActive = isSelected && activeBubbleIdx === bIdx;
                          return (
                            <div
                              key={bIdx}
                              className={`flex items-center gap-1.5 p-1.5 border rounded transition-all ${
                                isBubActive
                                  ? "border-[#e8185a] bg-rose-950/20 text-rose-200 font-bold"
                                  : "border-white/10 bg-[#161622] hover:bg-[#1a1a29] text-zinc-300"
                              }`}
                            >
                              <span className="text-[10px] font-mono font-extrabold bg-[#e8185a]/20 text-[#e8185a] px-1.5 py-0.5 rounded border border-[#e8185a]/30">
                                V{pIdx + 1} • #{bIdx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePanelIdx(pIdx);
                                  setActiveBubbleIdx(bIdx);
                                }}
                                className="flex-1 text-left text-xs font-mono truncate cursor-pointer bg-transparent border-0 text-inherit"
                              >
                                <span className="text-[9px] bg-white/5 px-1 rounded mr-1">
                                  {bub.style === "caption" ? "Narr." : bub.style === "cinematic" ? "Cine." : "Diál."}
                                </span>
                                {bub.speaker ? `${bub.speaker}: ` : ""}
                                {bub.text || "(vacío)"}
                              </button>
                              {handleReorderBubbles && (panel.dialogue?.length || 0) > 1 && (
                                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  {bIdx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleReorderBubbles(pIdx, bIdx, bIdx - 1)}
                                      className="text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 w-4 h-4 rounded flex items-center justify-center border border-white/5 active:scale-95 transition-all cursor-pointer font-bold"
                                      title="Mover diálogo antes (#1 va primero)"
                                    >
                                      ▲
                                    </button>
                                  )}
                                  {bIdx < (panel.dialogue?.length || 0) - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleReorderBubbles(pIdx, bIdx, bIdx + 1)}
                                      className="text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 w-4 h-4 rounded flex items-center justify-center border border-white/5 active:scale-95 transition-all cursor-pointer font-bold"
                                      title="Mover diálogo después"
                                    >
                                      ▼
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {(panel.dialogue?.length || 0) === 0 && (
                          <span className="text-[10px] text-zinc-500 italic text-center py-1">Sin globos de diálogo</span>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 mt-1 border-t border-white/5 pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddBubble(pIdx, undefined, "normal");
                          }}
                          className="flex-1 text-[10px] bg-[#161622] hover:bg-[#1a1a29] text-white font-bold py-1.5 px-2 rounded border border-white/10 text-center transition-colors cursor-pointer"
                        >
                          💬 + Diálogo
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddBubble(pIdx, undefined, "caption");
                          }}
                          className="flex-1 text-[10px] bg-[#f5e642] hover:bg-yellow-500 text-black font-bold py-1.5 px-2 rounded border border-yellow-600/20 text-center transition-colors cursor-pointer"
                        >
                          📜 + Narración
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddBubble(pIdx, undefined, "cinematic");
                          }}
                          className="flex-1 text-[10px] bg-cyan-900 hover:bg-cyan-800 text-cyan-100 font-bold py-1.5 px-2 rounded border border-cyan-700/40 text-center transition-colors cursor-pointer"
                        >
                          🎬 + Épico
                        </button>
                      </div>
                    </div>
                  )}
                      {/* SECTION 1: Zoom Areas & Spoilers (Collapsible) */}
                      <details className="group border border-white/10 rounded bg-[#0d0d12]/40 mb-2.5 overflow-hidden" open={isSelected}>
                    <summary className="flex items-center justify-between p-2 cursor-pointer list-none select-none hover:bg-white/5 transition-colors">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        🔍 Áreas de Zoom y Máscaras ({rects.length})
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-2 border-t border-white/5 flex flex-col gap-2.5 bg-[#0a0a0f]/40">
                      {rects.length === 0 ? (
                        <div className="text-[10px] text-zinc-500 italic text-center py-2.5">
                          Sin áreas de zoom/occlusión.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-0.5">
                          {rects.map((zoomRect, rIdx) => (
                            <div
                              key={rIdx}
                              className="border border-white/5 p-2 rounded bg-[#161622] flex flex-col gap-1.5"
                            >
                              <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-0.5">
                                <span className="text-[9px] font-bold text-zinc-300">
                                  {rIdx === 0
                                    ? "🎯 Área Zoom Principal"
                                    : `🤫 Máscara Spoiler ${rIdx + 1}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newRects = rects.filter((_, idx) => idx !== rIdx);
                                    handleUpdatePanelParams(pIdx, {
                                      zoomRects: newRects.length > 0 ? newRects : undefined,
                                      zoomRect: undefined,
                                    });
                                  }}
                                  className="text-[9px] text-red-400 hover:text-red-300 hover:underline font-bold"
                                >
                                  Eliminar
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] font-mono text-zinc-400">
                                    X: {zoomRect.x}%
                                  </span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={zoomRect.x}
                                    onChange={(e) => {
                                      const newRects = rects.map((r, idx) =>
                                        idx === rIdx ? { ...r, x: parseInt(e.target.value) } : r
                                      );
                                      handleUpdatePanelParams(pIdx, {
                                        zoomRects: newRects,
                                        zoomRect: undefined,
                                      });
                                    }}
                                    className="w-full accent-emerald-500 cursor-pointer h-1"
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] font-mono text-zinc-400">
                                    Y: {zoomRect.y}%
                                  </span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={zoomRect.y}
                                    onChange={(e) => {
                                      const newRects = rects.map((r, idx) =>
                                        idx === rIdx ? { ...r, y: parseInt(e.target.value) } : r
                                      );
                                      handleUpdatePanelParams(pIdx, {
                                        zoomRects: newRects,
                                        zoomRect: undefined,
                                      });
                                    }}
                                    className="w-full accent-emerald-500 cursor-pointer h-1"
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] font-mono text-zinc-400">
                                    Ancho: {zoomRect.w}%
                                  </span>
                                  <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="1"
                                    value={zoomRect.w}
                                    onChange={(e) => {
                                      const newRects = rects.map((r, idx) =>
                                        idx === rIdx ? { ...r, w: parseInt(e.target.value) } : r
                                      );
                                      handleUpdatePanelParams(pIdx, {
                                        zoomRects: newRects,
                                        zoomRect: undefined,
                                      });
                                    }}
                                    className="w-full accent-emerald-500 cursor-pointer h-1"
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] font-mono text-zinc-400">
                                    Alto: {zoomRect.h}%
                                  </span>
                                  <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="1"
                                    value={zoomRect.h}
                                    onChange={(e) => {
                                      const newRects = rects.map((r, idx) =>
                                        idx === rIdx ? { ...r, h: parseInt(e.target.value) } : r
                                      );
                                      handleUpdatePanelParams(pIdx, {
                                        zoomRects: newRects,
                                        zoomRect: undefined,
                                      });
                                    }}
                                    className="w-full accent-emerald-500 cursor-pointer h-1"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const lastRect = rects[rects.length - 1];
                          const targetY = Math.round((panel.focusY ?? 0.5) * 100);
                          const rectHeight = 20;
                          const defaultY = Math.max(0, Math.min(100 - rectHeight, targetY - rectHeight / 2));
                          const newY = lastRect ? Math.max(0, Math.min(100 - rectHeight, lastRect.y + 10)) : defaultY;
                          const newRects = [...rects, { x: 0, y: newY, w: 100, h: rectHeight }];
                          handleUpdatePanelParams(pIdx, { zoomRects: newRects, zoomRect: undefined });
                        }}
                        className="font-[var(--font-bangers)] text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded transition-all mt-1 w-full text-center tracking-wider cursor-pointer border border-emerald-700"
                      >
                        + Agregar Área (Zoom/Máscara)
                      </button>

                      {/* Duration and Anti-Spoiler config */}
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5">
                        {/* Auto-advance duration */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                            <span>
                              ⏱️ Auto-avance: {panel.duration ? `${panel.duration}s` : "Manual"}
                            </span>
                            {panel.duration !== undefined && (
                              <button
                                type="button"
                                onClick={() => handleUpdatePanelParams(pIdx, { duration: undefined })}
                                className="text-[9px] text-red-400 hover:underline font-bold"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={panel.duration ?? 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdatePanelParams(pIdx, { duration: val > 0 ? val : undefined });
                            }}
                            className="w-full accent-emerald-500 cursor-pointer h-1.5"
                          />
                        </div>

                        {/* Anti-spoiler mask checkbox/button */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] font-bold text-zinc-400">
                            🤫 Oclusión Spoiler:
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdatePanelParams(pIdx, { hideUntilReached: true })}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                panel.hideUntilReached ?? true
                                  ? "bg-purple-600 text-white border-purple-700 font-bold"
                                  : "bg-zinc-800 text-zinc-400 border-white/5 hover:bg-zinc-700"
                              }`}
                            >
                              Sí (Ocultar)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdatePanelParams(pIdx, { hideUntilReached: false })
                              }
                              className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                !(panel.hideUntilReached ?? true)
                                  ? "bg-zinc-700 text-white border-zinc-800 font-bold"
                                  : "bg-zinc-800 text-zinc-400 border-white/5 hover:bg-zinc-700"
                              }`}
                            >
                              No (Mostrar)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* SECTION 2: Audio Config Section (Collapsible) */}
                  <details className="group border border-white/10 rounded bg-[#0d0d12]/40 mb-2.5 overflow-hidden" open={isSelected && ((panel.sounds?.length ?? 0) > 0 || !!panel.sound)}>
                    <summary className="flex items-center justify-between p-2 cursor-pointer list-none select-none hover:bg-white/5 transition-colors">
                      {(() => {
                        const count = panel.sounds ? panel.sounds.length : (panel.sound ? 1 : 0);
                        return (
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            🔊 Audio ({count})
                          </span>
                        );
                      })()}
                      <span className="text-[9px] font-mono text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-2 border-t border-white/5 flex flex-col gap-2.5 bg-[#0a0a0f]/40">
                      {(() => {
                        const soundsList = panel.sounds || (panel.sound ? [{
                          sound: panel.sound,
                          soundStartTime: panel.soundStartTime,
                          soundEndTime: panel.soundEndTime,
                          soundConfig: panel.soundConfig
                        }] : []);

                        const updateSoundItem = (sIdx: number, updates: Partial<PanelSound>) => {
                          const newList = [...soundsList];
                          const existing = newList[sIdx] || { sound: "" };
                          const newConfig = updates.soundConfig 
                            ? { ...(existing.soundConfig || {}), ...updates.soundConfig }
                            : existing.soundConfig;
                          
                          newList[sIdx] = {
                            ...existing,
                            ...updates,
                            soundConfig: newConfig
                          };

                          handleUpdatePanelParams(pIdx, {
                            sound: undefined,
                            soundStartTime: undefined,
                            soundEndTime: undefined,
                            soundConfig: undefined,
                            sounds: newList
                          });
                        };

                        const removeSoundItem = (sIdx: number) => {
                          const newList = soundsList.filter((_, idx) => idx !== sIdx);
                          handleUpdatePanelParams(pIdx, {
                            sound: undefined,
                            soundStartTime: undefined,
                            soundEndTime: undefined,
                            soundConfig: undefined,
                            sounds: newList
                          });
                        };

                        const addSoundItem = () => {
                          const newList = [
                            ...soundsList,
                            {
                              sound: "",
                              soundStartTime: 0,
                              soundConfig: { volume: 1, playbackRate: 1 }
                            }
                          ];
                          handleUpdatePanelParams(pIdx, {
                            sound: undefined,
                            soundStartTime: undefined,
                            soundEndTime: undefined,
                            soundConfig: undefined,
                            sounds: newList
                          });
                        };

                        return (
                          <>
                            <div className="flex items-center justify-between border-b border-white/5 pb-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                CONFIGURACIÓN DE AUDIO
                              </label>
                              {soundsList.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdatePanelParams(pIdx, {
                                      sound: undefined,
                                      soundStartTime: undefined,
                                      soundEndTime: undefined,
                                      soundConfig: undefined,
                                      sounds: []
                                    });
                                  }}
                                  className="text-[9px] text-red-400 hover:text-red-300 hover:underline font-bold"
                                >
                                  Limpiar todo
                                </button>
                              )}
                            </div>

                            {soundsList.map((soundItem, sIdx) => {
                              const previewKey = `${pIdx}-${sIdx}`;
                              const isPreviewing = previewingSound === previewKey;
                              
                              return (
                                <div key={sIdx} className="border border-white/5 rounded-md p-2.5 bg-[#14141e] flex flex-col gap-2 relative shadow-sm">
                                  <div className="flex justify-between items-center bg-[#0a0a0f]/60 -mx-2.5 -mt-2.5 mb-1.5 p-2 border-b border-white/5 rounded-t-md">
                                    <span className="text-[10px] font-bold text-zinc-300 font-mono">
                                      🎵 Audio #{sIdx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeSoundItem(sIdx)}
                                      className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                                    >
                                      ✕ Eliminar
                                    </button>
                                  </div>

                                  {/* Sound Selector Dropdown & Player */}
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-zinc-400">
                                      Seleccionar archivo:
                                    </label>
                                    <div className="flex items-center gap-2 w-full min-w-0">
                                      <select
                                        value={soundItem.sound || ""}
                                        onChange={(e) => {
                                          const val = e.target.value || "";
                                          updateSoundItem(sIdx, { sound: val });
                                          if (val) {
                                            playPreview(val, {
                                              startTime: soundItem.soundStartTime,
                                              endTime: soundItem.soundEndTime,
                                              ...soundItem.soundConfig,
                                            });
                                          } else {
                                            stopPreview();
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 min-w-0 max-w-full truncate text-xs px-2 py-1.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                                      >
                                        <option value="">-- Selecciona un sonido --</option>
                                        {(() => {
                                          // Group sounds by folder/category dynamically
                                          const groups = availableSounds.reduce<Record<string, Array<{ name: string; path: string }>>>((acc, sound) => {
                                            const parts = sound.path.split("/");
                                            const category = (parts.length >= 3 && parts[1] === "sounds") ? parts[2] : "otros";
                                            if (!acc[category]) acc[category] = [];
                                            acc[category].push(sound);
                                            return acc;
                                          }, {});

                                          return Object.entries(groups).map(([category, items]) => (
                                            <optgroup key={category} label={category.toUpperCase()} className="bg-[#0a0a0f] text-zinc-500 font-bold">
                                              {items.map((sound) => (
                                                <option key={sound.path} value={sound.path} className="text-white bg-[#0a0a0f]">
                                                  {sound.name}
                                                </option>
                                              ))}
                                            </optgroup>
                                          ));
                                        })()}
                                      </select>
                                      {soundItem.sound && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isPreviewing) {
                                              stopPreview();
                                            } else {
                                              playPreview(soundItem.sound, {
                                                startTime: soundItem.soundStartTime,
                                                endTime: soundItem.soundEndTime,
                                                ...soundItem.soundConfig,
                                              });
                                            }
                                          }}
                                          className={`text-xs px-2.5 py-1.5 rounded font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                                            isPreviewing
                                              ? "bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-md"
                                              : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400"
                                          }`}
                                        >
                                          {isPreviewing ? "⏸ Pausa" : "▶ Probar"}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Duration Display */}
                                  {soundItem.sound && soundMetadata[soundItem.sound] && (
                                    <div className="text-[10px] text-zinc-400 px-2 py-1 bg-[#0a0a0f] border border-white/5 rounded">
                                      📹 Duración: {soundMetadata[soundItem.sound].toFixed(2)}s
                                      {soundItem.soundEndTime && (
                                        <span className="ml-2 border-l border-white/10 pl-2">
                                          Duración parcial: {(soundItem.soundEndTime - (soundItem.soundStartTime || 0)).toFixed(2)}s
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Waveform Visualizer */}
                                  {soundItem.sound && (
                                    <div className="rounded border border-white/10 bg-[#0a0a0f] overflow-hidden">
                                      <WaveformVisualizer
                                        soundPath={soundItem.sound}
                                        startTime={soundItem.soundStartTime || 0}
                                        endTime={soundItem.soundEndTime}
                                        height={50}
                                      />
                                      <div className="text-[8px] text-zinc-500 px-2 py-0.5 bg-[#0a0a0f] border-t border-white/5 flex justify-between">
                                        <span>🟩 Inicio | 🟥 Fin</span>
                                      </div>
                                    </div>
                                  )}

                                  {soundItem.sound && (
                                    <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                                      {/* Preview Button */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isPreviewing) {
                                            stopPreview();
                                          } else {
                                            playPreview(soundItem.sound, {
                                              startTime: soundItem.soundStartTime || 0,
                                              endTime: soundItem.soundEndTime,
                                              volume: soundItem.soundConfig?.volume ?? 1,
                                              playbackRate: soundItem.soundConfig?.playbackRate ?? 1,
                                              fadeIn: soundItem.soundConfig?.fadeIn ?? 0,
                                              fadeOut: soundItem.soundConfig?.fadeOut ?? 0,
                                              delay: soundItem.soundConfig?.delay ?? 0,
                                            });
                                            setPreviewingSound(previewKey);
                                          }
                                        }}
                                        className={`text-xs font-bold px-2 py-1.5 rounded border transition-all w-full cursor-pointer ${
                                          isPreviewing
                                            ? "bg-[#e8185a] text-white border-[#e8185a]"
                                            : "bg-[#161622] hover:bg-[#1f1f2e] text-rose-400 border-rose-500/30 hover:border-rose-500"
                                        }`}
                                      >
                                        {isPreviewing ? "⏸ Detener Preview" : "▶ Preview Sonido"}
                                      </button>
                                    </div>
                                  )}

                                  {/* Controls Grid */}
                                  <div className="grid grid-cols-2 gap-2 mt-0.5">
                                    {/* Sound Start Time */}
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-mono text-zinc-400">
                                        Inicio (seg):
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={soundItem.soundStartTime ?? 0}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          updateSoundItem(sIdx, {
                                            soundStartTime: val > 0 ? val : undefined,
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs px-2 py-1.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                                      />
                                    </div>

                                    {/* Sound End Time */}
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-mono text-zinc-400">
                                        Fin (seg):
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={soundItem.soundEndTime ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                          updateSoundItem(sIdx, {
                                            soundEndTime: val ? val : undefined,
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Completo"
                                        className="text-xs px-2 py-1.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Volume & Speed Sliders */}
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {/* Volume */}
                                    <div className="flex flex-col gap-1">
                                      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                        <span>Volumen:</span>
                                        <span className="text-rose-400 font-bold">
                                          {((soundItem.soundConfig?.volume ?? 1) * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={soundItem.soundConfig?.volume ?? 1}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          updateSoundItem(sIdx, {
                                            soundConfig: { volume: val },
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full accent-[#e8185a] cursor-pointer h-1"
                                      />
                                    </div>

                                    {/* Playback Rate */}
                                    <div className="flex flex-col gap-1">
                                      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                        <span>Velocidad:</span>
                                        <span className="text-rose-400 font-bold">
                                          {(soundItem.soundConfig?.playbackRate ?? 1).toFixed(2)}x
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0.5"
                                        max="5"
                                        step="0.1"
                                        value={soundItem.soundConfig?.playbackRate ?? 1}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          updateSoundItem(sIdx, {
                                            soundConfig: { playbackRate: val },
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full accent-[#e8185a] cursor-pointer h-1"
                                      />
                                    </div>
                                  </div>

                                  {/* Fade In & Fade Out */}
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-mono text-zinc-400">
                                        Fade In (ms):
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="5000"
                                        step="100"
                                        value={soundItem.soundConfig?.fadeIn ?? 0}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          updateSoundItem(sIdx, {
                                            soundConfig: { fadeIn: val > 0 ? val : undefined },
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs px-2 py-1.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                                      />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-mono text-zinc-400">
                                        Fade Out (ms):
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="5000"
                                        step="100"
                                        value={soundItem.soundConfig?.fadeOut ?? 0}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          updateSoundItem(sIdx, {
                                            soundConfig: { fadeOut: val > 0 ? val : undefined },
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs px-2 py-1.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Delay & Loop */}
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-mono text-zinc-400">
                                        Delay (ms):
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10000"
                                        step="100"
                                        value={soundItem.soundConfig?.delay ?? 0}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          updateSoundItem(sIdx, {
                                            soundConfig: { delay: val > 0 ? val : undefined },
                                          });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs px-2 py-1.5 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2 mt-5">
                                      <input
                                        type="checkbox"
                                        id={`loop-${pIdx}-${sIdx}`}
                                        checked={soundItem.soundConfig?.loop ?? false}
                                        onChange={(e) => {
                                          updateSoundItem(sIdx, {
                                            soundConfig: { loop: e.target.checked },
                                          });
                                        }}
                                        className="w-4 h-4 accent-[#e8185a] rounded border-white/10 focus:ring-rose-500 cursor-pointer"
                                      />
                                      <label htmlFor={`loop-${pIdx}-${sIdx}`} className="text-xs font-mono text-zinc-300 cursor-pointer select-none">
                                        Repetir (Loop)
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              onClick={addSoundItem}
                              className="text-xs font-bold py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded border border-blue-700 transition-all text-center flex items-center justify-center gap-1.5 mt-1 cursor-pointer"
                            >
                              ➕ Agregar otro sonido
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </details>

                  {/* SECTION 3: Dialogue List for this panel (Collapsible) */}
                  {presetMode === "custom" && (
                    <details className="group border border-white/10 rounded bg-[#0d0d12]/40 mb-1 overflow-hidden" open={isSelected && (panel.dialogue?.length || 0) > 0}>
                      <summary className="flex items-center justify-between p-2 cursor-pointer list-none select-none hover:bg-white/5 transition-colors">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          💬 Globos de Diálogo ({panel.dialogue?.length || 0})
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="p-2 border-t border-white/5 flex flex-col gap-2 bg-[#0a0a0f]/40">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-zinc-500">Globos:</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddBubble(pIdx);
                              }}
                              className="text-xs text-[#e8185a] hover:text-rose-400 hover:underline font-bold"
                            >
                              + Globo
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddBubble(pIdx, undefined, "cinematic");
                              }}
                              className="text-xs text-cyan-300 hover:text-cyan-200 hover:underline font-bold"
                            >
                              + Épico
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {panel.dialogue?.map((bub, bIdx) => {
                            const isBubActive = isSelected && activeBubbleIdx === bIdx;
                            return (
                              <button
                                key={bIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePanelIdx(pIdx);
                                  setActiveBubbleIdx(bIdx);
                                }}
                                className={`text-left text-xs p-2 border rounded font-mono truncate transition-all cursor-pointer ${
                                  isBubActive
                                    ? "border-rose-500 bg-rose-950/20 text-rose-200 font-bold"
                                    : "border-white/10 bg-[#161622] hover:bg-[#1a1a29] text-zinc-300"
                                }`}
                              >
                                {bub.speaker ? `${bub.speaker}: ` : ""}
                                {bub.text || "(vacío)"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              );
            })
          )}
      </div>
    </div>
  );
}

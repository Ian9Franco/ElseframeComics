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

function WaveformVisualizer({ soundPath, startTime = 0, endTime, height = 50 }: WaveformVisualizerProps) {
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

        const samples = 200;
        const blockSize = Math.floor(audioBuffer.length / samples);
        const filteredData: number[] = [];
        const rawData = audioBuffer.getChannelData(0);

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

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, h);

    const barWidth = width / waveformData.length;
    const maxValue = Math.max(...waveformData, 0.01);

    ctx.fillStyle = "#e8185a";
    waveformData.forEach((value, index) => {
      const barHeight = (value / maxValue) * (h * 0.8);
      const x = index * barWidth;
      const y = (h - barHeight) / 2;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    if (endTime !== undefined && duration > 0) {
      const startPixel = (startTime / duration) * width;
      const endPixel = (endTime / duration) * width;

      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startPixel, 0);
      ctx.lineTo(startPixel, h);
      ctx.stroke();

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(endPixel, 0);
      ctx.lineTo(endPixel, h);
      ctx.stroke();

      ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
      ctx.fillRect(startPixel, 0, endPixel - startPixel, h);
    }
  }, [waveformData, startTime, endTime, duration]);

  return (
    <div className="relative w-full h-[50px]">
      <canvas ref={canvasRef} width={300} height={50} className="w-full h-full block rounded" />
    </div>
  );
}

interface EditorTabStopsProps {
  currentPanels: PanelConfig[];
  activePanelIdx: number;
  handleAddPanel: () => void;
  setActivePanelIdx: (idx: number) => void;
  setActiveBubbleIdx: (idx: number | null) => void;
  handleRemovePanel: (idx: number) => void;
  handleUpdatePanelParams: (pIdx: number, updates: Partial<PanelConfig>) => void;
  handleReorderPanels: (startIndex: number, endIndex: number) => void;
}

/**
 * EditorTabStops Component (Capa 1: Paradas)
 * Handles panel stop definition, focusY positioning, reordering,
 * auto-advance timers, and multiple panel sound effects with full controls.
 */
export function EditorTabStops({
  currentPanels,
  activePanelIdx,
  handleAddPanel,
  setActivePanelIdx,
  setActiveBubbleIdx,
  handleRemovePanel,
  handleUpdatePanelParams,
  handleReorderPanels,
}: EditorTabStopsProps) {
  const [availableSounds, setAvailableSounds] = useState<Array<{ name: string; path: string }>>([]);
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [soundMetadata, setSoundMetadata] = useState<Record<string, number>>({});

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

  const activePanel = currentPanels[activePanelIdx];

  // Preload audio duration metadata
  useEffect(() => {
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

    const playWithDelay = () => {
      try {
        audio.play().catch(() => setPreviewingSound(null));

        if (fadeIn > 0) {
          const fadeInSteps = 30;
          const stepDuration = fadeIn / fadeInSteps;
          const volumeIncrement = targetVolume / fadeInSteps;
          let currentStep = 0;
          const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = Math.min(targetVolume, currentStep * volumeIncrement);
            if (currentStep >= fadeInSteps) clearInterval(fadeInterval);
          }, stepDuration);
        }

        previewIntervalRef.current = setInterval(() => {
          if (!audio || audio.paused) {
            stopPreview();
            return;
          }
          if (endTime !== undefined && audio.currentTime >= endTime) {
            if (fadeOut > 0) {
              const fadeOutSteps = 20;
              const stepDuration = fadeOut / fadeOutSteps;
              const volumeDecrement = audio.volume / fadeOutSteps;
              let currentStep = 0;
              const fadeOutInterval = setInterval(() => {
                currentStep++;
                audio.volume = Math.max(0, audio.volume - volumeDecrement);
                if (currentStep >= fadeOutSteps || audio.volume <= 0) {
                  clearInterval(fadeOutInterval);
                  stopPreview();
                }
              }, stepDuration);
            } else {
              stopPreview();
            }
          }
        }, 50);

        audio.onended = () => stopPreview();
      } catch (err) {
        stopPreview();
      }
    };

    if (delay > 0) {
      setTimeout(playWithDelay, delay);
    } else {
      playWithDelay();
    }
  };

  // Build current sounds array (converting single sound if present)
  const soundsList: PanelSound[] = activePanel?.sounds
    ? activePanel.sounds
    : activePanel?.sound
    ? [
        {
          sound: activePanel.sound,
          soundStartTime: activePanel.soundStartTime,
          soundEndTime: activePanel.soundEndTime,
          soundConfig: activePanel.soundConfig,
        },
      ]
    : [];

  const updateSoundItem = (sIdx: number, updates: Partial<PanelSound>) => {
    const newList = [...soundsList];
    const existing = newList[sIdx] || { sound: "" };
    const newConfig = {
      ...(existing.soundConfig || {}),
      ...(updates.soundConfig || {}),
    };

    newList[sIdx] = {
      ...existing,
      ...updates,
      soundConfig: newConfig,
    };

    handleUpdatePanelParams(activePanelIdx, {
      sound: undefined,
      soundStartTime: undefined,
      soundEndTime: undefined,
      soundConfig: undefined,
      sounds: newList,
    });
  };

  const removeSoundItem = (sIdx: number) => {
    const newList = soundsList.filter((_, idx) => idx !== sIdx);
    handleUpdatePanelParams(activePanelIdx, {
      sound: undefined,
      soundStartTime: undefined,
      soundEndTime: undefined,
      soundConfig: undefined,
      sounds: newList,
    });
  };

  const addSoundItem = () => {
    const newList = [
      ...soundsList,
      {
        sound: "",
        soundStartTime: 0,
        soundConfig: { volume: 1, playbackRate: 1 },
      },
    ];
    handleUpdatePanelParams(activePanelIdx, {
      sound: undefined,
      soundStartTime: undefined,
      soundEndTime: undefined,
      soundConfig: undefined,
      sounds: newList,
    });
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header & Add Stop Action */}
      <div className="flex justify-between items-center bg-[#161622] p-3 border border-white/10 rounded-md">
        <div className="flex items-center gap-2 font-[var(--font-bangers)] text-lg text-white tracking-wider">
          <span>📍 Paradas de Viñetas (Capa 1)</span>
          <span className="text-xs font-mono bg-[#0a0a0f] border border-white/10 text-rose-400 px-2.5 py-0.5 rounded-full">
            {currentPanels.length} Paradas
          </span>
        </div>
        <button
          type="button"
          onClick={handleAddPanel}
          className="font-[var(--font-bangers)] text-xs bg-emerald-600 hover:bg-emerald-700 text-white border border-white/10 px-3 py-1.5 shadow-[2px_2px_0_rgba(0,0,0,0.3)] transition-all active:scale-95 cursor-pointer rounded"
        >
          + Agregar Parada
        </button>
      </div>

      {currentPanels.length === 0 ? (
        <div className="text-sm text-zinc-500 italic text-center py-10 border border-dashed border-white/10 rounded-[#0e0e14]">
          No hay paradas definidas en esta página. Hacé clic en "+ Agregar Parada" para comenzar.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Active Stop Quick Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-[#0a0a0f] p-2 border border-white/10 rounded-md">
            <span className="text-xs font-bold text-zinc-400 self-center mr-1">Seleccionar:</span>
            {currentPanels.map((_, pIdx) => {
              const isSelected = activePanelIdx === pIdx;
              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    setActivePanelIdx(pIdx);
                    setActiveBubbleIdx(null);
                  }}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#e8185a] text-white shadow-sm"
                      : "bg-[#161622] text-zinc-300 hover:bg-zinc-800 border border-white/5"
                  }`}
                >
                  Parada {pIdx + 1}
                </button>
              );
            })}
          </div>

          {/* Detailed Config Card for Active Panel Stop */}
          {activePanel && (
            <div className="bg-[#14141e] border-2 border-[#e8185a]/60 rounded-lg p-4 flex flex-col gap-4 shadow-lg">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="font-[var(--font-bangers)] text-base text-white tracking-wide">
                  ⚙️ Configuración: Parada {activePanelIdx + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  {activePanelIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleReorderPanels(activePanelIdx, activePanelIdx - 1)}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-white/10 cursor-pointer font-bold"
                      title="Mover parada antes"
                    >
                      ▲ Subir
                    </button>
                  )}
                  {activePanelIdx < currentPanels.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleReorderPanels(activePanelIdx, activePanelIdx + 1)}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-white/10 cursor-pointer font-bold"
                      title="Mover parada después"
                    >
                      ▼ Bajar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePanel(activePanelIdx)}
                    className="text-xs text-red-400 hover:text-red-300 font-bold hover:underline px-1 cursor-pointer"
                  >
                    Eliminar Parada
                  </button>
                </div>
              </div>

              {/* Focus Y Slider */}
              <div className="flex flex-col gap-2 bg-[#0a0a0f] p-3 border border-white/10 rounded-md">
                <div className="flex justify-between text-xs font-mono text-zinc-300">
                  <span className="font-bold text-white">🎯 Altura de Enfoque (focusY):</span>
                  <span className="text-[#e8185a] font-bold">{(activePanel.focusY ?? 0.5).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={activePanel.focusY ?? 0.5}
                  onChange={(e) =>
                    handleUpdatePanelParams(activePanelIdx, { focusY: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#e8185a] cursor-pointer"
                />
                <span className="text-[10px] text-zinc-400 italic">
                  💡 Podés arrastrar la línea punteada roja directamente en el lienzo para ajustar la altura de enfoque.
                </span>
              </div>

              {/* Auto-advance duration */}
              <div className="flex flex-col gap-2 bg-[#0a0a0f] p-3 border border-white/10 rounded-md">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-300">
                  <span>⏱️ Auto-avance (Duración):</span>
                  <span className="font-mono text-[#e8185a]">
                    {activePanel.duration ? `${activePanel.duration}s` : "Manual (Sin timer)"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={activePanel.duration ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    handleUpdatePanelParams(activePanelIdx, { duration: val > 0 ? val : undefined });
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Advanced Sound Effects Section (Multi-sound + Controls) */}
              <div className="flex flex-col gap-3 bg-[#0a0a0f] p-3 border border-white/10 rounded-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    🔊 EFECTOS DE SONIDO ({soundsList.length})
                  </span>
                  <button
                    type="button"
                    onClick={addSoundItem}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded transition-all shadow-sm cursor-pointer"
                  >
                    + Agregar Sonido
                  </button>
                </div>

                {soundsList.length === 0 ? (
                  <div className="text-xs text-zinc-500 italic py-3 text-center border border-dashed border-white/5 rounded">
                    Sin efectos de sonido en esta parada. Hacé clic en "+ Agregar Sonido".
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {soundsList.map((soundItem, sIdx) => {
                      const isPreviewing = previewingSound === soundItem.sound && soundItem.sound !== "";

                      return (
                        <div key={sIdx} className="border border-white/10 rounded-md p-3 bg-[#14141e] flex flex-col gap-2.5 shadow-sm">
                          <div className="flex justify-between items-center bg-[#0a0a0f]/80 -mx-3 -mt-3 mb-1 p-2 px-3 border-b border-white/10 rounded-t-md">
                            <span className="text-xs font-bold text-rose-400 font-mono">
                              🎵 Sonido #{sIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSoundItem(sIdx)}
                              className="text-xs text-red-400 hover:text-red-300 font-bold hover:underline"
                            >
                              ✕ Eliminar
                            </button>
                          </div>

                          {/* Dropdown & Listen Previewer */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-zinc-400">Seleccionar archivo:</label>
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
                                className="flex-1 min-w-0 max-w-full truncate text-xs px-2.5 py-1.5 border border-white/15 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                              >
                                <option value="">-- Seleccioná un sonido --</option>
                                {(() => {
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
                                  onClick={() => {
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
                                  className={`text-xs px-3 py-1.5 rounded font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                                    isPreviewing
                                      ? "bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-md"
                                      : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400"
                                  }`}
                                >
                                  {isPreviewing ? "⏸ Pausa" : "▶ Escuchar"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Duration Info */}
                          {soundItem.sound && soundMetadata[soundItem.sound] && (
                            <div className="text-[10px] text-zinc-400 px-2 py-1 bg-[#0a0a0f] border border-white/5 rounded">
                              📹 Duración total: {soundMetadata[soundItem.sound].toFixed(2)}s
                              {soundItem.soundEndTime && (
                                <span className="ml-2 border-l border-white/10 pl-2 text-emerald-400">
                                  Duración recortada: {(soundItem.soundEndTime - (soundItem.soundStartTime || 0)).toFixed(2)}s
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
                              <div className="text-[8px] text-zinc-500 px-2 py-0.5 bg-[#0a0a0f] border-t border-white/5 flex justify-between font-mono">
                                <span>🟩 Inicio | 🟥 Fin</span>
                              </div>
                            </div>
                          )}

                          {/* Sound Trim Controls (Start / End) */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-mono text-zinc-400">Inicio (seg):</label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={soundItem.soundStartTime ?? 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateSoundItem(sIdx, { soundStartTime: val > 0 ? val : undefined });
                                }}
                                className="text-xs px-2 py-1 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-mono text-zinc-400">Fin (seg):</label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={soundItem.soundEndTime ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                  updateSoundItem(sIdx, { soundEndTime: val });
                                }}
                                placeholder="Completo"
                                className="text-xs px-2 py-1 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          </div>

                          {/* Volume & Speed Sliders */}
                          <div className="grid grid-cols-2 gap-2">
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
                                  updateSoundItem(sIdx, { soundConfig: { volume: val } });
                                }}
                                className="w-full accent-[#e8185a] cursor-pointer h-1"
                              />
                            </div>

                            {/* Playback Speed */}
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
                                  updateSoundItem(sIdx, { soundConfig: { playbackRate: val } });
                                }}
                                className="w-full accent-[#e8185a] cursor-pointer h-1"
                              />
                            </div>
                          </div>

                          {/* Loop Checkbox & Delay */}
                          <div className="grid grid-cols-2 gap-2 items-center">
                            <label className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={soundItem.soundConfig?.loop ?? false}
                                onChange={(e) => updateSoundItem(sIdx, { soundConfig: { loop: e.target.checked } })}
                                className="accent-[#e8185a] cursor-pointer"
                              />
                              <span>Repetir (Loop)</span>
                            </label>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[10px] font-mono text-zinc-400">Retardo (ms):</label>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={soundItem.soundConfig?.delay ?? 0}
                                onChange={(e) => updateSoundItem(sIdx, { soundConfig: { delay: parseInt(e.target.value) || 0 } })}
                                className="text-xs px-2 py-1 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          </div>

                          {/* Fade In & Fade Out */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[10px] font-mono text-zinc-400">Fade In (ms):</label>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={soundItem.soundConfig?.fadeIn ?? 0}
                                onChange={(e) => updateSoundItem(sIdx, { soundConfig: { fadeIn: parseInt(e.target.value) || 0 } })}
                                className="text-xs px-2 py-1 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-[10px] font-mono text-zinc-400">Fade Out (ms):</label>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={soundItem.soundConfig?.fadeOut ?? 0}
                                onChange={(e) => updateSoundItem(sIdx, { soundConfig: { fadeOut: parseInt(e.target.value) || 0 } })}
                                className="text-xs px-2 py-1 border border-white/10 rounded font-mono bg-[#0a0a0f] text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import type { DialogueLine } from "../DialogueBubble";

interface EditorBubbleVisualsFormProps {
  bubble: DialogueLine;
  activePanelIdx: number;
  activeBubbleIdx: number;
  handleUpdateBubble: (pIdx: number, bIdx: number, updates: Partial<DialogueLine>) => void;
}

export function EditorBubbleVisualsForm({
  bubble,
  activePanelIdx,
  activeBubbleIdx,
  handleUpdateBubble,
}: EditorBubbleVisualsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* CARD 1: 🗣️ PERSONAJE / HABLANTE (Indigo/Purple Theme) */}
      <div className="bg-[#0f0e1a] border-2 border-indigo-500/40 rounded-lg p-3.5 flex flex-col gap-3 shadow-md">
        <div className="flex justify-between items-center border-b border-indigo-500/20 pb-2">
          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            🗣️ Hablante / Personaje
          </span>
          {bubble.speaker && (
            <button
              type="button"
              onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { speaker: "" })}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
            >
              Quitar
            </button>
          )}
        </div>

        <input
          type="text"
          value={bubble.speaker || ""}
          onChange={(e) => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { speaker: e.target.value })}
          className="w-full border border-indigo-500/30 p-2 text-xs font-mono rounded bg-[#0a0a0f] text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Ej: Sofi, Ian, Byte..."
        />

        {/* Speaker Toggle for Off-screen / Radio */}
        {bubble.speaker && (
          <label className="flex items-center gap-2 text-xs text-indigo-200 cursor-pointer select-none bg-[#141226] p-2 border border-indigo-500/20 rounded hover:border-indigo-400 transition-colors">
            <input
              type="checkbox"
              checked={!!bubble.showSpeakerName || !!bubble.offscreen}
              onChange={(e) =>
                handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                  showSpeakerName: e.target.checked,
                })
              }
              className="rounded border-indigo-500/30 bg-zinc-900 text-indigo-500 focus:ring-0 cursor-pointer"
            />
            <span className="text-[11px] font-medium text-indigo-200">
              Mostrar nombre dentro del texto (Ian: hola), no como título
            </span>
          </label>
        )}

        {/* Speaker Presets */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-indigo-400">Hablantes rápidos:</label>
          <div className="flex flex-wrap gap-1">
            {["Uandi", "Sofi", "Jaz", "Ian", "Julián", "Mati", "Volvo", "Brooke", "Daichi", "Ren", "Byte", "Oni"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { speaker: name })}
                className={`px-2 py-1 border text-[10px] font-bold rounded transition-all cursor-pointer ${
                  bubble.speaker === name
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-sm"
                    : "bg-[#141226] border-indigo-500/20 text-indigo-200 hover:bg-indigo-900/40 hover:border-indigo-400"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CARD 2: 🎨 ESTILO VISUAL DEL GLOBO (Amber/Gold Theme) */}
      <div className="bg-[#18140c] border-2 border-amber-500/40 rounded-lg p-3.5 flex flex-col gap-3 shadow-md">
        <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            🎨 Estilo del Globo
          </span>
          <span className="text-[10px] font-mono bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
            {bubble.style || "normal"}
          </span>
        </div>

        <select
          value={bubble.style || "normal"}
          onChange={(e) => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { style: e.target.value as any })}
          className="w-full border border-amber-500/30 p-2 text-xs font-mono rounded bg-[#0a0a0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer font-bold"
        >
          <option value="normal">💬 Normal (Bocadillo clásico)</option>
          <option value="caption">📜 Narración (Caja cuadrada)</option>
          <option value="thought">💭 Pensamiento (Nube)</option>
          <option value="scream">💥 Grito (Llamativo/Bangers)</option>
          <option value="whisper">🤫 Susurro (Discontinuo/Itálico)</option>
          <option value="electronic">🤖 Electrónico (HUD Futurista Monospace)</option>
          <option value="sfx">⚡ Efecto de Sonido (SFX/Onomatopeya)</option>
          <option value="cinematic">🎬 Cinemático (Texto Épico Grande)</option>
        </select>

        {/* Cinematic Text Presets */}
        {bubble.style === "cinematic" && (
          <div className="flex flex-col gap-2 p-2.5 bg-cyan-950/30 border border-cyan-800/40 rounded shadow-sm">
            <label className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
              Presets Épicos Cinemáticos:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                    cinematicVariant: "translucent",
                    cinematic3d: true,
                    customBg: "transparent",
                    customColor: "#0a0a0f",
                    textColor: "#0a0a0f",
                    fontFamily: "bungee",
                    fontSize: 76,
                    width: 900,
                    tail: "none",
                  });
                }}
                className="p-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-[10px] font-bold rounded transition-colors cursor-pointer"
              >
                Translúcido oscuro
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                    cinematicVariant: "solid",
                    cinematic3d: true,
                    customBg: "transparent",
                    customColor: "#0a0a0f",
                    textColor: "#ffffff",
                    fontFamily: "bungee",
                    fontSize: 70,
                    width: 820,
                    tail: "none",
                  });
                }}
                className="p-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 text-[#0a0a0f] text-[10px] font-bold rounded transition-colors cursor-pointer"
              >
                Sólido blanco
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                    cinematicVariant: "outline",
                    cinematic3d: false,
                    customBg: "transparent",
                    customColor: "#0a0a0f",
                    textColor: "#ffffff",
                    fontFamily: "bungee",
                    fontSize: 74,
                    width: 860,
                    tail: "none",
                  });
                }}
                className="p-1.5 bg-[#0a0a0f] hover:bg-[#161622] border border-white/30 text-white text-[10px] font-bold rounded transition-colors cursor-pointer"
              >
                Solo borde
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                    cinematicVariant: "solid",
                    cinematic3d: true,
                    customBg: "transparent",
                    customColor: "#0a0a0f",
                    textColor: "#e81818",
                    fontFamily: "bungee",
                    fontSize: 82,
                    width: 900,
                    tail: "none",
                  });
                }}
                className="p-1.5 bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300 text-[10px] font-bold rounded transition-colors cursor-pointer"
              >
                Rojo impacto
              </button>
            </div>
          </div>
        )}

        {/* Sound SFX Presets */}
        {bubble.style === "sfx" && (
          <div className="flex flex-col gap-1.5 p-2.5 bg-amber-950/40 border border-amber-700/50 rounded shadow-sm">
            <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              ⚡ Presets Rápidos de Sonido (SFX):
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                    customBg: "#f5e642",
                    customColor: "#e8185a",
                    textColor: "#ffffff",
                    fontFamily: "luckiest",
                    fontSize: 28,
                    tail: "none",
                  });
                }}
                className="p-1 bg-[#f5e642] hover:bg-[#ffe554] border border-amber-600 text-[#e8185a] text-[10px] font-bold rounded flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
              >
                💥 BAM!
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                    customBg: "#e8185a",
                    customColor: "#f5e642",
                    textColor: "#ffffff",
                    fontFamily: "luckiest",
                    fontSize: 28,
                    tail: "none",
                  });
                }}
                className="p-1 bg-[#e8185a] hover:bg-[#ff3b7a] border border-rose-600 text-[#f5e642] text-[10px] font-bold rounded flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
              >
                ⚡ POW!
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                    customBg: "transparent",
                    customColor: "#0a0a0f",
                    textColor: "#00b8d4",
                    fontFamily: "bungee",
                    fontSize: 24,
                    tail: "none",
                  });
                }}
                className="p-1 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800 text-cyan-300 text-[10px] font-bold rounded flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
              >
                💨 SWOOSH!
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                    customBg: "#0a0a0f",
                    customColor: "#f5e642",
                    textColor: "#f5e642",
                    fontFamily: "luckiest",
                    fontSize: 32,
                    tail: "none",
                  });
                }}
                className="p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-yellow-300 text-[10px] font-bold rounded flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
              >
                💀 BOOM!
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD 3: 📐 TAMAÑO DEL GLOBO (Emerald Theme) */}
      <div className="bg-[#0c1813] border-2 border-emerald-500/40 rounded-lg p-3.5 flex flex-col gap-3 shadow-md">
        <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            📐 Tamaño y Escala del Globo
          </span>
          <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
            {bubble.size === "small" ? "S (Pequeño)" : bubble.size === "large" ? "L (Grande)" : "M (Mediano)"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { size: "small" })}
            className={`py-2 px-1 text-xs font-bold rounded transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
              (bubble.size || "medium") === "small"
                ? "bg-emerald-600 text-white border-2 border-emerald-300 shadow-sm"
                : "bg-[#12241d] text-emerald-200 hover:bg-emerald-900/40 border border-emerald-500/20"
            }`}
          >
            <span className="text-sm">S</span>
            <span className="text-[10px]">Pequeño</span>
          </button>

          <button
            type="button"
            onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { size: "medium" })}
            className={`py-2 px-1 text-xs font-bold rounded transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
              (bubble.size || "medium") === "medium"
                ? "bg-emerald-600 text-white border-2 border-emerald-300 shadow-sm"
                : "bg-[#12241d] text-emerald-200 hover:bg-emerald-900/40 border border-emerald-500/20"
            }`}
          >
            <span className="text-base">M</span>
            <span className="text-[10px]">Mediano</span>
          </button>

          <button
            type="button"
            onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { size: "large" })}
            className={`py-2 px-1 text-xs font-bold rounded transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
              (bubble.size || "medium") === "large"
                ? "bg-emerald-600 text-white border-2 border-emerald-300 shadow-sm"
                : "bg-[#12241d] text-emerald-200 hover:bg-emerald-900/40 border border-emerald-500/20"
            }`}
          >
            <span className="text-lg">L</span>
            <span className="text-[10px]">Grande</span>
          </button>
        </div>

        {/* Border Radius / Curvatura de Esquinas Slider & Presets */}
        <div className="flex flex-col gap-2 pt-2.5 border-t border-emerald-500/20">
          <div className="flex justify-between items-center text-xs font-bold text-emerald-200">
            <span>🔲 Redondeado de Esquinas (Curvatura):</span>
            <span className="font-mono text-emerald-400 font-bold">
              {bubble.borderRadius !== undefined ? `${bubble.borderRadius}px` : "Defecto"}
            </span>
            {bubble.borderRadius !== undefined && (
              <button
                type="button"
                onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { borderRadius: undefined })}
                className="text-[10px] text-red-400 hover:underline font-bold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={bubble.borderRadius ?? 18}
            onChange={(e) =>
              handleUpdateBubble(activePanelIdx, activeBubbleIdx, { borderRadius: parseInt(e.target.value) })
            }
            className="w-full accent-emerald-500 cursor-pointer h-1.5"
          />
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { borderRadius: 0 })}
              className={`px-1 py-1 border text-[10px] font-bold rounded transition-all cursor-pointer ${
                bubble.borderRadius === 0
                  ? "bg-emerald-600 border-emerald-300 text-white shadow-sm"
                  : "bg-emerald-950/40 border-emerald-500/20 text-emerald-300 hover:bg-emerald-900/40"
              }`}
            >
              0px (Recto ⬛)
            </button>
            <button
              type="button"
              onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { borderRadius: 8 })}
              className={`px-1 py-1 border text-[10px] font-bold rounded transition-all cursor-pointer ${
                bubble.borderRadius === 8
                  ? "bg-emerald-600 border-emerald-300 text-white shadow-sm"
                  : "bg-emerald-950/40 border-emerald-500/20 text-emerald-300 hover:bg-emerald-900/40"
              }`}
            >
              8px (Suave)
            </button>
            <button
              type="button"
              onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { borderRadius: 18 })}
              className={`px-1 py-1 border text-[10px] font-bold rounded transition-all cursor-pointer ${
                bubble.borderRadius === 18
                  ? "bg-emerald-600 border-emerald-300 text-white shadow-sm"
                  : "bg-emerald-950/40 border-emerald-500/20 text-emerald-300 hover:bg-emerald-900/40"
              }`}
            >
              18px (Norm)
            </button>
            <button
              type="button"
              onClick={() => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { borderRadius: 32 })}
              className={`px-1 py-1 border text-[10px] font-bold rounded transition-all cursor-pointer ${
                bubble.borderRadius === 32
                  ? "bg-emerald-600 border-emerald-300 text-white shadow-sm"
                  : "bg-emerald-950/40 border-emerald-500/20 text-emerald-300 hover:bg-emerald-900/40"
              }`}
            >
              32px (Píldora)
            </button>
          </div>
        </div>
      </div>

      {/* CARD 4: 🔤 TIPOGRAFÍA, COLORES Y DISEÑO (Sky/Blue Theme) */}
      <div className="bg-[#0c141c] border-2 border-sky-500/40 rounded-lg p-3.5 flex flex-col gap-3 shadow-md">
        <div className="flex justify-between items-center border-b border-sky-500/20 pb-2">
          <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
            🔤 Tipografía y Colores
          </span>
        </div>

        {/* Font Family */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-sky-200">Tipo de Fuente / Letra:</label>
          <select
            value={bubble.fontFamily || ""}
            onChange={(e) =>
              handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                fontFamily: (e.target.value || undefined) as any,
              })
            }
            className="w-full border border-sky-500/30 p-2 text-xs font-mono rounded bg-[#0a0a0f] text-white focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer font-bold"
          >
            <option value="">Por defecto del estilo</option>
            <option value="marker">✏️ Marker (Cómic Permanente)</option>
            <option value="bangers">💥 Bangers (Llamativo/Grito)</option>
            <option value="luckiest">🍀 Luckiest (Cómic SFX Blocky)</option>
            <option value="bungee">🧱 Bungee (Gruesa/Moderna)</option>
            <option value="arcane">✦ Arcana (Magos / grimorio)</option>
            <option value="diabolic">☠ Diabólica (Demonios / horror)</option>
            <option value="mono">💻 Monospace (Tecnológico)</option>
            <option value="sans">✨ Sans-Serif (Limpio/Moderno)</option>
            <option value="serif">📜 Serif (Clásico/Elegante)</option>
          </select>
        </div>

        {/* Day/Night Presets */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-sky-200">Preset Día / Noche:</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                  customBg: "#ffffff",
                  customColor: "#1c1c1c",
                  textColor: "#1c1c1c",
                });
              }}
              className="flex-1 py-1.5 px-2 bg-white hover:bg-zinc-100 border border-zinc-300 text-[#0a0a0f] text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              ☀️ Día
            </button>
            <button
              type="button"
              onClick={() => {
                handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                  customBg: "#f5e642",
                  customColor: "#000000",
                  textColor: "#000000",
                });
              }}
              className="flex-1 py-1.5 px-2 bg-yellow-450 hover:bg-yellow-500 border border-amber-600 text-black text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              🌙 Noche
            </button>
          </div>
        </div>

        {/* Transparency / Translucency Presets */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-sky-200">Transparencia / Opacidad:</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                  customBg: "rgba(255, 255, 255, 0.88)",
                  customColor: "#0a0a0f",
                  textColor: "#0a0a0f",
                });
              }}
              className="flex-1 py-1.5 px-2 bg-white/20 hover:bg-white/30 border border-white/20 hover:border-white/40 text-white text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              💎 Translúcido
            </button>
            <button
              type="button"
              onClick={() => {
                handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                  customBg: "rgba(255, 255, 255, 0.5)",
                  customColor: "#0a0a0f",
                  textColor: "#0a0a0f",
                });
              }}
              className="flex-1 py-1.5 px-2 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 text-white text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              🌫️ Semitransp.
            </button>
            <button
              type="button"
              onClick={() => {
                handleUpdateBubble(activePanelIdx, activeBubbleIdx, {
                  customBg: "#ffffff",
                });
              }}
              className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              ⚪ Sólido
            </button>
          </div>
        </div>

        {/* Custom Colors Grid */}
        <div className="grid grid-cols-3 gap-2 mt-1 pt-2 border-t border-sky-500/20">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-sky-200">Fondo:</label>
            <input
              type="color"
              value={bubble.customBg || "#ffffff"}
              onChange={(e) => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { customBg: e.target.value })}
              className="w-full h-8 p-0 border border-sky-500/30 rounded cursor-pointer bg-transparent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-sky-200">Borde:</label>
            <input
              type="color"
              value={bubble.customColor || "#0a0a0f"}
              onChange={(e) => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { customColor: e.target.value })}
              className="w-full h-8 p-0 border border-sky-500/30 rounded cursor-pointer bg-transparent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-sky-200">Texto:</label>
            <input
              type="color"
              value={bubble.textColor || "#000000"}
              onChange={(e) => handleUpdateBubble(activePanelIdx, activeBubbleIdx, { textColor: e.target.value })}
              className="w-full h-8 p-0 border border-sky-500/30 rounded cursor-pointer bg-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

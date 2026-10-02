"use client";

import React from "react";
import {
  BookOpen,
  Clapperboard,
  Cloud,
  Megaphone,
  MessageSquare,
  Radio,
  Sparkles,
  VolumeX,
} from "lucide-react";
import { BUBBLE_PALETTE, type BubbleStylePreset } from "../types";

const PALETTE_ICONS: Record<BubbleStylePreset, typeof MessageSquare> = {
  normal: MessageSquare,
  scream: Megaphone,
  whisper: VolumeX,
  thought: Cloud,
  caption: BookOpen,
  cinematic: Clapperboard,
  electronic: Radio,
  sfx: Sparkles,
};

export function BubbleStyleSelect({
  activeStyle,
  onStyleChange,
  className = "",
}: {
  activeStyle: BubbleStylePreset;
  onStyleChange: (s: BubbleStylePreset) => void;
  className?: string;
}) {
  return (
    <select
      value={activeStyle}
      onChange={(e) => onStyleChange(e.target.value as BubbleStylePreset)}
      className={`w-full text-sm bg-[#0a0a0f] text-white border border-white/10 rounded px-2 py-2 font-bold ${className}`}
      aria-label="Tipo de globo"
    >
      {BUBBLE_PALETTE.map((item) => (
        <option key={item.id} value={item.id}>
          {item.emoji} {item.label}
        </option>
      ))}
    </select>
  );
}

export function BubblePalette({
  activeStyle,
  onStyleChange,
  onDragStartStyle,
}: {
  activeStyle: BubbleStylePreset;
  onStyleChange: (s: BubbleStylePreset) => void;
  onDragStartStyle: (s: BubbleStylePreset, e: React.DragEvent) => void;
}) {
  return (
    <div className="p-3 bg-[#14141e] border-b border-white/10 flex flex-wrap gap-2">
      <span className="text-xs font-bold text-zinc-400 w-full px-1 uppercase tracking-wider">Tipos de globo</span>
      {BUBBLE_PALETTE.map((item) => {
        const Icon = PALETTE_ICONS[item.id];
        return (
          <button
            key={item.id}
            type="button"
            draggable
            onDragStart={(e) => onDragStartStyle(item.id, e)}
            onClick={() => onStyleChange(item.id)}
            className={`px-3 py-1.5 rounded text-sm font-bold cursor-grab active:cursor-grabbing transition-all inline-flex items-center gap-1.5 ${
              activeStyle === item.id
                ? "bg-[#e8185a] text-white"
                : "bg-[#0a0a0f] text-zinc-300 border border-white/10 hover:border-white/25"
            }`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

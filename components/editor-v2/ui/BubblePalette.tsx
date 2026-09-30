"use client";

import React from "react";
import { BUBBLE_PALETTE, type BubbleStylePreset } from "../types";

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
    <div className="p-2 bg-[#14141e] border-b border-white/10 flex flex-wrap gap-1.5">
      <span className="text-[10px] font-bold text-zinc-500 w-full px-1 uppercase tracking-wider">Tipos de globo</span>
      {BUBBLE_PALETTE.map((item) => (
        <button
          key={item.id}
          type="button"
          draggable
          onDragStart={(e) => onDragStartStyle(item.id, e)}
          onClick={() => onStyleChange(item.id)}
          className={`px-2 py-1 rounded text-[10px] font-bold cursor-grab active:cursor-grabbing transition-all ${
            activeStyle === item.id
              ? "bg-[#e8185a] text-white"
              : "bg-[#0a0a0f] text-zinc-300 border border-white/10 hover:border-white/25"
          }`}
        >
          {item.emoji} {item.label}
        </button>
      ))}
    </div>
  );
}

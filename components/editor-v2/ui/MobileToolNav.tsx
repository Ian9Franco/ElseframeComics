"use client";

import React from "react";
import { Hand, MapPin, MessageSquare, Square } from "lucide-react";
import type { EditorV2Tool } from "../types";

const TOOLS: { id: EditorV2Tool; label: string; Icon: typeof MapPin }[] = [
  { id: "stops", label: "Paradas", Icon: MapPin },
  { id: "bubble", label: "Diálogos", Icon: MessageSquare },
  { id: "mask", label: "Máscaras", Icon: Square },
  { id: "hand", label: "Mano", Icon: Hand },
];

export function MobileToolNav({
  activeTool,
  onToolChange,
}: {
  activeTool: EditorV2Tool;
  onToolChange: (t: EditorV2Tool) => void;
}) {
  return (
    <div className="lg:hidden shrink-0 flex border-t border-white/10 bg-[#12121c] pb-[env(safe-area-inset-bottom)]">
      {TOOLS.map(({ id, label, Icon }) => {
        const active = activeTool === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToolChange(id)}
            className={`flex-1 min-h-12 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              active ? "text-white bg-[#e8185a]/25" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? "text-[#e8185a]" : ""}`} strokeWidth={2.2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

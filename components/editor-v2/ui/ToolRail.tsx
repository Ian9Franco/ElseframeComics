"use client";

import React from "react";
import { Hand, MapPin, MessageSquare, Plus, Square } from "lucide-react";
import type { EditorV2Tool } from "../types";

const tools: { id: EditorV2Tool; label: string; key: string; Icon: typeof MapPin }[] = [
  { id: "stops", label: "Paradas", key: "P", Icon: MapPin },
  { id: "bubble", label: "Diálogos", key: "B", Icon: MessageSquare },
  { id: "mask", label: "Máscaras", key: "M", Icon: Square },
  { id: "hand", label: "Mano", key: "H", Icon: Hand },
];

export function ToolRail({
  activeTool,
  onToolChange,
  onAddStop,
}: {
  activeTool: EditorV2Tool;
  onToolChange: (t: EditorV2Tool) => void;
  onAddStop: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 p-2 bg-[#12121c] border-r border-white/10 shrink-0 w-16">
      {tools.map((t) => (
        <button
          key={t.id}
          type="button"
          title={`${t.label} (${t.key})`}
          onClick={() => onToolChange(t.id)}
          className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTool === t.id
              ? "bg-[#e8185a] text-white shadow-md"
              : "bg-[#0a0a0f] text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          <t.Icon className="w-5 h-5" strokeWidth={2.2} />
          <span className="text-[9px] font-mono font-bold mt-0.5">{t.key}</span>
        </button>
      ))}
      {activeTool === "stops" && (
        <button
          type="button"
          title="Agregar parada"
          onClick={onAddStop}
          className="w-12 h-12 rounded-lg flex flex-col items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          <span className="text-[9px] font-bold uppercase">Parada</span>
        </button>
      )}
    </div>
  );
}

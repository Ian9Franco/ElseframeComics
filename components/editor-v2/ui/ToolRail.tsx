"use client";

import React from "react";
import type { EditorV2Tool } from "../types";

const tools: { id: EditorV2Tool; label: string; key: string; icon: string }[] = [
  { id: "select", label: "Seleccionar", key: "V", icon: "↖" },
  { id: "bubble", label: "Globo", key: "B", icon: "💬" },
  { id: "stop", label: "Viñeta", key: "M", icon: "▭" },
  { id: "hand", label: "Mano", key: "H", icon: "✋" },
];

export function ToolRail({
  activeTool,
  onToolChange,
}: {
  activeTool: EditorV2Tool;
  onToolChange: (t: EditorV2Tool) => void;
}) {
  return (
    <div className="flex flex-col gap-1 p-2 bg-[#12121c] border-r border-white/10 shrink-0 w-14">
      {tools.map((t) => (
        <button
          key={t.id}
          type="button"
          title={`${t.label} (${t.key})`}
          onClick={() => onToolChange(t.id)}
          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-lg transition-all cursor-pointer ${
            activeTool === t.id
              ? "bg-[#e8185a] text-white shadow-md"
              : "bg-[#0a0a0f] text-zinc-400 hover:text-white border border-white/10"
          }`}
        >
          <span>{t.icon}</span>
          <span className="text-[8px] font-mono font-bold">{t.key}</span>
        </button>
      ))}
    </div>
  );
}

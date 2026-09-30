"use client";

import React from "react";
import { getComicPageUrl } from "@/components/reader/readerUtils";

export function PageStrip({
  pages,
  pageIdx,
  onSelect,
}: {
  pages: string[];
  pageIdx: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="h-20 shrink-0 bg-[#0e0e14] border-r border-white/10 overflow-y-auto overflow-x-hidden w-20 flex flex-col gap-1 p-1.5">
      {pages.map((p, i) => (
        <button
          key={p}
          type="button"
          onClick={() => onSelect(i)}
          className={`relative rounded overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
            pageIdx === i ? "border-[#e8185a] shadow-[0_0_8px_rgba(232,24,90,0.5)]" : "border-white/10 opacity-70 hover:opacity-100"
          }`}
        >
          <img src={getComicPageUrl(p)} alt="" className="w-full aspect-[2/3] object-cover" />
          <span className="absolute bottom-0 right-0 bg-black/70 text-[9px] font-mono text-white px-1">{i + 1}</span>
        </button>
      ))}
    </div>
  );
}

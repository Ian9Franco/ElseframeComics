"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getComicAssetUrl } from "@/components/reader/readerUtils";
import { filterSoundsForEditorPicker } from "@/lib/readerSystemSounds";

type SoundFile = { name: string; path: string };

type TreeNode = {
  folders: Record<string, TreeNode>;
  files: SoundFile[];
};

function buildTree(files: SoundFile[]): TreeNode {
  const root: TreeNode = { folders: {}, files: [] };
  for (const file of files) {
    const parts = file.path.replace(/^\/sounds\//, "").split("/").filter(Boolean);
    if (parts.length === 0) continue;
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const folder = parts[i];
      if (!node.folders[folder]) node.folders[folder] = { folders: {}, files: [] };
      node = node.folders[folder];
    }
    node.files.push(file);
  }
  return root;
}

function nodeAtPath(root: TreeNode, crumbs: string[]): TreeNode {
  let node = root;
  for (const crumb of crumbs) {
    node = node.folders[crumb];
    if (!node) return { folders: {}, files: [] };
  }
  return node;
}

export function SoundFolderPicker({
  onPick,
  compact,
}: {
  onPick: (path: string) => void;
  compact?: boolean;
}) {
  const [files, setFiles] = useState<SoundFile[]>([]);
  const [crumbs, setCrumbs] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/sounds")
      .then((r) => r.json())
      .then((data) => setFiles(filterSoundsForEditorPicker(Array.isArray(data) ? data : [])))
      .catch(() => setFiles([]));
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const tree = useMemo(() => buildTree(files), [files]);
  const node = useMemo(() => nodeAtPath(tree, crumbs), [tree, crumbs]);
  const folderNames = Object.keys(node.folders).sort((a, b) => a.localeCompare(b));

  const togglePreview = (path: string) => {
    if (previewing === path) {
      audioRef.current?.pause();
      setPreviewing(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(getComicAssetUrl(path));
    audioRef.current = audio;
    audio.play().catch(() => undefined);
    audio.onended = () => setPreviewing(null);
    setPreviewing(path);
  };

  return (
    <div className={`flex flex-col gap-2 ${compact ? "" : "min-h-[180px]"}`}>
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => setCrumbs([])}
          className="px-2 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
        >
          Sonidos
        </button>
        {crumbs.map((c, i) => (
          <React.Fragment key={`${c}-${i}`}>
            <span className="text-zinc-500">/</span>
            <button
              type="button"
              onClick={() => setCrumbs(crumbs.slice(0, i + 1))}
              className="px-2 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            >
              {c}
            </button>
          </React.Fragment>
        ))}
      </div>

      {folderNames.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {folderNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCrumbs([...crumbs, name])}
              className="text-left px-2.5 py-2 rounded-md bg-[#161622] border border-white/10 hover:border-[#e8185a]/50 text-sm truncate"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {node.files.length > 0 && (
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {node.files.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#0a0a0f] border border-white/5"
            >
              <button
                type="button"
                onClick={() => onPick(file.path)}
                className="flex-1 text-left text-sm truncate hover:text-white text-zinc-300"
              >
                {file.name}
              </button>
              <button
                type="button"
                onClick={() => togglePreview(file.path)}
                className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 shrink-0"
              >
                {previewing === file.path ? "Pausa" : "Play"}
              </button>
            </div>
          ))}
        </div>
      )}

      {folderNames.length === 0 && node.files.length === 0 && (
        <p className="text-sm text-zinc-500 italic">No hay archivos en esta carpeta.</p>
      )}
    </div>
  );
}

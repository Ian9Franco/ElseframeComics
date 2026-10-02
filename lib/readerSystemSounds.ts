/**
 * Sounds baked into the reader UX (page flip, etc.) — not chapter SFX/music tracks.
 */

import type { Dialogues, PanelStop } from "@/components/reader/audioPlayer";

export const PAGE_FLIP_SOUND_PATH = "/sounds/sfx/page-flip.mp3";

export const READER_LOCAL_STORAGE_PAGE_FLIP = "reader_page_flip_sound";

export function normalizeSoundAssetPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\\/g, "/").toLowerCase();
}

/** True for built-in reader sounds that must not appear in editor pickers or audioTracks. */
export function isReaderSystemSound(path: string | null | undefined): boolean {
  if (!path) return false;
  const n = normalizeSoundAssetPath(path);
  if (n === normalizeSoundAssetPath(PAGE_FLIP_SOUND_PATH)) return true;
  if (n.endsWith("/page-flip.mp3")) return true;
  return false;
}

export function filterSoundsForEditorPicker<T extends { path: string }>(files: T[]): T[] {
  return files.filter((f) => !isReaderSystemSound(f.path));
}

export function readPageFlipSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(READER_LOCAL_STORAGE_PAGE_FLIP);
  if (saved === null) return true;
  return saved === "true";
}

export function writePageFlipSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(READER_LOCAL_STORAGE_PAGE_FLIP, enabled ? "true" : "false");
}

function stripPanelSystemSounds(panel: PanelStop): PanelStop {
  let next: PanelStop = { ...panel };
  if (isReaderSystemSound(next.sound)) {
    next = { ...next, sound: undefined, soundConfig: undefined, soundStartTime: undefined, soundEndTime: undefined };
  }
  if (next.sounds?.length) {
    const sounds = next.sounds.filter((s) => !isReaderSystemSound(s.sound));
    next = { ...next, sounds: sounds.length ? sounds : undefined };
  }
  return next;
}

/** Removes reader-only sounds from editable dialogue data before save / display in editor stacks. */
export function stripReaderSystemSoundsFromDialogues(dialogues: Dialogues): Dialogues {
  const audioTracks = (dialogues.audioTracks ?? []).filter((t) => !isReaderSystemSound(t.src));
  const pages = dialogues.pages ? { ...dialogues.pages } : {};
  for (const key of Object.keys(pages)) {
    const page = pages[key];
    if (!page?.panels?.length) continue;
    pages[key] = {
      ...page,
      panels: page.panels.map(stripPanelSystemSounds),
    };
  }
  return { ...dialogues, audioTracks, pages };
}

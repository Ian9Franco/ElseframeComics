import type { DialogueContextConfig } from "@/lib/dialogueContext";
import type { AudioTrack, Dialogues } from "@/components/reader/audioPlayer";

/** old page key -> new page key, or null if the page was deleted */
export type PageMap = Record<string, string | null>;

function remapKey(pageMap: PageMap, key: string | undefined): string | undefined {
  if (!key) return key;
  if (!(key in pageMap)) return key;
  return pageMap[key] ?? undefined;
}

export function remapPageReferences<T extends { pages?: Record<string, unknown> }>(
  pagesRecord: T["pages"],
  pageMap: PageMap
): T["pages"] {
  if (!pagesRecord) return pagesRecord;
  const next: Record<string, unknown> = {};
  for (const [oldKey, value] of Object.entries(pagesRecord)) {
    const newKey = oldKey in pageMap ? pageMap[oldKey] : oldKey;
    if (newKey == null) continue;
    next[newKey] = value;
  }
  return next as T["pages"];
}

export function remapAudioTracks(tracks: AudioTrack[] | undefined, pageMap: PageMap): AudioTrack[] | undefined {
  if (!tracks) return tracks;
  return tracks.flatMap((track) => {
    const startPageKey = remapKey(pageMap, track.startPageKey);
    if (!startPageKey) return [];
    const stopPageKey = remapKey(pageMap, track.stopTrigger?.pageKey);
    if (track.stopTrigger && track.stopTrigger.pageKey && !stopPageKey) {
      return [{ ...track, startPageKey, stopTrigger: undefined }];
    }
    return [
      {
        ...track,
        startPageKey,
        stopTrigger: track.stopTrigger && stopPageKey
          ? { ...track.stopTrigger, pageKey: stopPageKey }
          : track.stopTrigger,
      },
    ];
  });
}

export function remapDialogues(dialogues: Dialogues, pageMap: PageMap): Dialogues {
  return {
    ...dialogues,
    pages: remapPageReferences(dialogues.pages, pageMap) as Dialogues["pages"],
    audioTracks: remapAudioTracks(dialogues.audioTracks, pageMap),
  };
}

export function remapDialogueContext(
  config: DialogueContextConfig,
  pageMap: PageMap
): DialogueContextConfig {
  return {
    ...config,
    pages: remapPageReferences(config.pages, pageMap) as DialogueContextConfig["pages"],
  };
}

export function summarizePageContent(dialogues: Dialogues, pageKey: string) {
  const page = dialogues.pages?.[pageKey];
  const panels = page?.panels || [];
  const dialoguesCount = panels.reduce((n, p) => n + (p.dialogue?.length || 0), 0);
  const stopsCount = panels.length;
  const masksCount = panels.reduce(
    (n, p) => n + (p.zoomRects?.length || (p.zoomRect ? 1 : 0)),
    0
  );
  const audioRefs = (dialogues.audioTracks || []).filter(
    (t) => t.startPageKey === pageKey || t.stopTrigger?.pageKey === pageKey
  ).length;
  return { dialoguesCount, stopsCount, masksCount, audioRefs };
}

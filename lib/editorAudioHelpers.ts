import type { AudioTrack, AudioTrackStopTrigger } from "@/components/reader/audioPlayer";
import { getPageKeyFromUrl } from "@/components/reader/readerUtils";

export function pageNumberFromKey(pages: string[], pageKey: string): number {
  const idx = pages.findIndex((p) => getPageKeyFromUrl(p) === pageKey);
  if (idx >= 0) return idx + 1;
  const n = parseInt(pageKey, 10);
  return Number.isFinite(n) ? n : 1;
}

export function formatParadaPosition(pages: string[], pageKey: string, panelIdx: number): string {
  return `Pág ${pageNumberFromKey(pages, pageKey)} · Parada ${panelIdx + 1}`;
}

export function describeStopTrigger(
  trigger: AudioTrackStopTrigger | undefined,
  pages: string[]
): string {
  if (!trigger) return "Fin del capítulo (sin stop automático)";
  const pNum = pageNumberFromKey(pages, trigger.pageKey);
  switch (trigger.type) {
    case "panelStart":
      return `Al entrar a Parada ${trigger.panelIdx + 1} (pág ${pNum})`;
    case "panelEnd":
      return `Al salir de Parada ${trigger.panelIdx + 1} (pág ${pNum})`;
    case "pageStart":
      return `Al empezar pág ${pNum}`;
    case "pageEnd":
      return `Al terminar pág ${pNum}`;
    default:
      return "";
  }
}

/** One-line span summary for track cards */
export function describeTrackSpan(track: AudioTrack, pages: string[]): string {
  const start = formatParadaPosition(pages, track.startPageKey, track.startPanelIdx);
  const end = describeStopTrigger(track.stopTrigger, pages);
  return `${start} → ${end}`;
}

export function isTrackActiveAtPosition(
  track: AudioTrack,
  pageKey: string,
  panelIdx: number,
  pages: string[]
): boolean {
  const curPage = pageNumberFromKey(pages, pageKey);
  const startPage = pageNumberFromKey(pages, track.startPageKey);
  if (curPage < startPage) return false;
  if (curPage === startPage && panelIdx < track.startPanelIdx) return false;
  if (!track.stopTrigger) return true;
  const stopPage = pageNumberFromKey(pages, track.stopTrigger.pageKey);
  if (curPage > stopPage) return false;
  if (curPage === stopPage && track.stopTrigger.type === "panelEnd") {
    return panelIdx <= track.stopTrigger.panelIdx;
  }
  if (curPage === stopPage && track.stopTrigger.type === "panelStart") {
    return panelIdx < track.stopTrigger.panelIdx;
  }
  return true;
}

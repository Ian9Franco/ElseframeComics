import type { SceneFadeType } from "./audioPlayer";

export const SCENE_FADE_OPTIONS: { id: SceneFadeType; label: string }[] = [
  { id: "fade", label: "Fade (desvanecer)" },
  { id: "wipeUp", label: "Wipe arriba" },
  { id: "wipeDown", label: "Wipe abajo" },
  { id: "wipeLeft", label: "Wipe izquierda" },
  { id: "wipeRight", label: "Wipe derecha" },
  { id: "iris", label: "Iris (centro)" },
  { id: "cut", label: "Corte" },
];

export function resolveFadeType(type: SceneFadeType | undefined, durationMs: number): SceneFadeType {
  if ((durationMs ?? 0) <= 0) return "cut";
  return type ?? "fade";
}

export function sceneFadeDurationMs(type: SceneFadeType | undefined, durationMs: number): number {
  if (resolveFadeType(type, durationMs) === "cut") return 0;
  return Math.max(0, durationMs ?? 0);
}

export function sceneFadeInitial(type: SceneFadeType | undefined, durationMs: number, direction: "in" | "out") {
  const resolved = resolveFadeType(type, durationMs);
  if (direction === "out") {
    return { opacity: 1, scale: 1, scaleX: 1, scaleY: 1 };
  }
  if (resolved === "cut") return { opacity: 0, scale: 1, scaleX: 1, scaleY: 1 };
  if (resolved === "iris") return { opacity: 1, scale: 0, scaleX: 1, scaleY: 1 };
  if (resolved === "wipeUp" || resolved === "wipeDown") return { opacity: 1, scale: 1, scaleX: 1, scaleY: 0 };
  if (resolved === "wipeLeft" || resolved === "wipeRight") return { opacity: 1, scale: 1, scaleX: 0, scaleY: 1 };
  return { opacity: 0, scale: 1, scaleX: 1, scaleY: 1 };
}

export function sceneFadeVisible() {
  return { opacity: 1, scale: 1, scaleX: 1, scaleY: 1 };
}

export function sceneFadeExit(type: SceneFadeType | undefined, durationMs: number) {
  const resolved = resolveFadeType(type, durationMs);
  if (resolved === "cut") return { opacity: 0, scale: 1, scaleX: 1, scaleY: 1 };
  if (resolved === "iris") return { opacity: 1, scale: 0, scaleX: 1, scaleY: 1 };
  if (resolved === "wipeUp" || resolved === "wipeDown") return { opacity: 1, scale: 1, scaleX: 1, scaleY: 0 };
  if (resolved === "wipeLeft" || resolved === "wipeRight") return { opacity: 1, scale: 1, scaleX: 0, scaleY: 1 };
  return { opacity: 0, scale: 1, scaleX: 1, scaleY: 1 };
}

export function sceneFadeOrigin(type: SceneFadeType | undefined): string {
  switch (type) {
    case "wipeUp":
      return "bottom center";
    case "wipeDown":
      return "top center";
    case "wipeLeft":
      return "right center";
    case "wipeRight":
      return "left center";
    case "iris":
      return "center";
    default:
      return "center";
  }
}

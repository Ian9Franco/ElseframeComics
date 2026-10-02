import React from "react";
import type { DialogueLine } from "../DialogueBubble";

/**
 * Renders bubble text with inline markup support:
 *  - `*text*` or `**text**`  → bold
 *  - `_text_`                → italic
 *  - `~~text~~`              → strikethrough
 *  - `[color:#hex]text[/color]` → colored span (overrides bubble-level textColor)
 *
 * Raw HTML tags (e.g. from older editor versions) are stripped before parsing
 * so they never show up as literal text in the reader.
 */
export function renderStyledText(text: string): React.ReactNode {
  if (!text) return "";

  const cleaned = text.replace(/<[^>]+>/g, "");
  const tokenRegex = /(\*\*|\*(?!\*)|~~|_(?!_)|\[color:[^\]]+\]|\[\/color\])/g;
  const parts = cleaned.split(tokenRegex);
  let isBold = false;
  let isItalic = false;
  let isStrike = false;
  const colorStack: string[] = [];

  return React.createElement(
    React.Fragment,
    null,
    parts.map((part, index) => {
      if (part === "**" || part === "*") {
        isBold = !isBold;
        return null;
      }
      if (part === "_") {
        isItalic = !isItalic;
        return null;
      }
      if (part === "~~") {
        isStrike = !isStrike;
        return null;
      }
      if (part.startsWith("[color:") && part.endsWith("]")) {
        colorStack.push(part.slice(7, -1));
        return null;
      }
      if (part === "[/color]") {
        colorStack.pop();
        return null;
      }
      if (part === "") return null;

      const style: React.CSSProperties = {};
      if (isBold) style.fontWeight = 800;
      if (isItalic) style.fontStyle = "italic";
      if (isStrike) style.textDecoration = "line-through";
      if (colorStack.length > 0) style.color = colorStack[colorStack.length - 1];

      if (isBold || isItalic || isStrike || colorStack.length > 0) {
        return React.createElement("span", { key: index, style }, part);
      }
      return part;
    })
  );
}

export function lineShowsSpeaker(line: DialogueLine): boolean {
  return Boolean(line.speaker && (line.showSpeakerName || line.offscreen));
}

export function InlineSpeakerLabel({ name, color }: { name: string; color: string }) {
  return React.createElement(
    "strong",
    {
      style: { color, fontWeight: 800, fontStyle: "inherit", letterSpacing: "0.02em" },
    },
    `${name}: `
  );
}

export const BUBBLE_FONT_OPTIONS: { id: NonNullable<DialogueLine["fontFamily"]> | ""; label: string }[] = [
  { id: "", label: "Por defecto del estilo" },
  { id: "marker", label: "Marker — cómic" },
  { id: "bangers", label: "Bangers — grito" },
  { id: "luckiest", label: "Luckiest — SFX" },
  { id: "bungee", label: "Bungee — bloque" },
  { id: "arcane", label: "Arcana — magos" },
  { id: "diabolic", label: "Diabólica — demonios" },
  { id: "mono", label: "Mono — tech" },
  { id: "sans", label: "Sans — limpia" },
  { id: "serif", label: "Serif — clásica" },
];

// ─── Speaker Color Palette ─────────────────────────────────────────────────────
// Maps a lowercase speaker name to their canonical accent color.

export const SPEAKER_COLORS: Record<string, string> = {
  uandi:    "#ef4444",
  sofi:     "#06b6d4",
  ian:      "#10b981",
  jaz:      "#eab308",
  julian:   "#3b82f6",
  julián:   "#3b82f6",
  mati:     "#a855f7",
  volvo:    "#f97316",
  valery:   "#ec4899",
  brooke:   "#3b82f6",
  daichi:   "#854d0e",
  ren:      "#f97316",
  byte:     "#38bdf8",
  oni:      "#ef4444",
  shinjuro: "#6b7280",
};

/**
 * Returns the speaker's accent color, or a fallback if the speaker is unknown.
 */
export function getSpeakerColor(
  speaker: string | null | undefined,
  defaultColor: string = "#000000"
): string {
  if (!speaker) return defaultColor;
  const key = speaker.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const rawKey = speaker.toLowerCase().trim();
  return SPEAKER_COLORS[key] || SPEAKER_COLORS[rawKey] || defaultColor;
}

/**
 * Resolves the background color for a bubble. If the background is white
 * (either default or set to #ffffff), it returns a translucent white.
 */
export function resolveBgColor(
  customBg: string | undefined,
  defaultBg: string,
  bubbleOpacity: number = 0.88
): string {
  const bg = customBg || defaultBg;
  const lower = bg.toLowerCase().trim();
  if (lower === "#ffffff" || lower === "#fff" || lower === "rgb(255,255,255)" || lower === "rgb(255, 255, 255)") {
    return `rgba(255, 255, 255, ${bubbleOpacity})`;
  }
  return bg;
}

/**
 * Generates a light-to-dark gradient based on a single hex color for SFX text.
 */
export function getSfxGradient(hexColor: string): { start: string; end: string } {
  if (!hexColor || hexColor === "transparent") {
    return { start: "#ffffff", end: "#e5e7eb" };
  }
  
  // Parse hex
  let hex = hexColor.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  
  // Convert RGB to HSL
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }
  
  // Create lighter start and darker end
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  
  const startL = Math.min(lPct + 15, 95);
  const endL = Math.max(lPct - 15, 10);
  
  return {
    start: `hsl(${hDeg}, ${sPct}%, ${startL}%)`,
    end: `hsl(${hDeg}, ${sPct}%, ${endL}%)`,
  };
}

// ─── Text Parsing ──────────────────────────────────────────────────────────────

export type ParsedParagraph = {
  speaker: string | null;
  text: string;
};

/**
 * Splits bubble text into paragraphs. Lines with the format "Speaker: text"
 * are parsed into { speaker, text } pairs for inline speaker coloring.
 */
export function parseParagraphs(text: string): ParsedParagraph[] {
  if (!text) return [];
  return text.split("\n").map((line) => {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      return {
        speaker: match[1].trim(),
        text: match[2].trim(),
      };
    }
    return {
      speaker: null,
      text: line.trim(),
    };
  });
}

// ─── Font Family Resolution ────────────────────────────────────────────────────

/**
 * Resolves a DialogueLine's fontFamily field to the actual CSS font-family value.
 * Falls back to a default based on the bubble style if fontFamily is not set.
 */
export function resolveFontFamily(
  line: DialogueLine,
  style: string
): string {
  if (line.fontFamily) {
    switch (line.fontFamily) {
      case "bangers":  return "var(--font-bangers)";
      case "marker":   return "var(--font-marker)";
      case "mono":     return "ui-monospace, monospace";
      case "sans":     return "var(--font-inter), sans-serif";
      case "serif":    return "ui-serif, Georgia, serif";
      case "bungee":   return "var(--font-bungee)";
      case "luckiest": return "var(--font-luckiest)";
      case "arcane":   return "var(--font-arcane)";
      case "diabolic": return "var(--font-diabolic)";
    }
  }
  // Style-based defaults
  switch (style) {
    case "scream":     return "var(--font-bangers)";
    case "electronic": return "ui-monospace, monospace";
    case "whisper":    return "var(--font-marker)";
    case "sfx":        return "var(--font-bangers)";
    case "cinematic":  return "var(--font-bungee)";
    case "caption":    return "var(--font-inter), sans-serif";
    default:           return "var(--font-marker)";
  }
}

/**
 * Resolves a DialogueLine's fontFamily to a Tailwind font class string.
 */
export function resolveFontClass(line: DialogueLine, style?: string): string {
  if (line.fontFamily) {
    switch (line.fontFamily) {
      case "bangers":  return "font-[var(--font-bangers)]";
      case "mono":     return "font-mono";
      case "sans":     return "font-sans font-bold";
      case "serif":    return "font-serif";
      case "bungee":   return "font-[var(--font-bungee)]";
      case "luckiest": return "font-[var(--font-luckiest)]";
      case "arcane":   return "font-[var(--font-arcane)]";
      case "diabolic": return "font-[var(--font-diabolic)]";
      default:         return "font-[var(--font-marker)]";
    }
  }

  const activeStyle = line.style || style || "normal";
  switch (activeStyle) {
    case "caption":    return "font-sans font-bold";
    case "scream":     return "font-[var(--font-bangers)]";
    case "electronic": return "font-mono";
    case "sfx":        return "font-[var(--font-bangers)]";
    case "cinematic":  return "font-[var(--font-bungee)]";
    default:           return "font-[var(--font-marker)]";
  }
}

// ─── Animation Variants ────────────────────────────────────────────────────────

export type AppearanceAnimation = "spring" | "fade" | "slide" | "zoom" | "pop";
export type FadeOutAnimation    = "fade"   | "slide" | "zoom";

/**
 * Returns Framer Motion variant objects for bubble entrance/exit animations.
 * The "pop" variant adds a jaunty rotation for a more comic-book feel.
 */
export function buildAnimVariants(
  appearanceAnimation: AppearanceAnimation | undefined
) {
  const initial =
    appearanceAnimation === "fade"  ? { opacity: 0 } :
    appearanceAnimation === "slide" ? { opacity: 0, y: 20 } :
    appearanceAnimation === "zoom"  ? { opacity: 0, scale: 0.4 } :
    appearanceAnimation === "pop"   ? { opacity: 0, scale: 0.3, rotate: -8 } :
    /* spring (default) */            { opacity: 0, scale: 0.75, y: 8 };

  return {
    initial,
    animate: { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 },
  };
}

export function buildExitVariant(fadeOutAnimation: FadeOutAnimation | undefined) {
  return (
    fadeOutAnimation === "slide" ? { opacity: 0, y: -20 } :
    fadeOutAnimation === "zoom"  ? { opacity: 0, scale: 0.5 } :
    /* fade (default) */           { opacity: 0 }
  );
}

/**
 * Returns the Framer Motion transition config for a bubble.
 * "pop" uses a snappier spring for a comic-book impact feel.
 */
export function buildAnimTransition(
  appearanceAnimation: AppearanceAnimation | undefined,
  delay: number,
  instant: boolean,
  stagger: boolean = true
): object {
  if (instant) {
    return { delay: 0, duration: 0.15, ease: "easeOut" };
  }
  const softSpring = { delay, type: "spring" as const, stiffness: 160, damping: 26, mass: 0.95 };
  if (!stagger) {
    if (appearanceAnimation === "spring" || !appearanceAnimation) {
      return softSpring;
    }
    if (appearanceAnimation === "pop") {
      return { delay, type: "spring", stiffness: 220, damping: 22, mass: 0.9 };
    }
    return { delay, duration: 0.48, ease: [0.22, 1, 0.36, 1] };
  }
  if (appearanceAnimation === "spring" || !appearanceAnimation) {
    return { delay, type: "spring", stiffness: 280, damping: 20 };
  }
  if (appearanceAnimation === "pop") {
    return { delay, type: "spring", stiffness: 420, damping: 16 };
  }
  return { delay, duration: 0.35, ease: "easeOut" };
}

// ─── Dialogue Speed Multiplier ─────────────────────────────────────────────────

/**
 * Returns the per-bubble delay in seconds, factoring in:
 * - Text length (longer text → more time to read before next bubble)
 * - Bubble style (scream is fast, whisper is slow)
 * - Global speed multiplier from reader settings
 */
export function computeBubbleDelay(
  index: number,
  line: DialogueLine,
  instant: boolean,
  speedMultiplier: number = 1.0,
  stagger: boolean = true
): number {
  if (instant) return 0;
  if (!stagger) return 0.05;

  const words = (line.text || "").split(" ").length;
  // Base delay + reading time estimate
  const baseMs = 350 + words * 18;

  // Style multipliers for pacing variety
  const styleMultiplier: Record<string, number> = {
    scream:     0.55,
    whisper:    1.35,
    caption:    0.85,
    thought:    1.20,
    electronic: 0.70,
    sfx:        0.28,
    cinematic:  0.45,
    normal:     1.00,
  };
  const styleMul = styleMultiplier[line.style ?? "normal"] ?? 1.0;

  // Divide by speedMultiplier so that slow (0.5) → double the delay (more time to read)
  // and fast (1.5) → two-thirds of the delay. This matches the autoplay timer logic in CinematicReader.
  return (index * baseMs * styleMul) / (speedMultiplier * 1000);
}

function balloonUnit(seed: number): number {
  let x = seed >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = (x ^ (x >>> 16)) >>> 0;
  return (x % 10000) / 10000;
}

const TAIL_ANGLE: Record<string, number> = {
  right: 0,
  "bottom-right": Math.PI / 4,
  "bottom-left": (3 * Math.PI) / 4,
  left: Math.PI,
  "top-left": (-3 * Math.PI) / 4,
  "top-right": -Math.PI / 4,
};

function smoothClosed(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return `${d} Z`;
}

/**
 * Closed comic balloon in pixel space so the stroke stays sharp.
 * "scallop" is the bumpy whisper outline.
 */
export function buildComicBalloonPath(
  seed: number,
  tail: string | null | undefined,
  boxW: number,
  boxH: number,
  kind: "smooth" | "scallop" = "smooth"
): string {
  const w = Math.max(24, boxW);
  const h = Math.max(24, boxH);
  const n = kind === "scallop" ? 18 : 12;
  const cx = w / 2;
  const cy = h / 2;
  const fit = kind === "scallop" ? 1.14 : 1.06;
  const a = (w / 2 - 2) / fit;
  const b = (h / 2 - 2) / fit;
  const power = kind === "scallop" ? 2.15 : 3.1;
  const tailAngle = tail && tail !== "none" ? TAIL_ANGLE[tail] : undefined;

  let tailIdx = -1;
  if (tailAngle !== undefined) {
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const delta = Math.atan2(Math.sin(angle - tailAngle), Math.cos(angle - tailAngle));
      const abs = Math.abs(delta);
      if (abs < best) {
        best = abs;
        tailIdx = i;
      }
    }
  }

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const wobble = kind === "smooth" ? (balloonUnit(seed + i * 97) - 0.5) * 0.08 : 0;
    const scallop = kind === "scallop" ? Math.sin((i / n) * Math.PI * 2 * 7) * 0.1 : 0;
    let scale = 1 + wobble + scallop;
    if (i === tailIdx) scale += kind === "scallop" ? 0.28 : 0.22;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const x = cx + Math.sign(c || 1) * a * scale * Math.pow(Math.abs(c), 2 / power);
    const y = cy + Math.sign(s || 1) * b * scale * Math.pow(Math.abs(s), 2 / power);
    pts.push({ x, y });
  }

  return smoothClosed(pts);
}

export function comicBalloonSeed(index: number, text: string): number {
  let h = Math.imul(index + 1, 374761393) ^ 668265263;
  const sample = text || "";
  const limit = Math.min(sample.length, 32);
  for (let i = 0; i < limit; i++) {
    h = Math.imul(h ^ sample.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Padding and wrapping so glyphs stay inside the bubble at any font size. */
export function comicTextContainment(fontSizePx: number, extraPad = 0): {
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  overflowWrap: "anywhere";
  wordBreak: "break-word";
  whiteSpace: "normal";
  maxWidth: string;
  boxSizing: "border-box";
  lineHeight: number;
} {
  const padX = Math.max(14, fontSizePx * 0.7) + extraPad;
  const padY = Math.max(10, fontSizePx * 0.55) + extraPad * 0.65;
  const descender = fontSizePx * 0.25;
  return {
    paddingTop: `${padY}px`,
    paddingRight: `${padX}px`,
    paddingBottom: `${padY + descender}px`,
    paddingLeft: `${padX}px`,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "normal",
    maxWidth: "100%",
    boxSizing: "border-box",
    lineHeight: 1.2,
  };
}

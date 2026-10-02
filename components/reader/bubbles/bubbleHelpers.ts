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

/** Applies reader bubble opacity to hex / rgb / rgba fills. Leaves transparent unchanged. */
export function colorWithOpacity(color: string, opacity: number): string {
  if (!color || color === "transparent") return color;
  const a = Math.max(0, Math.min(1, opacity));
  const lower = color.toLowerCase().trim();
  const rgbaMatch = lower.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${a})`;
  }
  const rgbMatch = lower.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${a})`;
  }
  let hex = lower.startsWith("#") ? lower.slice(1) : "";
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  return color;
}

/**
 * Resolves the background color for a bubble and tints it with the reader opacity slider.
 */
export function resolveBgColor(
  customBg: string | undefined,
  defaultBg: string,
  bubbleOpacity: number = 0.88
): string {
  const bg = customBg || defaultBg;
  return colorWithOpacity(bg, bubbleOpacity);
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

export type SpeechFusionNode = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  seed?: number;
  /** Tail-like neck width in px. Clamped to 10–16. */
  neckPx?: number;
};

type FusionPt = { x: number; y: number };

function fusionEllipsePoint(
  node: SpeechFusionNode,
  angle: number,
  kind: "smooth" | "scallop",
  sampleIndex: number
): FusionPt {
  const seed = node.seed ?? 0;
  const wobble = kind === "smooth" ? (balloonUnit(seed + sampleIndex * 97) - 0.5) * 0.07 : 0;
  const scallop = kind === "scallop" ? Math.sin(angle * 7) * 0.09 : 0;
  const scale = 1 + wobble + scallop;
  const power = kind === "scallop" ? 2.15 : 3.1;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const a = node.rx * scale;
  const b = node.ry * scale;
  return {
    x: node.cx + Math.sign(c || 1) * a * Math.pow(Math.abs(c), 2 / power),
    y: node.cy + Math.sign(s || 1) * b * Math.pow(Math.abs(s), 2 / power),
  };
}

function normalizeAngle(a: number): number {
  let x = a % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x;
}

function forwardSpan(start: number, end: number): number {
  let span = normalizeAngle(end) - normalizeAngle(start);
  if (span <= 0.0001) span += Math.PI * 2;
  return span;
}

function sampleIncreasing(
  node: SpeechFusionNode,
  start: number,
  end: number,
  steps: number,
  kind: "smooth" | "scallop",
  skipFirst: boolean
): FusionPt[] {
  const a0 = normalizeAngle(start);
  const span = forwardSpan(start, end);
  const pts: FusionPt[] = [];
  const n = Math.max(3, steps);
  for (let s = skipFirst ? 1 : 0; s <= n; s++) {
    pts.push(fusionEllipsePoint(node, a0 + span * (s / n), kind, s));
  }
  return pts;
}

/** Longer way around the ellipse (the body, not the neck gap). */
function sampleLongArc(
  node: SpeechFusionNode,
  from: number,
  to: number,
  kind: "smooth" | "scallop",
  skipFirst: boolean
): FusionPt[] {
  const span = forwardSpan(from, to);
  if (span >= Math.PI) return sampleIncreasing(node, from, to, 14, kind, skipFirst);
  const rev = sampleIncreasing(node, to, from, 14, kind, false).reverse();
  return skipFirst ? rev.slice(1) : rev;
}

/** Flank between two ports, preferring the side that faces `sideDir`. */
function sampleSideArc(
  node: SpeechFusionNode,
  from: number,
  to: number,
  sideDir: FusionPt,
  kind: "smooth" | "scallop"
): FusionPt[] {
  const forward = sampleIncreasing(node, from, to, 8, kind, true);
  const backward = sampleIncreasing(node, to, from, 8, kind, false).reverse().slice(1);
  const score = (pts: FusionPt[]) => {
    const mid = pts[Math.floor(pts.length / 2)];
    if (!mid) return -Infinity;
    return (mid.x - node.cx) * sideDir.x + (mid.y - node.cy) * sideDir.y;
  };
  const chosen = score(forward) >= score(backward) ? forward : backward;
  const span = forwardSpan(from, to);
  const other = Math.PI * 2 - span;
  const chosenSpan = chosen === forward ? span : other;
  if (chosenSpan > Math.PI + 0.2) {
    return score(forward) >= score(backward) ? backward : forward;
  }
  return chosen;
}

function neckWidthPx(a: SpeechFusionNode, b: SpeechFusionNode): number {
  const raw = Math.min(a.neckPx ?? 14, b.neckPx ?? 14);
  return Math.min(16, Math.max(10, raw));
}

function halfGap(node: SpeechFusionNode, dir: number, neckPx: number): number {
  const c = Math.cos(dir);
  const s = Math.sin(dir);
  const r = (node.rx * node.ry) / (Math.hypot(node.ry * c, node.rx * s) || Math.min(node.rx, node.ry));
  const fromWidth = Math.asin(Math.min(0.8, neckPx / 2 / Math.max(8, r)));
  const minGap = (6 * Math.PI) / 180;
  const maxGap = (16 * Math.PI) / 180;
  return Math.min(maxGap, Math.max(minGap, fromWidth));
}

function quadPoint(from: FusionPt, ctrl: FusionPt, to: FusionPt, t: number): FusionPt {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y,
  };
}

function nearFusionNodes(p: FusionPt, nodes: SpeechFusionNode[], neckPx: number): boolean {
  for (const n of nodes) {
    const nx = (p.x - n.cx) / (n.rx + 20);
    const ny = (p.y - n.cy) / (n.ry + 20);
    if (nx * nx + ny * ny <= 1) return true;
  }
  const sorted = [...nodes].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  const limit = neckPx + 10;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const abx = b.cx - a.cx;
    const aby = b.cy - a.cy;
    const ab2 = abx * abx + aby * aby || 1;
    let t = ((p.x - a.cx) * abx + (p.y - a.cy) * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    const qx = a.cx + abx * t;
    const qy = a.cy + aby * t;
    if (Math.hypot(p.x - qx, p.y - qy) <= limit) return true;
  }
  return false;
}

type FusionSeg =
  | { type: "arc"; pts: FusionPt[] }
  | { type: "neck"; from: FusionPt; ctrl: FusionPt; to: FusionPt };

function appendArc(d: string, pts: FusionPt[], move: boolean): string {
  const clean = pts.filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (clean.length === 0) return d;
  let out = d;
  const start = move ? 1 : 0;
  if (move) {
    out += `M ${clean[0].x.toFixed(2)} ${clean[0].y.toFixed(2)}`;
  }
  for (let i = start; i < clean.length; i++) {
    const p0 = clean[Math.max(0, i - 2)] ?? clean[0];
    const p1 = clean[i - 1] ?? clean[0];
    const p2 = clean[i];
    const p3 = clean[Math.min(clean.length - 1, i + 1)] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) continue;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    out += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return out;
}

/**
 * Closed outline: ellipses joined by a tail-width neck (~10–16px).
 * Returns null when the outline leaves the bubbles (degenerate arc).
 */
export function buildSpeechFusionPath(
  nodes: SpeechFusionNode[],
  opts?: { kind?: "smooth" | "scallop" }
): string | null {
  if (nodes.length < 2) return null;
  const kind = opts?.kind ?? "smooth";
  const sorted = [...nodes].sort((a, b) => a.cy - b.cy || a.cx - b.cx);

  type Link = {
    nw: number;
    dir: number;
    perp: FusionPt;
    aPlus: FusionPt;
    aMinus: FusionPt;
    bPlus: FusionPt;
    bMinus: FusionPt;
    aPlusAng: number;
    aMinusAng: number;
    bPlusAng: number;
    bMinusAng: number;
    mid: FusionPt;
  };

  const links: Link[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const dir = Math.atan2(b.cy - a.cy, b.cx - a.cx);
    const back = dir + Math.PI;
    const nw = neckWidthPx(a, b);
    const ha = halfGap(a, dir, nw);
    const hb = halfGap(b, back, nw);
    const perp = { x: -Math.sin(dir), y: Math.cos(dir) };
    let aPlusAng = dir + ha;
    let aMinusAng = dir - ha;
    let bPlusAng = back - hb;
    let bMinusAng = back + hb;
    let aPlus = fusionEllipsePoint(a, aPlusAng, kind, i);
    let aMinus = fusionEllipsePoint(a, aMinusAng, kind, i + 3);
    let bPlus = fusionEllipsePoint(b, bPlusAng, kind, i + 5);
    let bMinus = fusionEllipsePoint(b, bMinusAng, kind, i + 7);
    const side = (pt: FusionPt) => (pt.x - a.cx) * perp.x + (pt.y - a.cy) * perp.y;
    if (side(aPlus) < side(aMinus)) {
      [aPlus, aMinus] = [aMinus, aPlus];
      [aPlusAng, aMinusAng] = [aMinusAng, aPlusAng];
    }
    if (side(bPlus) < side(bMinus)) {
      [bPlus, bMinus] = [bMinus, bPlus];
      [bPlusAng, bMinusAng] = [bMinusAng, bPlusAng];
    }
    links.push({
      nw,
      dir,
      perp,
      aPlus,
      aMinus,
      bPlus,
      bMinus,
      aPlusAng,
      aMinusAng,
      bPlusAng,
      bMinusAng,
      mid: { x: (a.cx + b.cx) / 2, y: (a.cy + b.cy) / 2 },
    });
  }

  const neckCtrl = (from: FusionPt, to: FusionPt, mid: FusionPt): FusionPt => {
    const c = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    return {
      x: c.x + (mid.x - c.x) * 0.18,
      y: c.y + (mid.y - c.y) * 0.18,
    };
  };

  const segs: FusionSeg[] = [];
  const first = links[0];
  segs.push({
    type: "arc",
    pts: sampleLongArc(sorted[0], first.aMinusAng, first.aPlusAng, kind, false),
  });

  for (let i = 0; i < links.length; i++) {
    const L = links[i];
    segs.push({
      type: "neck",
      from: L.aPlus,
      ctrl: neckCtrl(L.aPlus, L.bPlus, L.mid),
      to: L.bPlus,
    });
    if (i < links.length - 1) {
      segs.push({
        type: "arc",
        pts: sampleSideArc(sorted[i + 1], L.bPlusAng, links[i + 1].aPlusAng, L.perp, kind),
      });
    } else {
      segs.push({
        type: "arc",
        pts: sampleLongArc(sorted[i + 1], L.bPlusAng, L.bMinusAng, kind, true),
      });
    }
  }

  for (let i = links.length - 1; i >= 0; i--) {
    const L = links[i];
    segs.push({
      type: "neck",
      from: L.bMinus,
      ctrl: neckCtrl(L.bMinus, L.aMinus, L.mid),
      to: L.aMinus,
    });
    if (i > 0) {
      segs.push({
        type: "arc",
        pts: sampleSideArc(sorted[i], L.aMinusAng, links[i - 1].bMinusAng, {
          x: -L.perp.x,
          y: -L.perp.y,
        }, kind),
      });
    }
  }

  const samples: FusionPt[] = [];
  let d = "";
  let moved = false;
  const neckLimit = Math.max(...links.map((l) => l.nw));
  for (const seg of segs) {
    if (seg.type === "arc") {
      if (seg.pts.length === 0) return null;
      d = appendArc(d, seg.pts, !moved);
      moved = true;
      samples.push(...seg.pts);
    } else {
      d += ` Q ${seg.ctrl.x.toFixed(2)} ${seg.ctrl.y.toFixed(2)} ${seg.to.x.toFixed(2)} ${seg.to.y.toFixed(2)}`;
      for (let t = 0.25; t <= 1; t += 0.25) samples.push(quadPoint(seg.from, seg.ctrl, seg.to, t));
    }
  }
  if (!moved || samples.length < 8) return null;
  if (samples.some((p) => !nearFusionNodes(p, sorted, neckLimit))) return null;
  return `${d} Z`;
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
export function comicTextContainment(
  fontSizePx: number,
  legacyExtraPad = 0,
  opts?: { mobile?: boolean; speechBalloon?: boolean }
): {
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
  const mobile = opts?.mobile ?? false;
  const speech = opts?.speechBalloon ?? false;
  let extra = legacyExtraPad;
  if (speech) {
    extra = mobile ? fontSizePx * 0.14 : fontSizePx * 0.35;
  }

  let padX: number;
  let padY: number;
  let descender: number;
  if (mobile) {
    padX = Math.max(6, fontSizePx * 0.42) + extra;
    padY = Math.max(5, fontSizePx * 0.36) + extra * 0.65;
    descender = fontSizePx * 0.18;
  } else {
    padX = Math.max(14, fontSizePx * 0.7) + extra;
    padY = Math.max(10, fontSizePx * 0.55) + extra * 0.65;
    descender = fontSizePx * 0.25;
  }

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

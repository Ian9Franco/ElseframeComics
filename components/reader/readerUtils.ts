import type { DialogueLine } from "./DialogueBubble";
import type { PanelStop, SceneFadeType } from "./audioPlayer";
import { comicTextContainment } from "./bubbles/bubbleHelpers";

/**
 * Compute the path on the edge of the bubble (estimated as an ellipse/rect)
 * in the direction of the anchor target. Returns SVG path description string.
 */
export function buildTailPath(
  bubbleCenterX: number,
  bubbleCenterY: number,
  targetX: number,
  targetY: number,
  line?: DialogueLine
): string | null {
  const dx = targetX - bubbleCenterX;
  const dy = targetY - bubbleCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 8) return null;

  const angle = Math.atan2(dy, dx);
  const perpAngle = angle + Math.PI / 2;
  // Tail base width at center — scales down with distance for an organic look unless specified
  const baseWidth = line?.tailWidth ?? Math.max(8, 28 - distance * 0.03);

  const bLX = bubbleCenterX + Math.cos(perpAngle) * (baseWidth / 2);
  const bLY = bubbleCenterY + Math.sin(perpAngle) * (baseWidth / 2);
  const bRX = bubbleCenterX - Math.cos(perpAngle) * (baseWidth / 2);
  const bRY = bubbleCenterY - Math.sin(perpAngle) * (baseWidth / 2);

  // Quadratic control point halfway, offset by curvature
  const curvature = line?.tailCurvature ?? 0;
  const cx = bubbleCenterX + dx * 0.5 + Math.cos(perpAngle) * curvature;
  const cy = bubbleCenterY + dy * 0.5 + Math.sin(perpAngle) * curvature;

  // Open path to prevent stroke from closing the bubble outline
  return `M ${bLX} ${bLY} Q ${cx} ${cy} ${targetX} ${targetY} Q ${cx} ${cy} ${bRX} ${bRY}`;
}

/**
 * Estimate bubble half-dimensions from width/fontSize settings (approximate)
 */
export function estimateBubbleSize(
  line: DialogueLine,
  opts?: { mobile?: boolean }
): { halfW: number; halfH: number } {
  const size = line.size ?? "medium";
  const style = line.style ?? "normal";
  let baseFontSize = line.fontSize;
  if (!baseFontSize) {
    baseFontSize = size === "small" ? 12 : size === "large" ? 18 : 14;
  }
  const mobile =
    opts?.mobile ?? (typeof window !== "undefined" && window.innerWidth < 768);
  const isSpeech = style === "normal" || style === "whisper";
  const pad = comicTextContainment(baseFontSize, 0, {
    mobile,
    speechBalloon: isSpeech,
  });
  const padX = parseFloat(pad.paddingLeft) || 10;
  const padY = parseFloat(pad.paddingTop) || 8;

  const textLen = line.text?.length ?? 8;
  const w =
    line.width ??
    Math.min(300, Math.max(96, textLen * baseFontSize * 0.42 + padX * 2));
  const charPerLine = Math.max(1, (w - padX * 2) / (baseFontSize * 0.52));
  const lineCount =
    Math.ceil(textLen / charPerLine) +
    (line.speaker || line.showSpeakerName ? 1 : 0);
  const h = lineCount * baseFontSize * pad.lineHeight + padY * 2 + baseFontSize * 0.2;
  return { halfW: w / 2, halfH: h / 2 };
}

export type FusionBubbleRef = {
  key: string;
  index: number;
  x: number;
  y: number;
  line: DialogueLine;
  active: boolean;
};

function isSpeechFusionStyle(line: DialogueLine): boolean {
  const style = line.style ?? "normal";
  return style === "normal" || style === "whisper";
}

class UnionFind {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }
  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

/** Union-find groups from linkedTo + optional vertical auto-stack (speech bubbles only). */
export function buildSpeechFusionGroups(bubbles: FusionBubbleRef[]): {
  groups: FusionBubbleRef[][];
  fusedKeys: Set<string>;
} {
  const n = bubbles.length;
  const uf = new UnionFind(n);
  const hasExplicitLink = bubbles.map((b) => b.line.linkedTo !== undefined);

  for (let i = 0; i < n; i++) {
    const link = bubbles[i].line.linkedTo;
    if (link !== undefined && link >= 0 && link < n && i !== link) {
      if (isSpeechFusionStyle(bubbles[i].line) && isSpeechFusionStyle(bubbles[link].line)) {
        uf.union(i, link);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (hasExplicitLink[i] || hasExplicitLink[j]) continue;
      const a = bubbles[i];
      const b = bubbles[j];
      if (!isSpeechFusionStyle(a.line) || !isSpeechFusionStyle(b.line)) continue;
      const sa = estimateBubbleSize(a.line);
      const sb = estimateBubbleSize(b.line);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 16) continue;
      const radiusAlong = (halfW: number, halfH: number) => {
        const c = dx / len;
        const s = dy / len;
        return (halfW * halfH) / (Math.hypot(halfH * c, halfW * s) || 1);
      };
      const surfaceGap = len - radiusAlong(sa.halfW, sa.halfH) - radiusAlong(sb.halfW, sb.halfH);
      if (surfaceGap > 18) continue;
      const gapX = Math.abs(dx) - sa.halfW - sb.halfW;
      const gapY = Math.abs(dy) - sa.halfH - sb.halfH;
      const stacked = gapY < 22 && -gapX > Math.min(sa.halfW, sb.halfW) * 0.55;
      const sideBySide = gapX < 22 && -gapY > Math.min(sa.halfH, sb.halfH) * 0.4;
      if (stacked || sideBySide) uf.union(i, j);
    }
  }

  const buckets = new Map<number, FusionBubbleRef[]>();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    const list = buckets.get(root) ?? [];
    list.push(bubbles[i]);
    buckets.set(root, list);
  }

  const groups: FusionBubbleRef[][] = [];
  const fusedKeys = new Set<string>();
  for (const list of buckets.values()) {
    if (list.length > 1) {
      groups.push(list);
      for (const b of list) fusedKeys.add(b.key);
    }
  }
  return { groups, fusedKeys };
}

/**
 * Find if a point is inside another dialogue bubble on the page
 */
export function findTargetBubble(
  tx: number, // Target X in percentage (0-100)
  ty: number, // Target Y in percentage (0-100)
  dialogues: DialogueLine[],
  sourceIdx: number,
  imgWidth: number,
  imgHeight: number,
  imgLeft: number,
  imgTop: number
): { index: number; line: DialogueLine } | null {
  if (!imgWidth || !imgHeight) return null;
  const txPx = imgLeft + (tx / 100) * imgWidth;
  const tyPx = imgTop + (ty / 100) * imgHeight;

  for (let i = 0; i < dialogues.length; i++) {
    if (i === sourceIdx) continue;
    const line = dialogues[i];
    const cx = line.posX ?? 50;
    const cy = line.posY ?? 50;
    const size = estimateBubbleSize(line);

    const cxPx = imgLeft + (cx / 100) * imgWidth;
    const cyPx = imgTop + (cy / 100) * imgHeight;

    const dx = txPx - cxPx;
    const dy = tyPx - cyPx;

    // Ellipse test: (dx / radiusX)^2 + (dy / radiusY)^2 <= 1
    // 10% safety margin for target drop accuracy
    const radiusX = size.halfW * 1.1;
    const radiusY = size.halfH * 1.1;

    if ((dx / radiusX) ** 2 + (dy / radiusY) ** 2 <= 1) {
      return { index: i, line };
    }
  }
  return null;
}

/**
 * Synchronized delay groups calculation based on anchor collisions
 */
export function getEffectiveIndexes(
  dialogue: DialogueLine[],
  imgWidth: number,
  imgHeight: number,
  imgLeft: number,
  imgTop: number
): number[] {
  const n = dialogue.length;
  if (n === 0) return [];

  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const line = dialogue[i];
    if (line.tailX !== undefined && line.tailY !== undefined) {
      const target = findTargetBubble(line.tailX, line.tailY, dialogue, i, imgWidth, imgHeight, imgLeft, imgTop);
      if (target) {
        adj[i].push(target.index);
        adj[target.index].push(i);
      }
    }
  }

  const visited = new Set<number>();
  const components: number[][] = [];

  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      const component: number[] = [];
      const queue = [i];
      visited.add(i);
      while (queue.length > 0) {
        const u = queue.shift()!;
        component.push(u);
        for (const v of adj[u]) {
          if (!visited.has(v)) {
            visited.add(v);
            queue.push(v);
          }
        }
      }
      component.sort((a, b) => a - b);
      components.push(component);
    }
  }

  components.sort((a, b) => a[0] - b[0]);

  const effectiveIdx = new Array(n).fill(0);
  for (let compIdx = 0; compIdx < components.length; compIdx++) {
    for (const u of components[compIdx]) {
      effectiveIdx[u] = compIdx;
    }
  }

  return effectiveIdx;
}

/**
 * Devuelve la URL absoluta de una imagen del cómic.
 * Devuelve la URL absoluta de un asset del cómic (páginas, portadas o sonidos).
 * Si NEXT_PUBLIC_ASSETS_BASE_URL está configurado, la cargará del CDN/servidor de assets externo.
 * De lo contrario, usará la ruta local relativa en /public.
 */
export function getComicAssetUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return "";
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  const baseUrl = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "";
  const cleanPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}

export const getComicPageUrl = getComicAssetUrl;

/**
 * Extrae la clave de página a partir de la URL (ej. "/comics/saga/chapter/12.webp" -> "12")
 */
export function getPageKeyFromUrl(url: string | undefined): string {
  if (!url) return "1";
  const encodedFilename = url.split("/").pop()?.split("?")[0] || "1";
  let filename = encodedFilename;
  try {
    filename = decodeURIComponent(encodedFilename);
  } catch {
    // Keep the encoded filename if it contains malformed escape sequences.
  }
  const extensionIndex = filename.lastIndexOf(".");
  return extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
}

/** Panels that matter in read mode (same filter the reader uses for its stops). */
export function getReadPanels(panels: PanelStop[] | undefined): PanelStop[] {
  return (panels || []).filter(
    (p) =>
      (p.dialogue && p.dialogue.length > 0) ||
      p.zoomRect ||
      (p.zoomRects && p.zoomRects.length > 0) ||
      p.sound ||
      (p.sounds && p.sounds.length > 0)
  );
}

export type SpoilerMask = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fadeOut?: number;
  fadeOutType?: SceneFadeType;
};

/** Spoiler masks (in % of the page) still hidden for the given reading position. */
export function computeSpoilerMasks(
  panels: PanelStop[],
  revealPanel: number,
  revealZoom: number
): SpoilerMask[] {
  const raw: SpoilerMask[] = [];
  panels.forEach((panel, pIdx) => {
    const rects = panel.zoomRects || (panel.zoomRect ? [panel.zoomRect] : []);
    rects.forEach((zoom: any, rIdx: number) => {
      let shouldMask = false;
      if (pIdx > revealPanel) {
        shouldMask = panel.hideUntilReached !== false;
      } else if (pIdx === revealPanel) {
        shouldMask = rIdx > revealZoom && panel.hideUntilReached !== false;
      }
      if (shouldMask) {
        raw.push({
          key: `spoiler-mask-${pIdx}-${rIdx}`,
          x: zoom.x ?? 0,
          y: zoom.y ?? 0,
          w: zoom.w ?? 100,
          h: zoom.h ?? 25,
          fadeOut: zoom.fadeOut,
          fadeOutType: zoom.fadeOutType,
        });
      }
    });
  });

  const sorted = raw.sort((a, b) => a.y - b.y);
  return sorted.map((mask, idx) => {
    let h = mask.h;
    const next = sorted[idx + 1];
    if (next) {
      const bottom = mask.y + h;
      if (next.y > bottom && next.y - bottom <= 15) h = next.y - mask.y + 0.5;
    } else if (mask.y + h >= 75) {
      h = Math.max(h, 100 - mask.y);
    }
    return { ...mask, h };
  });
}

/**
 * Magnetic snapping for zoom rects / masks.
 * Snaps edges of `rect` to other rects or container bounds if within threshold percentage (default 10%).
 */
export function snapMaskRect(
  rect: { x: number; y: number; w: number; h: number },
  otherRects: { x: number; y: number; w: number; h: number }[],
  threshold = 10
): { x: number; y: number; w: number; h: number } {
  let top = rect.y;
  let bottom = rect.y + rect.h;
  let left = rect.x;
  let right = rect.x + rect.w;

  // 1. Snap to container bounds
  if (Math.abs(top - 0) <= threshold) top = 0;
  if (Math.abs(bottom - 100) <= threshold) bottom = 100;
  if (Math.abs(left - 0) <= threshold) left = 0;
  if (Math.abs(right - 100) <= threshold) right = 100;

  // 2. Snap to all other masks
  for (const other of otherRects) {
    const oTop = other.y;
    const oBottom = other.y + other.h;
    const oLeft = other.x;
    const oRight = other.x + other.w;

    // Vertical snapping
    if (Math.abs(top - oBottom) <= threshold) top = oBottom;
    else if (Math.abs(top - oTop) <= threshold) top = oTop;

    if (Math.abs(bottom - oTop) <= threshold) bottom = oTop;
    else if (Math.abs(bottom - oBottom) <= threshold) bottom = oBottom;

    // Horizontal snapping
    if (Math.abs(left - oRight) <= threshold) left = oRight;
    else if (Math.abs(left - oLeft) <= threshold) left = oLeft;

    if (Math.abs(right - oLeft) <= threshold) right = oLeft;
    else if (Math.abs(right - oRight) <= threshold) right = oRight;
  }

  // Recalculate dimensions
  const newY = top;
  const newH = Math.max(2, bottom - top);
  const newX = left;
  const newW = Math.max(2, right - left);

  return { x: newX, y: newY, w: newW, h: newH };
}

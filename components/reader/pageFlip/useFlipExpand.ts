"use client";

import { useEffect, useState } from "react";
import type { FlipDirection } from "./usePageFlipGesture";

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

/** 0→1 while the view eases from panel focus to full-page sheet before/during the curl. */
export function useFlipExpand(direction: FlipDirection | null, durationMs: number) {
  const [expandT, setExpandT] = useState(1);

  useEffect(() => {
    if (!direction) {
      setExpandT(1);
      return;
    }
    setExpandT(0);
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const raw = Math.min(1, (now - t0) / durationMs);
      setExpandT(smoothstep(raw));
      if (raw < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [direction, durationMs]);

  return direction ? expandT : 1;
}

export type PageRect = { left: number; top: number; width: number; height: number };

/** Painted page box in the zoom wrapper's local CSS pixels (matches the 3D canvas). */
export function measureVisiblePageRect(img: HTMLElement | null): PageRect | null {
  const frame = img?.parentElement;
  if (!frame) return null;
  const width = frame.offsetWidth;
  const height = frame.offsetHeight;
  if (width < 2 || height < 2) return null;
  return {
    left: frame.offsetLeft,
    top: frame.offsetTop,
    width,
    height,
  };
}

export function lerpPageRect(from: PageRect, to: PageRect, t: number): PageRect {
  return {
    left: from.left + (to.left - from.left) * t,
    top: from.top + (to.top - from.top) * t,
    width: from.width + (to.width - from.width) * t,
    height: from.height + (to.height - from.height) * t,
  };
}

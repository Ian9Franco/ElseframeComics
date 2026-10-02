"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playPageFlipSound, preloadPageFlipSound } from "./pageFlipSound";

export type FlipDirection = "next" | "prev";

const AXIS_LOCK_PX = 10;
const COMMIT_PROGRESS = 0.35;
const COMMIT_VELOCITY = 0.6;
const BLOCKED_MAX = 0.15;

const IGNORE_SELECTOR =
  "[data-dialogue-bubble], .zoom-controls, .btn, .tag, .page-end-controls, button, input, textarea";

const AUTO_FLIP_MS = 1350;
const RELEASE_FLIP_MS = 1250;
const CANCEL_MS = 950;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function usePageFlipGesture({
  enabled,
  canNext,
  canPrev,
  pageWidth,
  onCommit,
}: {
  enabled: boolean;
  canNext: boolean;
  canPrev: boolean;
  pageWidth: number;
  onCommit: (dir: FlipDirection) => void;
}) {
  const [direction, setDirection] = useState<FlipDirection | null>(null);
  const progressRef = useRef(0);

  const tracking = useRef(false);
  const axis = useRef<"undecided" | "x" | "y">("undecided");
  const start = useRef({ x: 0, y: 0 });
  const lastSample = useRef({ x: 0, t: 0 });
  const velocity = useRef(0);
  const dirRef = useRef<FlipDirection | null>(null);
  const animFrame = useRef<number | null>(null);
  const suppressClickUntil = useRef(0);

  const latest = useRef({ canNext, canPrev, pageWidth, onCommit });
  latest.current = { canNext, canPrev, pageWidth, onCommit };

  useEffect(() => {
    preloadPageFlipSound();
    return () => {
      if (animFrame.current !== null) cancelAnimationFrame(animFrame.current);
    };
  }, []);

  const isAnimating = () => animFrame.current !== null;

  const animateTo = useCallback(
    (target: 0 | 1, dir: FlipDirection, durationMs: number, ease: (t: number) => number = easeOutCubic) => {
    const from = progressRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      progressRef.current = from + (target - from) * ease(t);
      if (t < 1) {
        animFrame.current = requestAnimationFrame(step);
        return;
      }
      animFrame.current = null;
      progressRef.current = target;
      if (target === 1) latest.current.onCommit(dir);
      dirRef.current = null;
      setDirection(null);
      progressRef.current = 0;
    };
    animFrame.current = requestAnimationFrame(step);
    },
    []
  );

  const flipTo = useCallback(
    (dir: FlipDirection) => {
      if (isAnimating() || dirRef.current) return;
      const allowed = dir === "next" ? latest.current.canNext : latest.current.canPrev;
      if (!allowed) return;
      dirRef.current = dir;
      progressRef.current = 0;
      setDirection(dir);
      playPageFlipSound(dir);
      animateTo(1, dir, AUTO_FLIP_MS, easeInOutCubic);
    },
    [animateTo]
  );

  const onPointerStart = useCallback(
    (x: number, y: number, target: EventTarget | null) => {
      tracking.current = false;
      if (!enabled || isAnimating()) return;
      if (target instanceof Element && target.closest(IGNORE_SELECTOR)) return;
      tracking.current = true;
      axis.current = "undecided";
      start.current = { x, y };
      lastSample.current = { x, t: performance.now() };
      velocity.current = 0;
    },
    [enabled]
  );

  /** Returns true when the flip owns the gesture, so pan should not move. */
  const onPointerMove = useCallback((x: number, y: number): boolean => {
    if (!tracking.current) return false;
    const dx = x - start.current.x;
    const dy = y - start.current.y;

    if (axis.current === "undecided") {
      if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return false;
      if (Math.abs(dx) > Math.abs(dy) * 1.15) {
        axis.current = "x";
        const dir: FlipDirection = dx < 0 ? "next" : "prev";
        dirRef.current = dir;
        setDirection(dir);
      } else {
        axis.current = "y";
        tracking.current = false;
        return false;
      }
    }

    if (axis.current !== "x" || !dirRef.current) return false;

    const now = performance.now();
    const dt = Math.max(1, now - lastSample.current.t);
    velocity.current = (x - lastSample.current.x) / dt;
    lastSample.current = { x, t: now };

    const dir = dirRef.current;
    const signed = dir === "next" ? -dx : dx;
    const raw = Math.max(0, signed) / Math.max(120, latest.current.pageWidth * 0.9);
    const allowed = dir === "next" ? latest.current.canNext : latest.current.canPrev;
    progressRef.current = allowed ? Math.min(1, raw) : Math.min(BLOCKED_MAX, raw * 0.4);
    return true;
  }, []);

  /** Returns true when the gesture was a flip, so the follow-up click must be ignored. */
  const onPointerEnd = useCallback((): boolean => {
    const wasFlip = tracking.current && axis.current === "x" && !!dirRef.current;
    tracking.current = false;
    axis.current = "undecided";
    if (!wasFlip) return false;

    suppressClickUntil.current = performance.now() + 350;
    const dir = dirRef.current as FlipDirection;
    const allowed = dir === "next" ? latest.current.canNext : latest.current.canPrev;
    const towards = dir === "next" ? -velocity.current : velocity.current;
    const commit = allowed && (progressRef.current > COMMIT_PROGRESS || towards > COMMIT_VELOCITY);

    if (commit) {
      playPageFlipSound(dir);
      animateTo(1, dir, Math.max(650, (1 - progressRef.current) * RELEASE_FLIP_MS));
    } else {
      animateTo(0, dir, Math.max(420, progressRef.current * CANCEL_MS));
    }
    return true;
  }, [animateTo]);

  const shouldSuppressClick = useCallback(() => performance.now() < suppressClickUntil.current, []);

  return {
    direction,
    progressRef,
    flipTo,
    onPointerStart,
    onPointerMove,
    onPointerEnd,
    shouldSuppressClick,
  };
}

export type PageFlipController = ReturnType<typeof usePageFlipGesture>;

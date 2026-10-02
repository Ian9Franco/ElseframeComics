"use client";

import React from "react";
import { motion } from "framer-motion";
import type { SceneFadeType } from "./audioPlayer";
import {
  sceneFadeDurationMs,
  sceneFadeExit,
  sceneFadeInitial,
  sceneFadeOrigin,
  sceneFadeVisible,
} from "./sceneFade";

export function SceneFadeLayer({
  show,
  type,
  durationMs,
  direction,
  className,
  zIndex = 80,
  children,
}: {
  show: boolean;
  type?: SceneFadeType;
  durationMs: number;
  direction: "in" | "out";
  className?: string;
  zIndex?: number;
  children?: React.ReactNode;
}) {
  const duration = sceneFadeDurationMs(type, durationMs) / 1000;
  if (!show && duration <= 0) return null;

  const origin = sceneFadeOrigin(type);
  const visible = sceneFadeVisible();
  const hiddenIn = sceneFadeInitial(type, durationMs, "in");
  const hiddenOut = sceneFadeExit(type, durationMs);

  return (
    <motion.div
      className={`absolute inset-0 brand-grain pointer-events-none ${className ?? ""}`}
      style={{ zIndex, transformOrigin: origin, overflow: "hidden" }}
      initial={direction === "in" ? hiddenIn : visible}
      animate={direction === "in" ? visible : hiddenOut}
      exit={hiddenOut}
      transition={{ duration, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

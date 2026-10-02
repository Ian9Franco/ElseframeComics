"use client";

import React from "react";
import { CaptionBubble } from "./bubbles/CaptionBubble";
import { ThoughtBubble } from "./bubbles/ThoughtBubble";
import { StandardBubble } from "./bubbles/StandardBubble";
import { CinematicTextBubble } from "./bubbles/CinematicTextBubble";
import { SPEAKER_COLORS, resolveBgColor } from "./bubbles/bubbleHelpers";

export type DialogueLine = {
  text: string;
  speaker?: string | null;
  showSpeakerName?: boolean; // If true, forces rendering speaker name header (e.g. Off-screen/Radio)
  offscreen?: boolean;       // Indicates character speaks off-screen
  style?: "normal" | "caption" | "thought" | "scream" | "whisper" | "electronic" | "sfx" | "cinematic";
  tail?: "bottom-left" | "bottom-right" | "top-left" | "top-right" | "left" | "right" | "none";
  posX?: number;
  posY?: number;
  size?: "small" | "medium" | "large";
  cinematicVariant?: "translucent" | "solid" | "outline";
  cinematic3d?: boolean;
  customColor?: string;
  customBg?: string;
  textColor?: string;    // Custom text/typography color in hex
  fontFamily?:
    | "marker"
    | "bangers"
    | "mono"
    | "sans"
    | "serif"
    | "bungee"
    | "luckiest"
    | "arcane"
    | "diabolic";
  width?: number;        // Custom max-width in pixels
  fontSize?: number;     // Custom font-size in pixels
  borderRadius?: number; // Custom border-radius in pixels
  tailX?: number;        // Elastic tail anchor X (0-100% of image)
  tailY?: number;        // Elastic tail anchor Y (0-100% of image)
  tailWidth?: number;    // Custom elastic tail base width
  tailCurvature?: number;// Custom elastic tail curvature (-100 to 100)
  linkedTo?: number;     // Index of sibling bubble to connect with an organic bridge
};

export type InlineTextEditProps = {
  value: string;
  onChange: (text: string) => void;
  autoFocus?: boolean;
};

export function getBubbleStyles(line: DialogueLine, bubbleOpacity?: number) {
  const style = line.style ?? "normal";
  let bgColor      = resolveBgColor(line.customBg, "#ffffff", bubbleOpacity);
  let borderColor  = line.customColor || "#0a0a0f";
  let strokeWidth  = 1.5;

  if (style === "scream") {
    bgColor     = line.customBg    || "#f5e642";
    borderColor = line.customColor || "#0a0a0f";
    strokeWidth = 2.5;
  } else if (style === "whisper") {
    bgColor     = resolveBgColor(line.customBg, "#ffffff", bubbleOpacity);
    borderColor = line.customColor || "#a1a1aa";
  } else if (style === "electronic") {
    bgColor     = line.customBg    || "rgba(10, 20, 32, 0.82)";
    borderColor = line.customColor || "#00f0ff";
  } else if (style === "caption") {
    bgColor     = resolveBgColor(line.customBg, "#f5e642", bubbleOpacity);
    borderColor = line.customColor || "#0a0a0f";
  } else if (style === "thought") {
    bgColor     = resolveBgColor(line.customBg, "#000000", bubbleOpacity);
    borderColor = line.customColor || "#ffffff";
  } else if (style === "sfx") {
    bgColor     = line.customBg    || "transparent";
    borderColor = line.customColor || "#0a0a0f";
    strokeWidth = 3;
  } else if (style === "cinematic") {
    bgColor     = "transparent";
    borderColor = line.customColor || "#0a0a0f";
    strokeWidth = 0;
  }
  return { bgColor, borderColor, strokeWidth };
}

export function DialogueBubble({
  line,
  index,
  elasticTailNode,
  instant,
  appearanceAnimation,
  fadeOutAnimation,
  depth,
  textScale = 1.0,
  speedMultiplier = 1.0,
  bubbleOpacity,
  staggerDelay = true,
  inlineTextEdit,
}: {
  line: DialogueLine;
  index: number;
  elasticTailNode?: React.ReactNode;
  instant?: boolean;
  appearanceAnimation?: "spring" | "fade" | "slide" | "zoom" | "pop";
  fadeOutAnimation?: "fade" | "slide" | "zoom";
  depth?: number;
  textScale?: number;
  speedMultiplier?: number;
  bubbleOpacity?: number;
  staggerDelay?: boolean;
  inlineTextEdit?: InlineTextEditProps;
}) {
  const style = line.style ?? "normal";

  if (style === "caption") {
    return (
      <CaptionBubble
        line={line}
        index={index}
        instant={instant}
        appearanceAnimation={appearanceAnimation}
        fadeOutAnimation={fadeOutAnimation}
        depth={depth}
        textScale={textScale}
        speedMultiplier={speedMultiplier}
        bubbleOpacity={bubbleOpacity}
        staggerDelay={staggerDelay}
        inlineTextEdit={inlineTextEdit}
      />
    );
  }

  if (style === "thought") {
    return (
      <ThoughtBubble
        line={line}
        index={index}
        elasticTailNode={elasticTailNode}
        instant={instant}
        appearanceAnimation={appearanceAnimation}
        fadeOutAnimation={fadeOutAnimation}
        depth={depth}
        textScale={textScale}
        speedMultiplier={speedMultiplier}
        bubbleOpacity={bubbleOpacity}
        staggerDelay={staggerDelay}
        inlineTextEdit={inlineTextEdit}
      />
    );
  }

  if (style === "cinematic") {
    return (
      <CinematicTextBubble
        line={line}
        index={index}
        instant={instant}
        appearanceAnimation={appearanceAnimation}
        fadeOutAnimation={fadeOutAnimation}
        depth={depth}
        textScale={textScale}
        speedMultiplier={speedMultiplier}
        staggerDelay={staggerDelay}
        inlineTextEdit={inlineTextEdit}
      />
    );
  }

  return (
    <StandardBubble
      line={line}
      index={index}
      elasticTailNode={elasticTailNode}
      instant={instant}
      appearanceAnimation={appearanceAnimation}
      fadeOutAnimation={fadeOutAnimation}
      depth={depth}
      textScale={textScale}
      speedMultiplier={speedMultiplier}
      bubbleOpacity={bubbleOpacity}
      staggerDelay={staggerDelay}
      inlineTextEdit={inlineTextEdit}
    />
  );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import type { DialogueLine } from "../DialogueBubble";
import {
  buildAnimTransition,
  buildAnimVariants,
  buildExitVariant,
  computeBubbleDelay,
  parseParagraphs,
  renderStyledText,
  resolveFontClass,
  resolveFontFamily,
} from "./bubbleHelpers";
import { BubbleInlineEditor } from "./BubbleInlineEditor";

interface CinematicTextBubbleProps {
  line: DialogueLine;
  index: number;
  instant?: boolean;
  appearanceAnimation?: "spring" | "fade" | "slide" | "zoom" | "pop";
  fadeOutAnimation?: "fade" | "slide" | "zoom";
  depth?: number;
  textScale?: number;
  bubbleLayoutScale?: number;
  speedMultiplier?: number;
  staggerDelay?: boolean;
  inlineTextEdit?: import("../DialogueBubble").InlineTextEditProps;
}

function colorWithAlpha(color: string, alpha: number): string {
  const value = color.trim();
  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((char) => char + char).join("");
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  if (value.startsWith("rgb(")) {
    return value.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  return value;
}

function stripTextTokens(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\[color:[^\]]+\]/g, "")
    .replace(/\[\/color\]/g, "")
    .replace(/<[^>]+>/g, "");
}

export function CinematicTextBubble({
  line,
  index,
  instant,
  appearanceAnimation,
  fadeOutAnimation,
  depth,
  textScale = 1.0,
  bubbleLayoutScale = 1,
  speedMultiplier = 1.0,
  staggerDelay = true,
  inlineTextEdit,
}: CinematicTextBubbleProps) {
  const paragraphs = parseParagraphs(line.text);
  const variant = line.cinematicVariant ?? "translucent";
  const hasDepth = line.cinematic3d ?? true;
  const size = line.size ?? "large";
  const width = (line.width ?? (size === "small" ? 420 : size === "large" ? 960 : 720)) * bubbleLayoutScale * textScale;
  const baseFontSize = line.fontSize ?? (size === "small" ? 42 : size === "large" ? 86 : 64);
  const textColor = line.textColor || (variant === "translucent" ? "#0a0a0f" : "#ffffff");
  const depthColor = line.customColor || "#0a0a0f";
  const fontFamily = resolveFontFamily(line, "cinematic");
  const fontClass = resolveFontClass(line, "cinematic");

  const delay = computeBubbleDelay(index, line, instant ?? false, speedMultiplier, staggerDelay);
  const animVars = buildAnimVariants(appearanceAnimation);
  const exitVar = buildExitVariant(fadeOutAnimation);
  const transition = buildAnimTransition(appearanceAnimation, delay, instant ?? false, staggerDelay);

  const fillColor = variant === "translucent" ? colorWithAlpha(textColor, 0.48) : textColor;
  const strokeColor = variant === "outline" ? textColor : colorWithAlpha(depthColor, 0.2);
  const strokeWidth = variant === "outline" ? "2.5px" : variant === "translucent" ? "0.4px" : "0px";
  const depthOpacity = variant === "translucent" ? 0.34 : 0.72;
  const fontLayoutScale = bubbleLayoutScale;
  const fontSize = Math.max(18 * fontLayoutScale * textScale, baseFontSize * textScale * fontLayoutScale);

  const textShadow = hasDepth
    ? `2px 2px 0 ${colorWithAlpha(depthColor, depthOpacity)}, 5px 5px 0 ${colorWithAlpha(depthColor, depthOpacity * 0.55)}, -2px 0 0 rgba(0, 240, 255, 0.18), 2px 0 0 rgba(232, 24, 90, 0.2), 0 10px 24px rgba(0, 0, 0, 0.35)`
    : variant === "outline"
      ? `0 3px 12px ${colorWithAlpha(depthColor, 0.28)}`
      : `0 4px 16px ${colorWithAlpha(depthColor, 0.22)}`;

  const contentStyle: React.CSSProperties = {
    color: variant === "outline" ? "transparent" : fillColor,
    WebkitTextFillColor: variant === "outline" ? "transparent" : fillColor,
    WebkitTextStroke: `${strokeWidth} ${strokeColor}`,
    paintOrder: "stroke fill",
    textShadow,
    fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: 0.86,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
    textAlign: "center",
    whiteSpace: "pre-line",
  };

  const plainText = stripTextTokens(line.text);

  return (
    <motion.div
      key={`cinematic-${index}`}
      variants={{ ...animVars, exit: exitVar }}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="relative select-none"
      style={{
        pointerEvents: "none",
        width: `${width}px`,
        maxWidth: "min(92vw, 100%)",
        transform: `perspective(900px) rotateX(${hasDepth ? depth ?? 2 : 0}deg)`,
      }}
    >
      {hasDepth && (
        <>
          <div
            aria-hidden="true"
            className={`${fontClass} absolute inset-0`}
            style={{
              ...contentStyle,
              color: colorWithAlpha(depthColor, variant === "translucent" ? 0.2 : 0.42),
              WebkitTextFillColor: colorWithAlpha(depthColor, variant === "translucent" ? 0.2 : 0.42),
              WebkitTextStroke: `1px ${colorWithAlpha(depthColor, 0.38)}`,
              transform: "translate3d(8px, 8px, -18px)",
              filter: "blur(0.2px)",
              zIndex: 0,
            }}
          >
            {plainText}
          </div>
          <div
            aria-hidden="true"
            className={`${fontClass} absolute inset-0`}
            style={{
              ...contentStyle,
              color: "transparent",
              WebkitTextFillColor: "transparent",
              WebkitTextStroke: `1px rgba(0, 240, 255, 0.3)`,
              transform: "translateX(-3px)",
              textShadow: "none",
              zIndex: 1,
            }}
          >
            {plainText}
          </div>
          <div
            aria-hidden="true"
            className={`${fontClass} absolute inset-0`}
            style={{
              ...contentStyle,
              color: "transparent",
              WebkitTextFillColor: "transparent",
              WebkitTextStroke: `1px rgba(232, 24, 90, 0.32)`,
              transform: "translateX(3px)",
              textShadow: "none",
              zIndex: 1,
            }}
          >
            {plainText}
          </div>
        </>
      )}

      <div className={`${fontClass} relative z-10`} style={contentStyle}>
        {inlineTextEdit ? (
          <BubbleInlineEditor inlineTextEdit={inlineTextEdit} className={fontClass} style={contentStyle} />
        ) : (
          paragraphs.map((paragraph, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && "\n"}
              {renderStyledText(paragraph.text)}
            </React.Fragment>
          ))
        )}
      </div>
    </motion.div>
  );
}

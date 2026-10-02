"use client";

import React from "react";
import { motion } from "framer-motion";
import type { DialogueLine } from "../DialogueBubble";
import {
  getSpeakerColor,
  parseParagraphs,
  resolveFontFamily,
  resolveFontClass,
  buildAnimVariants,
  buildExitVariant,
  buildAnimTransition,
  computeBubbleDelay,
  comicTextContainment,
  resolveBgColor,
  renderStyledText,
  lineShowsSpeaker,
  InlineSpeakerLabel,
} from "./bubbleHelpers";
import { BubbleInlineEditor } from "./BubbleInlineEditor";

function captionOffsetColor(color: string): string {
  const value = color.trim().toLowerCase();
  if (
    !value ||
    value === "#0a0a0f" ||
    value === "#000" ||
    value === "#000000" ||
    value === "#111" ||
    value === "#111111" ||
    value === "black"
  ) {
    return "#e23b3b";
  }
  return color;
}

interface CaptionBubbleProps {
  line: DialogueLine;
  index: number;
  instant?: boolean;
  appearanceAnimation?: "spring" | "fade" | "slide" | "zoom" | "pop";
  fadeOutAnimation?: "fade" | "slide" | "zoom";
  depth?: number;
  textScale?: number;
  speedMultiplier?: number;
  bubbleOpacity?: number;
  staggerDelay?: boolean;
  inlineTextEdit?: import("../DialogueBubble").InlineTextEditProps;
}

export function CaptionBubble({
  line,
  index,
  instant,
  appearanceAnimation,
  fadeOutAnimation,
  depth,
  textScale = 1.0,
  speedMultiplier = 1.0,
  bubbleOpacity,
  staggerDelay = true,
  inlineTextEdit,
}: CaptionBubbleProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const paragraphs = parseParagraphs(line.text);
  const size = line.size ?? "medium";

  // ── Dynamic shadow based on depth ──
  // ── Animation ──
  const delay      = computeBubbleDelay(index, line, instant ?? false, speedMultiplier, staggerDelay);
  const animVars   = buildAnimVariants(appearanceAnimation);
  const exitVar    = buildExitVariant(fadeOutAnimation);
  const transition = buildAnimTransition(appearanceAnimation, delay, instant ?? false, staggerDelay);

  // ── Font ──
  const customFontFamily    = resolveFontFamily(line, "caption");
  const fontClass           = resolveFontClass(line);

  // ── Colours ──
  const captionBg           = resolveBgColor(line.customBg, "#f5e642", bubbleOpacity);
  const captionBorderColor  = line.customColor || "#0a0a0f";
  const captionSpeakerColor = getSpeakerColor(line.speaker, "#000000");

  // ── Size classes ──
  let captionSizeClass = "text-sm sm:text-base";
  if (size === "small") captionSizeClass = "text-xs";
  if (size === "large") captionSizeClass = "text-base sm:text-lg";

  const isTranslucent = captionBg.includes("rgba") || captionBg === "transparent";
  const backdropBlurStyles: React.CSSProperties = isTranslucent
    ? { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }
    : {};

  const captionStyles: React.CSSProperties = {
    pointerEvents: "none",
    border: "2px solid #0a0a0f",
    background: captionBg,
    boxShadow: "none",
    borderRadius: 0,
    position: "relative",
    zIndex: 1,
    ...backdropBlurStyles,
  };
  const slabColor = captionOffsetColor(captionBorderColor);

  let baseFontSize = line.fontSize;
  if (!baseFontSize) {
    baseFontSize = size === "small" ? 12 : size === "large" ? 18 : 14;
  }
  const minFont = isMobile ? 8 : 10;
  const finalFontSize = Math.max(minFont, baseFontSize * textScale);
  Object.assign(captionStyles, comicTextContainment(finalFontSize));
  captionStyles.fontSize = `${finalFontSize}px`;
  if (line.width)     captionStyles.maxWidth = `${line.width}px`;
  if (line.textColor) captionStyles.color    = line.textColor;

  const wrapperStyles: React.CSSProperties = { pointerEvents: "none" };
  if (line.width) wrapperStyles.maxWidth = `${line.width}px`;

  return (
    <motion.div
      key={`caption-${index}`}
      variants={{ ...animVars, exit: exitVar }}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className={`caption leading-snug text-left max-w-sm ${captionSizeClass}`}
      style={{
        ...wrapperStyles,
        background: "transparent",
        border: "none",
        filter: "none",
        position: "relative",
      }}
    >
      <div className="flex flex-col gap-2" style={{ ...captionStyles, boxShadow: `2px 2px 0 #f2c14e, 4px 4px 0 ${slabColor}` }}>
        {paragraphs.map((p, i) => (
          <div
            key={i}
            className={`text-stone-800 ${fontClass}`}
            style={{
              fontFamily: customFontFamily,
              ...(line.textColor ? { color: line.textColor } : {}),
            }}
          >
            {i === 0 && lineShowsSpeaker(line) && line.speaker && (
              <InlineSpeakerLabel name={line.speaker} color={captionSpeakerColor} />
            )}
            {p.speaker && (!line.speaker || p.speaker.toUpperCase().trim() !== line.speaker.toUpperCase().trim()) && (
              <InlineSpeakerLabel name={p.speaker} color={getSpeakerColor(p.speaker, "#000000")} />
            )}
            {inlineTextEdit ? (
              <BubbleInlineEditor inlineTextEdit={inlineTextEdit} />
            ) : (
              renderStyledText(p.text)
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

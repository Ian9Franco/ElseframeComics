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

interface ThoughtBubbleProps {
  line: DialogueLine;
  index: number;
  elasticTailNode?: React.ReactNode;
  instant?: boolean;
  appearanceAnimation?: "spring" | "fade" | "slide" | "zoom" | "pop";
  fadeOutAnimation?: "fade" | "slide" | "zoom";
  depth?: number;
  textScale?: number;
  bubbleLayoutScale?: number;
  speedMultiplier?: number;
  bubbleOpacity?: number;
  staggerDelay?: boolean;
  inlineTextEdit?: import("../DialogueBubble").InlineTextEditProps;
}

export function ThoughtBubble({
  line,
  index,
  instant,
  appearanceAnimation,
  fadeOutAnimation,
  depth,
  textScale = 1.0,
  bubbleLayoutScale = 1,
  speedMultiplier = 1.0,
  bubbleOpacity,
  staggerDelay = true,
  inlineTextEdit,
}: ThoughtBubbleProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const paragraphs = parseParagraphs(line.text);
  const size       = line.size ?? "medium";

  // ── Dynamic shadow ──
  // ── Animation ──
  const delay      = computeBubbleDelay(index, line, instant ?? false, speedMultiplier, staggerDelay);
  const animVars   = buildAnimVariants(appearanceAnimation);
  const exitVar    = buildExitVariant(fadeOutAnimation);
  const transition = buildAnimTransition(appearanceAnimation, delay, instant ?? false, staggerDelay);

  // ── Font ──
  const customFontFamily   = resolveFontFamily(line, "thought");
  const fontClass          = resolveFontClass(line);

  // ── Colours (Black Background, White Text, Sharp Box, No Tail) ──
  const thoughtBg          = line.customBg || "#000000";
  const thoughtTextColor   = line.textColor || "#ffffff";
  const thoughtBorderColor = line.customColor || "#ffffff";
  const thoughtSpeakerColor = getSpeakerColor(line.speaker, "#ffffff");

  let thoughtSizeClass = "text-sm sm:text-base leading-snug";
  if (size === "small") thoughtSizeClass = "text-xs leading-tight";
  if (size === "large") thoughtSizeClass = "text-base sm:text-lg leading-normal";

  let baseFontSize = line.fontSize;
  if (!baseFontSize) {
    baseFontSize = size === "small" ? 12 : size === "large" ? 18 : 14;
  }
  const minFont = isMobile ? 6 : 10;
  const fontLayoutScale = bubbleLayoutScale;
  const finalFontSize = Math.max(minFont * textScale, baseFontSize * textScale * fontLayoutScale);

  const thoughtStyles: React.CSSProperties = {
    backgroundColor: resolveBgColor(thoughtBg, "#000000", bubbleOpacity),
    color: thoughtTextColor,
    border: `2px solid ${thoughtBorderColor}`,
    borderRadius: 0,
    fontSize: `${finalFontSize}px`,
    ...comicTextContainment(finalFontSize, 0, { mobile: isMobile }),
  };

  const layoutWidth = line.width ? line.width * bubbleLayoutScale * textScale : undefined;
  if (layoutWidth)       thoughtStyles.maxWidth   = `${layoutWidth}px`;
  if (customFontFamily) thoughtStyles.fontFamily = customFontFamily;

  const wrapperStyles: React.CSSProperties = { pointerEvents: "none" };
  if (layoutWidth) wrapperStyles.maxWidth = `${layoutWidth}px`;

  return (
    <motion.div
      key={`thought-${index}`}
      variants={{ ...animVars, exit: exitVar }}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="relative max-w-sm"
      style={{
        ...wrapperStyles,
        pointerEvents: "none",
      }}
    >
      <div
        className={`${fontClass} ${thoughtSizeClass} relative z-10`}
        style={thoughtStyles}
      >
        <div className="flex flex-col gap-2">
          {paragraphs.map((p, i) => (
            <div key={i}>
              {i === 0 && lineShowsSpeaker(line) && line.speaker && (
                <InlineSpeakerLabel name={line.speaker} color={thoughtSpeakerColor} />
              )}
              {p.speaker && (!line.speaker || p.speaker.toUpperCase().trim() !== line.speaker.toUpperCase().trim()) && (
                <InlineSpeakerLabel name={p.speaker} color={getSpeakerColor(p.speaker, "#ffffff")} />
              )}
              <span>
                {inlineTextEdit ? <BubbleInlineEditor inlineTextEdit={inlineTextEdit} /> : renderStyledText(p.text)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

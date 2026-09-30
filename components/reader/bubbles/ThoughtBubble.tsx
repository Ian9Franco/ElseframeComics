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
  resolveBgColor,
  renderStyledText,
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
  speedMultiplier?: number;
  bubbleOpacity?: number;
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
  speedMultiplier = 1.0,
  bubbleOpacity,
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
  const depthVal      = depth ?? 2;
  const shadowOffsetY = 2 + depthVal * 1.5;
  const shadowBlur    = 4 + depthVal * 2.5;
  const shadowAlpha   = 0.15 + depthVal * 0.05;
  const customDropShadow = `drop-shadow(0px ${shadowOffsetY}px ${shadowBlur}px rgba(0, 0, 0, ${shadowAlpha}))`;

  // ── Animation ──
  const delay      = computeBubbleDelay(index, line, instant ?? false, speedMultiplier);
  const animVars   = buildAnimVariants(appearanceAnimation);
  const exitVar    = buildExitVariant(fadeOutAnimation);
  const transition = buildAnimTransition(appearanceAnimation, delay, instant ?? false);

  // ── Font ──
  const customFontFamily   = resolveFontFamily(line, "thought");
  const fontClass          = resolveFontClass(line);

  // ── Colours (Black Background, White Text, Sharp Box, No Tail) ──
  const thoughtBg          = line.customBg || "#000000";
  const thoughtTextColor   = line.textColor || "#ffffff";
  const thoughtBorderColor = line.customColor || "#ffffff";
  const thoughtSpeakerColor = getSpeakerColor(line.speaker, "#ffffff");

  let thoughtSizeClass = "px-3 py-2 text-sm sm:text-base leading-snug";
  if (size === "small") thoughtSizeClass = "px-2.5 py-1.5 text-xs leading-tight";
  if (size === "large") thoughtSizeClass = "px-5 py-3 text-base sm:text-lg leading-normal";

  let baseFontSize = line.fontSize;
  if (!baseFontSize) {
    baseFontSize = size === "small" ? 12 : size === "large" ? 18 : 14;
  }
  const minFont = isMobile ? 8 : 10;
  const finalFontSize = Math.max(minFont, baseFontSize * textScale);

  const thoughtStyles: React.CSSProperties = {
    backgroundColor: resolveBgColor(thoughtBg, "#000000", bubbleOpacity),
    color: thoughtTextColor,
    border: `2px solid ${thoughtBorderColor}`,
    borderRadius: line.borderRadius !== undefined ? `${line.borderRadius}px` : "0px",
    fontSize: `${finalFontSize}px`,
  };

  if (line.width)       thoughtStyles.maxWidth   = `${line.width}px`;
  if (customFontFamily) thoughtStyles.fontFamily = customFontFamily;

  const wrapperStyles: React.CSSProperties = { pointerEvents: "none" };
  if (line.width) wrapperStyles.maxWidth = `${line.width}px`;

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
        filter: customDropShadow,
      }}
    >
      {/* Rectangular Box Container (Fondo Negro, Letras Blancas, Bordes Rectos) */}
      <div
        className={`${fontClass} ${thoughtSizeClass} relative z-10 shadow-lg`}
        style={thoughtStyles}
      >
        {line.speaker && (line.showSpeakerName || line.offscreen) && (
          <span
            className="font-[var(--font-bangers)] text-xs tracking-wider block mb-1 uppercase font-bold"
            style={{ color: thoughtSpeakerColor }}
          >
            {line.speaker}
          </span>
        )}
        <div className="flex flex-col gap-2">
          {paragraphs.map((p, i) => (
            <div key={i}>
              {p.speaker && (!line.speaker || p.speaker.toUpperCase().trim() !== line.speaker.toUpperCase().trim()) && (
                <strong className="font-[var(--font-bangers)] font-bold mr-1 tracking-wide" style={{ color: getSpeakerColor(p.speaker, "#ffffff"), fontWeight: "bold" }}>
                  {p.speaker}:{" "}
                </strong>
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

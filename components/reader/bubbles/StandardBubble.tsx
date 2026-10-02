"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
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
  buildComicBalloonPath,
  comicBalloonSeed,
  comicTextContainment,
  computeBubbleDelay,
  resolveBgColor,
  getSfxGradient,
  renderStyledText,
  lineShowsSpeaker,
  InlineSpeakerLabel,
} from "./bubbleHelpers";
import { BubbleInlineEditor } from "./BubbleInlineEditor";
import type { InlineTextEditProps } from "../DialogueBubble";

interface StandardBubbleProps {
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
}

// ─── Triangle Tail Helpers ─────────────────────────────────────────────────────

function TriangleTail({
  direction,
  bgColor,
  borderColor,
  strokeWidth = 1.75,
}: {
  direction: string;
  bgColor: string;
  borderColor: string;
  strokeWidth?: number;
}) {
  if (direction === "none") return null;

  const strokeW = strokeWidth;

  switch (direction) {
    case "bottom-right":
      return (
        <svg
          width="20"
          height="14"
          className="absolute z-10 pointer-events-none"
          style={{ bottom: "-13.5px", right: "24px", overflow: "visible" }}
        >
          <path
            d="M 1 0 L 10 13 L 19 0"
            fill={bgColor}
            stroke={borderColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "top-left":
      return (
        <svg
          width="20"
          height="14"
          className="absolute z-10 pointer-events-none"
          style={{ top: "-13.5px", left: "24px", overflow: "visible" }}
        >
          <path
            d="M 1 14 L 10 1 L 19 14"
            fill={bgColor}
            stroke={borderColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "top-right":
      return (
        <svg
          width="20"
          height="14"
          className="absolute z-10 pointer-events-none"
          style={{ top: "-13.5px", right: "24px", overflow: "visible" }}
        >
          <path
            d="M 1 14 L 10 1 L 19 14"
            fill={bgColor}
            stroke={borderColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "left":
      return (
        <svg
          width="14"
          height="20"
          className="absolute z-10 pointer-events-none"
          style={{ left: "-13.5px", top: "50%", transform: "translateY(-50%)", overflow: "visible" }}
        >
          <path
            d="M 14 1 L 1 10 L 14 19"
            fill={bgColor}
            stroke={borderColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "right":
      return (
        <svg
          width="14"
          height="20"
          className="absolute z-10 pointer-events-none"
          style={{ right: "-13.5px", top: "50%", transform: "translateY(-50%)", overflow: "visible" }}
        >
          <path
            d="M 0 1 L 13 10 L 0 19"
            fill={bgColor}
            stroke={borderColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "bottom-left":
    default:
      return (
        <svg
          width="20"
          height="14"
          className="absolute z-10 pointer-events-none"
          style={{ bottom: "-13.5px", left: "24px", overflow: "visible" }}
        >
          <path
            d="M 1 0 L 10 13 L 19 0"
            fill={bgColor}
            stroke={borderColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function StandardBubble({
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
}: StandardBubbleProps & { inlineTextEdit?: InlineTextEditProps }) {
  const style   = line.style ?? "normal";
  const tailDir = line.tail  ?? "bottom-left";
  const paragraphs = parseParagraphs(line.text);
  const size    = line.size  ?? "medium";

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Dynamic shadow based on depth ──
  const depthVal       = depth ?? 2;
  const shadowOffsetY  = 2 + depthVal * 1.5;
  const shadowBlur     = 4 + depthVal * 2.5;
  const shadowAlpha    = 0.12 + depthVal * 0.04;
  const customDropShadow = `drop-shadow(0px ${shadowOffsetY}px ${shadowBlur}px rgba(0, 0, 0, ${shadowAlpha}))`;

  // ── Animation ──
  const delay      = computeBubbleDelay(index, line, instant ?? false, speedMultiplier, staggerDelay);
  const animVars   = buildAnimVariants(appearanceAnimation);
  const exitVar    = buildExitVariant(fadeOutAnimation);
  const transition = buildAnimTransition(appearanceAnimation, delay, instant ?? false, staggerDelay);

  // ── Font ──
  const customFontFamily = resolveFontFamily(line, style);
  const fontClass        = resolveFontClass(line);

  // ── Visual styling ──
  let bgColor      = resolveBgColor(line.customBg, "#ffffff", bubbleOpacity);
  let borderColor  = line.customColor || "#0a0a0f";
  let borderStyle  = `1.75px solid ${borderColor}`; // slightly thicker for better contrast when transparent
  let shadowStyle  = "none";
  let speakerColor = getSpeakerColor(line.speaker, "#000000");

  let bubbleClass  = `${fontClass} text-[#0a0a0f]`;

  // ── Size classes ──
  let sizeClass = "px-3.5 py-2 rounded-2xl text-sm sm:text-base leading-snug";
  if (size === "small")  sizeClass = "px-2 py-1 rounded-xl text-xs leading-tight";
  if (size === "large")  sizeClass = "px-6 py-3.5 rounded-3xl text-base sm:text-lg leading-normal";

  // ── Style-specific overrides ──
  if (style === "scream") {
    bgColor      = line.customBg    || "#f5e642";
    borderColor  = line.customColor || "#0a0a0f";
    borderStyle  = `2.5px solid ${borderColor}`;
    shadowStyle  = `4px 4px 0 ${line.customColor || "#e8185a"}`;
    bubbleClass  = `${line.fontFamily ? fontClass : "font-[var(--font-bangers)]"} text-[#0a0a0f] uppercase tracking-wide leading-tight`;
    sizeClass    = size === "small" ? "px-4 py-2.5 rounded text-xs sm:text-sm" :
                   size === "large" ? "px-8 py-5 rounded-lg text-lg sm:text-xl" :
                                      "px-6 py-4 rounded-md text-base sm:text-lg";

  } else if (style === "whisper") {
    bgColor      = resolveBgColor(line.customBg, "#ffffff", bubbleOpacity);
    borderColor  = line.customColor || "#a1a1aa";
    borderStyle  = `1.75px dashed ${borderColor}`;
    bubbleClass  = `${line.fontFamily ? fontClass : "font-[var(--font-marker)]"} italic text-zinc-500`;
    speakerColor = getSpeakerColor(line.speaker, "#a1a1aa");
    sizeClass    = size === "small" ? "px-3 py-1.5 rounded-xl text-[10px] sm:text-xs leading-tight" :
                   size === "large" ? "px-7 py-3.5 rounded-3xl text-sm sm:text-base leading-normal" :
                                      "px-4 py-2 rounded-2xl text-xs sm:text-sm leading-snug";

  } else if (style === "electronic") {
    // ── Premium glassmorphism for electronic bubbles ──
    bgColor      = line.customBg    || "rgba(10, 20, 32, 0.82)";
    borderColor  = line.customColor || "#00f0ff";
    borderStyle  = `1px solid rgba(0, 240, 255, 0.55)`;
    shadowStyle  = `0 0 18px rgba(0, 240, 255, 0.25), inset 0 0 12px rgba(0, 240, 255, 0.08)`;
    bubbleClass  = `${line.fontFamily ? fontClass : "font-mono"} text-[#00f0ff]`;
    speakerColor = getSpeakerColor(line.speaker, borderColor);
    sizeClass    = size === "small" ? "px-2.5 py-1.5 rounded-none text-[10px] sm:text-xs leading-tight" :
                   size === "large" ? "px-6 py-3.5 rounded-none text-sm sm:text-base leading-normal" :
                                      "px-4 py-2.5 rounded-none text-xs sm:text-sm leading-snug";

  } else if (style === "sfx") {
    bgColor      = line.customBg || "transparent";
    borderColor  = line.customColor || "#000000";
    borderStyle  = "none";
    shadowStyle  = "none";
    bubbleClass  = `${line.fontFamily ? fontClass : "font-[var(--font-bangers)]"} text-center uppercase tracking-wider leading-none`;
    speakerColor = getSpeakerColor(line.speaker, "#e8185a");
    const isTransparent = bgColor === "transparent";
    sizeClass    = size === "small" ? (isTransparent ? "p-1 text-base sm:text-lg"    : "px-7 py-5 rounded-none text-sm sm:text-base") :
                   size === "large" ? (isTransparent ? "p-3 text-4xl sm:text-6xl"    : "px-16 py-12 rounded-none text-3xl sm:text-5xl") :
                                      (isTransparent ? "p-2 text-2xl sm:text-4xl"    : "px-11 py-8 rounded-none text-xl sm:text-3xl");
  }

  const organicBalloon = style === "normal" || style === "whisper";
  if (organicBalloon) {
    if (style === "whisper") {
      sizeClass =
        size === "small"
          ? "text-[10px] sm:text-xs leading-tight"
          : size === "large"
            ? "text-sm sm:text-base leading-normal"
            : "text-xs sm:text-sm leading-snug";
    } else {
      sizeClass =
        size === "small"
          ? "text-xs leading-tight"
          : size === "large"
            ? "text-base sm:text-lg leading-normal"
            : "text-sm sm:text-base leading-snug";
    }
  }

  const hasElasticTail = line.tail !== "none" && line.tailX !== undefined && line.tailY !== undefined;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [balloonBox, setBalloonBox] = useState({ w: 0, h: 0 });


  const wrapperStyles: React.CSSProperties = { pointerEvents: "none" };
  if (line.width) wrapperStyles.maxWidth = `${line.width}px`;

  const bubbleStyles: React.CSSProperties = {
    backgroundColor: organicBalloon ? "transparent" : bgColor,
    border: organicBalloon ? "none" : borderStyle,
    boxShadow: organicBalloon ? "none" : shadowStyle,
    borderRadius: organicBalloon
      ? undefined
      : line.borderRadius !== undefined
        ? `${line.borderRadius}px`
        : undefined,
  };

  // ── Font size scaling ──
  let baseFontSize = line.fontSize;
  if (!baseFontSize) {
    baseFontSize = style === "sfx"
      ? (size === "small" ? 18 : size === "large" ? 48 : 32)
      : (size === "small" ? 12 : size === "large" ? 18 : 14);
  }
  const minFont = style === "sfx" ? 10 : (isMobile ? 8 : 10);
  const finalFontSize = Math.max(minFont, baseFontSize * textScale);
  useLayoutEffect(() => {
    if (!organicBalloon) return;
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setBalloonBox({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [organicBalloon, line.text, line.width, finalFontSize, textScale, isMobile]);

  const balloonBleed = isMobile ? 10 : 16;
  const balloonW = balloonBox.w + balloonBleed * 2;
  const balloonH = balloonBox.h + balloonBleed * 2;
  const balloonPath =
    organicBalloon && balloonBox.w > 0
      ? buildComicBalloonPath(
          comicBalloonSeed(index, line.text || ""),
          hasElasticTail ? "none" : tailDir,
          balloonW,
          balloonH,
          style === "whisper" ? "scallop" : "smooth"
        )
      : "";
  const balloonFill = bgColor.replace(
    /rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)/,
    "rgb($1, $2, $3)"
  );
  if (style !== "sfx") {
    Object.assign(
      bubbleStyles,
      comicTextContainment(finalFontSize, 0, { mobile: isMobile, speechBalloon: organicBalloon })
    );
  }
  bubbleStyles.fontSize = `${finalFontSize}px`;
  if (line.width)     bubbleStyles.maxWidth  = `${line.width}px`;
  if (line.textColor) bubbleStyles.color     = line.textColor;
  if (customFontFamily) bubbleStyles.fontFamily = customFontFamily;

  // ── SFX special styling ──
  if (style === "sfx") {
    Object.assign(bubbleStyles, {
      backgroundColor: "transparent",
      border: "none",
      boxShadow: "none",
      display: "inline-block",
    });
  }

  // ── Apply backdrop blur for translucent bubbles ──
  const isTranslucent = bgColor.includes("rgba") || bgColor === "transparent" || style === "electronic";
  const backdropBlurStyles: React.CSSProperties = isTranslucent
    ? { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }
    : {};

  return (
    <motion.div
      key={`bubble-${index}`}
      variants={{ ...animVars, exit: exitVar }}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="relative max-w-sm font-sans"
      style={{
        ...wrapperStyles,
        filter: organicBalloon ? "none" : customDropShadow,
        overflow: "visible",
      }}
    >
      {/* 3D Layered Starburst backdrop for SFX when background is not transparent */}
      {style === "sfx" && bgColor !== "transparent" && (
        <div className="absolute inset-0 z-0 pointer-events-none scale-110">
          {/* Shadow Starburst */}
          <div className="absolute inset-0 top-1.5 left-1.5 opacity-80">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d="M 50,5 L 57,25 L 75,10 L 73,32 L 95,25 L 82,45 L 98,60 L 78,65 L 85,88 L 65,80 L 58,98 L 47,80 L 32,95 L 33,75 L 10,85 L 22,62 L 2,50 L 22,38 L 8,15 L 30,28 L 28,8 L 45,23 Z"
                fill={borderColor}
                stroke={borderColor}
                strokeWidth="1"
                strokeLinejoin="miter"
              />
            </svg>
          </div>
          {/* Main Starburst */}
          <div className="absolute inset-0">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d="M 50,5 L 57,25 L 75,10 L 73,32 L 95,25 L 82,45 L 98,60 L 78,65 L 85,88 L 65,80 L 58,98 L 47,80 L 32,95 L 33,75 L 10,85 L 22,62 L 2,50 L 22,38 L 8,15 L 30,28 L 28,8 L 45,23 Z"
                fill={bgColor}
                stroke={borderColor}
                strokeWidth="2.5"
                strokeLinejoin="miter"
              />
            </svg>
          </div>
        </div>
      )}

      {/* SVG Elastic Tail */}
      {hasElasticTail && elasticTailNode}

      {organicBalloon && balloonPath && (
        <svg
          className="absolute pointer-events-none"
          viewBox={`0 0 ${balloonW} ${balloonH}`}
          width={balloonW}
          height={balloonH}
          overflow="visible"
          style={{ zIndex: 0, left: -balloonBleed, top: -balloonBleed }}
        >
          <path
            d={balloonPath}
            fill={balloonFill}
            stroke={borderColor}
            strokeWidth={style === "whisper" ? 2.75 : 2.15}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Traditional Triangle Tail — scream/electronic only; speech balloons carry the tail in the outline */}
      {!organicBalloon && !hasElasticTail && style !== "sfx" && style !== "caption" && (
        <TriangleTail
          direction={tailDir}
          bgColor={bgColor}
          borderColor={borderColor}
          strokeWidth={style === "scream" ? 2.5 : 1.75}
        />
      )}

      {/* Inner Bubble Body & Text */}
      <div
        ref={bodyRef}
        className={`${bubbleClass} ${sizeClass} relative z-10`}
        style={{ ...bubbleStyles, ...(organicBalloon ? {} : backdropBlurStyles) }}
      >
        {style === "sfx" ? (
          <div className="flex flex-col gap-1.5 items-center justify-center">
            {paragraphs.map((p, pIdx) => {
              const chars = p.text.split("");
              const mid = (chars.length - 1) / 2;
              const sfxOutlineColor = borderColor;
              const sfxTextColor    = line.textColor || "#f5e642";
              const gradient        = getSfxGradient(sfxTextColor);

              return (
                <div key={pIdx} className="flex items-center justify-center whitespace-nowrap">
                  {chars.map((char, charIdx) => {
                    if (char === " ") {
                      return <span key={charIdx} className="inline-block w-3" />;
                    }

                    // Subtle alternating rotation to give it a hand-drawn comic look without hurting readability
                    const rotate = charIdx % 2 === 0 ? -2.5 : 2.5;
                    const y = 0;

                    // Letter-specific pop animation
                    const charVariants = {
                      initial: { opacity: 0, scale: 0.2, y: 25, rotate: -25 },
                      animate: {
                        opacity: 1,
                        scale: 1,
                        y: y,
                        rotate: rotate,
                        transition: {
                          type: "spring" as const,
                          stiffness: 350,
                          damping: 14,
                          delay: delay + charIdx * 0.05,
                        },
                      },
                      exit: {
                        opacity: 0,
                        scale: 0.4,
                        transition: { duration: 0.15 }
                      },
                    };

                    return (
                      <motion.span
                        key={charIdx}
                        variants={charVariants}
                        className="inline-block relative select-none"
                        style={{
                          transformOrigin: "center bottom",
                          margin: "0 0.015em",
                          fontSize: "inherit",
                          fontWeight: "inherit",
                          fontFamily: "var(--font-bangers)",
                        }}
                      >
                        {/* Thick Outline Background */}
                        <span
                          className="absolute inset-0 select-none pointer-events-none"
                          style={{
                            color: sfxOutlineColor,
                            WebkitTextStroke: `4.5px ${sfxOutlineColor}`,
                            paintOrder: "stroke fill",
                            zIndex: 1,
                          }}
                        >
                          {char}
                        </span>
                        
                        {/* 3D Extrusion Shadow */}
                        <span
                          className="absolute select-none pointer-events-none"
                          style={{
                            color: sfxOutlineColor,
                            WebkitTextStroke: `4.5px ${sfxOutlineColor}`,
                            top: "3.5px",
                            left: "3.5px",
                            opacity: 0.75,
                            zIndex: 0,
                          }}
                        >
                          {char}
                        </span>
                        
                        {/* Foreground Gradient Text */}
                        <span
                          className="relative block"
                          style={{
                            background: `linear-gradient(180deg, ${gradient.start} 0%, ${gradient.end} 100%)`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            zIndex: 2,
                          }}
                        >
                          {char}
                        </span>
                      </motion.span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : inlineTextEdit ? (
          <div>
            {lineShowsSpeaker(line) && line.speaker && (
              <InlineSpeakerLabel name={line.speaker} color={speakerColor} />
            )}
            <BubbleInlineEditor inlineTextEdit={inlineTextEdit} className={bubbleClass} style={{ color: line.textColor }} />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {paragraphs.map((p, i) => (
              <div key={i}>
                {i === 0 && lineShowsSpeaker(line) && line.speaker && (
                  <InlineSpeakerLabel name={line.speaker} color={speakerColor} />
                )}
                {p.speaker && (!line.speaker || p.speaker.toUpperCase().trim() !== line.speaker.toUpperCase().trim()) && (
                  <InlineSpeakerLabel name={p.speaker} color={getSpeakerColor(p.speaker, "#000000")} />
                )}
                <span>{renderStyledText(p.text)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

"use client";

import React from "react";
import { getComicPageUrl, type SpoilerMask } from "../readerUtils";

const NEXT_FILTER = "blur(3px) brightness(0.42) saturate(0.7)";

export function StaticSpoilerMasks({ masks }: { masks?: SpoilerMask[] }) {
  if (!masks?.length) return null;
  return (
    <>
      {masks.map((m) => (
        <div
          key={m.key}
          className="absolute brand-grain"
          style={{
            left: `calc(${m.x}% - 2px)`,
            top: `calc(${m.y}% - 2px)`,
            width: `calc(${m.w}% + 4px)`,
            height: `calc(${m.h}% + 4px)`,
          }}
        />
      ))}
    </>
  );
}

/** A page image with its spoiler masks, filtered as one layer so the masks blur with it. */
export function MaskedPageImage({
  src,
  masks,
  filter,
  opacity = 1,
  zIndex,
}: {
  src: string;
  masks?: SpoilerMask[];
  filter?: string;
  opacity?: number;
  zIndex?: number;
}) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ filter, opacity, zIndex }}
    >
      <img
        src={getComicPageUrl(src)}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: "fill", maxWidth: "none" }}
      />
      <StaticSpoilerMasks masks={masks} />
    </div>
  );
}

export function NeighborPages({
  prevSrc,
  nextSrc,
  prevMasks,
  nextMasks,
  imgLeft,
  imgTop,
  imgWidth,
  imgHeight,
  transition,
  zIndex,
}: {
  prevSrc?: string;
  nextSrc?: string;
  prevMasks?: SpoilerMask[];
  nextMasks?: SpoilerMask[];
  imgLeft: number;
  imgTop: number;
  imgWidth: number;
  imgHeight: number;
  transition: string;
  zIndex?: number;
}) {
  if (imgWidth <= 0 || imgHeight <= 0) return null;
  // On narrow screens the page fills the width, so a tighter gap lets the neighbors peek in.
  const gap = Math.max(8, Math.min(28, imgLeft * 0.3));

  const renderSide = (src: string | undefined, masks: SpoilerMask[] | undefined, side: "prev" | "next") => {
    if (!src) return null;
    const left = side === "prev" ? imgLeft - imgWidth - gap : imgLeft + imgWidth + gap;
    return (
      <div
        key={side}
        aria-hidden
        className="absolute pointer-events-auto select-none cursor-grab"
        data-flip-neighbor={side}
        style={{
          left,
          top: imgTop,
          width: imgWidth,
          height: imgHeight,
          transition,
          zIndex,
          boxShadow: "0 15px 40px rgba(0, 0, 0, 0.8)",
        }}
      >
        <div
          className="absolute inset-0"
          style={
            side === "prev"
              ? { transform: "scaleX(-1)", opacity: 0.42 }
              : undefined
          }
        >
          <MaskedPageImage
            src={src}
            masks={side === "prev" ? undefined : masks}
            filter={side === "next" ? NEXT_FILTER : undefined}
            opacity={side === "next" ? 0.75 : 1}
          />
        </div>
        {side === "next" && (
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(10,10,15,0) 0%, rgba(10,10,15,0.55) 100%)",
            }}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {renderSide(prevSrc, prevMasks, "prev")}
      {renderSide(nextSrc, nextMasks, "next")}
    </>
  );
}

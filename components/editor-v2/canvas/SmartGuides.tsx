"use client";

import React from "react";

const SNAP = 2;

export function snapWithGuides(
  posX: number,
  posY: number,
  others: { posX: number; posY: number }[]
): { posX: number; posY: number; guides: { axis: "x" | "y"; value: number }[] } {
  let x = posX;
  let y = posY;
  const guides: { axis: "x" | "y"; value: number }[] = [];
  const anchors = [0, 25, 50, 75, 100, ...others.flatMap((o) => [o.posX, o.posY])];

  for (const ax of anchors) {
    if (Math.abs(x - ax) <= SNAP) {
      x = ax;
      guides.push({ axis: "x", value: ax });
      break;
    }
  }
  for (const ay of anchors) {
    if (Math.abs(y - ay) <= SNAP) {
      y = ay;
      guides.push({ axis: "y", value: ay });
      break;
    }
  }
  return { posX: x, posY: y, guides };
}

export function SmartGuides({
  guides,
  imgLeft,
  imgTop,
  imgWidth,
  imgHeight,
}: {
  guides: { axis: "x" | "y"; value: number }[];
  imgLeft: number;
  imgTop: number;
  imgWidth: number;
  imgHeight: number;
}) {
  if (guides.length === 0) return null;
  return (
    <>
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <div
            key={`gx-${i}`}
            className="absolute top-0 bottom-0 w-px bg-[#e8185a] z-[90] pointer-events-none"
            style={{ left: imgLeft + (g.value / 100) * imgWidth }}
          />
        ) : (
          <div
            key={`gy-${i}`}
            className="absolute left-0 right-0 h-px bg-[#e8185a] z-[90] pointer-events-none"
            style={{ top: imgTop + (g.value / 100) * imgHeight }}
          />
        )
      )}
    </>
  );
}

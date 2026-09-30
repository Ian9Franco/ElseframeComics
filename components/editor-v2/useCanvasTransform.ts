"use client";

import { useCallback, useState } from "react";

export function useCanvasTransform() {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);

  const screenToImagePercent = useCallback(
    (
      clientX: number,
      clientY: number,
      containerRect: DOMRect,
      imgLeft: number,
      imgTop: number,
      imgWidth: number,
      imgHeight: number
    ) => {
      const cx = containerRect.left + pan.x;
      const cy = containerRect.top + pan.y;
      const localX = (clientX - cx - imgLeft) / scale;
      const localY = (clientY - cy - imgTop) / scale;
      return {
        posX: (localX / imgWidth) * 100,
        posY: (localY / imgHeight) * 100,
      };
    },
    [pan, scale]
  );

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => Math.min(3, Math.max(0.35, s + delta)));
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return {
    scale,
    setScale,
    pan,
    setPan,
    spaceHeld,
    setSpaceHeld,
    screenToImagePercent,
    zoomBy,
    resetView,
  };
}

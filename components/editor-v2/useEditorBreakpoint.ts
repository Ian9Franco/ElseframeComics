"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind `lg` (1024px) — desktop editor chrome vs mobile layered UI. */
export function useEditorBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return { isDesktop, isMobile: !isDesktop };
}

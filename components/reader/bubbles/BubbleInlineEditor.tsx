"use client";

import React, { useEffect, useRef } from "react";
import type { InlineTextEditProps } from "../DialogueBubble";

export function BubbleInlineEditor({
  inlineTextEdit,
  className,
  style,
}: {
  inlineTextEdit: InlineTextEditProps;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (inlineTextEdit.autoFocus && ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
    }
  }, [inlineTextEdit.autoFocus, inlineTextEdit.value]);

  return (
    <textarea
      ref={ref}
      value={inlineTextEdit.value}
      onChange={(e) => inlineTextEdit.onChange(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      className={`bg-transparent border-none outline-none resize-none min-w-[4rem] min-h-[1.5rem] pointer-events-auto ${className ?? ""}`}
      style={style}
      rows={Math.max(1, inlineTextEdit.value.split("\n").length)}
    />
  );
}

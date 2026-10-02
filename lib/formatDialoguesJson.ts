function stringifyDialogueCompact(obj: Record<string, unknown>): string {
  const parts = Object.entries(obj).map(([k, v]) => {
    return `${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  });
  return `{ ${parts.join(", ")} }`;
}

function stringifyZoomRectCompact(obj: { x: number; y: number; w: number; h: number }): string {
  return `{ "x": ${obj.x}, "y": ${obj.y}, "w": ${obj.w}, "h": ${obj.h} }`;
}

export function formatDialoguesJson(val: unknown, indent = ""): string {
  if (val === null) return "null";
  if (typeof val === "undefined") return "undefined";
  if (typeof val === "string") return JSON.stringify(val);
  if (typeof val === "number" || typeof val === "boolean") return String(val);

  const nextIndent = indent + "  ";

  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";

    const isDialogueArray = val.every((item) => item && typeof item === "object" && "text" in item);
    const isZoomRectArray = val.every(
      (item) => item && typeof item === "object" && "x" in item && "w" in item
    );

    if (isDialogueArray) {
      const items = val.map((item) => nextIndent + stringifyDialogueCompact(item as Record<string, unknown>));
      return "[\n" + items.join(",\n") + "\n" + indent + "]";
    }

    if (isZoomRectArray) {
      const items = val.map((item) => nextIndent + stringifyZoomRectCompact(item as { x: number; y: number; w: number; h: number }));
      return "[\n" + items.join(",\n") + "\n" + indent + "]";
    }

    const items = val.map((item) => formatDialoguesJson(item, nextIndent));
    return "[\n" + items.map((item) => nextIndent + item).join(",\n") + "\n" + indent + "]";
  }

  if (typeof val === "object") {
    const keys = Object.keys(val as object);
    if (keys.length === 0) return "{}";

    const parts = keys.map((k) => {
      const valueStr = formatDialoguesJson((val as Record<string, unknown>)[k], nextIndent);
      return nextIndent + JSON.stringify(k) + ": " + valueStr;
    });
    return "{\n" + parts.join(",\n") + "\n" + indent + "}";
  }

  return JSON.stringify(val);
}

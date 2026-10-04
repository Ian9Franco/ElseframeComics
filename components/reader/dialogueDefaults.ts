import type { DialogueLine } from "./DialogueBubble";
import { suggestBubbleWidth } from "./readerUtils";

export type DialogueSeed = Pick<DialogueLine, "text"> &
  Partial<
    Pick<
      DialogueLine,
      | "speaker"
      | "showSpeakerName"
      | "offscreen"
      | "style"
      | "tail"
      | "posX"
      | "posY"
      | "size"
      | "tailX"
      | "tailY"
    >
  >;

/** Shared factory used by both manual creation and accepted AI proposals. */
export function createDialogueLine(
  seed: DialogueSeed,
  presetMode: "standard" | "custom"
): DialogueLine {
  const style = seed.style ?? "normal";
  const posX = seed.posX ?? 50;
  const posY = seed.posY ?? 50;
  const isStandard = presetMode === "standard";
  const isCaption = style === "caption";
  const isCinematic = style === "cinematic";
  // Match the legacy manual factory exactly: captions keep their dormant tail
  // geometry even though `tail` is "none"; only cinematic lines omit it.
  const omitsTailGeometry = isCinematic;

  return {
    text: seed.text,
    speaker: seed.speaker ?? "",
    showSpeakerName: seed.showSpeakerName,
    offscreen: seed.offscreen,
    style,
    size: seed.size ?? (isCinematic ? "large" : isCaption ? "medium" : "small"),
    posX,
    posY,
    tailX: omitsTailGeometry ? undefined : seed.tailX ?? posX,
    tailY: omitsTailGeometry ? undefined : seed.tailY ?? posY + 15,
    tailWidth: omitsTailGeometry ? undefined : 6,
    tailCurvature: omitsTailGeometry ? undefined : -22,
    width: isCinematic
      ? 900
      : isCaption
        ? 160
        : seed.text?.trim()
          ? suggestBubbleWidth({
              text: seed.text,
              style,
              size: seed.size ?? (isCinematic ? "large" : isCaption ? "medium" : "small"),
              fontSize: isCinematic ? 76 : 8,
            })
          : 96,
    fontSize: isCinematic ? 76 : 8,
    borderRadius: isCinematic ? 0 : isCaption ? 4 : 18,
    tail: isCinematic ? "none" : seed.tail,
    fontFamily: isCinematic
      ? "bungee"
      : isStandard
        ? "marker"
        : isCaption
          ? "sans"
          : undefined,
    customBg: isCinematic ? "transparent" : isStandard && isCaption ? "#f5e642" : undefined,
    textColor: isCinematic ? "#0a0a0f" : isStandard && isCaption ? "#000000" : undefined,
    customColor: isCinematic ? "#0a0a0f" : isStandard && isCaption ? "#0a0a0f" : undefined,
    cinematicVariant: isCinematic ? "translucent" : undefined,
    cinematic3d: isCinematic ? true : undefined,
  };
}

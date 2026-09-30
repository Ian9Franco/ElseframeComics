import type { DialogueLine } from "@/components/reader/DialogueBubble";

export type EditorV2Tool = "select" | "bubble" | "stop" | "hand";

export type BubbleStylePreset = NonNullable<DialogueLine["style"]>;

export type Selection =
  | { kind: "none" }
  | { kind: "bubble"; panelIdx: number; bubbleIdx: number }
  | { kind: "bubbles"; items: { panelIdx: number; bubbleIdx: number }[] }
  | { kind: "stop"; panelIdx: number }
  | { kind: "mask"; panelIdx: number; rectIdx: number };

export const BUBBLE_PALETTE: { id: BubbleStylePreset; label: string; emoji: string }[] = [
  { id: "normal", label: "Normal", emoji: "💬" },
  { id: "scream", label: "Grito", emoji: "📢" },
  { id: "whisper", label: "Susurro", emoji: "🤫" },
  { id: "thought", label: "Pensamiento", emoji: "💭" },
  { id: "caption", label: "Narración", emoji: "📜" },
  { id: "cinematic", label: "Cinemático", emoji: "🎬" },
  { id: "electronic", label: "Electrónico", emoji: "📡" },
  { id: "sfx", label: "SFX", emoji: "💥" },
];

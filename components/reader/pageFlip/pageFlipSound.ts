"use client";

import { Howl } from "howler";
import { PAGE_FLIP_SOUND_PATH, readPageFlipSoundEnabled } from "@/lib/readerSystemSounds";

let flipHowl: Howl | null = null;

function getFlipHowl(): Howl | null {
  if (typeof window === "undefined") return null;
  if (!flipHowl) {
    flipHowl = new Howl({
      src: [PAGE_FLIP_SOUND_PATH],
      volume: 0.55,
      preload: true,
      onloaderror: (_id, error) => {
        console.error("No se pudo cargar el sonido de pasar página", error);
      },
    });
  }
  return flipHowl;
}

export function preloadPageFlipSound() {
  getFlipHowl();
}

export function playPageFlipSound(direction: "next" | "prev") {
  if (!readPageFlipSoundEnabled()) return;
  const howl = getFlipHowl();
  if (!howl) return;
  const id = howl.play();
  howl.rate(direction === "next" ? 0.98 : 0.9, id);
}

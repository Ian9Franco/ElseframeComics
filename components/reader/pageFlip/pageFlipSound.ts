"use client";

import { Howl } from "howler";

let flipHowl: Howl | null = null;

function getFlipHowl(): Howl | null {
  if (typeof window === "undefined") return null;
  if (!flipHowl) {
    flipHowl = new Howl({
      src: ["/sounds/sfx/page-flip.mp3"],
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
  const howl = getFlipHowl();
  if (!howl) return;
  const id = howl.play();
  howl.rate(direction === "next" ? 0.98 : 0.9, id);
}

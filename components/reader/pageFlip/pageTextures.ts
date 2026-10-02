"use client";

import * as THREE from "three";
import { getComicPageUrl, type SpoilerMask } from "../readerUtils";

const MAX_TEXTURE_SIDE = 2048;
const MASK_COLOR = "#080808";

const cache = new Map<string, THREE.Texture>();
let loader: THREE.TextureLoader | null = null;
let grainPattern: HTMLCanvasElement | null = null;

function getLoader() {
  if (!loader) {
    loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
  }
  return loader;
}

function getGrain(): HTMLCanvasElement {
  if (grainPattern) return grainPattern;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const data = ctx.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const n = Math.random() * 255;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = n;
    data.data[i + 3] = 22;
  }
  ctx.putImageData(data, 0, 0);
  grainPattern = c;
  return c;
}

function masksKey(masks: SpoilerMask[] | undefined) {
  if (!masks?.length) return "";
  return masks.map((m) => `${m.x},${m.y},${m.w},${m.h}`).join("|");
}

function buildMaskedTexture(url: string, masks: SpoilerMask[]): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const scale = Math.min(1, MAX_TEXTURE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    const pad = Math.max(2, w * 0.003);
    const pattern = ctx.createPattern(getGrain(), "repeat");
    masks.forEach((m) => {
      const x = (m.x / 100) * w - pad;
      const y = (m.y / 100) * h - pad;
      const mw = (m.w / 100) * w + pad * 2;
      const mh = (m.h / 100) * h + pad * 2;
      ctx.fillStyle = MASK_COLOR;
      ctx.fillRect(x, y, mw, mh);
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(x, y, mw, mh);
      }
    });
    tex.needsUpdate = true;
  };
  img.src = url;
  return tex;
}

export function getPageTexture(src: string | undefined, masks?: SpoilerMask[]): THREE.Texture | null {
  if (!src || typeof window === "undefined") return null;
  const url = getComicPageUrl(src);
  const key = `${url}#${masksKey(masks)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let tex: THREE.Texture;
  if (masks?.length) {
    tex = buildMaskedTexture(url, masks);
  } else {
    tex = getLoader().load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  }
  cache.set(key, tex);
  return tex;
}

export function preloadPageTextures(entries: { src?: string; masks?: SpoilerMask[] }[]) {
  entries.forEach((e) => getPageTexture(e.src, e.masks));
}

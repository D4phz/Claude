import { Pix, bayer, hash, mix, type RGB } from "./engine";
import { P } from "./palette";

/** Integer-scaled blit (close-ups keep crisp square pixels). */
export const blitScaled = (px: Pix, src: Pix, ox: number, oy: number, s: number, flip = false, tint?: RGB, shade = 0) => {
  ox = Math.round(ox);
  oy = Math.round(oy);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const sx = flip ? src.w - 1 - x : x;
      const c = src.get(sx, y);
      if (!c) continue;
      px.rect(ox + x * s, oy + y * s, s, s, tint ?? (shade ? mix(c, P.ink, shade) : c));
    }
};

const RUNES = [
  [1, 0, 1, 0, 1, 0, 1, 0, 1],
  [0, 1, 0, 1, 1, 1, 0, 1, 0],
  [1, 1, 0, 0, 1, 0, 0, 1, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 1],
];
const rune = (px: Pix, x: number, y: number, i: number, c: RGB) => {
  const r = RUNES[i % RUNES.length];
  for (let k = 0; k < 9; k++) if (r[k]) px.set(x + (k % 3), y + Math.floor(k / 3), c);
};

/** The witch's magic: always purple spirals + rising runes + dithered glow. */
export const magicAura = (px: Pix, cx: number, cy: number, r: number, t: number, k: number) => {
  if (k <= 0) return;
  px.glow(cx, cy, r * 1.2, P.magicDk, 0.55 * k);
  const n = Math.floor(70 * k);
  for (let i = 0; i < n; i++) {
    const a = t * (0.8 + hash(i) * 0.6) + hash(i + 1) * 6.28;
    const rr = r * (0.3 + hash(i + 2) * 0.7);
    const y = cy - ((t * 12 + hash(i + 3) * r * 2) % (r * 2)) + r;
    px.set(cx + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.3, hash(i + 4) > 0.7 ? P.magicHi : P.magic);
  }
  for (let i = 0; i < Math.floor(8 * k); i++) {
    const ry = cy + r * 0.6 - ((t * 10 + hash(i + 20) * r * 1.5) % (r * 1.5));
    const rx = cx + (hash(i + 21) - 0.5) * r * 1.6 + Math.sin(t + i) * 3;
    rune(px, rx, ry, i, i % 2 ? P.magicHi : P.magic);
  }
};

/** Withering motes rising from a body (decay rule: grey + purple motes). */
export const decayMotes = (px: Pix, x: number, y: number, w: number, h: number, t: number, k: number) => {
  for (let i = 0; i < Math.floor(24 * k); i++) {
    const q = (t * 0.6 + hash(i)) % 1;
    px.set(x + hash(i + 7) * w + Math.sin(t * 2 + i) * 2, y + h - q * h * 1.3, q < 0.5 ? P.magic : P.magicHi, 255 * (1 - q));
  }
};

/** Pixel slash arc (weapon trail). */
export const slash = (px: Pix, cx: number, cy: number, r: number, a0: number, a1: number, c: RGB = P.white) => {
  for (let i = 0; i <= 30; i++) {
    const a = a0 + ((a1 - a0) * i) / 30;
    px.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c);
    if (i % 2) px.set(cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1), mix(c, P.fog, 0.5));
  }
};

/** Dithered vignette / darkness toward the edges (k 0..1). */
export const vignette = (px: Pix, k: number, c: RGB = P.ink) => {
  for (let y = 0; y < px.h; y++)
    for (let x = 0; x < px.w; x++) {
      const dx = (x - px.w / 2) / (px.w / 2);
      const dy = (y - px.h / 2) / (px.h / 2);
      const d = Math.sqrt(dx * dx * 0.9 + dy * dy * 0.7);
      if (bayer(x, y) < (d - 1 + k) * 1.4) px.set(x, y, c);
    }
};

/** Dither dissolve to a colour (0 = none, 1 = full). */
export const dissolve = (px: Pix, k: number, c: RGB = P.ink) => {
  if (k <= 0) return;
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) if (bayer(x, y) < k) px.set(x, y, c);
};

/** Desaturate whole frame (for dying POV). */
export const desaturate = (px: Pix, k: number) => {
  for (let i = 0; i < px.w * px.h; i++) {
    const r = px.data[i * 4];
    const g = px.data[i * 4 + 1];
    const b = px.data[i * 4 + 2];
    const l = r * 0.3 + g * 0.59 + b * 0.11;
    px.data[i * 4] = r + (l - r) * k;
    px.data[i * 4 + 1] = g + (l - g) * k;
    px.data[i * 4 + 2] = b + (l * 1.05 - b) * k;
  }
};

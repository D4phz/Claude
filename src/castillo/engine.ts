// Pixel-art engine: a low-res RGBA buffer with primitives, outlines,
// ordered dithering and palette helpers. Everything is deterministic.

export type RGB = [number, number, number];
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const gray = (c: RGB, t: number): RGB => {
  const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  return mix(c, [l * 0.9, l * 0.92, l], t);
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[((y & 3) << 2) | (x & 3)];

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i + seed * 1013) * (1 - u) + hash(i + 1 + seed * 1013) * u;
};
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ease = (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/** Soft mode: glows, fog and fades blend smoothly instead of dithering. */
export const SOFT = { on: false };

export class Pix {
  data: Uint8ClampedArray<ArrayBuffer>;
  /** Colour filter applied on set(): used for decay / tint effects. */
  filter: ((c: RGB, x: number, y: number) => RGB) | null = null;
  constructor(
    public w: number,
    public h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  clear(c?: RGB) {
    for (let i = 0; i < this.w * this.h; i++) {
      this.data[i * 4] = c ? c[0] : 0;
      this.data[i * 4 + 1] = c ? c[1] : 0;
      this.data[i * 4 + 2] = c ? c[2] : 0;
      this.data[i * 4 + 3] = c ? 255 : 0;
    }
  }
  set(x: number, y: number, c: RGB, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (this.filter) c = this.filter(c, x, y);
    const i = (y * this.w + x) * 4;
    if (a >= 255) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = 255;
    } else if (a > 0) {
      const k = a / 255;
      this.data[i] = c[0] * k + this.data[i] * (1 - k);
      this.data[i + 1] = c[1] * k + this.data[i + 1] * (1 - k);
      this.data[i + 2] = c[2] * k + this.data[i + 2] * (1 - k);
      this.data[i + 3] = Math.max(this.data[i + 3], a);
    }
  }
  get(x: number, y: number): RGB | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    if (this.data[i + 3] === 0) return null;
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }
  alpha(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }
  /** Rect with ordered-dither opacity (pixel-art friendly transparency). */
  drect(x: number, y: number, w: number, h: number, c: RGB, k: number) {
    x = Math.round(x);
    y = Math.round(y);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bayer(x + i, y + j) < k) this.set(x + i, y + j, c);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
      }
  }
  /** Dithered radial glow. */
  glow(cx: number, cy: number, r: number, c: RGB, k = 0.6) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d >= 1) continue;
        if (SOFT.on) this.set(x, y, c, Math.min(255, (1 - d) * (1 - d) * k * 200));
        else if (bayer(x, y) < (1 - d) * (1 - d) * k) this.set(x, y, c);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 2000; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  poly(pts: [number, number][], c: RGB) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y + 0.5 && y1 > y + 0.5) || (y1 <= y + 0.5 && y0 > y + 0.5)) xs.push(x0 + ((y + 0.5 - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, c);
    }
  }
  /** Blit another buffer. flip mirrors horizontally. */
  blit(src: Pix, ox: number, oy: number, flip = false, a = 255) {
    ox = Math.round(ox);
    oy = Math.round(oy);
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const sx = flip ? src.w - 1 - x : x;
        const i = (y * src.w + sx) * 4;
        if (src.data[i + 3] === 0) continue;
        this.set(ox + x, oy + y, [src.data[i], src.data[i + 1], src.data[i + 2]], Math.min(a, src.data[i + 3]));
      }
  }
  /** 1px outline around opaque pixels. */
  outline(c: RGB) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y)) continue;
        if (this.alpha(x + 1, y) || this.alpha(x - 1, y) || this.alpha(x, y + 1) || this.alpha(x, y - 1)) add.push(x, y);
      }
    const f = this.filter;
    this.filter = null;
    for (let i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], c);
    this.filter = f;
  }
  /** Fill every pixel (for silhouettes). */
  recolor(c: RGB) {
    for (let i = 0; i < this.w * this.h; i++)
      if (this.data[i * 4 + 3]) {
        this.data[i * 4] = c[0];
        this.data[i * 4 + 1] = c[1];
        this.data[i * 4 + 2] = c[2];
      }
  }
}

/** Vertical gradient with ordered dithering between colour stops. */
export const ditherGradient = (px: Pix, y0: number, y1: number, stops: RGB[], x0 = 0, x1 = px.w) => {
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(t));
    const f = t - i;
    for (let x = x0; x < x1; x++) px.set(x, y, bayer(x, y) < f ? stops[i + 1] : stops[i]);
  }
};

/** Drifting dithered fog band. */
export const fog = (px: Pix, y: number, h: number, t: number, c: RGB, k: number, seed = 0, speed = 3) => {
  for (let yy = Math.floor(y - h); yy < y + h; yy++) {
    const fy = 1 - Math.abs(yy - y) / h;
    for (let x = 0; x < px.w; x++) {
      const n = noise1((x + t * speed) / 22, seed) * 0.6 + noise1((x - t * speed * 0.6) / 9, seed + 1) * 0.4;
      if (SOFT.on) px.set(x, yy, c, Math.min(255, fy * n * k * 190));
      else if (bayer(x, yy) < fy * n * k) px.set(x, yy, c);
    }
  }
};

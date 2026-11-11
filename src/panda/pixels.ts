// Tiny pixel-art rasteriser: draws into a low-res ImageData that is scaled up
// with nearest-neighbour filtering.

export type RGB = [number, number, number];

export const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

export class Pix {
  data: Uint8ClampedArray<ArrayBuffer>;
  constructor(
    public w: number,
    public h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  set(x: number, y: number, c: RGB, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (a >= 255) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = 255;
    } else {
      const k = a / 255;
      const ba = this.data[i + 3] / 255;
      this.data[i] = c[0] * k + this.data[i] * (1 - k);
      this.data[i + 1] = c[1] * k + this.data[i + 1] * (1 - k);
      this.data[i + 2] = c[2] * k + this.data[i + 2] * (1 - k);
      this.data[i + 3] = Math.min(255, (k + ba * (1 - k)) * 255);
    }
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }
  rect(x: number, y: number, w: number, h: number, c: RGB, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
      }
  }
  /** Copy another buffer on top (opaque pixels only). */
  blit(src: Pix, ox: number, oy: number) {
    ox = Math.round(ox);
    oy = Math.round(oy);
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.data[i + 3] === 0) continue;
        this.set(ox + x, oy + y, [src.data[i], src.data[i + 1], src.data[i + 2]], src.data[i + 3]);
      }
  }
  /** Add a 1px outline around every opaque shape. */
  outline(c: RGB) {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1))
          add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, c);
  }
}

/** Deterministic hash in [0, 1). */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Smooth 1D value noise. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i + seed * 1000) * (1 - u) + hash(i + 1 + seed * 1000) * u;
};

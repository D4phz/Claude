import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-700.css";

export const FPS = 30;
export const SHOT = 60; // 2 seconds per beat

export const COL = {
  night: "#040814",
  navy: "#0a1630",
  deep: "#0f2347",
  moon: "#9cc0ff",
  white: "#eef3ff",
  yellow: "#f2c14e",
  amber: "#e0a83a",
  stain: "#d9b45a",
  sweat: "#7fb6ff",
  cells: "#e8eef8",
};

export const FONT_HEAD = "Montserrat, Inter, sans-serif";
export const FONT_BODY = "Inter, Montserrat, sans-serif";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

export type V3 = [number, number, number];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Deterministic hash in [0,1). */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

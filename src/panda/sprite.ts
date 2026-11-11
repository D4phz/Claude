import { Pix, hex } from "./pixels";

const W = hex("#f3eee5");
const SHADE = hex("#cdc4ba");
const K = hex("#25212d");
const FAR = hex("#3b3646");
const PINK = hex("#f2a3b1");

/** Design scale: the sprite is drawn in design units, multiplied by S. */
const S = 1.6;
export const SPRITE_W = Math.ceil(42 * S);
export const SPRITE_H = Math.ceil(30 * S);
/** Row the feet stand on (the outline sits here). */
export const SPRITE_GROUND = SPRITE_H - 3;

/**
 * Side-view pixel panda facing right.
 * @param phase walk cycle 0..1 (ignored when `walking` is 0)
 * @param walking 0 = standing still, 1 = full stride
 * @param blink true = eyes closed
 */
export const drawPanda = (phase: number, walking: number, blink: boolean) => {
  const p = new Pix(SPRITE_W, SPRITE_H);
  // Design coordinates (ground at y=27) mapped to sprite pixels.
  const G = SPRITE_GROUND;
  const X = (x: number) => Math.round(x * S);
  const Y = (y: number) => Math.round(G - (27 - y) * S);
  const rect = (x: number, y: number, w: number, h: number, c: typeof K) =>
    p.rect(X(x), Y(y), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S)), c);
  const ell = (x: number, y: number, rx: number, ry: number, c: typeof K) =>
    p.ellipse(x * S, G - (27 - y) * S, rx * S, ry * S, c);
  const dot = (x: number, y: number, c: typeof K, size = 1) => p.rect(X(x), Y(y), size, size, c);
  const gy = 27;
  const a = phase * Math.PI * 2;
  // Body bobs down twice per stride.
  const bob = walking > 0.3 ? Math.round(0.5 - 0.5 * Math.cos(a * 2)) / S : 0;

  const leg = (x: number, offset: number, color: typeof K) => {
    const ang = a + offset;
    const dx = Math.round(1.8 * Math.cos(ang) * walking * S) / S;
    const lift = walking > 0.3 && Math.sin(ang) > 0.35 ? 1 : 0;
    rect(x + dx, gy - 9 - lift, 3, 8, color);
    rect(x + dx, gy - 2 - lift, 4, 1.2, color); // paw
  };

  // Far legs (darker), drawn behind the body.
  leg(10, Math.PI, FAR);
  leg(22, 0, FAR);

  // Body
  const by = gy - 11 + bob;
  ell(17, by, 10.5, 6.5, W);
  for (let x = X(6); x < X(29); x++) for (let y = Y(by + 3); y < Y(by + 7.5); y++) if (p.get(x, y)) p.set(x, y, SHADE);
  // Black shoulder band
  ell(22.5, by, 3.6, 6.8, K);
  // Tail
  ell(6.5, by - 3, 1.6, 1.6, K);

  // Near legs
  leg(12, 0, K);
  leg(24, Math.PI, K);

  // Head
  const hy = gy - 16 + bob;
  ell(26.5, hy - 5, 2, 2, K); // ear back
  ell(32, hy - 5.5, 2, 2, K); // ear front
  ell(30, hy, 6.2, 5.6, W);
  ell(35.5, hy + 2, 2.6, 2.1, W); // snout
  ell(32, hy - 0.5, 1.7, 2.2, K); // eye patch
  if (blink) {
    p.rect(X(31.4), Y(hy), 2, 1, W);
  } else {
    dot(32, hy - 1.2, W, 2);
  }
  ell(38.3, hy + 1.2, 0.9, 0.8, K); // nose
  dot(36.4, hy + 3.2, K); // mouth
  p.rect(X(29), Y(hy + 2), 3, 1, PINK); // cheek

  p.outline(K);
  return p;
};

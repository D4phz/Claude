import { Pix, bayer, ditherGradient, fog, hash, mix, noise1, type RGB } from "./engine";
import { P } from "./palette";

// ---------------------------------------------------------------- sky & forest

export const nightSky = (px: Pix, y0: number, y1: number, t: number, horizon: RGB = P.violet) => {
  ditherGradient(px, y0, y1, [P.ink, P.night, P.night2, horizon]);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(hash(i) * px.w);
    const y = y0 + Math.floor(hash(i + 70) * (y1 - y0) * 0.6);
    const tw = Math.sin(t * (1 + hash(i + 3) * 2) + i * 5);
    if (tw > -0.3) px.set(x, y, tw > 0.7 ? P.fogHi : P.fogDk);
  }
};

export const moon = (px: Pix, x: number, y: number, r = 12) => {
  px.glow(x, y, r * 2.4, P.goldDk, 0.5);
  px.ellipse(x, y, r, r, mix(P.gold, P.fogHi, 0.35));
  px.ellipse(x - 3, y - 2, r * 0.25, r * 0.2, P.gold);
  px.ellipse(x + 4, y + 3, r * 0.18, r * 0.18, P.gold);
  px.ellipse(x + 1, y - 6, r * 0.12, r * 0.12, P.gold);
};

/** Row of conifer silhouettes along y (deterministic per seed). */
export const treeLine = (px: Pix, y: number, c: RGB, seed: number, scale = 1, offX = 0) => {
  for (let i = -2; i < 30; i++) {
    const w = (9 + hash(i + seed) * 8) * scale;
    const h = (24 + hash(i + seed + 50) * 26) * scale;
    const x = Math.round(i * 9 * scale + hash(i + seed + 9) * 6 - offX);
    px.poly([[x - w / 2, y], [x, y - h], [x + w / 2, y]], c);
    px.rect(x - 1, y - 2, 2, 4, c);
  }
  px.rect(0, y, px.w, px.h - y, c);
};

const trunk = (px: Pix, x0: number, x1: number, light: number) => {
  for (let x = x0; x < x1; x++) {
    const edge = (x - x0) / (x1 - x0);
    const base = edge > 0.8 ? mix(P.tree2, P.fogDk, 0.3 * light) : P.tree;
    for (let y = 0; y < px.h; y++) {
      const bark = noise1(y / 5 + x * 3.1, 7) > 0.72;
      px.set(x, y, bark ? P.ink : base);
    }
  }
};

export type ForestOpts = { lift?: number; fogK?: number; purple?: number; camX?: number; behind?: (px: Pix, dy: number) => void };

/** The forest entrance: same composition every time it appears (loop anchor). */
export const forest = (px: Pix, t: number, o: ForestOpts = {}) => {
  const lift = o.lift ?? 0; // 0 = ground view, 1 = camera raised to the castle
  const dy = Math.round(lift * 230);
  const camX = o.camX ?? 0;
  nightSky(px, 0, 210 + dy, t);
  moon(px, 132 - camX * 0.05, 46 + dy * 0.2);
  if (o.behind) o.behind(px, dy);
  treeLine(px, 172 + dy * 0.6, mix(P.violet, P.night2, 0.5), 3, 0.9, camX * 0.2);
  fog(px, 170 + dy * 0.6, 10, t, P.fogDk, 0.5, 1);
  treeLine(px, 196 + dy * 0.8, P.tree2, 11, 1.1, camX * 0.4);
  fog(px, 196 + dy * 0.8, 9, t, P.fog, 0.35 * (o.fogK ?? 1), 2, 4);
  // forest floor + path
  const gy = 205 + dy;
  px.rect(0, gy, px.w, px.h - gy, P.leaf);
  for (let y = gy; y < px.h; y++) {
    const k = (y - gy) / (px.h - gy);
    const half = 5 + k * 40;
    const cx = 92 + Math.sin(k * 3.2) * 12 * (1 - k) - camX * k;
    for (let x = Math.floor(cx - half); x < cx + half; x++) {
      const edge = Math.abs(x - cx) / half;
      if (edge < 0.85 || bayer(x, y) < (1 - edge) * 5) px.set(x, y, edge < 0.4 && hash(x * 7 + y) > 0.9 ? P.fog : P.fogDk);
    }
    for (let x = 0; x < px.w; x++) if (hash(x * 13 + y * 7) > 0.97) px.set(x, y, P.leaf2);
  }
  // midground trees (fixed positions) with canopies
  for (const [mx, w, top] of [[34, 6, 120], [60, 4, 150], [128, 5, 135], [146, 7, 110], [112, 3, 165]] as const) {
    const x = Math.round(mx - camX * 0.7);
    const base = gy + 18;
    px.rect(x, top + dy * 0.9, w, base - top - dy * 0.9 + dy, P.tree2);
    px.rect(x + w - 1, top + dy * 0.9, 1, base - top, mix(P.tree2, P.fogDk, 0.4));
    for (let i = 0; i < 7; i++) px.ellipse(x + w / 2 + (hash(i + mx) - 0.5) * 26, top + dy * 0.9 - 4 + hash(i + mx + 9) * 18, 9, 6, i % 2 ? P.leaf : mix(P.leaf, P.leaf2, 0.5));
  }
  // undergrowth: ferns and tufts along the path, a few pale mushrooms
  for (let i = 0; i < 60; i++) {
    const y = gy + 10 + hash(i + 400) * 100;
    const k = (y - gy) / (px.h - gy);
    const cx = 92 + Math.sin(k * 3.2) * 12 * (1 - k) - camX * k;
    const side = i % 2 ? 1 : -1;
    const x = cx + side * (5 + k * 40 + 2 + hash(i + 401) * 18);
    const hgt = 2 + k * 6;
    for (let j = -2; j <= 2; j++) px.line(x, y, x + j * (1 + k), y - hgt + Math.abs(j), i % 3 ? P.leaf2 : mix(P.leaf2, P.fogDk, 0.4));
    if (i % 11 === 0) {
      px.rect(x + 3, y - 2, 1, 2, P.fogHi);
      px.rect(x + 2, y - 3, 3, 1, P.fog);
    }
  }
  // giant framing trunks (always on the same sides)
  trunk(px, -camX * 1.2 - 4, 20 - camX * 1.2, 1);
  trunk(px, 158 - camX * 1.2, 190 - camX * 1.2, 1);
  // roots
  px.poly([[0, gy + 70], [26, gy + 115], [0, gy + 115]], P.tree);
  px.poly([[180, gy + 60], [150, gy + 115], [180, gy + 115]], P.tree);
  // canopy overhang
  for (let x = 0; x < px.w; x++) {
    const h = 18 + noise1(x / 8, 4) * 22 + (Math.abs(x - 90) < 40 ? -10 : 0) - dy;
    for (let y = 0; y < h; y++) px.set(x, y, y > h - 3 && bayer(x, y) < 0.5 ? P.leaf2 : P.leaf);
  }
  fog(px, gy + 40, 14, t, P.fog, 0.3 * (o.fogK ?? 1), 5, 5);
  if (o.purple) fog(px, gy + 60, 30, t, P.magicDk, 0.5 * o.purple, 9, 2);
};

// ---------------------------------------------------------------- the castle

export type CastleOpts = { crack?: number; lit?: number; silhouette?: number; glow?: number; queenWindow?: boolean };

const brick = (px: Pix, x0: number, y0: number, w: number, h: number, base: RGB, crack = 0, seed = 0) => {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      let c = base;
      if ((y - y0) % 4 === 0 || (x - x0 + (Math.floor((y - y0) / 4) % 2) * 3) % 6 === 0) c = mix(base, P.ink, 0.35);
      if (x === x0) c = mix(base, P.ink, 0.2);
      if (x === x0 + w - 1) c = mix(base, P.fogHi, 0.25);
      if (crack > 0 && hash(Math.floor(x / 3) * 31 + Math.floor(y / 4) * 7 + seed) < crack * 0.35) continue;
      px.set(x, y, c);
    }
};

const roof = (px: Pix, cx: number, base: number, w: number, h: number) => {
  px.poly([[cx - w / 2 - 1, base], [cx, base - h], [cx + w / 2 + 1, base]], P.violet2);
  px.poly([[cx - w / 2 - 1, base], [cx, base - h], [cx - 1, base]], P.violet);
  px.rect(cx, base - h - 4, 1, 4, P.gold);
  px.set(cx, base - h - 5, P.goldHi);
};

const windowLit = (px: Pix, x: number, y: number, w: number, h: number, lit: number) => {
  const c = mix(P.ink, P.gold, lit);
  px.rect(x, y + 1, w, h - 1, c);
  px.rect(x + 1, y, w - 2, 1, c);
  if (lit > 0.5) px.glow(x + w / 2, y + h / 2, 6, P.goldDk, 0.25 * lit);
};

/** Floating castle. (cx, cy) = centre of the ground line on top of the rock. */
export const castle = (px: Pix, cx: number, cy: number, t: number, o: CastleOpts = {}) => {
  const crack = o.crack ?? 0;
  const lit = o.lit ?? 1;
  // magic beneath the rock: the queen's power keeps it aloft (always purple)
  if ((o.glow ?? 1) > 0) {
    px.glow(cx, cy + 50, 60, P.magicDk, 0.45 * (o.glow ?? 1));
    for (let i = 0; i < 14; i++) {
      const k = (t * 0.4 + hash(i)) % 1;
      px.set(cx - 30 + hash(i + 5) * 60, cy + 75 + k * 30, P.magic, 255 * (1 - k));
    }
  }
  // rock
  const rock: [number, number][] = [[cx - 48, cy], [cx + 48, cy], [cx + 40, cy + 14], [cx + 26, cy + 34], [cx + 14, cy + 56], [cx + 3, cy + 78], [cx - 6, cy + 60], [cx - 20, cy + 40], [cx - 36, cy + 20]];
  px.poly(rock, P.stoneDk);
  px.poly([[cx - 48, cy], [cx - 10, cy], [cx - 14, cy + 30], [cx - 6, cy + 60], [cx - 20, cy + 40], [cx - 36, cy + 20]], mix(P.stoneDk, P.ink, 0.4));
  for (let i = 0; i < 9; i++) {
    const rx = cx - 34 + i * 8;
    px.line(rx, cy + 12 + (i % 3) * 6, rx + (hash(i) - 0.5) * 6, cy + 30 + hash(i + 2) * 30, P.woodDk);
  }
  px.rect(cx - 48, cy - 1, 97, 2, P.leaf2);
  // curtain wall
  brick(px, cx - 38, cy - 22, 77, 22, P.stone, crack, 1);
  for (let x = cx - 38; x < cx + 39; x += 4) px.rect(x, cy - 25, 2, 3, P.stone);
  px.rect(cx - 6, cy - 14, 13, 14, P.ink); // gate
  px.rect(cx - 5, cy - 15, 11, 1, P.ink);
  // keep
  brick(px, cx - 17, cy - 64, 35, 42, P.stoneHi, crack, 2);
  for (let x = cx - 17; x < cx + 18; x += 4) px.rect(x, cy - 67, 2, 3, P.stoneHi);
  roof(px, cx, cy - 67, 30, 24);
  // towers
  brick(px, cx - 38, cy - 78, 14, 56, P.stone, crack, 3);
  roof(px, cx - 31, cy - 78, 16, 26);
  brick(px, cx + 24, cy - 86, 14, 64, P.stone, crack, 4);
  roof(px, cx + 31, cy - 86, 16, 30);
  // turrets
  brick(px, cx - 20, cy - 80, 6, 14, P.stone, crack, 5);
  roof(px, cx - 17, cy - 80, 6, 10);
  brick(px, cx + 15, cy - 80, 6, 14, P.stone, crack, 6);
  roof(px, cx + 18, cy - 80, 6, 10);
  // banners (crown emblem)
  for (const bx of [cx - 31, cx + 31]) {
    const wave = Math.round(Math.sin(t * 3 + bx) * 1);
    px.rect(bx - 2 + wave, cy - 66, 5, 10, P.violet2);
    px.set(bx + wave, cy - 63, P.gold);
    px.set(bx - 1 + wave, cy - 62, P.gold);
    px.set(bx + 1 + wave, cy - 62, P.gold);
  }
  // windows (fixed layout)
  const wins: [number, number, number, number][] = [
    [cx - 33, cy - 60, 3, 5],
    [cx - 33, cy - 44, 3, 5],
    [cx + 29, cy - 70, 3, 5],
    [cx + 29, cy - 52, 3, 5],
    [cx + 29, cy - 36, 3, 5],
    [cx - 11, cy - 40, 3, 5],
    [cx + 9, cy - 40, 3, 5],
  ];
  for (const [x, y, w, h] of wins) windowLit(px, x, y, w, h, lit * (0.7 + 0.3 * Math.sin(t * 2 + x)));
  // the queen's window: tall arched, centre of the keep
  windowLit(px, cx - 3, cy - 58, 7, 12, lit);
  if (o.silhouette) {
    const k = o.silhouette;
    const sx = cx;
    const sy = cy - 50;
    const c = P.ink;
    if (k > 0) {
      px.rect(sx - 1, sy - 3, 3, 3, c); // head
      px.set(sx - 1, sy - 4, c);
      px.set(sx + 1, sy - 4, c);
      px.set(sx, sy - 5, c); // crown points
      px.rect(sx - 2, sy, 5, 4, c);
    }
  }
  // cracks
  if (crack > 0) {
    for (let i = 0; i < 6; i++) {
      let x = cx - 30 + hash(i + 40) * 60;
      let y = cy - 70 + hash(i + 41) * 40;
      for (let s = 0; s < 18 * crack; s++) {
        px.set(x, y, P.ink);
        x += Math.round(hash(i * 50 + s) * 2 - 1);
        y += 1;
      }
    }
  }
};

// ---------------------------------------------------------------- throne hall

export const hall = (px: Pix, t: number, o: { shaft?: number; blood?: boolean } = {}) => {
  px.clear(P.violet);
  // back wall
  for (let y = 0; y < 150; y++) for (let x = 0; x < px.w; x++) {
    const c = (y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 5) % 10 === 0) ? P.ink : mix(P.violet, P.stoneDk, 0.5);
    px.set(x, y, c);
  }
  // gothic window
  const wx = 90;
  px.poly([[wx - 22, 112], [wx - 22, 40], [wx, 14], [wx + 22, 40], [wx + 22, 112]], P.stoneDk);
  px.poly([[wx - 18, 110], [wx - 18, 42], [wx, 20], [wx + 18, 42], [wx + 18, 110]], mix(P.night2, P.fog, 0.35));
  moon(px, wx + 6, 46, 7);
  for (const x of [wx - 6, wx + 6]) px.rect(x, 26, 2, 84, P.stoneDk);
  for (const y of [60, 85]) px.rect(wx - 18, y, 36, 2, P.stoneDk);
  // floor in perspective
  for (let y = 150; y < px.h; y++) {
    const k = (y - 150) / (px.h - 150);
    const tile = 8 + k * 26;
    for (let x = 0; x < px.w; x++) {
      const u = Math.floor((x - 90) / tile + 100);
      const v = Math.floor(Math.pow(k, 0.7) * 9);
      px.set(x, y, (u + v) % 2 ? P.stoneDk : mix(P.stoneDk, P.violet, 0.6));
    }
  }
  // carpet
  for (let y = 146; y < px.h; y++) {
    const k = (y - 146) / (px.h - 146);
    const half = 12 + k * 30;
    for (let x = Math.floor(90 - half); x < 90 + half; x++) px.set(x, y, Math.abs(x - 90) > half - 2 ? P.gold : P.violet2);
  }
  // moon shaft onto the carpet
  const sk = o.shaft ?? 1;
  for (let y = 40; y < 260; y++) for (let x = 60; x < 130; x++) {
    const c = Math.abs(x - (90 + (y - 40) * 0.12)) / (18 + (y - 40) * 0.12);
    if (c < 1 && bayer(x, y) < (1 - c) * 0.18 * sk) px.set(x, y, P.fogHi);
  }
  // dais + throne
  px.rect(62, 132, 56, 6, P.stone);
  px.rect(56, 138, 68, 8, P.stoneHi);
  px.poly([[78, 132], [78, 92], [90, 80], [102, 92], [102, 132]], P.goldDk);
  px.poly([[81, 130], [81, 95], [90, 86], [99, 95], [99, 130]], P.violet2);
  px.rect(76, 116, 28, 6, P.gold);
  // pillars
  for (const [x, w] of [[2, 18], [160, 18], [32, 10], [138, 10]] as const) {
    px.rect(x, 0, w, px.h, P.stone);
    px.rect(x, 0, 2, px.h, P.stoneDk);
    px.rect(x + w - 2, 0, 2, px.h, P.stoneHi);
    px.rect(x - 2, 8, w + 4, 4, P.stoneHi);
  }
  // banners with the crown emblem
  for (const bx of [44, 126]) {
    const wave = Math.round(Math.sin(t * 2 + bx) * 0.6);
    px.rect(bx - 6 + wave, 20, 12, 46, P.violet2);
    px.poly([[bx - 6 + wave, 66], [bx + wave, 72], [bx + 6 + wave, 66]], P.violet2);
    px.rect(bx - 4 + wave, 34, 9, 3, P.gold);
    for (const dx of [-4, 0, 4]) px.rect(bx + dx + wave, 30, 1, 4, P.gold);
    px.set(bx + wave, 35, P.magic);
  }
  // torches on the pillars
  for (const x of [11, 169]) torch(px, x, 120, t);
};

export const torch = (px: Pix, x: number, y: number, t: number, big = 1) => {
  px.rect(x - 1, y, 3, 6, P.woodDk);
  const f = Math.sin(t * 17 + x) * 0.5 + Math.sin(t * 29 + x * 2) * 0.5;
  px.glow(x, y - 3, 22 * big, P.goldDk, 0.4);
  px.ellipse(x, y - 3, 2.2, 3.5 + f, P.fire);
  px.ellipse(x, y - 2, 1.2, 2, P.fireHi);
};

// ---------------------------------------------------------------- corridor

export const corridor = (px: Pix, t: number, door = 0.3) => {
  px.clear(P.ink);
  const vx = 96;
  const vy = 130;
  for (let y = 0; y < px.h; y++)
    for (let x = 0; x < px.w; x++) {
      const dx = (x - vx) / 80;
      const dy = (y - vy) / 140;
      const wall = Math.abs(dx) > Math.abs(dy) * 0.9;
      const depth = wall ? Math.abs(dx) : Math.abs(dy);
      const u = wall ? (y - vy) / Math.abs(dx) : (x - vx) / Math.abs(dy);
      const v = 1 / Math.max(0.02, depth);
      const brickC = (Math.floor(u / 10) + Math.floor(v * 2)) % 2 ? P.stoneDk : mix(P.stoneDk, P.violet, 0.5);
      const line = Math.abs(u % 10) < 1 || Math.abs((v * 2) % 1) < 0.08;
      px.set(x, y, mix(line ? P.ink : brickC, P.ink, Math.max(0, 0.9 - depth * 1.4)));
    }
  // end door
  px.rect(vx - 10, vy - 26, 20, 34, P.woodDk);
  px.rect(vx - 10, vy - 26, Math.round(20 * door), 34, P.ink);
  px.rect(vx - 10 + Math.round(20 * door), vy - 26, 1, 34, P.woodHi);
  torch(px, 38, 120, t, 1.3);
  torch(px, 150, 118, t, 1.3);
};

// ---------------------------------------------------------------- ruins & cabin

export const CABIN = { x: 104, y: 236 };

export const cabin = (px: Pix, x: number, y: number, t: number, o: { glow?: number; purple?: number; door?: boolean } = {}) => {
  // y = ground line, x = left edge
  px.rect(x, y - 22, 40, 22, P.wood);
  for (let i = 0; i < 22; i += 4) px.rect(x, y - 22 + i, 40, 1, P.woodDk);
  px.rect(x + 39, y - 22, 1, 22, P.woodHi);
  px.poly([[x - 5, y - 21], [x + 20, y - 42], [x + 45, y - 21]], hex2("#4a3a2e"));
  for (let i = 0; i < 8; i++) px.line(x - 3 + i * 6, y - 22, x + 20, y - 41, hex2("#3a2c22"));
  px.rect(x + 30, y - 44, 5, 12, P.stoneDk); // chimney
  // smoke
  for (let i = 0; i < 6; i++) {
    const k = (t * 0.35 + i / 6) % 1;
    px.ellipse(x + 32 + Math.sin(k * 6 + i) * 3 + k * 6, y - 48 - k * 40, 2 + k * 4, 1.5 + k * 3, P.fogDk, 160 * (1 - k));
  }
  // window: warm, or purple when her magic is active
  const pk = o.purple ?? 0;
  const wc = mix(mix(P.ink, P.fire, o.glow ?? 0.8), P.magic, pk);
  px.rect(x + 25, y - 16, 8, 7, wc);
  px.rect(x + 28, y - 16, 1, 7, P.woodDk);
  px.rect(x + 25, y - 13, 8, 1, P.woodDk);
  px.glow(x + 29, y - 12, 12, mix(P.goldDk, P.magicDk, pk), 0.35);
  // door
  px.rect(x + 7, y - 15, 9, 15, o.door ? P.ink : P.woodDk);
  px.set(x + 14, y - 8, P.gold);
};
const hex2 = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Clearing after the fall: rubble of the same castle, cabin always at CABIN. */
export const ruins = (px: Pix, t: number, o: { smoke?: number; purple?: number; castleBack?: number } = {}) => {
  nightSky(px, 0, 220, t);
  moon(px, 132, 46);
  if (o.castleBack) castle(px, 90, 120, t, { glow: o.castleBack });
  treeLine(px, 186, mix(P.violet, P.night2, 0.5), 3, 0.9);
  fog(px, 184, 9, t, P.fogDk, 0.5, 1);
  treeLine(px, 206, P.tree2, 11, 1.1);
  px.rect(0, 206, px.w, px.h - 206, P.leaf);
  for (let y = 206; y < px.h; y++) for (let x = 0; x < px.w; x++) if (hash(x * 13 + y * 7) > 0.96) px.set(x, y, P.leaf2);
  // rubble (castle stone & violet roof pieces)
  const blocks = 46;
  for (let i = 0; i < blocks; i++) {
    const bx = 8 + hash(i + 300) * 160;
    const by = 214 + hash(i + 301) * 60;
    if (Math.abs(bx - (CABIN.x + 20)) < 28 && by > 214 && by < 240) continue;
    const w = 4 + Math.floor(hash(i + 302) * 8);
    const h = 3 + Math.floor(hash(i + 303) * 5);
    px.rect(bx, by, w, h, i % 7 === 0 ? P.violet2 : i % 2 ? P.stone : P.stoneDk);
    px.rect(bx, by, w, 1, P.stoneHi);
  }
  // broken left tower stub (same width & brick as the intact one)
  for (let y = 0; y < 34; y++) for (let x = 0; x < 14; x++) {
    const top = 34 - 26 + Math.round(noise1(x / 2, 3) * 10);
    if (y < top) continue;
    px.set(22 + x, 196 + y, (y % 4 === 0 || x % 6 === 0) ? P.stoneDk : P.stone);
  }
  // fallen spire (violet cone on its side)
  px.poly([[34, 268], [70, 258], [34, 250]], P.violet2);
  px.rect(70, 257, 4, 1, P.gold);
  cabin(px, CABIN.x, CABIN.y, t, { purple: o.purple ?? 0 });
  if (o.smoke) fog(px, 230, 22, t, P.fogDk, 0.6 * o.smoke, 12, 6);
  fog(px, 270, 16, t, P.fog, 0.3, 5, 4);
  if (o.purple) fog(px, 250, 40, t, P.magicDk, 0.4 * o.purple, 9, 2);
};

// ---------------------------------------------------------------- cabin interior

export const cabinInside = (px: Pix, t: number, o: { purple?: number } = {}) => {
  // plank walls
  for (let y = 0; y < 220; y++) for (let x = 0; x < px.w; x++) {
    const plank = Math.floor(x / 12);
    let c = plank % 2 ? P.wood : mix(P.wood, P.woodDk, 0.4);
    if (x % 12 === 0) c = P.woodDk;
    if (hash(plank * 7 + Math.floor(y / 30)) > 0.8 && y % 30 === 15) c = P.woodDk;
    px.set(x, y, c);
  }
  // floor
  for (let y = 220; y < px.h; y++) for (let x = 0; x < px.w; x++) px.set(x, y, (y - 220) % 9 === 0 ? P.woodDk : mix(P.woodDk, P.wood, 0.4));
  // window (right) with purple world beyond when active
  const pk = o.purple ?? 0;
  px.rect(122, 54, 40, 44, P.woodDk);
  px.rect(125, 57, 34, 38, mix(P.night2, P.magicDk, pk));
  moon(px, 148, 70, 5);
  px.rect(141, 57, 2, 38, P.woodDk);
  px.rect(125, 74, 34, 2, P.woodDk);
  // hearth (left)
  px.rect(8, 120, 54, 100, P.stoneDk);
  brickFill(px, 8, 120, 54, 100);
  px.rect(18, 160, 34, 60, P.ink);
  const f = Math.sin(t * 13) * 2;
  px.glow(35, 200, 46, P.ember, 0.5);
  px.ellipse(35, 208, 10, 10 + f, P.ember);
  px.ellipse(35, 210, 7, 7 + f, P.fire);
  px.ellipse(35, 212, 3, 4, P.fireHi);
  // table + jars
  px.rect(92, 196, 56, 5, P.woodHi);
  px.rect(96, 201, 4, 26, P.woodDk);
  px.rect(140, 201, 4, 26, P.woodDk);
  for (let i = 0; i < 4; i++) {
    const jx = 100 + i * 11;
    px.rect(jx, 186, 6, 10, i % 2 ? P.fogDk : P.violet2);
    px.rect(jx + 1, 184, 4, 2, P.woodDk);
    if (pk > 0 && i % 2 === 0) px.set(jx + 2, 190, P.magic);
  }
  // shelf
  px.rect(70, 110, 44, 3, P.woodHi);
  for (let i = 0; i < 5; i++) px.rect(72 + i * 8, 102, 5, 8, i % 2 ? P.goldDk : P.stone);
};
const brickFill = (px: Pix, x0: number, y0: number, w: number, h: number) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if ((y - y0) % 6 === 0 || (x - x0 + (Math.floor((y - y0) / 6) % 2) * 4) % 8 === 0) px.set(x, y, P.ink);
};

// ---------------------------------------------------------------- kingdom map

export const kingdomMap = (px: Pix, t: number, k: number) => {
  px.clear(P.night);
  for (let i = 0; i < 260; i++) {
    const x = hash(i) * 190 - 5;
    const y = hash(i + 900) * 330 - 5;
    if (Math.hypot(x - 90, y - 165) < 38) continue;
    px.ellipse(x, y, 6, 5, i % 3 ? P.leaf : P.leaf2);
    px.set(x - 2, y - 2, mix(P.leaf2, P.fogDk, 0.4));
  }
  px.ellipse(90, 165, 36, 30, mix(P.leaf, P.fogDk, 0.3));
  // castle (top view): towers + keep
  px.rect(76, 140, 28, 22, P.stone);
  px.rect(84, 146, 12, 10, P.violet2);
  px.ellipse(74, 140, 5, 5, P.violet2);
  px.ellipse(106, 140, 5, 5, P.violet2);
  px.ellipse(74, 162, 5, 5, P.violet2);
  px.ellipse(106, 162, 5, 5, P.violet2);
  // cabin
  px.rect(100, 182, 8, 6, P.wood);
  // purple veins spreading from the cabin
  for (let v = 0; v < 18; v++) {
    let x = 104;
    let y = 185;
    const a0 = (v / 18) * Math.PI * 2;
    const len = 150 * k;
    for (let s = 0; s < len; s++) {
      const a = a0 + Math.sin(s * 0.08 + v) * 0.6;
      x += Math.cos(a);
      y += Math.sin(a);
      px.set(x, y, s > len - 6 ? P.magicHi : P.magic);
      if (s % 3 === 0) px.set(x + 1, y, P.magicDk);
    }
  }
  px.glow(104, 185, 30 + 40 * k, P.magicDk, 0.5);
};

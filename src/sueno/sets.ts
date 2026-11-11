// Locations of the dream at 270x480. Each set is a fixed function so its
// architecture, layout and props never change between appearances.
import { Pix, bayer, ditherGradient, fog, hash, hex, mix, noise1, type RGB } from "../castillo/engine";
import { blitScaled, magicAura } from "../castillo/fx";
import { P } from "../castillo/palette";
import { castle as castleArt, moon, nightSky, torch, treeLine } from "../castillo/places";

export const W = 270;
export const GROUND = 400; // default ground line for exteriors

// ---------------------------------------------------------------- helpers
export const stoneWall = (px: Pix, x0: number, y0: number, w: number, h: number, base: RGB, bw = 12, bh = 6) => {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor((y - y0) / bh);
      const off = (row % 2) * (bw / 2);
      const edgeY = (y - y0) % bh === 0;
      const edgeX = (x - x0 + off) % bw === 0;
      const v = hash(Math.floor((x - x0 + off) / bw) * 17 + row * 31);
      let c = mix(base, v > 0.5 ? P.fogDk : P.ink, 0.12 + v * 0.1);
      if (edgeY || edgeX) c = mix(base, P.ink, 0.45);
      else if ((y - y0) % bh === 1) c = mix(c, P.fogHi, 0.08);
      px.set(x, y, c);
    }
};
const planks = (px: Pix, x0: number, y0: number, w: number, h: number, base: RGB, pw = 14) => {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const k = Math.floor((x - x0) / pw);
      let c = k % 2 ? base : mix(base, P.woodDk, 0.3);
      if ((x - x0) % pw === 0) c = P.woodDk;
      if (hash(k * 7 + Math.floor(y / 40)) > 0.85 && y % 40 === 20 && (x - x0) % pw > 4 && (x - x0) % pw < 8) c = P.woodDk; // knots
      px.set(x, y, c);
    }
};
export const floorTiles = (px: Pix, y0: number, y1: number, a: RGB, b: RGB, vx = W / 2) => {
  for (let y = y0; y < y1; y++) {
    const k = (y - y0) / (y1 - y0);
    const tile = 14 + k * 40;
    const v = Math.floor(Math.pow(k, 0.65) * 10);
    for (let x = 0; x < W; x++) {
      const u = Math.floor((x - vx) / tile + 100);
      px.set(x, y, (u + v) % 2 ? a : b);
    }
  }
};
export const candle = (px: Pix, x: number, y: number, t: number) => {
  px.rect(x, y, 2, 5, P.fogHi);
  const fl = Math.sin(t * 19 + x) > 0 ? 1 : 0;
  px.glow(x + 1, y - 2, 10, P.goldDk, 0.4);
  px.rect(x, y - 3 - fl, 2, 3 + fl, P.fire);
  px.set(x, y - 2, P.fireHi);
};
const banner = (px: Pix, x: number, y: number, h: number, t: number) => {
  const w = Math.round(Math.sin(t * 2 + x) * 0.7);
  px.rect(x - 7 + w, y, 14, h, P.violet2);
  px.rect(x - 7 + w, y, 2, h, P.violet);
  px.poly([[x - 7 + w, y + h], [x + w, y + h + 7], [x + 7 + w, y + h]], P.violet2);
  // crown emblem
  px.rect(x - 4 + w, y + 14, 9, 3, P.gold);
  for (const dx of [-4, 0, 4]) px.rect(x + dx + w, y + 10, 1, 4, P.goldHi);
  px.set(x + w, y + 15, P.magic);
};
const archWindow = (px: Pix, x: number, y: number, w: number, h: number, inner: RGB, t: number, moonOn = true) => {
  px.poly([[x - 3, y + h + 3], [x - 3, y + w / 2], [x + w / 2, y - 4], [x + w + 3, y + w / 2], [x + w + 3, y + h + 3]], P.stoneDk);
  px.poly([[x, y + h], [x, y + w / 2], [x + w / 2, y], [x + w, y + w / 2], [x + w, y + h]], inner);
  if (moonOn) moon(px, x + w * 0.65, y + w * 0.6, Math.max(3, w * 0.16));
  px.rect(x + w / 2, y + 2, 2, h - 2, P.stoneDk);
  px.rect(x, y + h * 0.55, w, 2, P.stoneDk);
};

// ---------------------------------------------------------------- castle (fixed design)
/** Draw the castle with its rock; lift raises it (0 = rooted in the ground). */
export const castle = (px: Pix, cx: number, groundY: number, t: number, o: { lift?: number; scale?: 1 | 2; crack?: number; lit?: number; purple?: number; silhouette?: number; glow?: number } = {}) => {
  const sc = o.scale ?? 1;
  const off = new Pix(110, 200);
  castleArt(off, 55, 105, t, { crack: o.crack, lit: o.lit, glow: o.glow ?? (o.lift ? 1 : 0), silhouette: o.silhouette });
  if (o.purple) {
    off.filter = null;
    for (let i = 0; i < off.w * off.h; i++)
      if (off.data[i * 4 + 3]) {
        const c: RGB = [off.data[i * 4], off.data[i * 4 + 1], off.data[i * 4 + 2]];
        const m = mix(c, P.magic, o.purple * 0.35);
        off.data[i * 4] = m[0];
        off.data[i * 4 + 1] = m[1];
        off.data[i * 4 + 2] = m[2];
      }
  }
  // castle ground line inside "off" is y=105; the rock hangs below it
  const lift = o.lift ?? 0;
  const top = groundY - 105 * sc - lift;
  blitScaled(px, off, cx - 55 * sc, top, sc);
  if (o.purple) magicAura(px, cx, groundY - lift - 40 * sc, 70 * sc, t, o.purple);
};

// ---------------------------------------------------------------- exteriors
export const forestPath = (px: Pix, t: number, o: { purple?: number; castleFar?: boolean; shafts?: number } = {}) => {
  nightSky(px, 0, 300, t);
  moon(px, 196, 60, 15);
  if (o.castleFar) castle(px, 200, 238, t, { glow: 0 });
  treeLine(px, 250, mix(P.violet, P.night2, 0.45), 3, 1.25);
  fog(px, 248, 12, t, P.fogDk, 0.5, 1);
  treeLine(px, 282, P.tree2, 11, 1.45);
  fog(px, 282, 12, t, P.fog, 0.32, 2, 4);
  const gy = 290;
  px.rect(0, gy, W, 480 - gy, P.leaf);
  // path
  for (let y = gy; y < 480; y++) {
    const k = (y - gy) / (480 - gy);
    const half = 6 + k * 62;
    const cx = 138 + Math.sin(k * 3.4) * 18 * (1 - k);
    for (let x = Math.floor(cx - half); x < cx + half; x++) {
      const e = Math.abs(x - cx) / half;
      if (e < 0.82 || bayer(x, y) < (1 - e) * 5) px.set(x, y, hash(x * 7 + y * 13) > 0.93 ? P.fog : e < 0.5 ? mix(P.fogDk, P.leaf, 0.25) : mix(P.fogDk, P.leaf, 0.5));
    }
    for (let x = 0; x < W; x++) if (hash(x * 13 + y * 7) > 0.965) px.set(x, y, P.leaf2);
  }
  // midground trees
  for (const [mx, w, top] of [[46, 8, 150], [84, 5, 196], [196, 7, 172], [222, 9, 140], [168, 4, 214]] as const) {
    px.rect(mx, top, w, gy + 20 - top, P.tree2);
    px.rect(mx + w - 2, top, 2, gy + 20 - top, mix(P.tree2, P.fogDk, 0.45));
    for (let i = 0; i < 9; i++) px.ellipse(mx + w / 2 + (hash(i + mx) - 0.5) * 40, top - 4 + hash(i + mx + 9) * 26, 13, 8, i % 2 ? P.leaf : mix(P.leaf, P.leaf2, 0.5));
  }
  // undergrowth
  for (let i = 0; i < 90; i++) {
    const y = gy + 12 + hash(i + 400) * 170;
    const k = (y - gy) / (480 - gy);
    const cx = 138 + Math.sin(k * 3.4) * 18 * (1 - k);
    const x = cx + (i % 2 ? 1 : -1) * (8 + k * 62 + hash(i + 401) * 30);
    const hgt = 3 + k * 9;
    for (let j = -2; j <= 2; j++) px.line(x, y, x + j * (1.5 + k * 2), y - hgt + Math.abs(j) * 1.5, i % 3 ? P.leaf2 : mix(P.leaf2, P.fogDk, 0.35));
    if (i % 13 === 0) {
      px.rect(x + 4, y - 3, 1, 3, P.fogHi);
      px.rect(x + 2, y - 4, 5, 2, i % 2 ? P.fog : hex("#9a6a6a"));
    }
  }
  // giant framing trunks + roots
  for (const [x0, x1] of [[-6, 30], [236, 280]] as const) {
    for (let x = x0; x < x1; x++)
      for (let y = 0; y < 480; y++) {
        const edge = (x - x0) / (x1 - x0);
        const bark = noise1(y / 6 + x * 2.7, 7) > 0.7;
        px.set(x, y, bark ? P.ink : edge > 0.78 && x0 < 100 ? mix(P.tree2, P.fogDk, 0.35) : P.tree);
      }
  }
  px.poly([[0, 400], [44, 480], [0, 480]], P.tree);
  px.poly([[270, 390], [222, 480], [270, 480]], P.tree);
  // canopy
  for (let x = 0; x < W; x++) {
    const h = 30 + noise1(x / 10, 4) * 34 - (Math.abs(x - 140) < 60 ? 18 : 0);
    for (let y = 0; y < h; y++) px.set(x, y, y > h - 4 && bayer(x, y) < 0.5 ? P.leaf2 : P.leaf);
  }
  // moon shafts
  const sk = o.shafts ?? 1;
  for (let y = 40; y < 420; y++)
    for (let x = 60; x < 250; x++) {
      const c = Math.abs(x - (190 - (y - 40) * 0.25)) / 22;
      const c2 = Math.abs(x - (130 - (y - 40) * 0.25)) / 12;
      if (c < 1) px.set(x, y, P.fogHi, (1 - c) * 26 * sk);
      if (c2 < 1) px.set(x, y, P.fogHi, (1 - c2) * 18 * sk);
    }
  fog(px, 340, 18, t, P.fog, 0.28, 5, 5);
  if (o.purple) fog(px, 360, 50, t, P.magicDk, 0.5 * o.purple, 9, 2);
};

const house = (px: Pix, x: number, y: number, w: number, h: number, t: number, lit = 1) => {
  px.rect(x, y - h, w, h, hex("#6a5a4a"));
  for (let i = 0; i < w; i += 6) px.rect(x + i, y - h, 1, h, P.woodDk);
  px.rect(x, y - h, w, 2, P.woodDk);
  px.poly([[x - 3, y - h], [x + w / 2, y - h - w * 0.5], [x + w + 3, y - h]], hex("#4a3a44"));
  px.rect(x + w / 2 - 2, y - h + 4, 4, 4, mix(P.ink, P.fire, lit * (0.7 + 0.3 * Math.sin(t * 3 + x))));
  px.rect(x + 2, y - 7, 4, 7, P.woodDk);
};

/** The clearing: castle, village houses, stone road. */
export const castleClearing = (px: Pix, t: number, o: { lift?: number; crack?: number; purple?: number; scale?: 1 | 2; cx?: number; houses?: boolean; rubble?: number; lit?: number } = {}) => {
  nightSky(px, 0, 420, t, o.purple ? mix(P.violet, P.magicDk, o.purple * 0.6) : P.violet);
  moon(px, 220, 56, 14);
  treeLine(px, 330, mix(P.violet, P.night2, 0.45), 3, 1.25);
  fog(px, 328, 12, t, P.fogDk, 0.5, 1);
  const lift = o.lift ?? 0;
  if (!o.rubble) castle(px, o.cx ?? 135, 352, t, { lift, crack: o.crack, purple: o.purple, scale: o.scale, lit: o.lit });
  px.rect(0, 352, W, 128, P.leaf);
  if (lift > 0) {
    // torn earth where the castle stood
    px.ellipse(o.cx ?? 135, 356, 50 * (o.scale ?? 1), 6, P.ink);
    px.ellipse(o.cx ?? 135, 355, 46 * (o.scale ?? 1), 4, mix(P.woodDk, P.ink, 0.4));
  }
  for (let y = 352; y < 480; y++) for (let x = 0; x < W; x++) if (hash(x * 11 + y * 5) > 0.96) px.set(x, y, P.leaf2);
  // road
  for (let y = 356; y < 480; y++) {
    const k = (y - 356) / 124;
    const half = 10 + k * 50;
    for (let x = Math.floor(135 - half); x < 135 + half; x++) px.set(x, y, (Math.floor(x / 6) + Math.floor(y / 4)) % 2 ? P.stoneDk : mix(P.stoneDk, P.stone, 0.4));
  }
  if (o.houses !== false) {
    house(px, 14, 372, 26, 18, t);
    house(px, 50, 362, 20, 14, t);
    house(px, 206, 366, 22, 16, t);
    house(px, 236, 378, 28, 20, t);
  }
  if (o.rubble) rubble(px, t, o.rubble);
};

/** Rubble of the same castle (stone & violet roof pieces) across the field. */
export const rubble = (px: Pix, t: number, k = 1) => {
  for (let i = 0; i < 70 * k; i++) {
    const x = 6 + hash(i + 300) * 258;
    const y = 340 + hash(i + 301) * 110;
    if (Math.abs(x - CABIN_X - 30) < 40 && y < 400) continue;
    const w = 5 + Math.floor(hash(i + 302) * 12);
    const h = 4 + Math.floor(hash(i + 303) * 7);
    px.rect(x, y, w, h, i % 7 === 0 ? P.violet2 : i % 2 ? P.stone : P.stoneDk);
    px.rect(x, y, w, 1, P.stoneHi);
    px.rect(x, y + h - 1, w, 1, P.ink);
  }
  // broken tower stub + fallen spire (same tower design)
  for (let y = 0; y < 50; y++)
    for (let x = 0; x < 20; x++) {
      const top = 14 + Math.round(noise1(x / 2, 3) * 16);
      if (y < top) continue;
      px.set(26 + x, 300 + y, y % 6 === 0 || x % 8 === 0 ? P.stoneDk : P.stone);
    }
  px.poly([[60, 420], [112, 404], [60, 392]], P.violet2);
  px.poly([[60, 420], [112, 404], [60, 410]], P.violet);
  px.rect(112, 403, 6, 1, P.gold);
};

export const CABIN_X = 150;
export const CABIN_Y = 372;
export const cabin = (px: Pix, t: number, o: { purple?: number; door?: number; lift?: number } = {}) => {
  const x = CABIN_X;
  const y = CABIN_Y - (o.lift ?? 0);
  planks(px, x, y - 34, 60, 34, P.wood, 10);
  px.rect(x + 59, y - 34, 1, 34, P.woodHi);
  px.poly([[x - 7, y - 33], [x + 30, y - 62], [x + 67, y - 33]], hex("#4a3a2e"));
  for (let i = 0; i < 11; i++) px.line(x - 5 + i * 7, y - 34, x + 30, y - 61, hex("#3a2c22"));
  px.rect(x + 44, y - 66, 7, 18, P.stoneDk);
  for (let i = 0; i < 7; i++) {
    const k = (t * 0.35 + i / 7) % 1;
    px.ellipse(x + 47 + Math.sin(k * 6 + i) * 4 + k * 8, y - 72 - k * 60, 3 + k * 6, 2 + k * 4, P.fogDk, 150 * (1 - k));
  }
  const pk = o.purple ?? 0;
  const wc = mix(mix(P.ink, P.fire, 0.85), P.magic, pk);
  px.rect(x + 38, y - 26, 12, 10, wc);
  px.rect(x + 43, y - 26, 2, 10, P.woodDk);
  px.rect(x + 38, y - 22, 12, 2, P.woodDk);
  px.glow(x + 44, y - 21, 18, mix(P.goldDk, P.magicDk, pk), 0.35);
  const door = o.door ?? 0;
  px.rect(x + 10, y - 24, 14, 24, P.ink);
  px.rect(x + 10 + Math.round(door * 10), y - 24, Math.round(14 - door * 10), 24, P.woodDk);
  if (door > 0) px.glow(x + 16, y - 12, 14, pk ? P.magicDk : P.goldDk, 0.4);
  px.set(x + 21, y - 12, P.gold);
  if (pk) magicAura(px, x + 30, y - 30, 60, t, pk);
};

export const rubbleField = (px: Pix, t: number, o: { purple?: number; door?: number; castle?: boolean; cabinLift?: number; castleLift?: number } = {}) => {
  nightSky(px, 0, 360, t, o.purple ? mix(P.violet, P.magicDk, o.purple * 0.6) : P.violet);
  moon(px, 220, 56, 14);
  if (o.castle) castle(px, 100, 300, t, { lift: o.castleLift ?? 0, purple: o.purple });
  treeLine(px, 320, mix(P.violet, P.night2, 0.45), 3, 1.25);
  fog(px, 318, 12, t, P.fogDk, 0.5, 1);
  treeLine(px, 342, P.tree2, 11, 1.45);
  px.rect(0, 340, W, 140, P.leaf);
  for (let y = 340; y < 480; y++) for (let x = 0; x < W; x++) if (hash(x * 11 + y * 5) > 0.96) px.set(x, y, P.leaf2);
  if (!o.castle) rubble(px, t);
  cabin(px, t, { purple: o.purple, door: o.door, lift: o.cabinLift });
  fog(px, 420, 20, t, P.fog, 0.28, 5, 4);
  if (o.purple) fog(px, 390, 50, t, P.magicDk, 0.45 * o.purple, 9, 2);
};

export const skyClouds = (px: Pix, t: number, purple = 0) => {
  ditherGradient(px, 0, 480, [P.ink, P.night, P.night2, mix(P.violet, P.magicDk, purple), mix(P.night2, P.fogDk, 0.3)]);
  moon(px, 210, 60, 16);
  for (let l = 0; l < 3; l++)
    for (let x = 0; x < W; x++) {
      const y0 = 300 + l * 50 + noise1((x + t * (6 + l * 4)) / (30 - l * 6), l + 2) * 30;
      for (let y = Math.floor(y0); y < 480; y++) if (bayer(x, y) < 0.6 + l * 0.2) px.set(x, y, mix(P.fogDk, P.fog, l * 0.35));
    }
};

// ---------------------------------------------------------------- interiors
export const throneHall = (px: Pix, t: number, o: { night?: number; purple?: number } = {}) => {
  stoneWall(px, 0, 0, W, 250, mix(P.violet, P.stoneDk, 0.55));
  archWindow(px, 105, 30, 60, 120, mix(P.night2, P.fog, 0.3), t);
  floorTiles(px, 250, 480, P.stoneDk, mix(P.stoneDk, P.violet, 0.6));
  // carpet
  for (let y = 244; y < 480; y++) {
    const k = (y - 244) / 236;
    const half = 18 + k * 46;
    for (let x = Math.floor(135 - half); x < 135 + half; x++) px.set(x, y, Math.abs(x - 135) > half - 3 ? P.gold : P.violet2);
  }
  // dais + throne
  px.rect(90, 220, 90, 10, P.stone);
  px.rect(80, 230, 110, 14, P.stoneHi);
  px.poly([[114, 222], [114, 158], [135, 140], [156, 158], [156, 222]], P.goldDk);
  px.poly([[118, 220], [118, 162], [135, 147], [152, 162], [152, 220]], P.violet2);
  px.rect(110, 196, 50, 8, P.gold);
  // pillars
  for (const [x, w] of [[4, 26], [240, 26], [52, 14], [204, 14]] as const) {
    stoneWall(px, x, 0, w, 480, P.stone, 7, 8);
    px.rect(x - 3, 14, w + 6, 6, P.stoneHi);
    px.rect(x + w - 2, 0, 2, 480, P.stoneHi);
  }
  banner(px, 78, 30, 70, t);
  banner(px, 192, 30, 70, t);
  for (const x of [17, 253]) torch(px, x, 190, t, 1.4);
  // night: darker, moonlight only
  if (o.night) px.rect(0, 0, W, 480, P.ink, o.night * 150);
  if (o.purple) fog(px, 300, 120, t, P.magicDk, 0.4 * o.purple, 9, 2);
};

export const banquet = (px: Pix, t: number) => {
  stoneWall(px, 0, 0, W, 230, mix(P.violet, P.stoneDk, 0.5));
  banner(px, 60, 20, 80, t);
  banner(px, 210, 20, 80, t);
  archWindow(px, 115, 26, 40, 90, mix(P.night2, P.fog, 0.3), t);
  floorTiles(px, 230, 480, P.woodDk, mix(P.woodDk, P.wood, 0.4));
  // long table in perspective
  px.poly([[100, 240], [170, 240], [250, 440], [20, 440]], P.woodHi);
  px.poly([[100, 240], [170, 240], [250, 440], [20, 440]].map(([x, y]) => [x, y + 0]) as [number, number][], P.woodHi);
  px.poly([[106, 242], [164, 242], [236, 430], [34, 430]], hex("#d8cfc0")); // tablecloth
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    const y = 254 + k * 160;
    const half = 30 + k * 90;
    for (const sd of [-1, 1]) {
      const x = 135 + sd * (half - 14 - k * 10);
      px.ellipse(x, y, 4 + k * 4, 2 + k * 2, P.fogHi); // plate
      px.rect(x + sd * (6 + k * 6), y - 6 - k * 4, 3 + k * 2, 5 + k * 4, P.white); // goblet of milk
      px.rect(x + sd * (6 + k * 6), y - 6 - k * 4, 3 + k * 2, 1, P.fogHi);
    }
    if (i % 2 === 0) candle(px, 134, y - 10 - k * 6, t);
    px.ellipse(135 + (i % 3 - 1) * 10, y + 4, 6 + k * 6, 3 + k * 2, i % 2 ? P.ember : P.goldDk); // food
  }
};

/** The bedroom. variant 'castle' = stone walls, 'cabin' = wooden walls. Same furniture & layout. */
export const bedroom = (px: Pix, t: number, variant: "castle" | "cabin" = "castle", o: { purple?: number } = {}) => {
  if (variant === "castle") stoneWall(px, 0, 0, W, 300, mix(P.violet, P.stoneDk, 0.45));
  else planks(px, 0, 0, W, 300, P.wood, 16);
  floorTiles(px, 300, 480, P.woodDk, mix(P.woodDk, P.wood, 0.35));
  // rug with gold pattern (same in both rooms)
  px.poly([[60, 360], [210, 360], [250, 470], [20, 470]], P.violet2);
  px.poly([[70, 368], [200, 368], [234, 462], [36, 462]], mix(P.violet2, P.violet, 0.5));
  for (let i = 0; i < 8; i++) px.ellipse(70 + i * 19 + (i % 2) * 3, 415, 3, 2, P.gold);
  // arched window, right
  archWindow(px, 186, 70, 50, 100, mix(P.night2, P.fog, 0.25), t);
  // canopy bed, left
  px.rect(20, 200, 6, 140, P.woodDk);
  px.rect(140, 200, 6, 140, P.woodDk);
  px.rect(16, 194, 134, 10, P.violet2);
  for (let x = 18; x < 148; x += 8) px.poly([[x, 204], [x + 8, 204], [x + 4, 214]], P.violet2);
  px.rect(26, 290, 114, 34, P.white);
  px.rect(26, 300, 114, 30, P.violet2);
  px.rect(26, 300, 114, 3, P.gold);
  px.ellipse(52, 290, 18, 7, P.fogHi);
  px.rect(20, 324, 126, 12, P.woodDk);
  // wardrobe + candle table
  px.rect(160, 210, 22, 130, P.woodDk);
  px.rect(162, 214, 8, 122, P.wood);
  px.rect(172, 214, 8, 122, P.wood);
  px.set(169, 270, P.gold);
  px.set(173, 270, P.gold);
  px.rect(200, 300, 30, 4, P.woodHi);
  px.rect(212, 304, 6, 36, P.woodDk);
  candle(px, 214, 292, t);
  // portrait of the queen above the bed (same frame in both rooms)
  px.rect(58, 110, 46, 56, P.gold);
  px.rect(62, 114, 38, 48, P.violet);
  px.ellipse(81, 134, 8, 10, hex("#efdccc"));
  px.rect(73, 122, 17, 3, P.gold);
  px.poly([[72, 162], [81, 146], [90, 162]], P.violet2);
  if (o.purple) fog(px, 240, 160, t, P.magicDk, 0.35 * o.purple, 9, 2);
};

export const corridor = (px: Pix, t: number, door = 0.2) => {
  stoneWall(px, 0, 0, W, 480, mix(P.violet, P.stoneDk, 0.6));
  // perspective walls
  for (let y = 0; y < 480; y++) {
    const k = Math.abs(y - 230) / 250;
    const inset = 40 + (1 - k) * 60;
    for (let x = 0; x < inset; x++) if (bayer(x, y) < 0.6) px.set(x, y, mix(P.ink, P.violet, 0.2));
    for (let x = W - inset; x < W; x++) if (bayer(x, y) < 0.6) px.set(x, y, mix(P.ink, P.violet, 0.2));
  }
  floorTiles(px, 300, 480, P.stoneDk, mix(P.stoneDk, P.ink, 0.4));
  px.rect(112, 170, 46, 130, P.woodDk);
  px.rect(112, 170, Math.round(46 * door), 130, P.ink);
  if (door > 0) px.glow(124, 236, 30, P.goldDk, 0.25);
  torch(px, 70, 200, t, 1.6);
  torch(px, 200, 200, t, 1.6);
  banner(px, 40, 60, 60, t);
  banner(px, 230, 60, 60, t);
};

export const courtyard = (px: Pix, t: number, o: { sky?: number; purple?: number } = {}) => {
  if (o.sky) skyClouds(px, t, o.purple ?? 0);
  else nightSky(px, 0, 300, t);
  // walls & towers of the inner court
  stoneWall(px, 0, 150, W, 170, P.stone);
  for (let x = 0; x < W; x += 10) px.rect(x, 142, 6, 8, P.stone);
  for (const tx of [0, 230]) {
    stoneWall(px, tx, 60, 40, 260, P.stoneHi, 10, 6);
    px.poly([[tx - 4, 60], [tx + 20, 10], [tx + 44, 60]], P.violet2);
  }
  banner(px, 90, 160, 60, t);
  banner(px, 180, 160, 60, t);
  px.rect(118, 230, 34, 90, P.ink); // keep gate
  floorTiles(px, 320, 480, P.stoneDk, mix(P.stoneDk, P.stone, 0.4));
  for (const x of [60, 210]) torch(px, x, 250, t, 1.3);
  if (o.purple) fog(px, 360, 80, t, P.magicDk, 0.4 * o.purple, 9, 2);
};

export const cabinKitchen = (px: Pix, t: number, o: { purple?: number } = {}) => {
  planks(px, 0, 0, W, 330, P.wood, 16);
  for (let y = 330; y < 480; y++) for (let x = 0; x < W; x++) px.set(x, y, (y - 330) % 12 === 0 ? P.woodDk : mix(P.woodDk, P.wood, 0.4));
  // hearth
  stoneWall(px, 10, 160, 80, 170, P.stoneDk, 10, 7);
  px.rect(24, 230, 52, 100, P.ink);
  const f = Math.sin(t * 13) * 3;
  px.glow(50, 300, 80, P.ember, 0.5);
  px.ellipse(50, 312, 16, 14 + f, P.ember);
  px.ellipse(50, 316, 10, 10 + f, P.fire);
  px.ellipse(50, 320, 5, 6, P.fireHi);
  px.rect(30, 270, 40, 2, P.steelDk); // cauldron bar
  px.ellipse(50, 284, 12, 9, P.stoneDk);
  // window with the rubble outside (right)
  px.rect(180, 80, 64, 70, P.woodDk);
  px.rect(184, 84, 56, 62, mix(P.night2, P.magicDk, o.purple ?? 0));
  moon(px, 222, 104, 6);
  for (let i = 0; i < 9; i++) px.rect(186 + i * 6, 136 - (i % 3) * 3, 5, 4 + (i % 3) * 3, i % 4 === 0 ? P.violet2 : P.stoneDk);
  px.rect(210, 84, 3, 62, P.woodDk);
  px.rect(184, 112, 56, 3, P.woodDk);
  // table with milk & bread
  px.rect(110, 330, 120, 7, P.woodHi);
  px.rect(116, 337, 6, 50, P.woodDk);
  px.rect(218, 337, 6, 50, P.woodDk);
  for (let i = 0; i < 4; i++) {
    px.rect(124 + i * 26, 318, 6, 12, P.white);
    px.rect(124 + i * 26, 318, 6, 2, P.fogHi);
  }
  px.ellipse(200, 326, 10, 4, P.ember);
  // shelves with jars
  px.rect(110, 180, 60, 4, P.woodHi);
  for (let i = 0; i < 6; i++) px.rect(112 + i * 10, 166, 7, 14, i % 2 ? P.fogDk : P.violet2);
  if (o.purple) fog(px, 240, 200, t, P.magicDk, 0.4 * o.purple, 9, 2);
};

export const dungeon = (px: Pix, t: number) => {
  stoneWall(px, 0, 0, W, 480, mix(P.stoneDk, P.ink, 0.3), 14, 8);
  floorTiles(px, 380, 480, P.ink, P.stoneDk);
  for (const x of [70, 200]) {
    px.rect(x - 1, 0, 2, 12, P.steelDk);
    for (let i = 0; i < 8; i++) px.ellipse(x, 14 + i * 7, 2, 3, P.steelDk);
  }
  // bars on the right
  for (let x = 236; x < 270; x += 9) px.rect(x, 0, 3, 480, P.steelDk);
  torch(px, 135, 120, t, 1.3);
  px.glow(135, 300, 160, P.night2, 0.2);
};

/** The milk room: a vat with a grinding wheel. Horror is suggested (shadow, sound, white). */
export const milkRoom = (px: Pix, t: number, turn: number) => {
  stoneWall(px, 0, 0, W, 480, mix(P.violet, P.stoneDk, 0.6), 12, 7);
  floorTiles(px, 360, 480, P.stoneDk, mix(P.stoneDk, P.ink, 0.4));
  // big vat
  px.ellipse(135, 300, 80, 22, P.woodDk);
  px.rect(55, 300, 160, 80, P.wood);
  for (let x = 55; x < 215; x += 12) px.rect(x, 300, 2, 80, P.woodDk);
  px.rect(55, 320, 160, 4, P.steelDk);
  px.rect(55, 360, 160, 4, P.steelDk);
  px.ellipse(135, 300, 74, 18, P.white);
  px.ellipse(135, 300, 74, 18, mix(P.white, P.fogHi, 0.3));
  // grinding wheel above
  const a = turn * Math.PI * 2;
  px.ellipse(135, 170, 50, 50, P.steelDk);
  px.ellipse(135, 170, 44, 44, P.stoneDk);
  for (let i = 0; i < 8; i++) {
    const b = a + (i / 8) * Math.PI * 2;
    px.line(135, 170, 135 + Math.cos(b) * 44, 170 + Math.sin(b) * 44, P.steelDk);
    px.poly([[135 + Math.cos(b) * 44, 170 + Math.sin(b) * 44], [135 + Math.cos(b + 0.12) * 54, 170 + Math.sin(b + 0.12) * 54], [135 + Math.cos(b + 0.25) * 44, 170 + Math.sin(b + 0.25) * 44]], P.steel);
  }
  px.ellipse(135, 170, 6, 6, P.gold);
  px.rect(132, 220, 6, 70, P.steelDk); // chute
  // tap and goblets
  px.rect(214, 350, 18, 5, P.steelDk);
  px.rect(228, 355, 4, 8, P.steelDk);
  for (let i = 0; i < 4; i++) px.rect(220 + i * 10 - 20, 396, 6, 12, P.white);
  torch(px, 30, 150, t, 1.5);
  torch(px, 240, 150, t, 1.5);
};

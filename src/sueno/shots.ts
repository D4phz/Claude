import { Pix, clamp01, ease, easeOut, hash, mix } from "../castillo/engine";
import { blitScaled, decayMotes, desaturate, dissolve, magicAura, slash, vignette } from "../castillo/fx";
import { P } from "../castillo/palette";
import { torch } from "../castillo/places";
import { CHICA, CHICO, MAGE, MAYOR, QUEEN, RUBIA, SERVANT, SOLDIER, VILLAGER, WITCH, worn } from "./cast";
import { chained, drawFigure, drink, fallen, lookUp, run, stand, thrust, walk, type Look, type Pose } from "./figure";
import { monsterQueen, portrait } from "./portrait";
import {
  CABIN_X,
  CABIN_Y,
  banquet,
  bedroom,
  cabin,
  cabinKitchen,
  castle,
  castleClearing,
  corridor,
  courtyard,
  dungeon,
  forestPath,
  milkRoom,
  rubbleField,
  skyClouds,
  throneHall,
} from "./sets";

type Draw = (px: Pix, t: number, p: number, f?: number) => void;

const YOUTHS = [MAYOR, CHICO, CHICA, RUBIA];
const PRESENT = YOUTHS.map(worn);
const CREATURE = worn(MAYOR);
const gear = (i: number): Pose["hold"] => (["sword", "staff", "spear", "sword"] as const)[i];

/** The four in formation (Mayor leads). */
const four = (px: Pix, x: number, y: number, pose: (i: number) => Pose, o: { gap?: number; flip?: boolean; looks?: Look[]; scale?: number; dy?: number } = {}) => {
  const looks = o.looks ?? YOUTHS;
  const gap = o.gap ?? 20;
  for (let i = looks.length - 1; i >= 0; i--) drawFigure(px, looks[i], pose(i), x + (o.flip ? 1 : -1) * i * gap, y - (i % 2) * (o.dy ?? 4), o.flip, o.scale ?? 1);
};
const crowd = (px: Pix, n: number, y0: number, y1: number, t: number, o: { glow?: boolean; dir?: number; speed?: number; seed?: number; run?: boolean } = {}) => {
  const items = Array.from({ length: n }, (_, i) => {
    const s = (o.seed ?? 0) + i;
    const kind = i % 4;
    const look = kind === 0 ? SOLDIER(s) : kind === 1 ? MAGE(s) : kind === 2 ? VILLAGER(s) : SERVANT(s);
    const y = y0 + hash(s + 11) * (y1 - y0);
    return { look, y, x: hash(s + 3) * 290 - 10, ph: hash(s + 5), kind };
  }).sort((a, b) => a.y - b.y);
  for (const c of items) {
    const dir = o.dir ?? (hash(c.ph * 99) > 0.5 ? 1 : -1);
    const x = ((c.x + dir * t * (o.speed ?? 10) + 400) % 300) - 15;
    const pose: Pose = o.run ? run(t * 1.6 + c.ph) : walk(t * 1.1 + c.ph, 0.8);
    if (c.kind === 0) pose.hold = "spear";
    if (c.kind === 1) pose.hold = "staff";
    if (o.glow) pose.eyes = "glow";
    drawFigure(px, c.look, pose, x, c.y, dir < 0);
  }
};
const black = (px: Pix) => px.clear(P.ink);
const flashLine = (px: Pix, k: number) => {
  if (k <= 0) return;
  px.rect(0, 0, 270, 480, P.white, Math.min(255, k * 230));
};

// ------------------------------------------------ shared compositions (reused at the end)
const walkComp: Draw = (px, t, p) => {
  forestPath(px, t);
  four(px, 150 + p * 40, 408 - p * 12, (i) => walk(t * 1.3 + i * 0.27), { gap: 40, scale: 2, dy: 3 });
};
const creatureRun: Draw = (px, t, p) => {
  forestPath(px, t);
  const k = easeOut(p);
  drawFigure(px, CREATURE, { ...run(t * 2.4), creature: true }, 214 - k * 60, 312 + k * 70, true);
};
const stabComp = (px: Pix, t: number, p: number, earliest = true) => {
  forestPath(px, t, { shafts: 0.6 });
  const k = clamp01((p - 0.35) / 0.25);
  const cx = 250 - clamp01(p / 0.55) * 82;
  four(px, 70, 392, (i) => (i === 0 ? stand() : { ...stand(), eyes: "wide" }), { gap: 16, looks: earliest ? YOUTHS : YOUTHS });
  drawFigure(px, CREATURE, p < 0.6 ? { ...run(t * 2.4), creature: true } : { ...fallen(clamp01((p - 0.6) / 0.3)), creature: true }, cx, 404, true, 2);
  drawFigure(px, MAYOR, thrust(k), 92, 408, false, 2);
  if (p > 0.55 && p < 0.62) flashLine(px, 1 - (p - 0.55) / 0.07);
};
const welcomeComp: Draw = (px, t, p) => {
  throneHall(px, t);
  for (let i = 0; i < 3; i++) {
    drawFigure(px, SOLDIER(i), { ...stand(), hold: "spear" }, 66 - i * 4, 300 + i * 34);
    drawFigure(px, SOLDIER(i + 5), { ...stand(), hold: "spear" }, 204 + i * 4, 300 + i * 34, true);
  }
  drawFigure(px, QUEEN, { ...stand(), armN: [0.9 + Math.sin(t * 2) * 0.05, 0.3], armF: [-0.8, 0.3], mouth: "smile" }, 135, 244, false, 2);
  four(px, 140, 404, () => ({ ...stand(), tilt: -0.2 }), { gap: 22 });
};

// ------------------------------------------------ the shots
export const SHOTS: Record<string, Draw> = {
  title: (px, t) => {
    black(px);
    castle(px, 135, 300, t, { lift: 40, glow: 0.6, lit: 0.6 });
    dissolve(px, 0.55, P.ink);
  },
  ch1: (px, t) => {
    forestPath(px, t);
    dissolve(px, 0.7, P.ink);
  },
  walk: walkComp,
  creatureAppears: (px, t, p) => {
    creatureRun(px, t, p);
    four(px, 150, 410, (i) => ({ ...stand(), eyes: "wide", tilt: -0.1 }), { gap: 40, scale: 2, dy: 3 });
  },
  creatureClose: (px, t, p) => {
    forestPath(px, t, { shafts: 0.3 });
    dissolve(px, 0.6, P.ink);
    const sh = Math.round(Math.sin(t * 30) * 1.5);
    blitScaled(px, portrait(CREATURE, { decay: 1, expr: "fear", rim: P.fogHi }), 39 + sh, 90, 3);
    for (let i = 0; i < 18; i++) px.rect(0, hash(i) * 480, 270 * hash(i + 3), 1, P.fogDk); // motion streaks
  },
  stab: (px, t, p) => stabComp(px, t, p),
  stabAfter: (px, t, p) => {
    forestPath(px, t, { shafts: 0.4 });
    drawFigure(px, CREATURE, { ...fallen(1), creature: true }, 168, 404, true, 2);
    drawFigure(px, MAYOR, { ...stand(), armN: [0.3, 0.2], hold: "sword" }, 92, 408, false, 2);
    four(px, 60, 388, (i) => ({ ...stand(), eyes: "wide" }), { gap: 14, looks: [CHICO, CHICA, RUBIA] });
    vignette(px, 0.25);
  },
  trail: (px, t, p) => {
    forestPath(px, t);
    for (let i = 0; i < 9; i++) px.ellipse(140 + Math.sin(i) * 8, 400 - i * 13, 2.5 - i * 0.15, 1.2, P.ink);
    four(px, 160, 400 - p * 30, (i) => walk(t * 1.2 + i * 0.27, 0.8), { gap: 30, scale: 2, dy: 3 });
  },
  castleReveal: (px, t, p) => {
    castleClearing(px, t, { scale: 2, houses: true });
    four(px, 200, 412, () => lookUp(), { gap: 36, scale: 2, dy: 3 });
  },
  welcome: welcomeComp,
  banquet: (px, t) => {
    banquet(px, t);
    drawFigure(px, QUEEN, { ...stand(), mouth: "smile", armN: [0.6, 0.6], hold: "goblet" }, 135, 236);
    drawFigure(px, SERVANT(2), { ...walk(t, 0.6), hold: "goblet" }, 40, 330);
    drawFigure(px, SERVANT(3), { ...walk(t + 0.5, 0.6), hold: "goblet" }, 236, 340, true);
    four(px, 70, 404, (i) => (i === 1 ? drink(0.5 + 0.4 * Math.sin(t * 2)) : { ...stand(), mouth: "smile" }), { gap: 0 });
    drawFigure(px, MAYOR, { ...stand(), mouth: "smile" }, 50, 404);
    drawFigure(px, CHICO, drink(0.5 + 0.4 * Math.sin(t * 2)), 82, 404);
    drawFigure(px, CHICA, { ...stand(), mouth: "smile" }, 200, 404, true);
    drawFigure(px, RUBIA, { ...stand(), mouth: "smile", hold: "goblet", armN: [0.9, 1.3] }, 228, 404, true);
  },
  bedroomCastle: (px, t) => {
    bedroom(px, t, "castle");
    drawFigure(px, CHICA, { ...stand(), tilt: -0.1 }, 196, 390);
    drawFigure(px, RUBIA, { ...stand(), mouth: "smile" }, 96, 396);
  },
  kingdom: (px, t) => {
    courtyard(px, t);
    crowd(px, 16, 340, 410, t, { seed: 4, speed: 12 });
    four(px, 190, 412, (i) => ({ ...stand(), tilt: -0.15 + i * 0.05 }), { gap: 40, scale: 2, dy: 3 });
  },
  explore: (px, t, p) => {
    corridor(px, t, 0.1);
    four(px, 170 + p * 10, 412 - p * 30, (i) => walk(t * 1.2 + i * 0.3, 0.8), { gap: 40, scale: 2, dy: 3 });
  },
  twoDays: (px, t, p) => {
    castleClearing(px, t, { scale: 1, lit: 0.5 + 0.5 * Math.sin(p * 12) });
    // two day/night cycles: a sun-glow sweeps across twice
    const k = (p * 2) % 1;
    px.glow(-20 + k * 310, 140 - Math.sin(k * Math.PI) * 90, 70, P.goldDk, 0.35 * Math.sin(k * Math.PI));
  },
  nightCorridor: (px, t, p) => {
    corridor(px, t, 0.1 + p * 0.25);
    dissolve(px, 0.45, P.ink);
    drawFigure(px, CHICA, { ...stand(), eyes: "wide", lean: 0.2 }, 30, 410, false, 2);
    drawFigure(px, MAYOR, { ...stand(), eyes: "wide", lean: 0.25 }, 64, 420, false, 2);
  },
  notWhat: (px, t, p) => {
    black(px);
    const k = clamp01(p * 2);
    if (k > 0.2) {
      for (const x of [118, 148]) {
        px.glow(x, 200, 16, P.magicDk, 0.6 * k);
        px.rect(x - 3, 199, 6, 2, P.magicHi);
      }
    }
  },
  armGrow: (px, t, p) => {
    throneHall(px, t, { night: 0.6 });
    drawFigure(px, SOLDIER(2), { ...stand(), hold: "spear", eyes: "wide" }, 226, 380, true, 1);
    drawFigure(px, QUEEN, { ...stand(), armN: [1.5, 0.05], reach: 1 + ease(p) * 5.5, eyes: "glow" }, 70, 380, false, 2);
    // door crack framing
    for (let y = 0; y < 480; y++) {
      px.rect(0, y, 24 + Math.sin(y / 30) * 2, 1, P.ink);
      px.rect(250, y, 20, 1, P.ink);
    }
  },
  armGrab: (px, t, p) => {
    throneHall(px, t, { night: 0.6 });
    const lift = easeOut(p) * 70;
    drawFigure(px, SOLDIER(2), { ...stand(), rot: -0.2, eyes: "wide", mouth: "scream", armN: [2.4, 0.3], armF: [-2.2 + 6.28, 0.3] }, 200, 380 - lift, true, 1);
    drawFigure(px, QUEEN, { ...stand(), armN: [1.5 - p * 0.5, 0.05], reach: 6.2, eyes: "glow" }, 70, 380, false, 2);
    for (let y = 0; y < 480; y++) {
      px.rect(0, y, 24, 1, P.ink);
      px.rect(250, y, 20, 1, P.ink);
    }
  },
  devour: (px, t) => {
    black(px);
    px.glow(135, 200, 170, P.magicDk, 0.55);
    blitScaled(px, monsterQueen(QUEEN, 0.5 + 0.5 * Math.abs(Math.sin(t * 3))), 39, 70, 3);
    magicAura(px, 135, 170, 110, t, 0.4);
  },
  spine: (px, t, p) => {
    // shadows on a torch-lit wall: suggested, never shown
    for (let y = 0; y < 480; y++)
      for (let x = 0; x < 270; x++) {
        const d = Math.hypot(x - 230, y - 380) / 380;
        const base = mix(mix(P.goldDk, P.violet2, 0.35), P.violet, Math.min(1, d * 1.3));
        px.set(x, y, y % 9 === 0 || (x + (Math.floor(y / 9) % 2) * 7) % 14 === 0 ? mix(base, P.ink, 0.35) : base);
      }
    torch(px, 240, 380, t, 2);
    const S = mix(P.ink, P.violet, 0.1);
    const shadow = (l: Look, pose: Pose, x: number, y: number, sc: number, flip = false) => {
      const tmp = new Pix(270, 480);
      drawFigure(tmp, l, pose, x, y, flip, sc);
      tmp.recolor(S);
      px.blit(tmp, 0, 0);
    };
    shadow(QUEEN, { ...stand(), armN: [2.6, 0.2], armF: [-2.4 + 6.28, 0.2], mouth: "scream" }, 100, 470, 4);
    const up = 120 - easeOut(p) * 30;
    shadow(SOLDIER(1), { ...stand(), rot: 0.4, armN: [2.4, 0.3] }, 150, up + 40, 2, true);
    if (p > 0.35) {
      // a long segmented shape pulled upward
      const k = clamp01((p - 0.35) / 0.3);
      for (let i = 0; i < 14 * k; i++) px.rect(176 + Math.sin(i * 0.7) * 3, 60 - i * 4, 5, 3, S);
    }
    if (p > 0.72) dissolve(px, (p - 0.72) / 0.2, P.ink);
  },
  horror: (px) => {
    black(px);
    YOUTHS.forEach((l, i) => blitScaled(px, portrait(l, { expr: i % 2 ? "shock" : "fear", rim: P.magic }), 3 + (i % 2) * 135, 40 + Math.floor(i / 2) * 170, 2));
  },
  confront: (px, t) => {
    throneHall(px, t, { night: 0.45 });
    drawFigure(px, QUEEN, { ...stand(), eyes: "glow", armN: [0.9, 0.2], armF: [-0.9, 0.2], mouth: "scream" }, 135, 250, false, 2);
    magicAura(px, 135, 190, 60, t, 0.5);
    four(px, 70, 404, (i) => ({ ...stand(), hold: gear(i), armN: [1, 0.3], lean: 0.1 }), { gap: -40, dy: 0 });
  },
  rise: (px, t, p) => {
    castleClearing(px, t, { lift: ease(p) * 150, scale: 2, houses: true });
    for (let i = 0; i < 26; i++) {
      const k = (p * 1.3 + hash(i)) % 1;
      px.rect(80 + hash(i + 1) * 110, 360 - ease(p) * 150 + k * 120, 3, 3, i % 3 ? P.stoneDk : P.leaf2);
    }
  },
  turned: (px, t) => {
    courtyard(px, t, { sky: 1, purple: 0.3 });
    crowd(px, 18, 330, 410, t, { glow: true, speed: 0, seed: 20 });
    four(px, 160, 400, (i) => ({ ...stand(), hold: gear(i), armN: [1.1, 0.3], eyes: "wide" }), { gap: 16 });
  },
  battle: (px, t, f) => {
    courtyard(px, t, { sky: 1, purple: 0.35 });
    crowd(px, 14, 320, 380, t, { glow: true, run: true, speed: 30, seed: 40 });
    const h = ((f ?? 0) % 24) / 24;
    four(px, 210, 404, (i) => thrust((h + i * 0.25) % 1), { gap: 46, dy: 6 });
    slash(px, 120, 330, 30, -2.4 + h * 2, -0.6 + h * 2);
    for (let i = 0; i < 3; i++) {
      const k = (t * 1.5 + i / 3) % 1;
      px.line(20 + i * 90, 300, 20 + i * 90 + k * 60, 300 + k * 80, P.magic);
      px.glow(20 + i * 90 + k * 60, 300 + k * 80, 8, P.magic, 0.6);
    }
  },
  defeat: (px, t, p) => {
    courtyard(px, t, { sky: 1, purple: 0.3 });
    const k = clamp01((p - 0.25) / 0.2);
    drawFigure(px, QUEEN, p < 0.45 ? { ...stand(), eyes: "glow", mouth: "scream", armN: [1.2, 0.2] } : { ...fallen(clamp01((p - 0.45) / 0.3)), eyes: "glow" }, 190, 400, true, 2);
    drawFigure(px, MAYOR, thrust(k), 86, 404, false, 2);
    if (p > 0.42 && p < 0.5) flashLine(px, 1 - (p - 0.42) / 0.08);
  },
  fall: (px, t, p) => {
    skyClouds(px, t, 0.2);
    const y = 300 + p * p * 260;
    castle(px, 135, y, t, { lift: 0, crack: 0.5 + p * 0.5, glow: 1 - p, lit: 1 - p });
    for (let i = 0; i < 30; i++) {
      const k = (p * 1.4 + hash(i)) % 1;
      px.rect(80 + hash(i + 1) * 110, y - 140 + k * 200, 3, 3, i % 3 ? P.stone : P.violet2);
    }
    if (p > 0.35) for (let i = 0; i < 4; i++) drawFigure(px, PRESENT[i], { ...run(t * 2 + i), rot: -0.6 }, 40 + i * 16 + p * 20, y - 120 + i * 10 + (p - 0.35) * 160);
  },
  crash: (px, t, p) => {
    castleClearing(px, t, { rubble: 1, houses: false });
    const k = easeOut(p);
    for (let i = 0; i < 60; i++) px.ellipse(135 + (hash(i) - 0.5) * 300 * k, 360 - hash(i + 1) * 160 * k, 16 + 30 * k, 10 + 18 * k, i % 2 ? P.fogDk : P.fog, 200 * (1 - k * 0.6));
  },
  escape: (px, t, p) => {
    castleClearing(px, t, { rubble: 1, houses: false });
    fogDust(px, t, 1 - p);
    four(px, 190, 412, (i) => ({ ...stand(), tilt: 0.2 }), { gap: 40, looks: PRESENT, scale: 2, dy: 3 });
  },
  ch2: (px, t) => {
    rubbleField(px, t);
    dissolve(px, 0.7, P.ink);
  },
  wander: (px, t, p) => {
    forestPath(px, t, { shafts: 0.5 });
    four(px, 150 + p * 40, 408 - p * 12, (i) => walk(t * 1.1 + i * 0.27, 0.8), { gap: 40, looks: PRESENT, scale: 2, dy: 3 });
  },
  cabinFound: (px, t, p) => {
    rubbleField(px, t);
    four(px, 60 + p * 40, 404, (i) => walk(t * 1.1 + i * 0.27, 0.8), { gap: 16, looks: PRESENT });
  },
  oldWoman: (px, t) => {
    rubbleField(px, t, { door: 1 });
    drawFigure(px, WITCH, { ...stand(), mouth: "smile", armN: [0.8, 0.4] }, CABIN_X + 17, CABIN_Y + 2, true);
    four(px, 130, 412, () => stand(), { gap: 30, looks: PRESENT, scale: 2, dy: 3 });
  },
  meal: (px, t) => {
    cabinKitchen(px, t);
    drawFigure(px, WITCH, { ...stand(), mouth: "smile", hold: "goblet", armN: [0.9, 1.2] }, 100, 360, false, 2);
    drawFigure(px, PRESENT[1], drink(0.5 + 0.4 * Math.sin(t * 2)), 150, 400);
    drawFigure(px, PRESENT[3], { ...stand(), mouth: "smile" }, 176, 400);
    drawFigure(px, PRESENT[0], { ...stand() }, 236, 404, true);
    drawFigure(px, PRESENT[2], { ...stand(), mouth: "smile" }, 210, 400, true);
  },
  curious: (px, t, p) => {
    cabinKitchen(px, t);
    px.rect(84, 200, 26, 130, P.ink);
    px.rect(84, 200, Math.round(26 * (1 - p)), 130, P.woodDk);
    px.glow(97, 266, 24, P.violet2, 0.3 * p);
    drawFigure(px, PRESENT[2], walk(t, 0.6), 130 - p * 20, 404, true);
    drawFigure(px, PRESENT[3], walk(t + 0.4, 0.6), 160 - p * 20, 404, true);
  },
  familiarRoom: (px, t, p) => {
    bedroom(px, t, "cabin");
    four(px, 120, 410, (i) => ({ ...stand(), eyes: "wide", tilt: -0.1 }), { gap: 26, looks: PRESENT });
  },
  compare: (px, t, p) => {
    const a = new Pix(270, 480);
    const b = new Pix(270, 480);
    bedroom(a, t, "castle");
    bedroom(b, t, "cabin");
    for (let y = 0; y < 238; y++)
      for (let x = 0; x < 270; x++) {
        const ca = a.get(x, y + 100);
        const cb = b.get(x, y + 100);
        if (ca) px.set(x, y, ca);
        if (cb) px.set(x, y + 242, cb);
      }
    px.rect(0, 238, 270, 4, P.magic);
  },
  window: (px, t) => {
    rubbleField(px, t);
    // window frame (interior) around the view
    for (let y = 0; y < 480; y++)
      for (let x = 0; x < 270; x++) {
        const inside = x > 40 && x < 230 && y > 60 && y < 330;
        if (!inside) px.set(x, y, (Math.floor(x / 16) % 2 ? P.wood : mix(P.wood, P.woodDk, 0.3)));
      }
    px.rect(40, 60, 190, 6, P.woodDk);
    px.rect(40, 324, 190, 6, P.woodDk);
    px.rect(132, 60, 6, 270, P.woodDk);
    px.rect(40, 190, 190, 5, P.woodDk);
    drawFigure(px, PRESENT[0], { ...stand(), tilt: 0.1 }, 100, 470, false, 2);
    drawFigure(px, PRESENT[2], { ...stand() }, 190, 476, true, 2);
  },
  rubbleWide: (px, t) => rubbleField(px, t),
  worse: (px, t, p) => {
    black(px);
    if (p > 0.4) drawFigure(px, WITCH, { ...stand(), eyes: "glow" }, 135, 300, false, 2);
    dissolve(px, 0.85 - p * 0.3, P.ink);
  },
  sameQueen: (px, t, p) => {
    black(px);
    px.glow(135, 220, 160, P.magicDk, 0.4);
    blitScaled(px, portrait(QUEEN, { expr: "smile" }), 39, 80, 3);
    const k = clamp01((p - 0.2) / 0.5);
    const w = portrait(WITCH, { eyes: p > 0.75 ? "glow" : "open", expr: "smile" });
    for (let y = 0; y < 72; y++) for (let x = 0; x < 64; x++) {
      const c = w.get(x, y);
      if (c && hash(x * 13 + y * 7) < k) px.rect(39 + x * 3, 80 + y * 3, 3, 3, c);
    }
  },
  survived: (px, t, p) => {
    if (p < 0.5) {
      courtyard(px, t, { sky: 1 });
      drawFigure(px, QUEEN, { ...fallen(1), eyes: "closed" }, 160, 400, true, 2);
      desaturate(px, 0.7);
      px.rect(60, 380, 80, 3, P.steel);
    } else {
      cabinKitchen(px, t);
      drawFigure(px, WITCH, { ...stand(), eyes: "glow" }, 135, 400, false, 2);
    }
  },
  hundred: (px, t) => {
    cabinKitchen(px, t, { purple: 0.5 });
    dissolve(px, 0.5, P.ink);
    blitScaled(px, portrait(WITCH, { eyes: "glow", rim: P.magic }), 39, 70, 3);
    magicAura(px, 135, 190, 100, t, 0.6);
  },
  questions: (px) => {
    black(px);
    PRESENT.forEach((l, i) => blitScaled(px, portrait(l, { expr: (["shock", "sad", "fear", "angry"] as const)[i], rim: P.fire }), 3 + (i % 2) * 135, 40 + Math.floor(i / 2) * 170, 2));
  },
  noAnswers: (px, t) => {
    black(px);
    const tmp = new Pix(270, 480);
    cabin(tmp, t);
    tmp.recolor(P.night2);
    px.blit(tmp, 0, 0);
  },
  attackWitch: (px, t, f) => {
    cabinKitchen(px, t, { purple: 0.4 });
    drawFigure(px, WITCH, { ...stand(), eyes: "glow", armN: [1.6, 0.1] }, 100, 380, false, 2);
    magicAura(px, 100, 300, 50, t, 0.7);
    const h = ((f ?? 0) % 24) / 24;
    drawFigure(px, PRESENT[0], thrust(h), 210, 404, true, 2);
    drawFigure(px, PRESENT[2], thrust((h + 0.5) % 1), 250, 404, true);
    slash(px, 150, 330, 28, -2.6 + h * 2, -0.6 + h * 2);
  },
  witchDies: (px, t, p) => {
    cabinKitchen(px, t);
    drawFigure(px, WITCH, p < 0.3 ? { ...stand(), eyes: "glow" } : fallen(clamp01((p - 0.3) / 0.3)), 100, 400, false, 2);
    drawFigure(px, PRESENT[0], thrust(clamp01(p / 0.3)), 200, 404, true, 2);
    if (p > 0.3) decayMotes(px, 60, 300, 80, 100, t, 1 - p);
  },
  orSo: (px, t, p) => {
    black(px);
    if (Math.sin(t * 9) > 0.6) px.glow(135, 240, 20 * p, P.magic, 0.7);
  },
  exitCabin: (px, t, p) => {
    rubbleField(px, t, { door: 1 });
    four(px, CABIN_X + 20 - p * 30, 412, () => lookUp(), { gap: 32, looks: PRESENT, scale: 2, dy: 3 });
  },
  rebuilt: (px, t) => {
    rubbleField(px, t, { castle: true });
    four(px, 240, 404, () => lookUp(), { gap: 16, looks: PRESENT });
  },
  impossible: (px, t) => {
    castleClearing(px, t, { scale: 2, houses: false });
    fogDust(px, t, 0.6);
  },
  ch3: (px, t) => {
    castleClearing(px, t, { scale: 2 });
    dissolve(px, 0.7, P.ink);
  },
  approach: (px, t, p) => {
    castleClearing(px, t, { scale: 1 });
    four(px, 160, 410 - p * 20, (i) => walk(t * 1.1 + i * 0.27, 0.8), { gap: 16, looks: PRESENT });
  },
  otherFour: (px, t) => {
    castleClearing(px, t, { scale: 1 });
    four(px, 112, 412, () => stand(), { gap: 26, looks: YOUTHS, scale: 2, dy: 3 });
    four(px, 158, 412, () => ({ ...stand(), eyes: "wide" }), { gap: 26, flip: true, looks: PRESENT, scale: 2, dy: 3 });
  },
  themselves: (px) => {
    black(px);
    YOUTHS.forEach((l, i) => blitScaled(px, portrait(l, { rim: P.goldHi }), 3 + i * 66, 70, 1));
    PRESENT.forEach((l, i) => blitScaled(px, portrait(l, { expr: "shock", rim: P.magic }), 3 + i * 66, 250, 1));
    px.rect(0, 200, 270, 2, P.magic);
    px.glow(135, 200, 90, P.magicDk, 0.4);
  },
  dontEnter: (px, t) => {
    castleClearing(px, t, { scale: 1 });
    dissolve(px, 0.55, P.ink);
    blitScaled(px, portrait(PRESENT[0], { expr: "angry", rim: P.fog }), 39, 90, 3);
  },
  stayHere: (px, t, p) => {
    castleClearing(px, t, { scale: 1 });
    four(px, 80, 404, () => ({ ...stand(), eyes: "wide" }), { gap: 16, looks: YOUTHS });
    four(px, 190 - p * 20, 404 - p * 40, (i) => walk(t * 1.1 + i * 0.27, 0.8), { gap: 16, flip: true, looks: PRESENT });
  },
  reenter: (px, t, p) => {
    corridor(px, t, 0.2);
    dissolve(px, 0.3, P.ink);
    four(px, 120 + p * 20, 404 - p * 40, (i) => walk(t * 1.2 + i * 0.3, 0.8), { gap: 18, looks: PRESENT });
  },
  killAgain: (px, t, p) => {
    throneHall(px, t, { night: 0.4 });
    drawFigure(px, QUEEN, p < 0.25 ? { ...stand(), eyes: "glow" } : fallen(clamp01((p - 0.25) / 0.3)), 170, 404, true, 2);
    drawFigure(px, PRESENT[0], thrust(clamp01(p / 0.25)), 80, 404, false, 2);
  },
  riseAgain: (px, t, p) => {
    castleClearing(px, t, { lift: ease(p) * 150, scale: 2, houses: true });
    four(px, 70, 404, () => lookUp(), { gap: 14, looks: YOUTHS });
  },
  fallAgain: (px, t, p) => {
    if (p < 0.35) {
      skyClouds(px, t);
      castle(px, 135, 300 + p * 500, t, { crack: 0.8 });
    } else castleClearing(px, t, { rubble: 1, houses: false });
    if (p > 0.35) fogDust(px, t, 1 - (p - 0.35));
  },
  noDeaths: (px, t) => {
    castleClearing(px, t, { rubble: 1, houses: false });
    four(px, 110, 412, () => ({ ...stand(), tilt: 0.2 }), { gap: 26, looks: PRESENT, scale: 2, dy: 3 });
    four(px, 238, 396, () => ({ ...stand(), eyes: "wide" }), { gap: 12, flip: true, looks: YOUTHS });
  },
  witchDoor: (px, t, p) => {
    castleClearing(px, t, { rubble: 1, houses: false });
    // the castle gate still standing in the ruins
    px.rect(110, 280, 14, 90, P.stone);
    px.rect(146, 280, 14, 90, P.stone);
    px.poly([[106, 284], [135, 256], [164, 284]], P.stone);
    px.rect(124, 290, 22, 80, P.ink);
    px.glow(135, 330, 40, P.magicDk, 0.6);
    drawFigure(px, WITCH, { ...walk(t, 0.6), eyes: "glow" }, 135, 372 + p * 20, false, 1);
    magicAura(px, 135, 340, 40, t, 0.5);
    four(px, 80, 410, () => ({ ...stand(), eyes: "wide" }), { gap: 16, looks: PRESENT, flip: false });
  },
  howAgain: (px, t) => {
    black(px);
    blitScaled(px, portrait(PRESENT[0], { expr: "shock", rim: P.magic }), 3, 110, 2);
    blitScaled(px, portrait(PRESENT[2], { expr: "fear", rim: P.magic }), 138, 110, 2);
  },
  possessed: (px, t) => {
    rubbleField(px, t, { purple: 0.6 });
    drawFigure(px, WITCH, { ...stand(), eyes: "glow", armN: [2.6, 0.2], armF: [-2.6 + 6.28, 0.2] }, 135, 330, false, 2);
    four(px, 210, 410, () => ({ ...stand(), eyes: "glow" }), { gap: 46, looks: PRESENT, dy: 0 });
    magicAura(px, 135, 360, 120, t, 0.6);
  },
  chains: (px, t) => {
    dungeon(px, t);
    drawFigure(px, PRESENT[0], chained(Math.sin(t)), 70, 300, false, 2);
    drawFigure(px, PRESENT[2], chained(Math.sin(t + 1)), 200, 300, false, 2);
  },
  worseFate: (px, t, p) => {
    milkRoom(px, t, 0);
    dissolve(px, 0.4, P.ink);
    drawFigure(px, SOLDIER(3), { ...walk(t, 0.6), hold: "spear" }, 40 + p * 40, 410);
    drawFigure(px, PRESENT[1], { ...walk(t + 0.3, 0.6), eyes: "glow" }, 80 + p * 40, 406);
    drawFigure(px, PRESENT[3], { ...walk(t + 0.6, 0.6), eyes: "glow" }, 110 + p * 40, 410);
  },
  grind: (px, t, p) => {
    milkRoom(px, t, t * (0.2 + p * 1.2));
    if (p < 0.4) {
      const tmp = new Pix(270, 480);
      drawFigure(tmp, PRESENT[1], stand(), 110, 290 - p * 60);
      drawFigure(tmp, PRESENT[3], stand(), 160, 290 - p * 60, true);
      tmp.recolor(P.ink);
      px.blit(tmp, 0, 0);
    }
    if (p > 0.6) for (let i = 0; i < 4; i++) px.rect(230, 363 + ((t * 40 + i * 9) % 30), 2, 4, P.white);
  },
  delicious: (px, t, p) => {
    milkRoom(px, t, 0.1);
    dissolve(px, 0.5, P.ink);
    drawFigure(px, MAYOR, drink(clamp01(p * 1.6)), 135, 420, false, 3);
  },
  keyGet: (px, t, p) => {
    dungeon(px, t);
    drawFigure(px, SOLDIER(6), { ...fallen(1), eyes: "closed" }, 140, 400);
    drawFigure(px, PRESENT[2], { ...chained(), armN: [1.4 + p, 0.8], hold: p > 0.5 ? "key" : null, eyes: "open" }, 110, 330, false, 2);
    if (p > 0.45 && p < 0.6) px.glow(150, 380, 12, P.goldHi, 0.8);
  },
  keyGive: (px, t, p) => {
    dungeon(px, t);
    drawFigure(px, PRESENT[2], { ...stand(), armN: [1.5, 0.1], hold: "key" }, 180, 404, false, 2);
    drawFigure(px, MAYOR, { ...stand(), armN: [1.4 * p, 0.2], hold: p > 0.6 ? "key" : null }, 262, 404, true, 2);
  },
  freeGirl: (px, t, p) => {
    dungeon(px, t);
    drawFigure(px, CHICA, p < 0.4 ? chained() : stand(), 110, p < 0.4 ? 300 : 404, false, 2);
    drawFigure(px, MAYOR, { ...stand(), armN: [1.6, 0.4], hold: "key" }, 190, 404, true, 2);
  },
  goKill: (px, t) => {
    dungeon(px, t);
    dissolve(px, 0.5, P.ink);
    blitScaled(px, portrait(PRESENT[2], { expr: "angry", rim: P.fire }), 39, 90, 3);
  },
  betrayal: (px, t, p) => {
    dungeon(px, t);
    const k = clamp01((p - 0.35) / 0.15);
    drawFigure(px, PRESENT[2], p < 0.5 ? { ...stand(), eyes: "wide" } : { ...fallen(clamp01((p - 0.5) / 0.3)) }, 180, 404, true, 2);
    drawFigure(px, CHICA, { ...thrust(k), eyes: "glow" }, 90, 404, false, 2);
    if (p > 0.48 && p < 0.55) flashLine(px, 1 - (p - 0.48) / 0.07);
  },
  bothRise: (px, t, p) => rubbleField(px, t, { castle: true, castleLift: ease(p) * 90, cabinLift: ease(p) * 60, purple: p * 0.6 }),
  ch4: (px, t) => {
    skyClouds(px, t, 1);
    dissolve(px, 0.6, P.ink);
  },
  glow: (px, t) => {
    skyClouds(px, t, 1);
    castle(px, 70, 260, t, { lift: 0, purple: 0.6, scale: 1 });
    cabin(px, t, { purple: 1, lift: 60 });
  },
  violet: (px, t) => {
    skyClouds(px, t, 1);
    cabin(px, t, { purple: 1, lift: 40 });
    magicAura(px, CABIN_X + 30, CABIN_Y - 80, 120, t, 1);
  },
  never: (px, t) => {
    black(px);
    px.glow(135, 240, 60 + Math.sin(t * 6) * 10, P.magicDk, 0.5);
  },
  keyBoy: (px, t, p) => {
    rubbleField(px, t, { purple: 1, door: p });
    drawFigure(px, MAYOR, walk(t * 1.1, 0.8), 60 + p * 90, 410, false, 2);
  },
  finallyKills: (px, t, p) => {
    cabinKitchen(px, t, { purple: 1 });
    const k = clamp01((p - 0.3) / 0.15);
    drawFigure(px, WITCH, p < 0.45 ? { ...stand(), eyes: "glow" } : fallen(clamp01((p - 0.45) / 0.3)), 90, 400, false, 2);
    drawFigure(px, MAYOR, thrust(k), 200, 404, true, 2);
    magicAura(px, 90, 320, 70, t, 1 - p * 0.6);
    if (p > 0.44 && p < 0.52) flashLine(px, 1 - (p - 0.44) / 0.08);
  },
  allFalls: (px, t, p) => {
    skyClouds(px, t, 0.8);
    castle(px, 70, 260 + p * p * 400, t, { purple: 0.5 });
    cabin(px, t, { purple: 0.6, lift: 60 - p * p * 300 });
  },
  castleAgain: (px, t, p) => {
    rubbleField(px, t, { castle: true, door: 1 });
    drawFigure(px, MAYOR, lookUp(), CABIN_X - 10, 410, false, 2);
  },
  cycle: (px, t, p, f) => {
    const step = Math.floor(p * 6);
    if (step % 3 === 0) castleClearing(px, t, { scale: 2 });
    else if (step % 3 === 1) castleClearing(px, t, { scale: 2, lift: 120 });
    else castleClearing(px, t, { rubble: 1, houses: false });
  },
  milkEffect: (px, t, p) => {
    black(px);
    px.glow(135, 220, 150, P.magicDk, 0.4);
    blitScaled(px, portrait(MAYOR, { decay: 0.15 + p * 0.25, expr: "fear", rim: P.magic }), 39, 80, 3);
  },
  melting: (px, t, p) => {
    black(px);
    px.glow(135, 220, 150, P.magicDk, 0.5);
    blitScaled(px, portrait(MAYOR, { decay: 0.4 + p * 0.5, expr: "fear", rim: P.magic }), 39, 80, 3);
    decayMotes(px, 39, 80, 192, 216, t, 0.5 + p * 0.5);
  },
  runStart: (px, t, p) => {
    rubbleField(px, t, { purple: 0.6, castle: true });
    drawFigure(px, MAYOR, { ...run(t * 2.2), decay: 0.7 }, 60 + p * 150, 410, false, 2);
  },
  chased: (px, t) => {
    castleClearing(px, t, { purple: 0.6, scale: 1 });
    crowd(px, 14, 360, 410, t, { glow: true, run: true, dir: 1, speed: 40, seed: 70 });
    drawFigure(px, MAYOR, { ...run(t * 2.4), decay: 0.78 }, 200 + Math.sin(t) * 10, 412, false, 2);
  },
  origin: (px, t) => {
    rubbleField(px, t, { purple: 1 });
    drawFigure(px, MAYOR, { ...run(t * 2.2), decay: 0.82, tilt: 0.3 }, 70, 412, true, 2);
  },
  door: (px, t, p) => rubbleField(px, t, { purple: 1, door: 0.15 + p * 0.25 }),
  purpleCastle: (px, t) => {
    castleClearing(px, t, { purple: 1, scale: 2, houses: false });
    YOUTHS.forEach((l, i) => {
      const tmp = new Pix(270, 480);
      drawFigure(tmp, l, stand(), 40 + i * 60, 400);
      tmp.recolor(P.magicHi);
      px.blit(tmp, 0, 0, false, 70);
    });
  },
  noTime: (px, t, p) => {
    forestPath(px, t, { purple: 0.6 });
    drawFigure(px, MAYOR, { ...run(t * 2.4), decay: 0.88 }, 40 + p * 160, 412, false, 2);
  },
  lost: (px, t) => {
    black(px);
    blitScaled(px, portrait(CREATURE, { decay: 0.92, expr: "sad", rim: P.magic }), 39, 80, 3);
    decayMotes(px, 39, 80, 192, 216, t, 0.9);
  },
  desperate: (px, t, p) => creatureRun(px, t, p),
  sword: (px, t, p) => stabComp(px, t, p),
  ch5: black,
  lastScene: (px, t, p) => {
    forestPath(px, t, { shafts: 0.3 });
    four(px, 210, 470, (i) => ({ ...stand(), tilt: 0.4, lean: 0.25 }), { gap: 50, scale: 2, dy: 0 });
    desaturate(px, 0.5);
    vignette(px, 0.35 + p * 0.2);
  },
  fourAgain: (px, t, p) => {
    walkComp(px, t, p);
    desaturate(px, 0.4);
    vignette(px, 0.3);
  },
  same: (px, t, p, f) => {
    const step = Math.floor(p * 3);
    if (step === 0) creatureRun(px, t, (p * 3) % 1);
    else if (step === 1) castleClearing(px, t, { scale: 2 });
    else welcomeComp(px, t, (p * 3) % 1, f);
    desaturate(px, 0.3);
  },
  werethey: (px) => {
    black(px);
    YOUTHS.forEach((l, i) => blitScaled(px, portrait(l, { rim: P.goldHi }), 3 + (i % 2) * 135, 40 + Math.floor(i / 2) * 170, 2));
  },
  oneOfFour: (px, t, p) => {
    black(px);
    const a = portrait(MAYOR, { rim: P.goldHi });
    const b = portrait(CREATURE, { decay: 1, rim: P.magic, expr: "sad" });
    const k = clamp01((p - 0.25) / 0.5);
    for (let y = 0; y < 72; y++)
      for (let x = 0; x < 64; x++) {
        const c = hash(x * 13 + y * 7) < k ? b.get(x, y) : a.get(x, y);
        if (c) px.rect(39 + x * 3, 80 + y * 3, 3, 3, c);
      }
  },
  sameSword: (px, t, p) => {
    black(px);
    px.glow(135, 220, 140, P.night2, 0.6);
    // the sword, close
    const ang = -0.9 + p * 0.1;
    const cx = 135;
    const cy = 230;
    const L = 170;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    for (let w = -3; w <= 3; w++) px.line(cx - dx * 40 - dy * w, cy - dy * 40 + dx * w, cx + dx * L - dy * w * (1 - 0.3), cy + dy * L + dx * w * 0.7, w < 0 ? P.steelDk : w > 1 ? P.white : P.steel);
    for (let w = -16; w <= 16; w++) px.rect(cx - dx * 40 - dy * w, cy - dy * 40 + dx * w, 3, 3, P.gold);
    for (let w = 0; w < 30; w++) px.rect(cx - dx * (44 + w) - 1, cy - dy * (44 + w) - 1, 4, 4, w % 4 ? P.woodDk : P.woodHi);
    // the red scarf tied to the hilt (the same scarf)
    for (let i = 0; i < 12; i++) px.rect(cx - dx * 52 + i * 2, cy - dy * 52 + i * 3 + Math.sin(t * 2 + i) * 2, 3, 3, i % 2 ? MAYOR.scarf! : mix(MAYOR.scarf!, P.ink, 0.3));
  },
  forestStill: (px, t) => forestPath(px, t),
  creatureAgain: (px, t, p) => creatureRun(px, t, p),
  welcomeAgain: welcomeComp,
  beginAgain: walkComp,
  never2: black,
  end: (px, t) => {
    black(px);
    castle(px, 135, 300, t, { lift: 40, glow: 0.7, lit: 0.7, silhouette: 1 });
    dissolve(px, 0.5, P.ink);
  },
};

const fogDust = (px: Pix, t: number, k: number) => {
  if (k <= 0) return;
  for (let i = 0; i < 30; i++) px.ellipse(hash(i) * 290 - 10, 300 + hash(i + 1) * 120, 30, 16, i % 2 ? P.fogDk : P.fog, 150 * k);
};

/** Per-shot camera/edit effects. */
export const FX: Record<string, ("shake" | "push" | "flash" | "rotate" | "zoom" | "pull")[]> = {
  creatureAppears: ["push"],
  creatureClose: ["shake"],
  stab: ["shake"],
  castleReveal: ["pull"],
  welcome: ["push"],
  notWhat: ["zoom"],
  armGrow: ["push"],
  armGrab: ["shake"],
  devour: ["shake"],
  spine: ["shake"],
  rise: ["shake"],
  battle: ["shake"],
  defeat: ["flash", "shake"],
  fall: ["shake"],
  crash: ["flash", "shake"],
  window: ["push"],
  compare: ["flash"],
  sameQueen: ["zoom"],
  attackWitch: ["shake"],
  rebuilt: ["pull"],
  otherFour: ["push"],
  themselves: ["flash"],
  killAgain: ["flash", "shake"],
  riseAgain: ["shake"],
  fallAgain: ["shake"],
  possessed: ["flash"],
  grind: ["shake"],
  betrayal: ["shake"],
  bothRise: ["shake"],
  violet: ["zoom"],
  finallyKills: ["shake"],
  allFalls: ["shake"],
  cycle: ["flash"],
  melting: ["zoom"],
  chased: ["shake"],
  door: ["zoom"],
  sword: ["shake"],
  lastScene: ["rotate"],
  oneOfFour: ["zoom"],
  sameSword: ["push"],
  never2: [],
};

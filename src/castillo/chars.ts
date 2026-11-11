import { Pix, gray, hex, mix, type RGB } from "./engine";
import { P } from "./palette";

export type Hero = {
  id: "lior" | "mara" | "teo" | "bram";
  name: string;
  skin: RGB;
  skinDk: RGB;
  hair: RGB;
  hairDk: RGB;
  eye: RGB;
  top: RGB;
  topDk: RGB;
  pants: RGB;
  boots: RGB;
  accent: RGB;
  style: "elf" | "braid" | "short" | "curly";
  weapon: "bow" | "sword" | "staff" | "axe";
  big?: boolean;
  cloak?: RGB;
};

// Character sheet: these never change across shots (continuity rule).
export const HEROES: Record<Hero["id"], Hero> = {
  lior: {
    id: "lior",
    name: "LIOR",
    skin: hex("#e6d3c2"),
    skinDk: hex("#b9a191"),
    hair: hex("#e4dcc0"),
    hairDk: hex("#a99f86"),
    eye: hex("#4fb39a"),
    top: hex("#2f6b4a"),
    topDk: hex("#1f4733"),
    pants: hex("#3a3248"),
    boots: hex("#2a2030"),
    accent: P.gold,
    style: "elf",
    weapon: "bow",
    cloak: hex("#23503a"),
  },
  mara: {
    id: "mara",
    name: "MARA",
    skin: hex("#d8a882"),
    skinDk: hex("#a87c5e"),
    hair: hex("#b5452e"),
    hairDk: hex("#7e2c1f"),
    eye: hex("#6a4a2a"),
    top: hex("#7a4a2a"),
    topDk: hex("#55321c"),
    pants: hex("#3a2a22"),
    boots: hex("#22181a"),
    accent: P.steel,
    style: "braid",
    weapon: "sword",
  },
  teo: {
    id: "teo",
    name: "TEO",
    skin: hex("#8d5a3b"),
    skinDk: hex("#643f29"),
    hair: hex("#1c1414"),
    hairDk: hex("#0f0a0a"),
    eye: hex("#2a1a10"),
    top: hex("#34508a"),
    topDk: hex("#223660"),
    pants: hex("#2a3150"),
    boots: hex("#1a1a2a"),
    accent: P.blueMagic,
    style: "short",
    weapon: "staff",
  },
  bram: {
    id: "bram",
    name: "BRAM",
    skin: hex("#e0b08c"),
    skinDk: hex("#b48466"),
    hair: hex("#6b4a2a"),
    hairDk: hex("#4a321c"),
    eye: hex("#3a5a7a"),
    top: hex("#6c6f7d"),
    topDk: hex("#4b4d59"),
    pants: hex("#3e3a33"),
    boots: hex("#26201c"),
    accent: hex("#9a8466"),
    style: "curly",
    weapon: "axe",
    big: true,
  },
};
export const ORDER: Hero["id"][] = ["lior", "mara", "teo", "bram"];

export type Pose = {
  phase?: number; // walk cycle 0..1
  stride?: number; // 0 standing, 1 walk, 1.6 run
  attack?: number; // 0..1 weapon swing
  decay?: number; // 0..1 withering (grey + purple motes)
  ghost?: boolean; // translucent echo
};

const sprite = (w: number, h: number) => new Pix(w, h);

/** Small full-body hero, facing right. 16x24 buffer, feet on row 21. */
export const heroSprite = (hero: Hero, pose: Pose = {}): Pix => {
  const s = sprite(16, 24);
  const { phase = 0, stride = 0, attack = 0, decay = 0 } = pose;
  if (decay > 0) s.filter = (c) => gray(c, decay * 0.85);
  const a = phase * Math.PI * 2;
  const run = stride > 1.2;
  const lean = run ? 1 : 0;
  const bob = stride > 0 ? Math.round(Math.abs(Math.sin(a)) * (run ? 1 : 0.6)) : 0;
  const y0 = 1 - bob + (hero.big ? 0 : 1);
  const X = (x: number) => x + lean;

  // Legs
  const dx = Math.round(Math.sin(a) * (run ? 2 : 1.2) * Math.min(1, stride));
  const lift1 = stride > 0 && Math.sin(a) > 0.5 ? 1 : 0;
  const lift2 = stride > 0 && Math.sin(a) < -0.5 ? 1 : 0;
  s.rect(5 - dx, 15 + y0 - lift2, 2, 5, mix(hero.pants, P.ink, 0.25));
  s.rect(5 - dx, 19 + y0 - lift2, 3, 1, hero.boots);
  // Cloak (behind)
  if (hero.cloak) {
    const fl = Math.round(Math.sin(a + 1) * stride);
    s.rect(3 - fl, 9 + y0, 2, 8, hero.cloak);
    s.rect(2 - fl, 13 + y0, 2, 4, hero.cloak);
  }
  // Back-carried weapons
  if (hero.weapon === "bow") {
    s.line(X(3), 6 + y0, X(7), 15 + y0, P.woodHi);
    s.line(X(2), 8 + y0, X(5), 15 + y0, P.fogHi);
  }
  // Torso
  const tw = hero.big ? 7 : 5;
  const tx = hero.big ? 4 : 5;
  s.rect(X(tx), 9 + y0, tw, 6, hero.top);
  s.rect(X(tx), 9 + y0, 1, 6, hero.topDk);
  s.rect(X(tx), 13 + y0, tw, 1, hero.accent);
  if (hero.style === "curly") s.rect(X(tx), 9 + y0, tw, 1, hex("#8a7a63")); // fur collar
  // Front leg
  s.rect(7 + dx, 15 + y0 - lift1, 2, 5, hero.pants);
  s.rect(7 + dx, 19 + y0 - lift1, 3, 1, hero.boots);
  if (hero.weapon === "axe" && attack === 0) {
    s.line(X(tx + tw), 16 + y0, X(tx + 1), 4 + y0, P.woodHi);
    s.rect(X(tx - 1), 2 + y0, 3, 4, P.steel);
    s.set(X(tx - 1), 2 + y0, P.steelDk);
  }
  // Head
  const hx = X(hero.big ? 6 : 6);
  s.rect(hx, 3 + y0, 5, 6, hero.skin);
  s.rect(hx, 3 + y0, 1, 6, hero.skinDk);
  s.set(hx + 3, 5 + y0, P.ink); // eye
  s.set(hx + 4, 5 + y0, hero.eye);
  s.set(hx + 4, 7 + y0, hero.skinDk); // mouth
  // Hair
  if (hero.style === "elf") {
    s.rect(hx - 1, 2 + y0, 6, 2, hero.hair);
    s.rect(hx - 1, 4 + y0, 2, 8, hero.hair);
    s.rect(hx - 1, 4 + y0, 1, 8, hero.hairDk);
    s.set(hx + 5, 3 + y0, hero.hair);
    // pointed ear sweeping back
    s.set(hx + 1, 5 + y0, hero.skin);
    s.set(hx, 4 + y0, hero.skin);
    s.set(hx - 1, 3 + y0, hero.skin);
  } else if (hero.style === "braid") {
    s.rect(hx - 1, 2 + y0, 6, 2, hero.hair);
    s.rect(hx - 1, 4 + y0, 2, 3, hero.hair);
    for (let i = 0; i < 6; i++) s.set(hx - 2 + (i % 2), 7 + y0 + i, i % 2 ? hero.hairDk : hero.hair);
  } else if (hero.style === "short") {
    s.rect(hx - 1, 2 + y0, 6, 2, hero.hair);
    s.rect(hx - 1, 4 + y0, 1, 3, hero.hair);
  } else {
    s.rect(hx - 1, 1 + y0, 7, 3, hero.hair);
    s.rect(hx - 2, 2 + y0, 2, 5, hero.hair);
    s.set(hx + 5, 1 + y0, hero.hairDk);
    s.set(hx - 1, 1 + y0, hero.hairDk);
  }
  // Front arm + held weapons
  const sw = Math.round(-Math.sin(a) * Math.min(1, stride));
  const ax = X(tx + tw - 2);
  if (attack > 0) {
    // raised arm swinging forward
    const ang = -2.2 + attack * 2.6;
    const hxp = ax + 1 + Math.round(Math.cos(ang) * 3);
    const hyp = 10 + y0 + Math.round(Math.sin(ang) * 3);
    s.line(ax + 1, 10 + y0, hxp, hyp, hero.top);
    s.set(hxp, hyp, hero.skin);
    const L = hero.weapon === "staff" ? 9 : hero.weapon === "axe" ? 7 : 8;
    const ex = hxp + Math.round(Math.cos(ang) * L);
    const ey = hyp + Math.round(Math.sin(ang) * L);
    if (hero.weapon === "sword") s.line(hxp, hyp, ex, ey, P.steel);
    if (hero.weapon === "axe") {
      s.line(hxp, hyp, ex, ey, P.woodHi);
      s.rect(ex - 1, ey - 1, 3, 3, P.steel);
    }
    if (hero.weapon === "staff") {
      s.line(hxp, hyp, ex, ey, P.woodHi);
      s.rect(ex - 1, ey - 1, 2, 2, P.blueMagic);
    }
    if (hero.weapon === "bow") {
      s.line(hxp, hyp - 4, hxp, hyp + 4, P.woodHi);
      s.line(hxp + 2, hyp, hxp + 7, hyp, P.fogHi);
    }
  } else {
    s.rect(ax + sw, 10 + y0, 2, 4, hero.topDk);
    s.set(ax + sw, 14 + y0, hero.skin);
    s.set(ax + sw + 1, 14 + y0, hero.skin);
    const hxp = ax + sw + 1;
    const hyp = 14 + y0;
    if (hero.weapon === "sword") {
      s.rect(hxp + 1, hyp - 7, 1, 7, P.steel);
      s.rect(hxp, hyp - 1, 3, 1, P.gold);
    }
    if (hero.weapon === "staff") {
      s.rect(hxp + 1, 2 + y0, 1, 19 - y0, P.woodHi);
      s.rect(hxp, 0 + y0, 3, 2, P.blueMagic);
      s.set(hxp + 1, 0 + y0, P.white);
    }
  }
  s.outline(decay > 0.5 ? mix(P.ink, P.violet, decay) : P.ink);
  s.filter = null;
  return s;
};

export type Expr = "neutral" | "fear" | "pain" | "determined" | "smile";

/** Close-up portrait 44x52 (same palette & features as the sprite). */
export const heroPortrait = (hero: Hero, expr: Expr = "neutral", rim: RGB = P.fog, decay = 0): Pix => {
  const s = new Pix(44, 52);
  if (decay > 0) s.filter = (c) => gray(c, decay * 0.85);
  const cx = 22;
  const cy = 24;
  // Shoulders / outfit
  s.poly([[6, 51], [10, 42], [17, 38], [27, 38], [34, 42], [38, 51]], hero.top);
  s.poly([[6, 51], [10, 42], [17, 38], [19, 38], [14, 51]], hero.topDk);
  if (hero.cloak) {
    s.poly([[4, 51], [8, 41], [14, 38], [12, 51]], hero.cloak);
    s.poly([[40, 51], [36, 41], [30, 38], [32, 51]], hero.cloak);
    s.rect(20, 40, 4, 3, P.gold); // clasp
  }
  if (hero.style === "curly") s.poly([[9, 44], [14, 38], [30, 38], [35, 44], [30, 42], [14, 42]], hex("#8a7a63"));
  if (hero.weapon === "staff") s.rect(36, 6, 2, 46, P.woodHi);
  if (hero.weapon === "staff") s.rect(35, 3, 4, 4, P.blueMagic);
  // Neck
  s.rect(18, 33, 8, 6, hero.skinDk);
  // Back hair
  if (hero.style === "elf") s.poly([[11, 14], [33, 14], [36, 44], [8, 44]], hero.hairDk);
  if (hero.style === "braid") {
    for (let i = 0; i < 9; i++) s.ellipse(34 + (i % 2), 26 + i * 3, 2.2, 1.8, i % 2 ? hero.hairDk : hero.hair);
  }
  // Ears
  if (hero.style === "elf") {
    s.poly([[13, 21], [4, 10], [12, 26]], hero.skin);
    s.poly([[31, 21], [40, 10], [32, 26]], hero.skin);
    s.line(6, 13, 11, 22, hero.skinDk);
    s.line(38, 13, 33, 22, hero.skinDk);
  } else {
    s.ellipse(12.5, 24, 1.8, 3, hero.skinDk);
    s.ellipse(31.5, 24, 1.8, 3, hero.skinDk);
  }
  // Head
  s.ellipse(cx, cy, 9.5, 11, hero.skin);
  s.poly([[14, 28], [30, 28], [26, 35], [18, 35]], hero.skin);
  for (let y = 14; y < 36; y++) for (let x = 12; x < 16; x++) if (s.get(x, y) && (x < 15 || (y > 26 && y < 34))) s.set(x, y, hero.skinDk);
  // Front hair
  if (hero.style === "elf") {
    s.poly([[12, 20], [14, 12], [22, 10], [31, 12], [33, 20], [28, 15], [22, 14], [16, 16]], hero.hair);
    s.rect(11, 18, 2, 18, hero.hair);
    s.rect(31, 18, 2, 18, hero.hair);
  } else if (hero.style === "braid") {
    s.poly([[12, 21], [14, 12], [22, 10], [31, 12], [33, 22], [30, 16], [20, 15], [15, 18]], hero.hair);
    s.line(15, 14, 26, 12, hero.hairDk);
  } else if (hero.style === "short") {
    s.poly([[12, 20], [13, 13], [22, 11], [31, 13], [32, 20], [29, 15], [15, 15]], hero.hair);
  } else {
    for (let i = 0; i < 14; i++) s.ellipse(12 + i * 1.5, 13 + (i % 3), 2.4, 2.4, i % 2 ? hero.hairDk : hero.hair);
    s.rect(11, 14, 3, 8, hero.hair);
    s.rect(31, 14, 3, 8, hero.hair);
  }
  // Brows / eyes / nose / mouth
  const by = expr === "fear" ? 17 : 18;
  if (expr === "determined") {
    s.line(15, 18, 19, 19, hero.hairDk);
    s.line(25, 19, 29, 18, hero.hairDk);
  } else {
    s.rect(15, by, 4, 1, hero.hairDk);
    s.rect(25, by, 4, 1, hero.hairDk);
  }
  if (expr === "pain") {
    s.rect(15, 22, 4, 1, P.ink);
    s.rect(25, 22, 4, 1, P.ink);
  } else {
    const ew = expr === "fear" ? 3 : 2;
    for (const ex of [16, 26]) {
      s.rect(ex - (ew === 3 ? 1 : 0), 21, ew + 1, ew, P.white);
      s.rect(ex, 21, 2, 2, hero.eye);
      s.set(ex + 1, 22, P.ink);
      s.set(ex, 21, P.white);
    }
  }
  s.rect(22, 24, 1, 3, hero.skinDk);
  s.set(21, 27, hero.skinDk);
  if (expr === "fear" || expr === "pain") s.ellipse(22, 31, 2.2, 1.6, P.ink);
  else if (expr === "smile") {
    s.rect(19, 30, 6, 1, hero.skinDk);
    s.set(18, 29, hero.skinDk);
    s.set(25, 29, hero.skinDk);
  } else s.rect(20, 30, 4, 1, hero.skinDk);
  // Rim light on the right side
  for (let y = 0; y < 52; y++)
    for (let x = 43; x > 20; x--)
      if (s.alpha(x, y)) {
        s.set(x, y, mix(s.get(x, y)!, rim, 0.55));
        break;
      }
  s.outline(P.ink);
  s.filter = null;
  return s;
};


// ---------------- The queen / witch (same crown, same violet eyes) ----------------

const crown = (s: Pix, cx: number, y: number, w: number, tarnish = 0) => {
  const g = mix(P.gold, P.fogDk, tarnish);
  const gh = mix(P.goldHi, P.fog, tarnish);
  s.rect(cx - w, y, w * 2 + 1, 2, g);
  for (let i = -w; i <= w; i += Math.max(2, Math.floor(w / 2))) s.rect(cx + i, y - 2, 1, 2, gh);
  s.rect(cx, y - 3, 1, 3, gh);
  s.set(cx, y, P.magic); // violet gem: always present
};

export const QUEEN = {
  skin: hex("#efdccc"),
  skinDk: hex("#c6ab9c"),
  hair: hex("#24142f"),
  hairHi: hex("#3d2550"),
  gown: P.violet2,
  gownDk: P.violet,
  eye: P.magic,
};
export const WITCH = { skin: hex("#b3a493"), skinDk: hex("#857767"), hair: hex("#c9c6c4"), shawl: hex("#3a2a4a") };

/** Queen portrait. beast=0 beautiful … 1 true face. */
export const queenPortrait = (beast = 0, open = 0): Pix => {
  const s = new Pix(48, 56);
  const skin = mix(QUEEN.skin, hex("#8f9a8e"), beast);
  const skinDk = mix(QUEEN.skinDk, hex("#5e665c"), beast);
  // hair mass (wilder when beast)
  s.poly([[8, 54], [10, 18], [24, 8], [38, 18], [40, 54]], QUEEN.hair);
  // gown collar
  s.poly([[4, 56], [12, 44], [36, 44], [44, 56]], QUEEN.gown);
  s.poly([[14, 44], [24, 52], [34, 44], [31, 44], [24, 49], [17, 44]], P.gold);
  s.rect(21, 37, 6, 8, skinDk);
  s.ellipse(24, 26, 9.5 + beast * 1.5, 12 + beast * 2, skin);
  for (let y = 14; y < 40; y++) for (let x = 14; x < 18; x++) if (s.get(x, y) && (x < 17 || y > 30)) s.set(x, y, skinDk);
  // fringe
  s.poly([[14, 20], [16, 13], [24, 11], [32, 13], [34, 20], [28, 15], [20, 16]], QUEEN.hair);
  crown(s, 24, 11, 8);
  // eyes
  for (const ex of [19, 28]) {
    if (beast > 0.5) {
      s.rect(ex - 1, 22, 4, 3, P.ink);
      s.rect(ex, 23, 2, 1, P.magicHi);
    } else {
      s.rect(ex - 1, 23, 4, 2, P.white);
      s.rect(ex, 23, 2, 2, QUEEN.eye);
      s.set(ex + 1, 24, P.ink);
      s.rect(ex - 1, 22, 4, 1, QUEEN.hair); // lashes
    }
  }
  s.rect(24, 26, 1, 3, skinDk);
  if (beast < 0.5) {
    s.rect(21, 32, 6, 1, hex("#8e4a6a"));
    s.set(20, 31, hex("#8e4a6a"));
    s.set(27, 31, hex("#8e4a6a"));
  } else {
    // jaw splits wide (teeth, no gore)
    const h = 3 + Math.round(open * 9);
    s.ellipse(24, 33 + h / 2, 7 + open * 2, h / 2 + 1, P.ink);
    for (let x = 18; x <= 30; x += 2) {
      s.poly([[x, 32], [x + 2, 32], [x + 1, 35]], P.white);
      s.poly([[x, 34 + h], [x + 2, 34 + h], [x + 1, 31 + h]], P.white);
    }
    s.line(14, 28, 18, 32, skinDk);
    s.line(34, 28, 30, 32, skinDk);
  }
  s.outline(P.ink);
  return s;
};

export const witchPortrait = (expr: "calm" | "glare" = "calm"): Pix => {
  const s = new Pix(44, 52);
  s.poly([[4, 52], [8, 20], [22, 8], [36, 20], [40, 52]], WITCH.shawl); // hood
  s.poly([[4, 52], [10, 44], [34, 44], [40, 52]], mix(WITCH.shawl, P.ink, 0.3));
  s.ellipse(22, 27, 8.5, 10.5, WITCH.skin);
  s.poly([[14, 20], [17, 15], [22, 14], [28, 15], [31, 21], [26, 18], [18, 18]], WITCH.hair);
  crown(s, 22, 15, 5, 0.45); // the same crown, tarnished
  // wrinkles
  for (const [x0, y0, x1, y1] of [[15, 30, 18, 33], [29, 30, 26, 33], [17, 19, 20, 19], [24, 19, 27, 19]] as const) s.line(x0, y0, x1, y1, WITCH.skinDk);
  for (const ex of [17, 26]) {
    s.rect(ex - 1, 23, 4, 2, expr === "glare" ? P.ink : hex("#d8d2c8"));
    s.rect(ex, 23, 2, 2, P.magic); // same violet eyes
    if (expr === "glare") s.set(ex + 1, 23, P.magicHi);
  }
  s.rect(22, 26, 1, 4, WITCH.skinDk);
  s.set(23, 29, WITCH.skinDk);
  s.rect(19, 33, 6, 1, WITCH.skinDk);
  s.outline(P.ink);
  return s;
};

/** Queen full body: 16x30, standing, gown flaring. */
export const queenSprite = (beast = 0): Pix => {
  const s = new Pix(16, 30);
  s.poly([[3, 29], [5, 12], [10, 12], [13, 29]], QUEEN.gown);
  s.poly([[3, 29], [5, 12], [7, 12], [6, 29]], QUEEN.gownDk);
  s.rect(5, 18, 6, 1, P.gold);
  s.rect(4, 4, 8, 10, QUEEN.hair);
  s.rect(6, 4, 4, 6, beast ? hex("#8f9a8e") : QUEEN.skin);
  s.set(7, 6, beast ? P.magicHi : QUEEN.eye);
  s.set(9, 6, beast ? P.magicHi : QUEEN.eye);
  if (beast) s.rect(6, 8, 4, 2, P.ink);
  s.rect(5, 2, 6, 2, P.gold);
  s.set(5, 1, P.goldHi);
  s.set(8, 0, P.goldHi);
  s.set(8, 1, P.goldHi);
  s.set(10, 1, P.goldHi);
  s.set(8, 2, P.magic);
  s.outline(P.ink);
  return s;
};

/** Old witch full body: hunched, 16x22, same crown pin. */
export const witchSprite = (): Pix => {
  const s = new Pix(16, 22);
  s.poly([[2, 21], [4, 8], [11, 6], [13, 21]], WITCH.shawl);
  s.rect(6, 5, 5, 5, WITCH.skin);
  s.rect(5, 3, 7, 3, WITCH.shawl);
  s.rect(7, 4, 3, 1, WITCH.hair);
  s.set(8, 3, P.gold);
  s.set(8, 2, P.goldHi);
  s.set(9, 7, P.magic);
  s.set(7, 7, P.magic);
  s.line(13, 9, 14, 21, P.woodHi); // cane
  s.rect(10, 11, 3, 2, WITCH.skin);
  s.outline(P.ink);
  return s;
};

/** Royal soldier: 14x24 armour, spear. */
export const soldierSprite = (phase = 0, stride = 0): Pix => {
  const s = new Pix(14, 24);
  const d = Math.round(Math.sin(phase * Math.PI * 2) * stride);
  s.rect(4 - d, 15, 2, 6, P.steelDk);
  s.rect(7 + d, 15, 2, 6, P.steelDk);
  s.rect(3, 8, 7, 8, P.stoneHi);
  s.rect(3, 8, 2, 8, P.steelDk);
  s.rect(3, 12, 7, 1, P.gold);
  s.rect(4, 2, 6, 6, P.steel);
  s.rect(5, 4, 5, 1, P.ink); // visor
  s.rect(6, 1, 2, 1, P.magicDk); // plume
  s.rect(11, 0, 1, 21, P.woodHi);
  s.set(11, 0, P.steel);
  s.set(10, 1, P.steel);
  s.set(12, 1, P.steel);
  s.outline(P.ink);
  return s;
};

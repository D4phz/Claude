import { Pix, hash, hex, mix, type RGB } from "../castillo/engine";
import { P } from "../castillo/palette";
import type { Look } from "./figure";

export type Face = {
  expr?: "neutral" | "smile" | "fear" | "angry" | "pain" | "shock" | "sad";
  eyes?: "open" | "closed" | "glow";
  decay?: number; // 0..1 melting (1 = the creature)
  rim?: RGB; // rim light colour
  look?: number; // -1 left … 1 right (pupil direction)
};

/** Front-facing close-up, 64x72, three-tone shading. */
export const portrait = (L: Look, f: Face = {}): Pix => {
  const s = new Pix(64, 72);
  const d = f.decay ?? 0;
  const dk = (c: RGB, k = 0.3) => mix(c, P.ink, k);
  const lt = (c: RGB, k = 0.25) => mix(c, P.white, k);
  const melt = hex("#a3ad97");
  const skin = mix(L.skin, melt, d * 0.75);
  const hair = mix(L.hair, hex("#5f645a"), d * 0.6);
  const cx = 32;
  const cy = 34;
  // shoulders & clothes
  s.poly([[4, 72], [10, 60], [22, 54], [42, 54], [54, 60], [60, 72]], L.robe ?? L.top);
  s.poly([[4, 72], [10, 60], [22, 54], [26, 54], [16, 72]], dk(L.robe ?? L.top));
  if (L.hairStyle === "curly") s.rect(10, 62, 6, 10, L.backpack ?? L.top);
  if (L.scarf) {
    s.poly([[20, 55], [44, 55], [46, 61], [18, 61]], L.scarf);
    s.poly([[34, 60], [40, 60], [42, 72], [35, 72]], dk(L.scarf, 0.15));
    for (let x = 20; x < 46; x += 4) s.rect(x, 57, 1, 3, dk(L.scarf, 0.3));
  }
  if (L.hairStyle === "hood") s.poly([[8, 72], [10, 26], [32, 8], [54, 26], [56, 72]], dk(L.robe ?? L.top, 0.15));
  // back hair
  if (L.hairStyle === "braid") s.poly([[17, 24], [47, 24], [46, 46], [18, 46]], dk(hair, 0.2));
  if (L.hairStyle === "crown-long" || L.hairStyle === "long") s.poly([[16, 22], [48, 22], [52, 64], [44, 66], [20, 66], [12, 64]], dk(hair, 0.2));
  if (L.hairStyle === "bob") s.poly([[16, 22], [48, 22], [50, 46], [46, 50], [18, 50], [14, 46]], dk(hair, 0.15));
  // neck
  s.rect(26, 46, 12, 10, dk(skin, 0.2));
  // ears (creature: long, pointed)
  if (d > 0.5) {
    const e = (d - 0.5) * 2;
    for (const sd of [-1, 1]) {
      s.poly([[cx + sd * 12, cy - 2], [cx + sd * (18 + 10 * e), cy - 12 - 8 * e], [cx + sd * 12, cy + 6]], skin);
      s.line(cx + sd * 13, cy, cx + sd * (16 + 9 * e), cy - 10 - 7 * e, dk(skin, 0.3));
    }
  } else for (const sd of [-1, 1]) s.ellipse(cx + sd * 13.5, cy + 2, 2.2, 4, dk(skin, 0.15));
  // head
  s.ellipse(cx, cy, 13, 15, skin);
  s.poly([[cx - 11, cy + 6], [cx + 11, cy + 6], [cx + 6, cy + 16], [cx - 6, cy + 16]], skin);
  for (let y = cy - 14; y < cy + 17; y++)
    for (let x = cx - 14; x < cx - 6; x++) if (s.get(x, y) && (x < cx - 9 || (y > cy + 10 && x < cx - 7))) s.set(x, y, dk(skin, 0.14));
  for (let y = cy - 12; y < cy + 4; y++) for (let x = cx + 3; x < cx + 9; x++) if (s.get(x, y) && (x + y) % 7 === 0) s.set(x, y, lt(skin, 0.12));
  // eyes
  const eyeY = cy + 1;
  const lookX = Math.round((f.look ?? 0) * 1.2);
  for (const sd of [-1, 1]) {
    const ex = cx + sd * 6;
    if (f.eyes === "closed" || f.expr === "pain") {
      s.rect(ex - 3, eyeY, 6, 1, dk(skin, 0.55));
      continue;
    }
    const big = f.expr === "fear" || f.expr === "shock" || d > 0.7;
    const h = big ? 4 : 3;
    s.rect(ex - 3, eyeY - (big ? 2 : 1), 6, h, f.eyes === "glow" ? P.magicDk : P.white);
    if (f.eyes === "glow") {
      s.rect(ex - 1, eyeY - 1, 3, 2, P.magicHi);
      s.glow(ex, eyeY, 7, P.magic, 0.5);
    } else {
      const ic = d > 0.7 ? hex("#cfd8bf") : L.eye;
      s.rect(ex - 1 + lookX, eyeY - 1, 3, big ? 3 : 2, ic);
      s.rect(ex + lookX, eyeY - (big ? 0 : 1), 1, 2, P.ink);
      s.set(ex - 1 + lookX, eyeY - 1, P.white);
    }
    s.rect(ex - 3, eyeY - (big ? 3 : 2), 6, 1, dk(skin, 0.4)); // lid line
  }
  // brows
  const bc = dk(hair, 0.2);
  if (f.expr === "angry") {
    s.line(cx - 9, eyeY - 6, cx - 3, eyeY - 4, bc);
    s.line(cx + 3, eyeY - 4, cx + 9, eyeY - 6, bc);
  } else if (f.expr === "fear" || f.expr === "sad" || f.expr === "shock") {
    s.line(cx - 9, eyeY - 5, cx - 3, eyeY - 7, bc);
    s.line(cx + 3, eyeY - 7, cx + 9, eyeY - 5, bc);
  } else {
    s.rect(cx - 9, eyeY - 6, 6, 1, bc);
    s.rect(cx + 3, eyeY - 6, 6, 1, bc);
  }
  // nose
  s.rect(cx, cy + 3, 1, 5, dk(skin, 0.25));
  s.rect(cx - 2, cy + 8, 4, 1, dk(skin, 0.3));
  // mouth
  const my = cy + 12;
  if (f.expr === "fear" || f.expr === "shock" || f.expr === "pain") s.ellipse(cx, my, f.expr === "shock" ? 3 : 2.4, f.expr === "pain" ? 1.6 : 2.4, P.ink);
  else if (f.expr === "smile") {
    s.rect(cx - 4, my, 8, 1, dk(skin, 0.5));
    s.set(cx - 5, my - 1, dk(skin, 0.5));
    s.set(cx + 4, my - 1, dk(skin, 0.5));
  } else if (f.expr === "sad") {
    s.rect(cx - 3, my, 6, 1, dk(skin, 0.5));
    s.set(cx - 4, my + 1, dk(skin, 0.5));
    s.set(cx + 3, my + 1, dk(skin, 0.5));
  } else s.rect(cx - 3, my, 6, 1, dk(skin, 0.45));
  if (L.freckles) for (const [x, y] of [[-7, 6], [-5, 7], [5, 6], [7, 7], [6, 5]] as const) s.set(cx + x, cy + y, dk(skin, 0.25));
  // front hair
  const hs = L.hairStyle;
  if (hs === "messy" && d < 0.9) {
    s.poly([[cx - 14, cy + 2], [cx - 14, cy - 10], [cx - 4, cy - 18], [cx + 8, cy - 17], [cx + 14, cy - 8], [cx + 14, cy], [cx + 9, cy - 9], [cx + 2, cy - 7], [cx - 3, cy - 10], [cx - 8, cy - 6]], hair);
    for (let i = 0; i < 6; i++) s.poly([[cx - 12 + i * 5, cy - 14], [cx - 14 + i * 5 + (i % 2) * 3, cy - 22 + (i % 2) * 2], [cx - 8 + i * 5, cy - 15]], hair);
    s.line(cx - 6, cy - 14, cx + 4, cy - 15, lt(hair, 0.15));
  } else if (hs === "curly") {
    for (let i = 0; i < 14; i++) s.ellipse(cx - 13 + i * 2, cy - 13 + Math.sin(i) * 2 - (i % 2) * 2, 3.4, 3.4, i % 3 === 0 ? lt(hair, 0.12) : hair);
    s.ellipse(cx - 13, cy - 6, 3, 4, hair);
    s.ellipse(cx + 13, cy - 6, 3, 4, hair);
  } else if (hs === "braid" || hs === "crown-long" || hs === "long") {
    s.poly([[cx - 14, cy + 6], [cx - 14, cy - 8], [cx - 6, cy - 16], [cx + 6, cy - 16], [cx + 14, cy - 8], [cx + 14, cy + 6], [cx + 10, cy - 6], [cx, cy - 10], [cx - 10, cy - 6]], hair);
    s.line(cx - 2, cy - 15, cx - 8, cy - 8, lt(hair, 0.15));
    if (hs === "braid") for (let i = 0; i < 6; i++) s.ellipse(cx + 15 + (i % 2), cy + 8 + i * 4, 2.5, 2.2, i % 2 ? dk(hair, 0.2) : hair);
  } else if (hs === "bob") {
    s.poly([[cx - 15, cy + 10], [cx - 15, cy - 8], [cx - 6, cy - 17], [cx + 7, cy - 17], [cx + 15, cy - 8], [cx + 15, cy + 10], [cx + 11, cy + 10], [cx + 10, cy - 5], [cx - 4, cy - 9], [cx - 11, cy - 3], [cx - 11, cy + 10]], hair);
    s.line(cx - 8, cy - 13, cx + 4, cy - 14, lt(hair, 0.2));
  } else if (hs === "bun") {
    s.poly([[cx - 13, cy - 2], [cx - 12, cy - 11], [cx, cy - 17], [cx + 12, cy - 11], [cx + 13, cy - 2], [cx + 7, cy - 10], [cx - 7, cy - 10]], hair);
    for (let i = 0; i < 5; i++) s.line(cx - 10 + i * 5, cy - 14, cx - 8 + i * 4, cy - 9, dk(hair, 0.2));
  } else if (hs === "helmet") {
    s.poly([[cx - 15, cy + 4], [cx - 15, cy - 8], [cx, cy - 20], [cx + 15, cy - 8], [cx + 15, cy + 4], [cx + 11, cy + 4], [cx + 11, cy - 2], [cx - 11, cy - 2], [cx - 11, cy + 4]], P.steel);
    s.rect(cx - 15, cy - 4, 30, 2, P.steelDk);
  }
  if (d > 0.6) {
    // patchy, thinning hair and melting skin
    for (let i = 0; i < 40 * d; i++) s.set(cx - 12 + hash(i) * 24, cy - 16 + hash(i + 50) * 10, skin);
  }
  if (L.crown) {
    const g = L.hairStyle === "bun" ? mix(P.gold, P.fogDk, 0.4) : P.gold;
    s.rect(cx - 10, cy - 19, 21, 3, g);
    for (const dx of [-10, -5, 0, 5, 10]) s.poly([[cx + dx - 1.5, cy - 19], [cx + dx, cy - 24 - (dx === 0 ? 3 : 0)], [cx + dx + 1.5, cy - 19]], lt(g, 0.2));
    s.rect(cx - 1, cy - 18, 2, 2, P.magic);
  }
  // melting drips & wrinkles
  if (d > 0.15) {
    for (let i = 0; i < Math.floor(d * 14); i++) {
      const x = cx - 11 + hash(i + 3) * 22;
      const y = cy + 4 + hash(i + 9) * 10;
      s.rect(x, y, 1, 2 + Math.floor(hash(i + 11) * 5 * d), dk(skin, 0.18));
      s.set(x, y + 2 + Math.floor(hash(i + 11) * 5 * d), lt(skin, 0.2));
    }
  }
  if (L.hairStyle === "bun") {
    for (const [a, b, c2, e] of [[-9, 6, -6, 9], [9, 6, 6, 9], [-7, -3, -4, -3], [4, -3, 7, -3]] as const) s.line(cx + a, cy + b, cx + c2, cy + e, dk(skin, 0.3));
  }
  // rim light
  const rim = f.rim ?? P.fog;
  for (let y = 0; y < 72; y++)
    for (let x = 63; x > 32; x--)
      if (s.alpha(x, y)) {
        s.set(x, y, mix(s.get(x, y)!, rim, 0.5));
        break;
      }
  s.outline(P.ink);
  return s;
};

/** The queen's true face: same crown and features, jaw splitting open. */
export const monsterQueen = (L: Look, open: number): Pix => {
  const p = portrait({ ...L, skin: hex("#8f9a8e") }, { eyes: "glow", expr: "neutral" });
  const cx = 32;
  const my = 46;
  const h = 3 + Math.round(open * 14);
  p.ellipse(cx, my + h / 2 - 1, 7 + open * 3, h / 2 + 1.5, P.ink);
  for (let x = cx - 8; x <= cx + 7; x += 2) {
    p.poly([[x, my - 1], [x + 2, my - 1], [x + 1, my + 3]], P.white);
    p.poly([[x, my + h], [x + 2, my + h], [x + 1, my + h - 4]], P.white);
  }
  p.line(cx - 13, my - 6, cx - 9, my, hex("#5e665c"));
  p.line(cx + 13, my - 6, cx + 9, my, hex("#5e665c"));
  return p;
};

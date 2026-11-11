// Skeletal pixel figures: every person in the dream is built from one rig, so
// walk / run / attack / fall / chains / drink all animate from joint angles.
import { Pix, hash, hex, mix, type RGB } from "../castillo/engine";
import { P } from "../castillo/palette";

export type Look = {
  skin: RGB;
  hair: RGB;
  eye: RGB;
  top: RGB;
  pants: RGB;
  boots: RGB;
  hairStyle: "messy" | "curly" | "braid" | "bob" | "long" | "bun" | "helmet" | "hood" | "bald" | "crown-long";
  scale?: number; // height multiplier
  width?: number; // torso width multiplier
  scarf?: RGB;
  backpack?: RGB;
  robe?: RGB; // gown / robe over the legs
  sleeves?: "long" | "short";
  belt?: RGB;
  crown?: boolean;
  sheath?: boolean; // sword at the hip
  freckles?: boolean;
};

export type Pose = {
  lean?: number; // torso, radians (+ forward)
  tilt?: number; // head
  armN?: [number, number]; // near arm: shoulder, elbow (radians, 0 = down, + forward)
  armF?: [number, number];
  legN?: [number, number]; // near leg: hip, knee bend (knee bend >= 0)
  legF?: [number, number];
  bob?: number; // px down
  rot?: number; // whole body rotation around the feet (falls)
  reach?: number; // near forearm length multiplier (the queen's arm)
  hold?: "sword" | "goblet" | "key" | "staff" | "spear" | null;
  eyes?: "open" | "closed" | "wide" | "glow";
  mouth?: "closed" | "open" | "smile" | "scream";
  decay?: number; // 0..1 melting
  creature?: boolean; // fully melted, elf-like (the creature)
  wind?: number; // scarf/hair flutter
};

// ---------------------------------------------------------------- poses
export const stand = (): Pose => ({ armN: [0.05, 0.1], armF: [-0.05, 0.1], legN: [0.02, 0], legF: [-0.02, 0] });
export const walk = (ph: number, k = 1): Pose => {
  const a = ph * Math.PI * 2;
  return {
    lean: 0.04 * k,
    armN: [-Math.sin(a) * 0.45 * k, 0.25],
    armF: [Math.sin(a) * 0.45 * k, 0.25],
    legN: [Math.sin(a) * 0.42 * k, Math.max(0, -Math.cos(a)) * 0.6 * k],
    legF: [-Math.sin(a) * 0.42 * k, Math.max(0, Math.cos(a)) * 0.6 * k],
    bob: Math.abs(Math.sin(a * 2)) < 0.3 ? 1 : 0,
  };
};
export const run = (ph: number): Pose => {
  const a = ph * Math.PI * 2;
  return {
    lean: 0.32,
    armN: [-Math.sin(a) * 0.9, 1.3],
    armF: [Math.sin(a) * 0.9, 1.3],
    legN: [Math.sin(a) * 0.85 + 0.1, 0.4 + Math.max(0, -Math.cos(a)) * 1.2],
    legF: [-Math.sin(a) * 0.85 + 0.1, 0.4 + Math.max(0, Math.cos(a)) * 1.2],
    bob: Math.abs(Math.cos(a)) > 0.7 ? 0 : 1,
    wind: 1,
  };
};
export const thrust = (k: number): Pose => ({
  lean: 0.15 + k * 0.25,
  armN: [0.2 + k * 1.35, -0.1 + (1 - k) * 0.9],
  armF: [-0.4, 0.6],
  legN: [0.5 * k, 0.1],
  legF: [-0.45 * k, 0.3],
  hold: "sword",
});
export const chained = (sway = 0): Pose => ({ lean: 0.05, tilt: 0.3, armN: [2.7 + sway * 0.05, 0.25], armF: [-2.7 + 6.28 - sway * 0.05, -0.25], legN: [0.05, 0.05], legF: [-0.05, 0.05], eyes: "closed" });
export const drink = (k: number): Pose => ({ tilt: -0.3 * k, armN: [0.6 + k * 1.2, 1.4 + k * 0.6], armF: [-0.05, 0.1], legN: [0.02, 0], legF: [-0.02, 0], hold: "goblet" });
export const lookUp = (): Pose => ({ ...stand(), tilt: -0.45, lean: -0.08 });
export const fallen = (k: number): Pose => ({ ...stand(), rot: -k * 1.5, eyes: k > 0.5 ? "closed" : "wide", armN: [0.8 * k, 0.4], armF: [-0.6 * k, 0.3], mouth: "open" });

// ---------------------------------------------------------------- render
const TAU = Math.PI * 2;

export const figure = (look: Look, pose: Pose = stand()): Pix => {
  const S = look.scale ?? 1;
  const W = look.width ?? 1;
  const px = new Pix(72, 80);
  const dk = (c: RGB, k = 0.32) => mix(c, P.ink, k);
  const decay = pose.creature ? 1 : pose.decay ?? 0;
  const tint = (c: RGB) => (decay > 0 ? mix(c, hex("#9aa596"), decay * 0.55) : c);
  const skin = pose.creature ? hex("#a9b49c") : tint(look.skin);
  // geometry
  const footY = 74;
  const thigh = 8.5 * S;
  const shin = 8.5 * S;
  const torsoL = 14 * S;
  const upper = 7 * S;
  const lower = 7 * S * (pose.reach ?? 1);
  const hipX = 36;
  const lean = (pose.lean ?? 0) + (pose.creature ? 0.35 : 0);
  const rot = pose.rot ?? 0;
  const pivot: [number, number] = [hipX, footY];
  const R = (x: number, y: number): [number, number] => {
    if (!rot) return [x, y];
    const dx = x - pivot[0];
    const dy = y - pivot[1];
    return [pivot[0] + dx * Math.cos(rot) - dy * Math.sin(rot), pivot[1] + dx * Math.sin(rot) + dy * Math.cos(rot)];
  };
  const H: [number, number] = [hipX, footY - thigh - shin + (pose.bob ?? 0) + (pose.creature ? 2 : 0)];
  const N: [number, number] = [H[0] + Math.sin(lean) * torsoL, H[1] - Math.cos(lean) * torsoL];
  const headA = lean + (pose.tilt ?? 0);
  const HC: [number, number] = [N[0] + Math.sin(headA) * 6 * S + 0.5, N[1] - Math.cos(headA) * 6 * S];

  const capsule = (a: [number, number], b: [number, number], r: number, c: RGB, edge = true) => {
    const [ax, ay] = R(...a);
    const [bx, by] = R(...b);
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    if (edge) for (let i = 0; i <= n; i++) px.ellipse(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, r, r, dk(c, 0.45));
    for (let i = 0; i <= n; i++) px.ellipse(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, edge ? r - 0.8 : r, edge ? r - 0.8 : r, c);
  };
  const leg = (j: [number, number], ang: [number, number], far: boolean) => {
    const K: [number, number] = [j[0] + Math.sin(ang[0]) * thigh, j[1] + Math.cos(ang[0]) * thigh];
    const sa = ang[0] - ang[1];
    const F: [number, number] = [K[0] + Math.sin(sa) * shin, K[1] + Math.cos(sa) * shin];
    const pc = far ? dk(tint(look.pants), 0.25) : tint(look.pants);
    capsule(j, K, 2.4 * W, pc);
    capsule(K, F, 2.2 * W, pc);
    const bootTop: [number, number] = [K[0] + Math.sin(sa) * shin * 0.6, K[1] + Math.cos(sa) * shin * 0.6];
    capsule(bootTop, F, 2.3 * W, far ? dk(look.boots, 0.25) : look.boots);
    const [fx, fy] = R(F[0] + 1.5, F[1] + 0.5);
    px.ellipse(fx, fy, 2.6, 1.3, far ? dk(look.boots, 0.25) : look.boots);
  };
  const arm = (ang: [number, number], far: boolean, holding: boolean) => {
    const Sh: [number, number] = [N[0] + (far ? -1 : 1), N[1] + 2.5];
    const E: [number, number] = [Sh[0] + Math.sin(ang[0]) * upper, Sh[1] + Math.cos(ang[0]) * upper];
    const la = ang[0] + ang[1];
    const Hd: [number, number] = [E[0] + Math.sin(la) * lower, E[1] + Math.cos(la) * lower];
    const sleeve = far ? dk(tint(look.top), 0.25) : tint(look.top);
    capsule(Sh, E, 2 * W, sleeve);
    capsule(E, Hd, 1.8 * W, look.sleeves === "short" ? (far ? dk(skin, 0.2) : skin) : sleeve);
    const [hx, hy] = R(...Hd);
    px.ellipse(hx, hy, 1.6, 1.6, far ? dk(skin, 0.2) : skin);
    if (holding && pose.hold) {
      const dir = [Math.sin(la), Math.cos(la)];
      if (pose.hold === "sword") {
        const len = 15 * S;
        const tip = R(Hd[0] + dir[0] * len, Hd[1] + dir[1] * len);
        px.line(hx, hy, tip[0], tip[1], P.steel);
        px.line(hx + 1, hy, tip[0] + 1, tip[1], P.white);
        px.line(hx - dir[1] * 2.5, hy + dir[0] * 2.5, hx + dir[1] * 2.5, hy - dir[0] * 2.5, P.gold);
      } else if (pose.hold === "goblet") {
        px.rect(hx - 1, hy - 5, 4, 4, P.fogHi);
        px.rect(hx - 1, hy - 5, 4, 1, P.white);
        px.rect(hx, hy - 1, 2, 2, P.fog);
      } else if (pose.hold === "key") {
        px.ellipse(hx + 1, hy - 2, 1.6, 1.6, P.gold);
        px.rect(hx + 2, hy - 2, 4, 1, P.gold);
      } else if (pose.hold === "spear" || pose.hold === "staff") {
        px.line(hx, hy - 20, hx, hy + 12, P.woodHi);
        if (pose.hold === "spear") px.poly([[hx - 1.5, hy - 20], [hx, hy - 25], [hx + 1.5, hy - 20]], P.steel);
        else px.ellipse(hx, hy - 21, 2, 2, mix(P.magic, P.fogHi, 0.2));
      }
    }
  };

  // ---- draw back to front
  if (look.hairStyle === "braid" || look.hairStyle === "long" || look.hairStyle === "crown-long") {
    const tail = look.hairStyle === "braid" ? 16 : 22;
    for (let i = 0; i < tail; i++) {
      const [x, y] = R(HC[0] - 4 - i * 0.15 - (pose.wind ?? 0) * i * 0.35, HC[1] + 2 + i);
      px.rect(x - 1.5, y, 3 + (look.hairStyle === "braid" ? 0 : 2), 1, i % 3 === 0 && look.hairStyle === "braid" ? dk(look.hair) : look.hair);
    }
  }
  if (look.scarf) {
    for (let i = 0; i < 9; i++) {
      const [x, y] = R(N[0] - 2 - i * (0.6 + (pose.wind ?? 0) * 0.5), N[1] + 2 + i * (0.8 - (pose.wind ?? 0) * 0.5) + Math.sin(i + (pose.wind ?? 0) * 3) * 0.6);
      if (decay > 0.5 && hash(i * 3) < 0.4) continue;
      px.rect(x, y, 2, 2, dk(look.scarf, i % 2 ? 0.2 : 0));
    }
  }
  if (look.backpack) {
    const [x, y] = R(N[0] - 5, N[1] + 3);
    px.rect(x, y, 4, 9, look.backpack);
    px.rect(x, y, 1, 9, dk(look.backpack));
  }
  arm(pose.armF ?? [0, 0.1], true, false);
  leg([H[0] - 1.2, H[1]], pose.legF ?? [0, 0], true);
  // torso
  const tw = 4.6 * W;
  const torso = [
    R(N[0] - tw, N[1] + 2),
    R(N[0] + tw, N[1] + 2),
    R(H[0] + tw * 0.85, H[1] + 1),
    R(H[0] - tw * 0.85, H[1] + 1),
  ];
  const top = tint(look.top);
  px.poly(torso, top);
  px.poly([torso[0], R(N[0] - tw + 2.5, N[1] + 2), R(H[0] - tw * 0.85 + 2.5, H[1] + 1), torso[3]], dk(top, 0.25));
  if (look.belt) {
    const [bx, by] = R(H[0] - tw * 0.85, H[1] - 1);
    px.rect(bx, by, tw * 1.7 + 1, 2, look.belt);
  }
  if (look.sheath) {
    const [sx, sy] = R(H[0] - 1, H[1]);
    px.line(sx, sy, sx - 9, sy + 7, P.woodDk);
    px.set(sx + 1, sy - 1, P.gold);
  }
  leg([H[0] + 1.2, H[1]], pose.legN ?? [0, 0], false);
  if (look.robe) {
    const hw = 5 * W;
    const fl = (pose.wind ?? 0) * 3;
    px.poly([R(H[0] - hw, H[1] - 2), R(H[0] + hw, H[1] - 2), R(H[0] + hw + 5 + fl, footY), R(H[0] - hw - 5 - fl, footY)], look.robe);
    px.poly([R(H[0] - hw, H[1] - 2), R(H[0] - hw + 3, H[1] - 2), R(H[0] - hw - 1, footY), R(H[0] - hw - 5 - fl, footY)], dk(look.robe, 0.3));
    px.rect(...R(H[0] - hw - 4, footY - 1), hw * 2 + 9, 1, dk(look.robe, 0.4));
  }
  // neck
  capsule(N, [N[0] + Math.sin(headA) * 2, N[1] - 2], 1.6, dk(skin, 0.15), false);
  // head
  const [hx, hy] = R(...HC);
  const hr = 5.2 * Math.min(1.1, S);
  px.ellipse(hx, hy, hr, hr * 1.06, skin);
  px.ellipse(hx - 1.5, hy + 1, hr * 0.6, hr * 0.8, dk(skin, 0.12));
  px.ellipse(hx + 0.6, hy - 0.3, hr * 0.8, hr * 0.85, skin);
  // creature ear (long, pointed, swept back) – the melted boy
  if (pose.creature || decay > 0.6) {
    const e = pose.creature ? 1 : (decay - 0.6) / 0.4;
    px.poly([R(hx - 1, hy - 1), R(hx - 4 - 7 * e, hy - 5 - 4 * e), R(hx - 2, hy + 2)], skin);
    px.line(...R(hx - 2, hy), ...R(hx - 3 - 6 * e, hy - 4 - 3 * e), dk(skin, 0.3));
  } else {
    px.ellipse(...R(hx - 1.5, hy + 0.5), 1.2, 1.8, dk(skin, 0.2));
  }
  // hair
  const hair = decay > 0 ? mix(look.hair, hex("#6f7468"), decay * 0.5) : look.hair;
  const thin = pose.creature ? 0.35 : 1;
  const hs = look.hairStyle;
  const HP = (x: number, y: number) => R(hx + x, hy + y);
  if (hs === "messy") {
    if (thin > 0.5) {
      px.poly([HP(-5.5, 0), HP(-5, -5), HP(0, -7), HP(5, -5), HP(5.5, -2), HP(1, -3), HP(-2, -2)], hair);
      for (const [x, y] of [[-4, -7], [-1, -8], [2, -7.5], [4.5, -6]] as const) px.line(...HP(x, y), ...HP(x * 0.7, y + 3), hair);
    } else for (let i = 0; i < 5; i++) px.line(...HP(-4 + i * 1.6, -5), ...HP(-5 + i * 1.5, -8 - (i % 2)), hair);
  } else if (hs === "curly") {
    for (let i = 0; i < 9; i++) px.ellipse(...HP(-5 + i * 1.25, -4.5 + (i % 2) * -1.2), 2, 2, i % 2 ? dk(hair, 0.15) : hair);
    px.ellipse(...HP(-5, -1), 2, 2.5, hair);
  } else if (hs === "braid" || hs === "long" || hs === "crown-long") {
    px.poly([HP(-5.6, 3), HP(-5.5, -4), HP(0, -6.5), HP(5, -4.5), HP(5.4, -1), HP(1, -3.5), HP(-2.5, -2)], hair);
  } else if (hs === "bob") {
    px.poly([HP(-5.8, 4), HP(-5.6, -4), HP(0, -6.6), HP(5.2, -4.5), HP(5.6, 0), HP(2, -3), HP(-2, -2.5), HP(-3.5, 4)], hair);
  } else if (hs === "bun") {
    px.poly([HP(-5.4, 1), HP(-5, -4.5), HP(0, -6.4), HP(5, -4), HP(4.8, -2), HP(0, -3.5), HP(-3, -2)], hair);
    px.ellipse(...HP(-4.5, -5.5), 2.8, 2.6, hair);
  } else if (hs === "helmet") {
    px.poly([HP(-6, 2), HP(-5.8, -4.5), HP(0, -7.2), HP(5.8, -4.5), HP(6, 1), HP(4, 1), HP(4, -1), HP(-6, -1)], P.steel);
    px.rect(...HP(-6, -2), 12, 1, P.steelDk);
    px.line(...HP(0, -7), ...HP(-3, -10), P.magicDk);
  } else if (hs === "hood") {
    px.poly([HP(-7, 6), HP(-6.5, -4), HP(0, -8), HP(6, -5), HP(6.5, 1), HP(4, -2.5), HP(-1, -3)], hair);
  }
  if (look.crown) {
    const g = decay > 0 || pose.creature ? mix(P.gold, P.fogDk, 0.45) : P.gold;
    px.rect(...HP(-3.5, -6.5), 8, 2, g);
    for (const dx of [-3.5, -1, 1.5, 4]) px.rect(...HP(dx, -8.5), 1, 2, P.goldHi);
    px.set(...HP(0.5, -6), P.magic);
  }
  // face (profile, looking right)
  const ey = HP(2.4, -0.6);
  const eyes = pose.eyes ?? "open";
  if (eyes === "closed") px.rect(ey[0] - 0.5, ey[1] + 0.5, 2, 1, dk(skin, 0.5));
  else if (eyes === "glow") {
    px.rect(ey[0], ey[1] - 0.5, 2, 2, P.magicHi);
    px.glow(ey[0] + 1, ey[1], 4, P.magic, 0.6);
  } else {
    const big = eyes === "wide" || pose.creature;
    px.rect(ey[0] - (big ? 0.5 : 0), ey[1] - (big ? 0.5 : 0), big ? 3 : 2, big ? 3 : 2, P.white);
    px.set(ey[0] + 1, ey[1], pose.creature ? hex("#d9e0c8") : look.eye);
    px.set(ey[0] + 1, ey[1] + 1, P.ink);
  }
  px.line(...HP(1.6, -2.4), ...HP(4, -2.6), dk(hair, 0.2)); // brow
  px.set(...HP(5.4, 0.8), dk(skin, 0.25)); // nose
  const mouth = pose.mouth ?? "closed";
  if (mouth === "open" || mouth === "scream") px.ellipse(...HP(3.4, 2.9), 1, mouth === "scream" ? 1.6 : 1, P.ink);
  else if (mouth === "smile") px.line(...HP(2.4, 2.6), ...HP(4.2, 2.2), dk(skin, 0.45));
  else px.line(...HP(2.6, 2.8), ...HP(4, 2.8), dk(skin, 0.35));
  if (look.freckles) {
    px.set(...HP(3, 1.2), dk(skin, 0.25));
    px.set(...HP(1.5, 1.4), dk(skin, 0.25));
  }
  arm(pose.armN ?? [0, 0.1], false, true);
  // melting drips
  if (decay > 0.2) {
    for (let i = 0; i < Math.floor(decay * 9); i++) {
      const [x, y] = R(hx - 4 + hash(i) * 9, hy + 3 + hash(i + 5) * 4);
      px.rect(x, y, 1, 2 + Math.floor(hash(i + 9) * 3 * decay), dk(skin, 0.2));
    }
  }
  px.outline(decay > 0.3 || pose.eyes === "glow" ? mix(P.ink, P.violet, 0.4) : P.ink);
  return px;
};

/** Draw a figure into a scene; (x, y) = point between the feet. */
export const drawFigure = (dst: Pix, look: Look, pose: Pose, x: number, y: number, flip = false, scale = 1) => {
  const f = figure(look, pose);
  if (scale === 1) dst.blit(f, x - (flip ? 72 - 36 : 36), y - 74, flip);
  else {
    for (let yy = 0; yy < f.h; yy++)
      for (let xx = 0; xx < f.w; xx++) {
        const sx = flip ? f.w - 1 - xx : xx;
        const c = f.get(sx, yy);
        if (c) dst.rect(Math.round(x - 36 * scale + xx * scale), Math.round(y - 74 * scale + yy * scale), scale, scale, c);
      }
  }
};

export const TAU_ = TAU;

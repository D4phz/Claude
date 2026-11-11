import { hash, hex, mix } from "../castillo/engine";
import { P } from "../castillo/palette";
import type { Look } from "./figure";

// The four youths. "Present" versions are worn (darker, dusty) – same faces,
// clothes and proportions (continuity rule).
export const MAYOR: Look = {
  skin: hex("#c99a76"),
  hair: hex("#1a1418"),
  eye: hex("#4a3426"),
  top: hex("#5a3a2a"), // leather jacket
  pants: hex("#3b3d4a"),
  boots: hex("#231c1c"),
  hairStyle: "messy",
  scale: 1.12,
  scarf: hex("#8e2a2e"), // signature: dark red scarf
  belt: hex("#2a201c"),
  sheath: true,
};
export const CHICO: Look = {
  skin: hex("#efc9a8"),
  hair: hex("#6a4426"),
  eye: hex("#3f6a8a"),
  top: hex("#35548c"), // blue hoodie
  pants: hex("#4a4038"),
  boots: hex("#2a2020"),
  hairStyle: "curly",
  scale: 0.95,
  backpack: hex("#6b5a3a"),
  freckles: true,
};
export const CHICA: Look = {
  skin: hex("#b88462"),
  hair: hex("#151018"),
  eye: hex("#3a2a1a"),
  top: hex("#2f5a44"), // green coat
  pants: hex("#2e2a36"),
  boots: hex("#1e1a1e"),
  hairStyle: "braid",
  scale: 1,
  belt: hex("#7d6228"),
};
export const RUBIA: Look = {
  skin: hex("#f1d6c2"),
  hair: hex("#e2c477"),
  eye: hex("#5a7a4a"),
  top: hex("#a8823a"), // ochre sweater
  pants: hex("#3a3448"),
  boots: hex("#2a2026"),
  hairStyle: "bob",
  scale: 0.97,
};

export const worn = (l: Look): Look => ({
  ...l,
  top: mix(l.top, hex("#3a3036"), 0.35),
  pants: mix(l.pants, hex("#2a2428"), 0.3),
  scarf: l.scarf ? mix(l.scarf, hex("#3a2028"), 0.3) : undefined,
});

export const QUEEN: Look = {
  skin: hex("#efdccc"),
  hair: hex("#24142f"),
  eye: P.magic,
  top: P.violet2,
  pants: P.violet,
  boots: P.violet,
  hairStyle: "crown-long",
  crown: true,
  robe: P.violet2,
  scale: 1.28,
  belt: P.gold,
};
export const WITCH: Look = {
  skin: hex("#b5a593"),
  hair: hex("#c9c6c4"),
  eye: P.magic,
  top: hex("#3a2a4a"),
  pants: hex("#2a2030"),
  boots: hex("#1e1820"),
  hairStyle: "bun",
  crown: true, // the same crown, tarnished: she is the queen
  robe: hex("#3a2a4a"),
  scale: 0.92,
};
export const SOLDIER = (i = 0): Look => ({
  skin: hash(i) > 0.5 ? hex("#d8ad8c") : hex("#9a6a4a"),
  hair: P.steel,
  eye: hex("#2a2a2a"),
  top: P.stoneHi,
  pants: P.steelDk,
  boots: hex("#2a2a34"),
  hairStyle: "helmet",
  belt: P.gold,
  scale: 1.05,
});
export const MAGE = (i = 0): Look => ({
  skin: hash(i + 3) > 0.5 ? hex("#e8c8b0") : hex("#8a5a3e"),
  hair: [hex("#2b3a6a"), hex("#4a2a5a"), hex("#2a4a4a")][i % 3],
  eye: hex("#2a2a2a"),
  top: [hex("#2b3a6a"), hex("#4a2a5a"), hex("#2a4a4a")][i % 3],
  pants: P.ink,
  boots: P.ink,
  hairStyle: "hood",
  robe: [hex("#2b3a6a"), hex("#4a2a5a"), hex("#2a4a4a")][i % 3],
});
export const VILLAGER = (i = 0): Look => ({
  skin: [hex("#e6c3a4"), hex("#b98a66"), hex("#7a5038"), hex("#f0d4bf")][i % 4],
  hair: [hex("#3a2a1a"), hex("#8a5a2a"), hex("#1a1418"), hex("#b0a090")][(i + 1) % 4],
  eye: hex("#2a2a2a"),
  top: [hex("#6a5a3a"), hex("#4a5a3a"), hex("#6a3a3a"), hex("#4a4a5a")][(i + 2) % 4],
  pants: hex("#3a3230"),
  boots: hex("#241e1c"),
  hairStyle: (["messy", "bob", "bun", "curly"] as const)[i % 4],
  sleeves: i % 2 ? "short" : "long",
  robe: i % 3 === 0 ? hex("#5a4a3a") : undefined,
  scale: 0.9 + hash(i + 7) * 0.15,
});
export const SERVANT = (i = 0): Look => ({ ...VILLAGER(i), top: hex("#e0d8c8"), robe: hex("#3a3040"), belt: P.gold });

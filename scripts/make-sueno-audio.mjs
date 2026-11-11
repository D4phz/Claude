// Soundtrack for the full dream (no voices). Reads src/sueno/timeline.ts so
// every ambience change and sound cue lands on its shot. → public/sueno-audio.wav
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("src/sueno/timeline.ts", "utf8");
const shots = [...src.matchAll(/\{ id: "([^"]+)", d: ([0-9.]+), text: "(?:[^"\\]|\\.)*", amb: "([a-z]+)"(?:, sfx: (\[\[.*?\]\]))?/g)].map((m) => ({
  id: m[1],
  d: Number(m[2]),
  amb: m[3],
  sfx: m[4] ? JSON.parse(m[4]) : [],
}));
let acc = 0;
for (const s of shots) {
  s.t0 = acc;
  acc += Math.round(s.d * 30) / 30;
}
const DUR = acc + 0.5;
const SR = 44100;
const N = Math.ceil(SR * DUR);
const L = new Float32Array(N);
const R = new Float32Array(N);
let seed = 33;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (t0, len, fn, pan = 0, gain = 1) => {
  const s0 = Math.floor(t0 * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
  const gr = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
  const n = Math.floor(len * SR);
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    const v = fn(i / SR);
    L[k] += v * gl;
    R[k] += v * gr;
  }
};
const lp = (cut) => {
  let y = 0;
  return () => (y += cut * (rnd() * 2 - 1 - y));
};
const env = (t, a, len, r) => Math.min(1, t / a) * Math.max(0, Math.min(1, (len - t) / r));

// ---------------------------------------------------------------- ambience beds
const BEDS = {
  forest: (t0, len) => {
    const a = lp(0.03);
    const b = lp(0.04);
    add(t0, len, (t) => a() * (0.5 + 0.5 * Math.sin(t * 0.7)) * 0.45 * env(t, 0.5, len, 0.5), -0.3);
    add(t0, len, (t) => b() * (0.5 + 0.5 * Math.sin(t * 0.5 + 2)) * 0.35 * env(t, 0.5, len, 0.5), 0.3);
    for (let c = t0 + 0.2; c < t0 + len - 0.2; c += 0.35 + rnd() * 0.35) {
      const f = 4100 + rnd() * 700;
      const pan = rnd() * 1.6 - 0.8;
      for (let k = 0; k < 3; k++) add(c + k * 0.045, 0.03, (t) => Math.sin(2 * Math.PI * f * t) * Math.sin((Math.PI * t) / 0.03) * 0.018, pan);
    }
    if (len > 4 && rnd() > 0.5) for (const [d, l] of [[0, 0.35], [0.5, 0.25], [0.8, 0.5]]) add(t0 + 1 + d, l, (t) => Math.sin(2 * Math.PI * (380 - t * 60) * t) * Math.sin((Math.PI * t) / l) * 0.05, -0.6);
  },
  field: (t0, len) => {
    const a = lp(0.02);
    add(t0, len, (t) => a() * (0.6 + 0.4 * Math.sin(t * 0.4)) * 0.6 * env(t, 0.5, len, 0.5));
  },
  castle: (t0, len) => {
    [38, 45, 50].forEach((m, j) => add(t0, len, (t) => Math.sin(2 * Math.PI * midi(m) * t) * 0.03 * env(t, 0.8, len, 0.8), (j - 1) * 0.4));
    const a = lp(0.15);
    add(t0, len, (t) => a() * 0.03 * env(t, 0.5, len, 0.5));
  },
  crowd: (t0, len) => {
    BEDS.castle(t0, len);
    const a = lp(0.08);
    add(t0, len, (t) => a() * (0.6 + 0.4 * Math.sin(t * 3.1) * Math.sin(t * 1.7)) * 0.35 * env(t, 0.5, len, 0.5));
    for (let c = t0; c < t0 + len; c += 0.25 + rnd() * 0.3) add(c, 0.1, (t) => Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 40) * 0.12, rnd() - 0.5);
  },
  night: (t0, len) => {
    [37, 44].forEach((m, j) => add(t0, len, (t) => (Math.sin(2 * Math.PI * midi(m) * t) + 0.5 * Math.sin(2 * Math.PI * midi(m) * 1.006 * t)) * 0.035 * env(t, 1, len, 0.8), j ? 0.4 : -0.4));
    const a = lp(0.2);
    for (let c = t0; c < t0 + len; c += 0.06 + rnd() * 0.15) add(c, 0.01, () => (rnd() * 2 - 1) * 0.08, 0.6); // torch crackle
  },
  battle: (t0, len) => {
    BEDS.crowd(t0, len);
    const a = lp(0.03);
    add(t0, len, (t) => a() * 0.8 * env(t, 0.3, len, 0.3));
  },
  sky: (t0, len) => {
    const a = lp(0.05);
    add(t0, len, (t) => a() * (0.7 + 0.3 * Math.sin(t * 2)) * 0.8 * env(t, 0.5, len, 0.5));
  },
  cabin: (t0, len) => {
    const a = lp(0.25);
    add(t0, len, (t) => a() * 0.035 * env(t, 0.3, len, 0.3));
    for (let c = t0; c < t0 + len; c += 0.05 + rnd() * 0.18) add(c, 0.012, () => (rnd() * 2 - 1) * 0.18, rnd() - 0.5);
    add(t0, len, (t) => Math.sin(2 * Math.PI * midi(45) * t) * 0.02 * env(t, 1, len, 1));
  },
  dungeon: (t0, len) => {
    add(t0, len, (t) => Math.sin(2 * Math.PI * 41 * t) * 0.06 * env(t, 1, len, 1));
    for (let c = t0 + 0.7; c < t0 + len; c += 1.3 + rnd()) add(c, 0.4, (t) => Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 18) * 0.06, rnd() - 0.5); // drips
  },
  milk: (t0, len) => {
    BEDS.dungeon(t0, len);
    add(t0, len, (t) => Math.sin(2 * Math.PI * 55 * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 1.2 * t)) * 0.08 * env(t, 0.5, len, 0.5));
  },
  purple: (t0, len) => {
    add(t0, len, (t) => {
      const tr = 0.6 + 0.4 * Math.sin(2 * Math.PI * 5.5 * t);
      return (Math.sin(2 * Math.PI * 110 * t) + Math.sin(2 * Math.PI * 110.7 * t) + 0.5 * Math.sin(2 * Math.PI * 165.4 * t)) * tr * 0.04 * env(t, 0.6, len, 0.6);
    });
    for (let i = 0; i < len * 5; i++) {
      const f = 1500 + rnd() * 2200;
      add(t0 + rnd() * len, 0.5, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 8) * 0.015, rnd() * 2 - 1);
    }
  },
  chase: (t0, len) => {
    BEDS.purple(t0, len);
    for (let c = t0; c < t0 + len; c += 0.19) add(c, 0.12, (t) => Math.sin(2 * Math.PI * (80 + 40 * Math.exp(-t * 40)) * t) * Math.exp(-t * 30) * 0.22);
    const a = lp(0.08);
    add(t0, len, (t) => a() * 0.25 * env(t, 0.5, len, 0.5));
  },
  black: () => {},
};

// ---------------------------------------------------------------- one-shot sounds
const bell = (t0, g = 1) => [1, 2.4, 3.9, 5.2].forEach((r, i) => add(t0, 4, (t) => Math.sin(2 * Math.PI * 196 * r * t) * Math.exp(-t * (1 + i)) * 0.07, 0, g));
const boom = (t0, g = 1) => {
  add(t0, 3, (t) => Math.sin(2 * Math.PI * (34 + 55 * Math.exp(-t * 7)) * t) * Math.exp(-t * 1.3) * 0.5, 0, g);
  const n = lp(0.07);
  add(t0, 1.5, (t) => n() * Math.exp(-t * 3) * 0.6, 0, g);
};
const SFX = {
  bell,
  boom,
  steps: (t0) => {
    for (let k = 0; k < 8; k++) add(t0 + k * 0.42, 0.12, (t) => Math.sin(2 * Math.PI * (90 + 40 * Math.exp(-t * 40)) * t) * Math.exp(-t * 30) * 0.12, k % 2 ? 0.2 : -0.2);
    const n = lp(0.3);
    for (let k = 0; k < 8; k++) add(t0 + k * 0.42, 0.08, (t) => n() * Math.exp(-t * 40) * 0.12);
  },
  run: (t0) => {
    for (let k = 0; k < 10; k++) add(t0 + k * 0.18, 0.1, (t) => Math.sin(2 * Math.PI * (90 + 40 * Math.exp(-t * 40)) * t) * Math.exp(-t * 30) * 0.18);
  },
  rustle: (t0) => {
    const n = lp(0.35);
    add(t0, 0.9, (t) => n() * Math.sin((Math.PI * t) / 0.9) * 0.3, 0.5);
  },
  heartbeat: (t0) => {
    for (let k = 0; k < 4; k++) for (const [d, a] of [[0, 1], [0.17, 0.7]]) add(t0 + k * 0.85 + d, 0.3, (t) => Math.sin(2 * Math.PI * (48 + 25 * Math.exp(-t * 30)) * t) * Math.exp(-t * 14) * 0.35 * a);
  },
  draw: (t0) => {
    const n = lp(0.5);
    add(t0, 0.6, (t) => (n() * 0.12 + Math.sin(2 * Math.PI * (2400 + 1200 * t) * t) * 0.025) * Math.sin((Math.PI * t) / 0.6), 0.2);
  },
  stab: (t0) => {
    const n = lp(0.25);
    add(t0, 0.25, (t) => n() * Math.sin((Math.PI * t) / 0.25) * 0.5, 0.2);
    add(t0 + 0.12, 0.5, (t) => Math.sin(2 * Math.PI * (60 + 60 * Math.exp(-t * 20)) * t) * Math.exp(-t * 8) * 0.45);
  },
  slash: (t0) => {
    const n = lp(0.3);
    add(t0, 0.22, (t) => n() * Math.sin((Math.PI * t) / 0.22) * 0.45, rnd() - 0.5);
  },
  clang: (t0) => [1, 2.76, 5.4, 8.93].forEach((r, i) => add(t0, 1, (t) => Math.sin(2 * Math.PI * 520 * r * t) * Math.exp(-t * (5 + i * 3)) * 0.06, rnd() - 0.5)),
  zap: (t0) => add(t0, 0.4, (t) => Math.sin(2 * Math.PI * (1800 - 3000 * t) * t) * Math.exp(-t * 8) * 0.07, -0.3),
  thud: (t0) => add(t0, 0.6, (t) => Math.sin(2 * Math.PI * (50 + 70 * Math.exp(-t * 18)) * t) * Math.exp(-t * 6) * 0.45),
  swell: (t0) => [50, 57, 62, 69].forEach((m, j) => add(t0, 4.5, (t) => Math.sin(2 * Math.PI * midi(m) * t) * Math.min(1, t / 2) * Math.exp(-Math.max(0, t - 2.5) * 1.5) * 0.04, (j - 1.5) * 0.3)),
  door: (t0) => add(t0, 1.2, (t) => Math.sin(2 * Math.PI * (180 + 120 * Math.sin(t * 9)) * t) * Math.sin((Math.PI * t) / 1.2) * 0.05, -0.4),
  creak: (t0) => add(t0, 0.9, (t) => Math.sin(2 * Math.PI * (300 + 200 * Math.sin(t * 13)) * t) * Math.sin((Math.PI * t) / 0.9) * 0.04, 0.4),
  chime: (t0) => [76, 79, 83].forEach((m, i) => add(t0 + i * 0.12, 1.5, (t) => Math.sin(2 * Math.PI * midi(m) * t) * Math.exp(-t * 3) * 0.04, (i - 1) * 0.4)),
  sting: (t0) => {
    [49, 50, 56, 61].forEach((m) => add(t0, 2.5, (t) => Math.sin(2 * Math.PI * midi(m) * t) * Math.exp(-t * 1.2) * 0.05));
    const n = lp(0.1);
    add(t0 - 0.8, 0.8, (t) => n() * Math.pow(t / 0.8, 3) * 0.5);
  },
  stretch: (t0) => add(t0, 3.5, (t) => Math.sin(2 * Math.PI * (70 + 40 * t) * t + Math.sin(t * 40) * 2) * 0.08 * Math.min(1, t), 0),
  grab: (t0) => {
    SFX.thud(t0);
    const n = lp(0.4);
    add(t0, 0.3, (t) => n() * Math.exp(-t * 12) * 0.4);
  },
  crunch: (t0) => {
    for (let k = 0; k < 6; k++) add(t0 + k * 0.07 + rnd() * 0.03, 0.05, () => (rnd() * 2 - 1) * 0.3, rnd() * 0.4 - 0.2);
  },
  tear: (t0) => {
    const n = lp(0.6);
    add(t0, 1, (t) => n() * (0.5 + 0.5 * Math.sin(t * 80)) * Math.sin((Math.PI * t) / 1) * 0.35);
  },
  rumble: (t0) => {
    const n = lp(0.02);
    add(t0, 4, (t) => n() * Math.min(1, t / 1.5) * Math.min(1, (4 - t) / 0.5) * 1.8);
  },
  crash: (t0) => {
    boom(t0, 1.2);
    for (let k = 0; k < 40; k++) add(t0 + 0.1 + rnd() * 2, 0.05, () => (rnd() * 2 - 1) * 0.15, rnd() * 2 - 1);
  },
  magic: (t0) => {
    add(t0, 2, (t) => (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 221.3 * t)) * Math.sin((Math.PI * t) / 2) * 0.04);
    for (let i = 0; i < 12; i++) {
      const f = 1800 + rnd() * 2000;
      add(t0 + rnd() * 1.6, 0.4, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9) * 0.03, rnd() * 2 - 1);
    }
  },
  chain: (t0) => {
    for (let k = 0; k < 5; k++) [1, 2.3, 3.7].forEach((r) => add(t0 + k * 0.09, 0.25, (t) => Math.sin(2 * Math.PI * 900 * r * t) * Math.exp(-t * 25) * 0.04, 0.3));
  },
  grind: (t0) => {
    const n = lp(0.4);
    add(t0, 4.5, (t) => (n() * 0.3 + Math.sin(2 * Math.PI * 60 * t) * 0.2) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 3 * t)) * Math.min(1, t) * Math.min(1, (4.5 - t) / 0.5));
  },
  pour: (t0) => {
    const n = lp(0.5);
    add(t0, 1.6, (t) => n() * (0.6 + 0.4 * Math.sin(t * 60)) * Math.sin((Math.PI * t) / 1.6) * 0.15, 0.5);
  },
  drink: (t0) => {
    for (let k = 0; k < 3; k++) add(t0 + k * 0.45, 0.2, (t) => Math.sin(2 * Math.PI * (140 - t * 200) * t) * Math.exp(-t * 15) * 0.25);
  },
  key: (t0) => [1, 2.9, 4.1].forEach((r) => add(t0, 0.5, (t) => Math.sin(2 * Math.PI * 1400 * r * t) * Math.exp(-t * 14) * 0.035, 0.3)),
  melt: (t0) => add(t0, 3, (t) => Math.sin(2 * Math.PI * (200 - 60 * t) * t + Math.sin(t * 17) * 3) * 0.05 * Math.sin((Math.PI * t) / 3)),
  crowd: (t0) => BEDS.crowd(t0, 3),
};

// ---------------------------------------------------------------- music & motif
const musicBox = (t0, g = 1) => [74, 77, 81, 79, 77, 76, 74, 69].forEach((m, i) => add(t0 + i * 0.42, 1.6, (t) => (Math.sin(2 * Math.PI * midi(m) * t) + 0.3 * Math.sin(2 * Math.PI * midi(m) * 3.01 * t) * Math.exp(-t * 6)) * Math.exp(-t * 2.6) * 0.06, 0.25, g));
const prog = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]];
for (let i = 0; i * 8 < DUR; i++) prog[i % 4].forEach((m, j) => add(i * 8 - 0.5, 9.5, (t) => (Math.sin(2 * Math.PI * midi(m) * t) + 0.4 * Math.sin(2 * Math.PI * midi(m) * 1.003 * t + j)) * env(t, 2, 9.5, 2.5) * (j === 0 ? 0.035 : 0.014), (j - 2) * 0.3));

for (const s of shots) {
  (BEDS[s.amb] ?? BEDS.field)(s.t0, s.d + 0.15);
  for (const [off, name] of s.sfx) (SFX[name] ?? (() => console.warn("no sfx", name)))(s.t0 + off);
  if (["title", "ch1", "rebuilt", "castleAgain", "beginAgain", "end"].includes(s.id)) musicBox(s.t0 + 0.3);
  if (s.id === "end") {
    boom(s.t0, 1.2);
    for (let k = 1; k <= 5; k++) bell(s.t0 + k * 0.35, 0.5 / k);
  }
}

// space + master
const d = Math.floor(0.31 * SR);
for (let i = d; i < N; i++) {
  L[i] += R[i - d] * 0.2;
  R[i] += L[i - d] * 0.2;
}
const out = Buffer.alloc(44 + N * 4);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.3) * Math.min(1, (DUR - t) / 1.2);
  out.writeInt16LE(Math.round(Math.tanh(L[i] * 1.5) * 0.85 * fade * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(Math.tanh(R[i] * 1.5) * 0.85 * fade * 32767), 46 + i * 4);
}
out.write("RIFF", 0);
out.writeUInt32LE(36 + N * 4, 4);
out.write("WAVEfmt ", 8);
out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20);
out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32);
out.writeUInt16LE(16, 34);
out.write("data", 36);
out.writeUInt32LE(N * 4, 40);
mkdirSync("public", { recursive: true });
writeFileSync("public/sueno-audio.wav", out);
console.log(`public/sueno-audio.wav ${DUR.toFixed(1)}s, ${shots.length} shots`);

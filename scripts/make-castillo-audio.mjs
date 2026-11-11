// Ambience, effects and music for "El castillo que siempre regresa" (60 s).
// No voices. Deterministic synthesis; writes public/castillo-audio.wav.
import { mkdirSync, writeFileSync } from "node:fs";

const SR = 44100;
const DUR = 60;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);
let seed = 21;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (t0, len, fn, pan = 0, gain = 1) => {
  const s0 = Math.floor(t0 * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
  const gr = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
  for (let i = 0; i < len * SR; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    const v = fn(i / SR, i);
    L[k] += v * gl;
    R[k] += v * gr;
  }
};
const noiseLP = (cut) => {
  let y = 0;
  return () => (y += cut * (rnd() * 2 - 1 - y));
};
const env = (t, a, len, rel) => Math.min(1, t / a) * Math.min(1, Math.max(0, (len - t) / rel));

// ---------------------------------------------------------------- beds
const forestBed = (t0, len, gain = 1, muffled = false) => {
  const n = noiseLP(muffled ? 0.01 : 0.03);
  add(t0, len, (t) => n() * (0.5 + 0.5 * Math.sin(t * 0.7 + 1)) * 0.5 * env(t, 0.6, len, 0.6), -0.2, gain);
  const n2 = noiseLP(muffled ? 0.012 : 0.04);
  add(t0, len, (t) => n2() * (0.5 + 0.5 * Math.sin(t * 0.5)) * 0.4 * env(t, 0.6, len, 0.6), 0.3, gain);
  if (!muffled)
    for (let c = t0 + 0.2; c < t0 + len - 0.3; c += 0.37 + rnd() * 0.3) {
      const f = 4200 + rnd() * 600;
      const pan = rnd() * 1.6 - 0.8;
      for (let k = 0; k < 3; k++) add(c + k * 0.045, 0.03, (t) => Math.sin(2 * Math.PI * f * t) * Math.sin((Math.PI * t) / 0.03) * 0.025, pan, gain);
    }
};
const owl = (t0) => {
  for (const [d, len] of [[0, 0.35], [0.5, 0.25], [0.8, 0.5]])
    add(t0 + d, len, (t) => Math.sin(2 * Math.PI * (380 - t * 60) * t) * Math.sin((Math.PI * t) / len) * 0.07, -0.6);
};
const drone = (t0, len, notes, gain = 0.05) => {
  notes.forEach((m, j) =>
    add(t0, len, (t) => {
      const f = midi(m);
      return (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 1.003 * t + j) + 0.15 * Math.sin(4 * Math.PI * f * t)) * env(t, 1.2, len, 1.2) * gain;
    }, (j - notes.length / 2) * 0.3),
  );
};
const crackle = (t0, len, gain = 1) => {
  const n = noiseLP(0.2);
  add(t0, len, (t) => n() * 0.05 * env(t, 0.3, len, 0.3), 0, gain);
  for (let c = t0; c < t0 + len; c += 0.05 + rnd() * 0.18) add(c, 0.012, () => (rnd() * 2 - 1) * 0.25, rnd() - 0.5, gain);
};

// ---------------------------------------------------------------- effects
const musicBox = (t0, gain = 1) => {
  const seq = [74, 77, 81, 79, 77, 76, 74, 69];
  seq.forEach((m, i) =>
    add(t0 + i * 0.42, 1.6, (t) => {
      const f = midi(m);
      return (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 3.01 * t) * Math.exp(-t * 6)) * Math.exp(-t * 2.6) * 0.07;
    }, 0.25, gain),
  );
};
const clang = (t0, g = 1) => {
  [1, 2.76, 5.4, 8.93].forEach((r, i) => add(t0, 1.2, (t) => Math.sin(2 * Math.PI * 520 * r * t) * Math.exp(-t * (5 + i * 3)) * 0.07, (rnd() - 0.5) * 0.8, g));
  const n = noiseLP(0.6);
  add(t0, 0.08, (t) => n() * Math.exp(-t * 50) * 0.4, 0, g);
};
const slash = (t0, g = 1) => {
  const n = noiseLP(0.25);
  add(t0, 0.25, (t) => n() * Math.sin((Math.PI * t) / 0.25) * 0.45, 0.3, g);
};
const thud = (t0, g = 1) => add(t0, 0.6, (t) => Math.sin(2 * Math.PI * (50 + 70 * Math.exp(-t * 18)) * t) * Math.exp(-t * 6) * 0.5, 0, g);
const boom = (t0, g = 1) => {
  add(t0, 3, (t) => Math.sin(2 * Math.PI * (34 + 55 * Math.exp(-t * 7)) * t) * Math.exp(-t * 1.3) * 0.55, 0, g);
  const n = noiseLP(0.07);
  add(t0, 1.5, (t) => n() * Math.exp(-t * 3) * 0.7, 0, g);
};
const zap = (t0, g = 1) => add(t0, 0.35, (t) => Math.sin(2 * Math.PI * (1800 - 3000 * t) * t) * Math.exp(-t * 9) * 0.08, -0.3, g);
const whooshRev = (t0, len = 0.8, g = 1) => {
  const n = noiseLP(0.1);
  add(t0 - len, len, (t) => n() * Math.pow(t / len, 3) * 0.6, 0, g);
};
const heartbeat = (t0, len, bpm0, bpm1, g = 1) => {
  let t = 0;
  while (t < len) {
    const bpm = bpm0 + ((bpm1 - bpm0) * t) / len;
    for (const [d, a] of [[0, 1], [0.16, 0.7]]) add(t0 + t + d, 0.3, (x) => Math.sin(2 * Math.PI * (48 + 25 * Math.exp(-x * 30)) * x) * Math.exp(-x * 14) * 0.35 * a, 0, g);
    t += 60 / bpm;
  }
};
const magicHum = (t0, len, g = 1) => {
  add(t0, len, (t) => {
    const trem = 0.6 + 0.4 * Math.sin(2 * Math.PI * 5.5 * t);
    return (Math.sin(2 * Math.PI * 110 * t) + Math.sin(2 * Math.PI * 110.7 * t) + 0.5 * Math.sin(2 * Math.PI * 165.4 * t)) * trem * 0.05 * env(t, 0.8, len, 0.6);
  }, 0, g);
  for (let i = 0; i < len * 6; i++) {
    const f = 1500 + rnd() * 2000;
    add(t0 + rnd() * len, 0.5, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 8) * 0.018, rnd() * 2 - 1, g);
  }
};
const rumble = (t0, len, g = 1) => {
  const n = noiseLP(0.02);
  add(t0, len, (t) => n() * Math.pow(t / len, 1.5) * 1.6, 0, g);
};
const steps = (t0, len, rate, g = 1, echo = false) => {
  for (let t = 0; t < len; t += 1 / rate) {
    add(t0 + t, 0.12, (x) => Math.sin(2 * Math.PI * (90 + 40 * Math.exp(-x * 40)) * x) * Math.exp(-x * 30) * 0.25, 0, g);
    if (echo) [0.15, 0.3].forEach((d, i) => add(t0 + t + d, 0.12, (x) => Math.sin(2 * Math.PI * 110 * x) * Math.exp(-x * 30) * 0.12 / (i + 1), i ? 0.5 : -0.5, g));
  }
};
const scrape = (t0) => {
  const n = noiseLP(0.5);
  add(t0, 0.7, (t) => (n() * 0.15 + Math.sin(2 * Math.PI * (2400 + 900 * t) * t) * 0.03) * Math.sin((Math.PI * t) / 0.7), 0.2);
};
const bell = (t0, g = 1) => [1, 2.4, 3.9, 5.2].forEach((r, i) => add(t0, 4, (t) => Math.sin(2 * Math.PI * 196 * r * t) * Math.exp(-t * (1 + i)) * 0.08, 0, g));

// ---------------------------------------------------------------- timeline
// music bed: dark pad (D minor) through everything, low
const prog = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]];
for (let i = 0; i < 7; i++) drone(i * 8, 8.6, prog[i % 4], 0.022);

forestBed(0, 4.2); owl(1.1); musicBox(0.3);
drone(4, 4, [38, 45], 0.06); add(5.1, 0.6, (t) => Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 14) * 0.05, 0.6); // chain clink
steps(8.2, 1.8, 2.2, 0.8); crackle(8, 4, 0.7);
heartbeat(10, 4, 60, 90);
whooshRev(14, 1.2, 1.2); boom(14, 0.9); add(14, 1.4, (t) => Math.sin(2 * Math.PI * (900 + 600 * Math.sin(t * 30)) * t) * Math.exp(-t * 2.5) * 0.06, 0); // shriek (synthetic, not a voice)
drone(14, 2, [49, 50, 56], 0.05);
[16.1, 16.6, 17.1, 17.6].forEach((t, i) => (i % 2 ? slash(t) : clang(t)));
zap(16.5); zap(17.3);
rumble(18, 1.9, 1); boom(19.85, 1.1);
forestBed(20, 4, 0.8); crackle(22, 2, 0.4);
crackle(24, 4, 1); drone(24, 2, [41, 48], 0.05);
slash(26.6); thud(26.9);
whooshRev(28, 1.0, 1.1); bell(28, 1);
forestBed(28, 4, 0.9); musicBox(29.0, 0.9);
steps(32, 2, 5, 0.7);
whooshRev(34.4, 0.7); magicHum(34.4, 1.4, 0.6);
for (let k = 0; k < 4; k++) (k % 2 ? slash : whooshRev)(36 + k * 0.5 + (k % 2 ? 0 : 0.45), 0.9);
magicHum(38, 6, 1);
for (let c = 40; c < 42; c += 0.2 + rnd() * 0.2) add(c, 0.03, () => (rnd() * 2 - 1) * 0.12, rnd() - 0.5); // brittle crackles
add(42, 2.2, (t) => Math.sin(2 * Math.PI * 41 * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 1.5 * t)) * 0.25 * env(t, 0.3, 2.2, 0.4)); // spreading pulse
heartbeat(44, 4, 80, 140, 1);
scrape(46.6);
whooshRev(48, 0.4); thud(48, 1.2); bell(48.02, 0.7);
forestBed(50, 4, 0.7, true); musicBox(50.3, 0.8); heartbeat(50, 2, 50, 30, 0.6);
steps(52, 2, 6, 0.7, true);
forestBed(54, 2.2, 0.7); rumble(54, 2, 0.35);
// rising music 56–58: ascending arpeggio + swell
const asc = [62, 65, 69, 72, 74, 77, 81, 84];
asc.forEach((m, i) => add(56 + i * 0.24, 1.2, (t) => Math.sin(2 * Math.PI * midi(m) * t) * Math.exp(-t * 2) * 0.06 * (0.6 + i * 0.07), (i % 2) - 0.5));
drone(56, 2.2, [50, 57, 62, 69], 0.06);
add(56, 2, (t) => Math.sin(2 * Math.PI * midi(38) * t) * (t / 2) * 0.12);
// final hit + echo
boom(58, 1.3); bell(58, 1.2);
for (let k = 1; k <= 5; k++) bell(58 + k * 0.34, 0.5 / k);

// space: stereo echo, master
const d = Math.floor(0.29 * SR);
for (let i = d; i < N; i++) {
  L[i] += R[i - d] * 0.22;
  R[i] += L[i - d] * 0.22;
}
const out = Buffer.alloc(44 + N * 4);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.3) * Math.min(1, (DUR - t) / 0.8);
  out.writeInt16LE(Math.round(Math.tanh(L[i] * 1.4) * 0.85 * fade * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(Math.tanh(R[i] * 1.4) * 0.85 * fade * 32767), 46 + i * 4);
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
writeFileSync("public/castillo-audio.wav", out);
console.log("public/castillo-audio.wav", DUR + "s");

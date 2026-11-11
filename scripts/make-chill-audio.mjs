// Generates public/chill.wav: a 10-second lo-fi loop (electric-piano chords,
// bass, soft drums, a little melody, vinyl crackle). Deterministic; no deps.
// Usage: node scripts/make-chill-audio.mjs [seconds]
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 44100;
const DUR = Number(process.argv[2] ?? 10);
const N = Math.floor(SR * DUR);
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

const BPM = 84;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const add = (t0, fn, len, pan = 0) => {
  const s0 = Math.floor(t0 * SR);
  const n = Math.floor(len * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n && s0 + i < N; i++) {
    if (s0 + i < 0) continue;
    const v = fn(i / SR);
    L[s0 + i] += v * gl;
    R[s0 + i] += v * gr;
  }
};

// Electric piano: sine + soft bell partial, tremolo, exponential decay.
const ep = (note, vel, len) => (t) => {
  const f = midi(note);
  const env = Math.min(1, t / 0.008) * Math.exp(-t * 1.6) * Math.min(1, (len - t) / 0.08);
  const trem = 1 + 0.12 * Math.sin(2 * Math.PI * 4.5 * t);
  const tone =
    Math.sin(2 * Math.PI * f * t) +
    0.25 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 6) +
    0.08 * Math.sin(2 * Math.PI * f * 14 * t) * Math.exp(-t * 18);
  return tone * env * trem * vel;
};

const bass = (note, len) => (t) => {
  const f = midi(note);
  const env = Math.min(1, t / 0.02) * Math.exp(-t * 0.9) * Math.min(1, (len - t) / 0.05);
  return (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(2 * Math.PI * f * 2 * t)) * env * 0.35;
};

const kick = (t) => {
  const f = 45 + 90 * Math.exp(-t * 30);
  return Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9) * 0.55;
};

const noiseHit = (decay, gain, lp) => {
  let y = 0;
  return (t) => {
    y += lp * ((rnd() * 2 - 1) - y);
    return y * Math.exp(-t * decay) * gain;
  };
};

// Fmaj7 – Em7 – Dm7 – Cmaj7 (voiced around middle C)
const chords = [
  { root: 41, notes: [57, 60, 64, 65] },
  { root: 40, notes: [55, 59, 62, 64] },
  { root: 38, notes: [53, 57, 60, 62] },
  { root: 36, notes: [52, 55, 59, 60] },
];

const bars = Math.ceil(DUR / BAR) + 1;
for (let b = 0; b < bars; b++) {
  const c = chords[b % chords.length];
  const t0 = b * BAR;
  // Chord: struck on 1 and pushed on the "and" of 2, slightly strummed.
  for (const [hit, vel, len] of [[0, 0.16, BEAT * 1.5], [BEAT * 1.5, 0.11, BEAT * 2.5]]) {
    c.notes.forEach((n, i) => add(t0 + hit + i * 0.012 + 0.01 * rnd(), ep(n, vel, len), len, (i - 1.5) * 0.25));
  }
  add(t0, bass(c.root, BEAT * 2.6), BEAT * 2.6);
  add(t0 + BEAT * 2.75, bass(c.root + 7, BEAT * 1.2), BEAT * 1.2);

  // Drums: lazy swing.
  const sw = BEAT * 0.08;
  add(t0, kick, 0.5);
  add(t0 + BEAT * 2.5, kick, 0.5);
  add(t0 + BEAT * 1 + 0.01, noiseHit(18, 0.22, 0.35), 0.3, 0.1);
  add(t0 + BEAT * 3 + 0.01, noiseHit(18, 0.22, 0.35), 0.3, 0.1);
  for (let k = 0; k < 8; k++) add(t0 + k * (BEAT / 2) + (k % 2 ? sw : 0), noiseHit(60, 0.06, 0.9), 0.08, 0.35);
}

// Sparse melody (F major pentatonic), soft sine with vibrato.
const mel = [[1.6, 72], [2.3, 69], [3.4, 67], [5.0, 69], [5.7, 72], [6.3, 74], [7.6, 72], [8.4, 69], [9.1, 65]];
for (const [tm, n] of mel) {
  add(tm, (t) => {
    const f = midi(n) * (1 + 0.004 * Math.sin(2 * Math.PI * 5 * t) * Math.min(1, t / 0.3));
    const env = Math.min(1, t / 0.03) * Math.exp(-t * 1.8);
    return (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * 2 * f * t)) * env * 0.07;
  }, 1.4, -0.2);
}

// Echo for space.
const d = Math.floor(BEAT * 0.75 * SR);
for (let i = d; i < N; i++) {
  L[i] += R[i - d] * 0.22;
  R[i] += L[i - d] * 0.22;
}

// Lo-fi: low-pass, vinyl hiss and crackle, gentle saturation.
let fl = 0, fr = 0;
const out = Buffer.alloc(44 + N * 4);
for (let i = 0; i < N; i++) {
  fl += 0.18 * (L[i] - fl);
  fr += 0.18 * (R[i] - fr);
  const hiss = (rnd() * 2 - 1) * 0.004;
  const crackle = rnd() > 0.9996 ? (rnd() * 2 - 1) * 0.15 : 0;
  const l = Math.tanh((fl + hiss + crackle) * 1.4) * 0.85;
  const r = Math.tanh((fr + hiss + crackle) * 1.4) * 0.85;
  out.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(r * 32767), 44 + i * 4 + 2);
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
writeFileSync("public/chill.wav", out);
console.log(`public/chill.wav  ${DUR}s`);

// Sound design for CamaAmarilla (54 s): ambient documentary bed + an event
// every 2 s (whoosh into each cut, text tick, shimmer on flash cuts, booms on
// impact beats). Deterministic; writes public/cama-audio.wav.
import { mkdirSync, writeFileSync } from "node:fs";

const SR = 44100;
const DUR = 54;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const midi = (m) => 440 * 2 ** ((m - 69) / 12);

const add = (t0, len, fn, pan = 0, gain = 1) => {
  const s0 = Math.floor(t0 * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
  const gr = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
  for (let i = 0; i < len * SR; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    const v = fn(i / SR);
    L[k] += v * gl;
    R[k] += v * gr;
  }
};

// --- Ambient bed: drone + slow pad chords (A minor, airy) ---
const chords = [
  [45, 57, 60, 64, 71], // Am(add9)
  [41, 53, 57, 60, 67], // Fmaj(add9)
  [43, 55, 59, 62, 69], // G6
  [40, 52, 55, 59, 66], // Em(add9)
];
for (let c = 0; c * 8 < DUR; c++) {
  const notes = chords[c % 4];
  notes.forEach((n, j) => {
    add(c * 8 - 0.5, 9.5, (t) => {
      const env = Math.min(1, t / 2.2) * Math.min(1, (9.5 - t) / 2.5);
      const f = midi(n);
      const det = 1 + (j % 2 ? 0.0025 : -0.0025);
      return (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * det * t + 1) + 0.15 * Math.sin(4 * Math.PI * f * t)) * env * (j === 0 ? 0.09 : 0.032);
    }, (j - 2) * 0.3);
  });
}
// Sub drone with slow breathing
add(0, DUR, (t) => Math.sin(2 * Math.PI * 55 * t) * 0.05 * (0.7 + 0.3 * Math.sin(t * 0.5)));

// Soft heartbeat-like pulse under the "body" chapters (8–28 s)
for (let t = 8; t < 28; t += 1) {
  add(t, 0.4, (x) => Math.sin(2 * Math.PI * (52 + 30 * Math.exp(-x * 25)) * x) * Math.exp(-x * 10) * 0.12);
}

// --- Event layer: something every 2 s ---
const lp = (decay, gain, cutoff) => {
  let y = 0;
  return (t) => {
    y += cutoff * (rnd() * 2 - 1 - y);
    return y * gain * decay(t);
  };
};
const whoosh = (tCut, strength = 1) => {
  // noise swell peaking at the cut, sweeping brightness
  let y = 0;
  add(tCut - 0.45, 0.75, (t) => {
    const k = t / 0.45;
    const env = t < 0.45 ? k * k : Math.exp(-(t - 0.45) * 9);
    const cut = 0.04 + 0.25 * Math.min(1, k);
    y += cut * (rnd() * 2 - 1 - y);
    return y * env * 0.5 * strength;
  }, (rnd() - 0.5) * 0.6);
};
const tick = (t0) => add(t0, 0.08, (t) => Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 80) * 0.08, 0.2);
const shimmer = (t0) => {
  [2093, 2637, 3136].forEach((f, i) =>
    add(t0 + i * 0.03, 1.2, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 4) * 0.025, (i - 1) * 0.5),
  );
};
const boom = (t0, g = 1) => {
  add(t0, 2.5, (t) => Math.sin(2 * Math.PI * (38 + 60 * Math.exp(-t * 8)) * t) * Math.exp(-t * 1.6) * 0.5 * g);
  add(t0, 1.2, lp((t) => Math.exp(-t * 4), 0.6 * g, 0.08));
};

const FLASH = [4, 10, 18, 24, 28, 34, 40, 48, 52];
for (let s = 0; s < 27; s++) {
  const t = s * 2;
  if (s > 0) whoosh(t, FLASH.includes(t) ? 1.2 : 0.8);
  tick(t + 0.14);
  if (FLASH.includes(t)) shimmer(t);
}
boom(24, 1);
boom(52, 1.2);
boom(0.02, 0.5);

// Scan sweep (6–8 s)
add(6, 1.8, (t) => Math.sin(2 * Math.PI * (300 + 500 * t) * t) * 0.03 * Math.sin(Math.PI * (t / 1.8)), 0);
// Clock ticks for "Durante meses" (32–34 s)
for (let i = 0; i < 6; i++) add(32.1 + i * 0.3, 0.06, lp((t) => Math.exp(-t * 90), 0.5, 0.6), i % 2 ? 0.3 : -0.3);
// Riser into the final zoom (50–52 s)
add(50.2, 1.8, lp((t) => (t / 1.8) ** 2, 0.35, 0.15));
add(50.2, 1.8, (t) => Math.sin(2 * Math.PI * (200 + 400 * (t / 1.8) ** 2) * t) * 0.025 * (t / 1.8));

// Echo + master fade + soft limiter
const d = Math.floor(0.33 * SR);
for (let i = d; i < N; i++) {
  L[i] += R[i - d] * 0.25;
  R[i] += L[i - d] * 0.25;
}
const out = Buffer.alloc(44 + N * 4);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.4) * Math.min(1, (DUR - t) / 1.2);
  out.writeInt16LE(Math.round(Math.tanh(L[i] * 1.3) * 0.85 * fade * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(Math.tanh(R[i] * 1.3) * 0.85 * fade * 32767), 46 + i * 4);
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
writeFileSync("public/cama-audio.wav", out);
console.log("public/cama-audio.wav", DUR + "s");

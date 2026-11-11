import { Dithering } from "@paper-design/shaders-react";
import { useLayoutEffect, useRef } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { usePaperShader } from "../lib/usePaperShader";
import { Pix, hash, hex, noise1, type RGB } from "./pixels";
import { SPRITE_GROUND, drawPanda } from "./sprite";

// Logical pixel-art resolution; scaled up 8x to 1920x1080.
const LW = 240;
const LH = 135;
const GROUND = 108;

const C = {
  glowA: hex("#6e4f93"),
  glowB: hex("#c76f97"),
  glowC: hex("#f2a27f"),
  moon: hex("#fbeab8"),
  moonDark: hex("#e7cf94"),
  star: hex("#fff3cf"),
  mountain: hex("#5d4680"),
  mountainHi: hex("#76599a"),
  hill: hex("#3d4a6e"),
  grove: hex("#2c5258"),
  groveNode: hex("#22424a"),
  groveLeaf: hex("#356660"),
  grass: hex("#86b46c"),
  grassDark: hex("#5f8c55"),
  path: hex("#8d6f55"),
  pathDark: hex("#74594a"),
  pebble: hex("#a88b6c"),
  fgBamboo: hex("#1d3830"),
  fgNode: hex("#2c5244"),
  firefly: hex("#fff2a0"),
  petal: hex("#f6b6c4"),
  flowerY: hex("#f6d67a"),
};

// 4x4 Bayer matrix for ordered dithering.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Panda speed factor over time (1 = walking, 0 = stopped). */
const speedAt = (t: number) => interpolate(t, [0, 0.4, 7.6, 9.2], [0.6, 1, 1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

const WALK_SPEED = 10; // logical px per second
const STRIDE = 14; // logical px per walk cycle

function drawScene(px: Pix, t: number, dist: number, walking: number, blink: boolean) {
  const cam = dist * 0.6;

  // Horizon glow: dithered bands over the shader sky (transparent above).
  for (let y = 30; y < GROUND; y++) {
    const k = (y - 30) / (GROUND - 30);
    for (let x = 0; x < LW; x++) {
      if (k < 0.3) {
        if (bayer(x, y) < k / 0.3) px.set(x, y, C.glowA);
      } else if (k < 0.65) {
        px.set(x, y, bayer(x, y) < (k - 0.3) / 0.35 ? C.glowB : C.glowA);
      } else {
        px.set(x, y, bayer(x, y) < (k - 0.65) / 0.35 ? C.glowC : C.glowB);
      }
    }
  }

  // Stars twinkle in the upper sky.
  for (let i = 0; i < 28; i++) {
    const sx = Math.floor(hash(i) * LW);
    const sy = Math.floor(hash(i + 50) * 38);
    const tw = Math.sin(t * (1.2 + hash(i + 9) * 2) + i * 3);
    if (tw > -0.2) px.set(sx, sy, C.star, tw > 0.6 ? 255 : 150);
    if (tw > 0.85 && hash(i + 3) > 0.6) {
      px.set(sx + 1, sy, C.star, 120);
      px.set(sx - 1, sy, C.star, 120);
      px.set(sx, sy + 1, C.star, 120);
      px.set(sx, sy - 1, C.star, 120);
    }
  }

  // Moon with a dithered halo.
  const mx = 182 - cam * 0.03;
  const my = 30;
  for (let y = my - 22; y <= my + 22; y++)
    for (let x = Math.floor(mx) - 22; x <= mx + 22; x++) {
      const d = Math.hypot(x - mx, y - my);
      if (d > 12 && d < 21 && bayer(x, y) < ((21 - d) / 9) * 0.45) px.set(x, y, C.moon, 90);
    }
  px.ellipse(mx, my, 11, 11, C.moon);
  px.ellipse(mx - 3, my - 2, 2.5, 2, C.moonDark);
  px.ellipse(mx + 4, my + 3, 1.6, 1.6, C.moonDark);
  px.ellipse(mx + 1, my - 6, 1, 1, C.moonDark);

  // Far mountains
  for (let x = 0; x < LW; x++) {
    const wx = x + cam * 0.12;
    const h = 62 + noise1(wx / 22, 1) * 20 + noise1(wx / 7, 2) * 5;
    for (let y = Math.floor(h); y < GROUND; y++) px.set(x, y, y < h + 2 ? C.mountainHi : C.mountain);
  }

  // Mid hills
  for (let x = 0; x < LW; x++) {
    const wx = x + cam * 0.3;
    const h = 84 + noise1(wx / 30, 3) * 12 + noise1(wx / 9, 4) * 3;
    for (let y = Math.floor(h); y < GROUND; y++) px.set(x, y, C.hill);
  }

  // Distant bamboo grove
  const gOff = cam * 0.55;
  for (let i = Math.floor(gOff / 7) - 2; i < Math.floor((gOff + LW) / 7) + 2; i++) {
    if (hash(i + 200) < 0.35) continue;
    const x = Math.round(i * 7 + hash(i + 300) * 4 - gOff);
    const top = 52 + Math.floor(hash(i + 400) * 26);
    const sway = Math.round(Math.sin(t * 0.8 + i) * 0.6);
    for (let y = top; y < GROUND; y++) {
      const sx = x + (y < top + 10 ? sway : 0);
      px.set(sx, y, (y - top) % 9 === 0 ? C.groveNode : C.grove);
      px.set(sx + 1, y, (y - top) % 9 === 0 ? C.groveNode : C.grove);
    }
    for (let l = 0; l < 3; l++) {
      const ly = top + 2 + l * 6;
      const dir = (i + l) % 2 ? 1 : -1;
      for (let k = 1; k <= 3; k++) px.set(x + sway + dir * (k + 1), ly + Math.floor(k / 2), C.groveLeaf);
    }
  }

  // Ground: grass edge and a path that scrolls with the camera.
  for (let x = 0; x < LW; x++) {
    const wx = Math.floor(x + cam);
    px.set(x, GROUND, C.grass);
    px.set(x, GROUND + 1, C.grass);
    px.set(x, GROUND + 2, C.grassDark);
    if (hash(wx + 7) > 0.72) px.set(x, GROUND - 1, C.grass);
    if (hash(wx + 8) > 0.9) {
      px.set(x, GROUND - 2, C.grass);
      px.set(x, GROUND - 1, C.grass);
    }
    if (hash(wx + 900) > 0.975) px.set(x, GROUND - 1, hash(wx) > 0.5 ? C.petal : C.flowerY);
    for (let y = GROUND + 3; y < LH; y++) {
      const band = hash(wx * 3 + y * 17) > 0.93;
      px.set(x, y, band ? C.pathDark : C.path);
      if (hash(wx * 7 + y * 31) > 0.985) px.set(x, y, C.pebble);
    }
  }

  // The panda
  const sprite = drawPanda((dist / STRIDE) % 1, walking, blink);
  const screenX = 64 + dist - cam;
  px.blit(sprite, screenX - 32, GROUND + 1 - SPRITE_GROUND);

  // Fireflies drift and blink.
  for (let i = 0; i < 16; i++) {
    const fx = (hash(i + 70) * LW * 1.3 - cam * 0.8 + Math.sin(t * 0.5 + i) * 6) % (LW * 1.3);
    const x = fx < 0 ? fx + LW * 1.3 : fx;
    const y = 55 + hash(i + 90) * 50 + Math.sin(t * 0.7 + i * 2) * 4;
    const glow = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
    if (glow > 0.25) {
      px.set(x, y, C.firefly, 120 + glow * 135);
      if (glow > 0.8) {
        px.set(x + 1, y, C.firefly, 70);
        px.set(x - 1, y, C.firefly, 70);
        px.set(x, y + 1, C.firefly, 70);
        px.set(x, y - 1, C.firefly, 70);
      }
    }
  }

  // Falling petals
  for (let i = 0; i < 7; i++) {
    const fall = (t * (5 + hash(i + 5) * 4) + hash(i + 11) * LH) % (LH + 10);
    const x = (hash(i + 13) * LW + Math.sin(t * 1.3 + i) * 5 - cam * 0.9 + LW * 10) % LW;
    px.set(x, fall - 5, C.petal);
    if (Math.sin(t * 4 + i) > 0) px.set(x + 1, fall - 5, C.petal);
  }

  // Foreground bamboo, passing faster than the camera.
  const fOff = cam * 1.5;
  for (let i = Math.floor(fOff / 150) - 1; i < Math.floor((fOff + LW) / 150) + 2; i++) {
    const x = Math.round(i * 150 + 20 + hash(i + 600) * 30 - fOff);
    for (let y = 0; y < LH; y++) {
      const node = (y + i * 5) % 16 === 0;
      px.rect(x, y, 5, 1, node ? C.fgNode : C.fgBamboo);
    }
    for (let l = 0; l < 4; l++) {
      const ly = 8 + l * 30 + Math.floor(hash(i * 4 + l) * 10);
      const dir = l % 2 ? 1 : -1;
      const sway = Math.round(Math.sin(t * 0.9 + l + i) * 1);
      for (let k = 0; k < 9; k++) {
        const lx = x + (dir > 0 ? 5 + k : -1 - k);
        const yy = ly + Math.floor(k / 3) + (k > 4 ? sway : 0);
        px.set(lx, yy, C.fgBamboo);
        if (k > 1 && k < 7) px.set(lx, yy + 1, C.fgBamboo);
      }
    }
  }
}

export const PandaWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const shader = usePaperShader(0.25);
  const t = frame / fps;

  // Distance walked = integral of speed, summed frame by frame (deterministic).
  let dist = 0;
  for (let f = 0; f < frame; f++) dist += (WALK_SPEED * speedAt(f / fps)) / fps;
  const walking = speedAt(t);
  const blink =
    (t > 3.1 && t < 3.22) || (t > 9.5 && t < 9.62) || (t > 9.78 && t < 9.9);

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const px = new Pix(LW, LH);
    drawScene(px, t, dist, walking, blink);
    ctx.putImageData(new ImageData(px.data, LW, LH), 0, 0);
  }, [t, dist, walking, blink]);

  const fade = interpolate(
    frame,
    [0, 18, durationInFrames - 18, durationInFrames - 1],
    [1, 0, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#211c3d" }}>
      {/* Sky: slow dithered clouds, pixel size matched to the 8x art scale. */}
      <Dithering
        {...shader}
        style={{ position: "absolute", inset: 0 }}
        width="100%"
        height="100%"
        colorBack="#231d42"
        colorFront="#3c3168"
        shape="simplex"
        type="4x4"
        size={8}
        scale={0.6}
      />
      <canvas
        ref={canvas}
        width={LW}
        height={LH}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
      />
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 55%, transparent 55%, rgba(15,10,30,0.45) 100%)" }}
      />
      <AbsoluteFill style={{ backgroundColor: "#0e0a1c", opacity: fade }} />
      <Audio src={staticFile("chill.wav")} volume={(f) => interpolate(f, [0, 20, durationInFrames - 30, durationInFrames], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
    </AbsoluteFill>
  );
};

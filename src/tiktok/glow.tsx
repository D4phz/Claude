import "@fontsource/montserrat/latin-800.css";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Shared look for the tiktok-explainer skill: dark stage, golden neon outlines,
// glossy floor reflection, dust, word-by-word captions.

export const GOLD = "#ffe39a";
/** Per-layer glow is applied once by <Stage>; kept as a no-op for API compatibility. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const glowFilter = (_k = 1): CSSProperties => ({});
const STAGE_GLOW = "drop-shadow(0 0 5px #ffcf6a) drop-shadow(0 0 20px rgba(255,150,45,0.75))";
export const stroke = { stroke: GOLD, strokeWidth: 6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export const Stage: React.FC<{ children: ReactNode; floor?: number; camera?: string }> = ({ children, floor = 1480, camera }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1a1714 0%, #0d0c0e 55%, #070708 100%)" }}>
    <Dust />
    <AbsoluteFill style={{ transform: camera, transformOrigin: "50% 60%" }}>
      {/* everything above the floor, mirrored by the browser on the glossy floor.
          The glow halo is blurred at 1/4 resolution and scaled up (fast without a GPU). */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1080,
          height: floor,
          overflow: "hidden",
          WebkitBoxReflect: "below 0 linear-gradient(transparent 78%, rgba(255,255,255,0.32))",
        } as CSSProperties}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: 270, height: floor / 4, transform: "scale(4)", transformOrigin: "0 0", willChange: "transform", opacity: 1, mixBlendMode: "screen" }}>
          <div style={{ width: 1080, height: floor, transform: "scale(0.25)", transformOrigin: "0 0", filter: "blur(7px) brightness(2.3) saturate(1.5)" }}>{children}</div>
        </div>
        <div style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 3px #ffcf6a)" }}>{children}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: floor, height: 2, background: "linear-gradient(90deg, transparent, rgba(255,210,140,0.35), transparent)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: floor, bottom: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(5,5,6,0.35) 50%, rgba(5,5,6,0.85) 100%)" }} />
    </AbsoluteFill>
  </AbsoluteFill>
);

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const Dust: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {Array.from({ length: 40 }, (_, i) => {
        const x = hash(i) * 1080;
        const y = (hash(i + 50) * 1920 - f * (0.4 + hash(i + 9) * 0.8) + 1920 * 2) % 1920;
        const s = 2 + hash(i + 3) * 5;
        return <div key={i} style={{ position: "absolute", left: x + Math.sin(f / 40 + i) * 10, top: y, width: s, height: s, borderRadius: "50%", background: "rgba(255,235,200,0.55)", filter: `blur(${hash(i + 7) * 3}px)`, opacity: 0.25 + hash(i + 2) * 0.5 }} />;
      })}
    </AbsoluteFill>
  );
};

export type Word = { w: string; start: number; end: number };

/** Word-by-word captions, top-left like the reference: current word white, earlier words of the chunk dimmer. */
export const Captions: React.FC<{ words: Word[]; chunk?: number }> = ({ words, chunk = 3 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  let idx = -1;
  for (let i = 0; i < words.length; i++) if (words[i].start <= t + 0.02) idx = i;
  if (idx < 0) return null;
  // chunks of up to `chunk` words that never cross a sentence end
  const starts: number[] = [0];
  for (let i = 1; i < words.length; i++) {
    const prevEnds = /[.?!…]$/.test(words[i - 1].w);
    if (prevEnds || i - starts[starts.length - 1] >= chunk) starts.push(i);
  }
  const c0 = starts.filter((s0) => s0 <= idx).pop() ?? 0;
  const shown = words.slice(c0, idx + 1);
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 190, fontFamily: "Montserrat", fontWeight: 800, fontSize: 104, lineHeight: 1.08, letterSpacing: -2 }}>
      {shown.map((w, i) => {
        const gi = c0 + i;
        const s = spring({ frame: f - Math.round(words[gi].start * fps), fps, config: { damping: 14, stiffness: 220 } });
        const current = gi === idx;
        return (
          <span
            key={gi}
            style={{
              display: "inline-block",
              marginRight: 26,
              color: current ? "#ffffff" : "rgba(255,255,255,0.55)",
              transform: `translateY(${(1 - s) * 30}px) scale(${0.85 + 0.15 * s})`,
              opacity: s,
              textShadow: current ? "0 0 24px rgba(255,200,120,0.35)" : undefined,
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

export const fade = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

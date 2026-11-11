import "@fontsource/pixelify-sans/latin-400.css";
import "@fontsource/pixelify-sans/latin-700.css";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { clamp01, ease, hash } from "../castillo/engine";
import { PixelCanvas2 } from "./PixelCanvas2";
import { FX, SHOTS } from "./shots";
import { TIMELINE, shotFrames, type Shot } from "./timeline";

const FONT = "'Pixelify Sans', monospace";

const Caption: React.FC<{ text: string; frames: number }> = ({ text, frames }) => {
  const f = useCurrentFrame();
  if (!text) return null;
  const typeEnd = Math.min(frames * 0.45, 12 + text.length * 0.9);
  const shown = Math.floor(interpolate(f, [2, typeEnd], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const out = interpolate(f, [frames - 8, frames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dialogue = text.startsWith("—");
  return (
    <>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 72%, rgba(8,8,18,0.92) 86%, rgba(8,8,18,0.96) 100%)" }} />
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          bottom: 92,
          minHeight: 150,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: text.length > 70 ? 50 : 56,
          lineHeight: 1.22,
          color: dialogue ? "#ecd08a" : "#e3e4ee",
          fontStyle: dialogue ? "italic" : undefined,
          opacity: out,
          textShadow: "4px 4px 0 #0a0b16, -2px -2px 0 #0a0b16, 2px -2px 0 #0a0b16, -2px 2px 0 #0a0b16",
        }}
      >
        <span>
          {text.slice(0, shown)}
          <span style={{ visibility: "hidden" }}>{text.slice(shown)}</span>
        </span>
      </div>
    </>
  );
};

const Card: React.FC<{ title: string; frames: number; big?: boolean }> = ({ title, frames, big }) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [4, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(f, [frames - 10, frames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const words = title.split(" ");
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: out }}>
      {[2, 1, 0].map((e) => (
        <div
          key={e}
          style={{
            position: "absolute",
            width: 960,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: big ? 112 : 78,
            lineHeight: 1.08,
            letterSpacing: 4,
            color: e === 0 ? "#c9a24a" : "#9b4dff",
            opacity: e === 0 ? k : (k * 0.3) / e,
            transform: `scale(${1 + e * 0.05 * (1 + Math.sin(f / 10))})`,
            textShadow: e === 0 ? "6px 6px 0 #2a1840" : undefined,
          }}
        >
          {big ? words.reduce<string[]>((acc, w, i) => (i % 2 ? [...acc.slice(0, -1), acc[acc.length - 1] + " " + w] : [...acc, w]), []).map((l) => <div key={l}>{l}</div>) : title}
        </div>
      ))}
    </AbsoluteFill>
  );
};

const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const frames = shotFrames(shot);
  const t = f / 30;
  const p = clamp01(f / (frames - 1));
  const fx = FX[shot.id] ?? [];
  let transform = "";
  if (fx.includes("shake")) {
    const s = 1 - p * 0.6;
    transform += ` translate(${Math.round((hash(f) - 0.5) * 3 * s) * 4}px, ${Math.round((hash(f + 77) - 0.5) * 3 * s) * 4}px)`;
  }
  if (fx.includes("push")) transform += ` scale(${1 + ease(p) * 0.1})`;
  if (fx.includes("pull")) transform += ` scale(${1.14 - ease(p) * 0.14})`;
  if (fx.includes("zoom")) transform += ` scale(${1 + ease(p) * 0.25})`;
  if (fx.includes("rotate")) transform += ` rotate(${8 - ease(p) * 4}deg) scale(1.2)`;
  const flash = fx.includes("flash") ? interpolate(f, [0, 6], [0.8, 0], { extrapolateRight: "clamp" }) : 0;
  const fadeIn = interpolate(f, [0, 5], [1, 0], { extrapolateRight: "clamp" });
  const draw = SHOTS[shot.id];
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0b16", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform }}>{draw && <PixelCanvas2 deps={[f]} draw={(px) => draw(px, t, p, f)} />}</AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: "#e9e6f2", opacity: flash }} />}
      <AbsoluteFill style={{ background: "#0a0b16", opacity: fadeIn * 0.6 }} />
      {shot.card && <Card title={shot.card} frames={frames} big={shot.id === "title" || shot.id === "end"} />}
      <Caption text={shot.text} frames={frames} />
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0 2px, transparent 2px 4px)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export const Sueno: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0b16" }}>
      {TIMELINE.map((s) => {
        const d = shotFrames(s);
        const el = (
          <Sequence key={s.id} from={from} durationInFrames={d} name={s.id}>
            <ShotView shot={s} />
          </Sequence>
        );
        from += d;
        return el;
      })}
      <Audio src={staticFile("sueno-audio.wav")} />
    </AbsoluteFill>
  );
};

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COL, FONT_BODY, FONT_HEAD, clamp01, easeOut } from "./theme";

/** 1% of the short side: keeps layout consistent in 9:16 and 16:9. */
export const useU = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 100;
};

/** Kinetic caption. Words wrapped in *asterisks* are highlighted in yellow. */
export const Caption: React.FC<{ text: string; y?: number; size?: number; delay?: number }> = ({
  text,
  y = 0.66,
  size = 7.2,
  delay = 4,
}) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const u = useU();
  const tokens: { w: string; hi: boolean }[] = [];
  let hi = false;
  for (const raw of text.split(" ")) {
    const starts = raw.startsWith("*");
    const ends = raw.endsWith("*") || raw.replace(/[.,…?!¿¡:]+$/, "").endsWith("*");
    if (starts) hi = true;
    tokens.push({ w: raw.replace(/\*/g, ""), hi });
    if (ends) hi = false;
  }
  const out = interpolate(f, [52, 59], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: height * y,
          transform: "translateY(-50%)",
          width: "86%",
          textAlign: "center",
          fontFamily: FONT_HEAD,
          fontWeight: 800,
          fontSize: size * u,
          lineHeight: 1.12,
          letterSpacing: -0.02 * size * u,
          color: COL.white,
          opacity: out,
          textShadow: `0 ${0.4 * u}px ${2.5 * u}px rgba(0,0,0,0.75)`,
        }}
      >
        {tokens.map((tk, i) => {
          const s = spring({ frame: f - delay - i * 2.2, fps, config: { damping: 18, stiffness: 160 } });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.25em",
                opacity: s,
                transform: `translateY(${(1 - s) * 0.6}em) scale(${0.9 + 0.1 * s})`,
                filter: `blur(${(1 - s) * 6}px)`,
                color: tk.hi ? COL.yellow : COL.white,
              }}
            >
              {tk.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Chapter tag: "01 · SUDOR". */
export const Kicker: React.FC<{ n: string; label: string; color?: string }> = ({ n, label, color = COL.moon }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const u = useU();
  const s = spring({ frame: f, fps, config: { damping: 16 } });
  const line = easeOut(clamp01((f - 4) / 14));
  return (
    <div
      style={{
        position: "absolute",
        top: height * 0.13,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: s,
        transform: `translateY(${(1 - s) * -3 * u}px)`,
      }}
    >
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 16 * u, color: "transparent", WebkitTextStroke: `${0.35 * u}px ${color}`, lineHeight: 1 }}>
        {n}
      </div>
      <div style={{ width: 22 * u * line, height: 0.4 * u, background: color, margin: `${1.2 * u}px 0` }} />
      <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 3.6 * u, letterSpacing: 0.4 * u, color }}>{label}</div>
    </div>
  );
};

/** Small top label for documentary feel. */
export const Tag: React.FC<{ text: string }> = ({ text }) => {
  const f = useCurrentFrame();
  const u = useU();
  const { height } = useVideoConfig();
  const o = clamp01(f / 8);
  return (
    <div
      style={{
        position: "absolute",
        top: height * 0.06,
        left: 6 * u,
        fontFamily: FONT_BODY,
        fontWeight: 700,
        fontSize: 2.6 * u,
        letterSpacing: 0.35 * u,
        color: COL.moon,
        opacity: o * 0.9,
        display: "flex",
        alignItems: "center",
        gap: 1.5 * u,
      }}
    >
      <span style={{ width: 1.4 * u, height: 1.4 * u, borderRadius: "50%", background: COL.yellow, opacity: 0.5 + 0.5 * Math.sin(f / 4) }} />
      {text}
    </div>
  );
};

/** Bottom gradient for legibility + vignette + animated grain. */
export const Finish: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,8,20,0.55) 0%, rgba(4,8,20,0) 22%, rgba(4,8,20,0) 45%, rgba(4,8,20,0.78) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(2,4,10,0.65) 100%)" }} />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.09, mixBlendMode: "overlay" }}>
        <filter id={`grain${f % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 6} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain${f % 6})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** White flash on cut (first frames of a shot). */
export const Flash: React.FC<{ strength?: number }> = ({ strength = 0.7 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 5], [strength, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#dfe9ff", opacity: o, mixBlendMode: "screen" }} />;
};

/** Cinematic letterbox bars. */
export const Letterbox: React.FC = () => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const k = easeOut(clamp01(f / 12));
  const bar = height * 0.11 * k;
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: bar, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: bar, background: "#000" }} />
    </>
  );
};

/** Vertical divider with side labels, for split comparisons. */
export const SplitLabels: React.FC<{ left: string; right: string; leftHot?: boolean }> = ({ left, right, leftHot = true }) => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const u = useU();
  const k = easeOut(clamp01(f / 14));
  const label = (txt: string, hot: boolean, side: "l" | "r") => (
    <div
      style={{
        position: "absolute",
        top: height * 0.27,
        [side === "l" ? "left" : "right"]: 7 * u,
        fontFamily: FONT_BODY,
        fontWeight: 700,
        fontSize: 3.4 * u,
        letterSpacing: 0.3 * u,
        color: hot ? COL.yellow : COL.white,
        padding: `${0.8 * u}px ${2 * u}px`,
        border: `${0.25 * u}px solid ${hot ? COL.yellow : "rgba(238,243,255,0.6)"}`,
        borderRadius: 1 * u,
        background: "rgba(4,8,20,0.45)",
        opacity: k,
      }}
    >
      {txt}
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: "50%", top: `${50 - 34 * k}%`, bottom: `${50 - 34 * k}%`, width: 0.35 * u, marginLeft: -0.175 * u, background: COL.white, boxShadow: `0 0 ${2 * u}px ${COL.moon}` }} />
      {label(left, leftHot, "l")}
      {label(right, false, "r")}
    </AbsoluteFill>
  );
};

/** Corner brackets + scanning readout. */
export const ScanHUD: React.FC<{ label: string }> = ({ label }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = useU();
  const k = easeOut(clamp01(f / 10));
  const m = 8 * u;
  const L = 8 * u * k;
  const c = (x: number, y: number, sx: number, sy: number) => (
    <div style={{ position: "absolute", left: x, top: y, width: L, height: L, borderLeft: sx > 0 ? `${0.4 * u}px solid ${COL.moon}` : undefined, borderRight: sx < 0 ? `${0.4 * u}px solid ${COL.moon}` : undefined, borderTop: sy > 0 ? `${0.4 * u}px solid ${COL.moon}` : undefined, borderBottom: sy < 0 ? `${0.4 * u}px solid ${COL.moon}` : undefined, transform: `translate(${sx < 0 ? -L : 0}px, ${sy < 0 ? -L : 0}px)` }} />
  );
  const pct = Math.min(100, Math.round((f / 50) * 100));
  return (
    <AbsoluteFill>
      {c(m, height * 0.22, 1, 1)}
      {c(width - m, height * 0.22, -1, 1)}
      {c(m, height * 0.56, 1, -1)}
      {c(width - m, height * 0.56, -1, -1)}
      <div style={{ position: "absolute", top: height * 0.225, left: m + 3 * u, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 2.6 * u, letterSpacing: 0.3 * u, color: COL.moon, opacity: k }}>
        {label} · {pct}%
      </div>
    </AbsoluteFill>
  );
};

/** "✕ Falta de higiene" crossed out → "✓ Proceso natural". */
export const NotHygiene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const u = useU();
  const a = spring({ frame: f, fps, config: { damping: 14 } });
  const strike = easeOut(clamp01((f - 10) / 10));
  const b = spring({ frame: f - 22, fps, config: { damping: 14 } });
  const row = (icon: string, txt: string, col: string, s: number, struck = 0) => (
    <div style={{ display: "flex", alignItems: "center", gap: 2 * u, opacity: s, transform: `scale(${0.85 + 0.15 * s})`, fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 5.2 * u, color: col, position: "relative" }}>
      <span style={{ width: 8 * u, height: 8 * u, borderRadius: "50%", border: `${0.5 * u}px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 4.5 * u }}>{icon}</span>
      <span style={{ position: "relative" }}>
        {txt}
        {struck > 0 && <span style={{ position: "absolute", left: 0, top: "52%", height: 0.6 * u, width: `${struck * 100}%`, background: col }} />}
      </span>
    </div>
  );
  return (
    <div style={{ position: "absolute", top: height * 0.24, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 * u }}>
      {row("✕", "Falta de higiene", "#9fb0cc", a, strike)}
      {row("✓", "Proceso natural", COL.yellow, b)}
    </div>
  );
};

/** Bars: adult men vs women, average sebum output (relative, no numbers). */
export const SebumBars: React.FC = () => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const u = useU();
  const grow = (d: number, target: number) => easeOut(clamp01((f - d) / 22)) * target;
  const bar = (label: string, v: number, col: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 * u }}>
      <div style={{ height: 34 * u, width: 15 * u, display: "flex", alignItems: "flex-end", background: "rgba(156,192,255,0.08)", borderRadius: 1.5 * u, overflow: "hidden" }}>
        <div style={{ width: "100%", height: `${v * 100}%`, background: `linear-gradient(180deg, ${col}, ${col}99)`, borderRadius: 1.5 * u, boxShadow: `0 0 ${3 * u}px ${col}66` }} />
      </div>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 3.4 * u, color: COL.white }}>{label}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", top: height * 0.17, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * u }}>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 2.8 * u, letterSpacing: 0.35 * u, color: COL.moon }}>PRODUCCIÓN DE SEBO · PROMEDIO</div>
      <div style={{ display: "flex", gap: 10 * u, alignItems: "flex-end" }}>
        {bar("Hombres", grow(4, 0.85), COL.yellow)}
        {bar("Mujeres", grow(10, 0.6), "#9cc0ff")}
      </div>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 500, fontSize: 2.4 * u, color: "rgba(238,243,255,0.6)" }}>Ilustrativo · varía entre personas</div>
    </div>
  );
};

/** Hormone influence: stylised steroid ring skeleton drawing itself. */
export const Hormone: React.FC = () => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const u = useU();
  const draw = easeOut(clamp01(f / 30));
  const hex = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
  const pent = (cx: number, cy: number, r: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = ((Math.PI * 2) / 5) * i - Math.PI / 2 + 0.3;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
  const r = 40;
  const w = r * Math.sqrt(3);
  return (
    <div style={{ position: "absolute", top: height * 0.2, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * u }}>
      <svg width={70 * u} height={36 * u} viewBox="-10 -70 330 170">
        {[
          hex(40, 30, r),
          hex(40 + w, 30 - r * 1.5 + r * 1.5, r),
          hex(40 + w * 1.5, 30 - r * 1.5, r),
          pent(40 + w * 2.5 + 8, 30 - r * 1.5 - 4, r * 0.85),
        ].map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke={i === 3 ? COL.yellow : COL.moon}
            strokeWidth={3.5}
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - clamp01(draw * 1.6 - i * 0.2)}
            style={{ filter: `drop-shadow(0 0 6px ${i === 3 ? COL.yellow : COL.moon})` }}
          />
        ))}
      </svg>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 3 * u, letterSpacing: 0.35 * u, color: COL.moon, opacity: draw }}>ANDRÓGENOS → GLÁNDULAS SEBÁCEAS</div>
    </div>
  );
};

/** Months counter with a progress bar turning yellow. */
export const Months: React.FC = () => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const u = useU();
  const k = clamp01(f / 50);
  const m = Math.max(1, Math.ceil(k * 6));
  return (
    <div style={{ position: "absolute", top: height * 0.17, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 * u }}>
      <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 3 * u, letterSpacing: 0.4 * u, color: COL.moon }}>TIEMPO DE USO</div>
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 13 * u, color: COL.white, lineHeight: 1 }}>
        {m} <span style={{ fontSize: 5 * u, color: COL.yellow }}>{m === 1 ? "mes" : "meses"}</span>
      </div>
      <div style={{ width: 60 * u, height: 1.2 * u, background: "rgba(156,192,255,0.2)", borderRadius: u }}>
        <div style={{ width: `${k * 100}%`, height: "100%", borderRadius: u, background: `linear-gradient(90deg, ${COL.white}, ${COL.yellow})` }} />
      </div>
    </div>
  );
};

const Icon: React.FC<{ kind: "sweat" | "sebum" | "cells"; size: number }> = ({ kind, size }) => {
  if (kind === "sweat")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M50 8 C50 8 20 45 20 64 a30 30 0 0 0 60 0 C80 45 50 8 50 8Z" fill="none" stroke={COL.sweat} strokeWidth="6" />
        <path d="M36 66 a14 14 0 0 0 12 13" fill="none" stroke={COL.sweat} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  if (kind === "sebum")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <ellipse cx="50" cy="62" rx="34" ry="18" fill={`${COL.yellow}33`} stroke={COL.yellow} strokeWidth="6" />
        <ellipse cx="40" cy="56" rx="9" ry="4" fill={COL.yellow} opacity="0.8" />
        <path d="M50 14 C50 14 38 30 38 38 a12 12 0 0 0 24 0 C62 30 50 14 50 14Z" fill={COL.yellow} />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {[
        [32, 38, 0],
        [64, 32, 20],
        [50, 66, -15],
      ].map(([x, y, r], i) => (
        <polygon
          key={i}
          transform={`translate(${x} ${y}) rotate(${r})`}
          points="0,-16 14,-8 14,8 0,16 -14,8 -14,-8"
          fill={`${COL.cells}22`}
          stroke={COL.cells}
          strokeWidth="5"
        />
      ))}
    </svg>
  );
};

/** Three factors as animated icons. */
export const Factors: React.FC = () => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const u = useU();
  const items: { k: "sweat" | "sebum" | "cells"; label: string; col: string }[] = [
    { k: "sweat", label: "Sudor", col: COL.sweat },
    { k: "sebum", label: "Sebo", col: COL.yellow },
    { k: "cells", label: "Células muertas", col: COL.cells },
  ];
  return (
    <div style={{ position: "absolute", top: height * 0.2, width: "100%", display: "flex", justifyContent: "center", gap: 6 * u }}>
      {items.map((it, i) => {
        const s = spring({ frame: f - i * 6, fps, config: { damping: 11, stiffness: 140 } });
        const bob = Math.sin((f + i * 10) / 8) * 0.8 * u;
        return (
          <div key={it.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 * u, transform: `translateY(${bob}px) scale(${s})`, opacity: clamp01(s) }}>
            <div style={{ width: 20 * u, height: 20 * u, borderRadius: "50%", border: `${0.35 * u}px solid ${it.col}55`, background: "rgba(4,8,20,0.55)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${4 * u}px ${it.col}33` }}>
              <Icon kind={it.k} size={12 * u} />
            </div>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 3 * u, color: it.col, textAlign: "center", width: 24 * u }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Labels for the exploded sheet/mattress view. */
export const LayerLabels: React.FC = () => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const u = useU();
  const k = easeOut(clamp01((f - 14) / 12));
  const lab = (txt: string, top: number) => (
    <div style={{ position: "absolute", top: height * top, right: 8 * u, display: "flex", alignItems: "center", gap: 1.5 * u, opacity: k, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 3.2 * u, color: COL.white }}>
      <span style={{ width: 10 * u * k, height: 0.3 * u, background: COL.moon }} />
      {txt}
    </div>
  );
  return (
    <>
      {lab("Sábana", 0.33)}
      {lab("Colchón", 0.47)}
    </>
  );
};

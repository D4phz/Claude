import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import words from "../../public/tiktok/suenos-hook.words.json";
import { Captions, GOLD, Stage, fade, glowFilter, stroke, type Word } from "./glow";

const FILL = "rgba(150,80,30,0.28)";
const FILL2 = "rgba(110,55,25,0.45)";

const Sleeper: React.FC<{ breath: number }> = ({ breath }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", ...glowFilter() }}>
    {/* bed */}
    <rect x={150} y={1290} width={780} height={150} rx={26} fill={FILL2} {...stroke} />
    <rect x={130} y={1080} width={46} height={400} rx={18} fill={FILL2} {...stroke} />
    <rect x={904} y={1210} width={40} height={270} rx={16} fill={FILL2} {...stroke} />
    {/* pillow */}
    <ellipse cx={300} cy={1262} rx={110} ry={42} fill={FILL} {...stroke} />
    {/* head + hair */}
    <circle cx={318} cy={1205} r={62} fill="rgba(170,110,70,0.35)" {...stroke} />
    <path d="M262 1180 Q280 1128 336 1140 Q378 1150 380 1190" fill="rgba(60,30,20,0.55)" {...stroke} strokeWidth={5} />
    <path d="M345 1214 q12 6 22 0" fill="none" {...stroke} strokeWidth={4} />
    {/* blanket over the body (breathing) */}
    <path
      d={`M372 1290 C430 ${1180 - breath * 10} 560 ${1170 - breath * 14} 640 ${1205 - breath * 6} C720 1235 800 1230 900 1240 L900 1300 L372 1300 Z`}
      fill="rgba(200,120,50,0.25)"
      {...stroke}
    />
    <path d="M470 1240 q60 30 120 10 M650 1250 q70 20 140 4" fill="none" stroke={GOLD} strokeWidth={3} opacity={0.6} />
  </svg>
);

const Moon: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", ...glowFilter(0.8) }}>
    <path d="M870 420 a90 90 0 1 0 60 150 a75 75 0 1 1 -60 -150 Z" fill="rgba(255,220,140,0.18)" {...stroke} />
  </svg>
);

const Polaroid: React.FC<{ x: number; y: number; r: number; s: number; dim?: number; lit?: number }> = ({ x, y, r, s, dim = 0, lit = 0 }) => {
  const col = dim > 0 ? `rgba(200,200,210,${0.35 + 0.65 * lit})` : GOLD;
  const c = lit > 0 ? GOLD : col;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={s > 0 ? 1 : 0}>
      <rect x={-95} y={-115} width={190} height={230} rx={10} fill="rgba(255,240,210,0.08)" stroke={c} strokeWidth={6} />
      <rect x={-75} y={-95} width={150} height={150} rx={4} fill={dim > 0 && lit < 0.5 ? "rgba(120,120,130,0.18)" : "rgba(255,170,80,0.18)"} stroke={c} strokeWidth={4} strokeDasharray={dim > 0 && lit < 0.5 ? "10 8" : undefined} />
      <circle cx={0} cy={-38} r={30} fill="none" stroke={c} strokeWidth={5} />
      <path d="M-55 50 Q0 -10 55 50" fill="none" stroke={c} strokeWidth={5} />
    </g>
  );
};

const Brain: React.FC<{ k: number; light: number }> = ({ k, light }) => {
  const nodes: [number, number][] = [[430, 760], [520, 700], [610, 760], [560, 840], [470, 860], [650, 690], [380, 830]];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", opacity: k, ...glowFilter() }}>
      <path
        d="M330 820 C300 700 380 600 480 620 C520 560 640 560 680 620 C780 620 820 720 780 800 C820 880 760 960 680 940 C640 1000 520 1000 480 950 C380 980 300 920 330 820 Z"
        fill="rgba(255,150,90,0.12)"
        {...stroke}
      />
      <path d="M560 600 C540 700 590 800 560 980" fill="none" stroke={GOLD} strokeWidth={4} opacity={0.7} />
      <path d="M400 720 q40 30 20 70 M700 700 q-30 40 0 80 M450 900 q50 -30 90 0 M620 880 q40 -20 70 10" fill="none" stroke={GOLD} strokeWidth={4} opacity={0.6} />
      {nodes.map(([x, y], i) => {
        const on = light * nodes.length > i;
        const [nx, ny] = nodes[(i + 2) % nodes.length];
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={nx} y2={ny} stroke={on ? "#fff3c4" : "rgba(255,227,154,0.2)"} strokeWidth={on ? 4 : 2} />
            <circle cx={x} cy={y} r={on ? 11 : 7} fill={on ? "#fff6d8" : "rgba(255,227,154,0.3)"} />
          </g>
        );
      })}
    </svg>
  );
};

export const SuenosHook: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const breath = Math.sin((t / 3.5) * Math.PI * 2);
  // beats from the word timings
  const bubble = spring({ frame: f - Math.round(3.25 * fps), fps, config: { damping: 15 } });
  const p1 = spring({ frame: f - Math.round(3.6 * fps), fps, config: { damping: 12 } });
  const p2 = spring({ frame: f - Math.round(4.9 * fps), fps, config: { damping: 12 } });
  const toBrain = interpolate(t, [6.6, 7.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lightUp = interpolate(t, [7.4, 8.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const relit = fade(t, 8.05, 8.6);
  const q = spring({ frame: f - Math.round(8.6 * fps), fps, config: { damping: 9 } });
  const flicker = p2 > 0.9 && relit < 0.1 ? (Math.sin(t * 40) > 0.3 ? 1 : 0.4) : 1;
  const camera = `scale(${1 + t * 0.012 + toBrain * 0.06}) translateY(${toBrain * 40}px)`;
  const dreamOpacity = 1 - toBrain * 0.85;

  return (
    <AbsoluteFill>
      <Stage camera={camera} floor={1442}>
        <AbsoluteFill style={{ opacity: 1 - toBrain * 0.75 }}>
          <Moon />
          <Sleeper breath={breath} />
        </AbsoluteFill>
        {/* dream bubble rising from the head */}
        <svg width={1080} height={1920} style={{ position: "absolute", opacity: dreamOpacity, ...glowFilter() }}>
          {[0, 1, 2].map((i) => {
            const k = Math.max(0, Math.min(1, bubble * 3 - i));
            return <circle key={i} cx={360 + i * 40} cy={1110 - i * 70} r={(12 + i * 10) * k} fill="rgba(255,200,120,0.12)" {...stroke} strokeWidth={4} />;
          })}
          <g transform={`translate(560 660) scale(${bubble})`}>
            <path
              d="M-330 60 C-380 -40 -300 -150 -200 -130 C-170 -230 -20 -260 40 -170 C120 -250 280 -200 280 -100 C370 -80 380 60 300 100 C320 200 180 250 110 200 C40 270 -120 260 -160 190 C-280 220 -360 150 -330 60 Z"
              fill="rgba(255,190,110,0.08)"
              {...stroke}
            />
          </g>
          <Polaroid x={420} y={650} r={-8} s={p1} />
          <g opacity={flicker}>
            <Polaroid x={690} y={640} r={7} s={p2} dim={1} lit={relit} />
          </g>
        </svg>
        <Brain k={toBrain} light={lightUp} />
        {/* the relit memory drawn above the brain */}
        <svg width={1080} height={1920} style={{ position: "absolute", opacity: toBrain, ...glowFilter(1 + relit) }}>
          <Polaroid x={760} y={1120} r={8} s={toBrain} dim={1} lit={relit} />
          <path d="M610 760 C700 860 720 980 740 1010" fill="none" stroke="#fff3c4" strokeWidth={5} strokeDasharray="600" strokeDashoffset={600 - relit * 600} />
        </svg>
        <svg width={1080} height={1920} style={{ position: "absolute", ...glowFilter(1.3) }}>
          <text x={300} y={1260} fontFamily="Montserrat" fontWeight={800} fontSize={260 * q} fill="rgba(255,220,140,0.15)" stroke={GOLD} strokeWidth={6} opacity={q > 0.02 ? 1 : 0}>
            ?
          </text>
        </svg>
      </Stage>
      <Captions words={words as Word[]} />
      <Audio src={staticFile("tiktok/suenos-hook-mix.mp3")} />
    </AbsoluteFill>
  );
};

import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Bedroom3D, CAM } from "./Bedroom3D";
import type { CamMove } from "./CameraRig";
import { FIBER_CAM, Fibers3D } from "./Fibers3D";
import { LAYERS_CAM, Layers3D } from "./Layers3D";
import { MACRO_CAM, Macro3D } from "./Macro3D";
import {
  Caption,
  Factors,
  Finish,
  Flash,
  Hormone,
  Kicker,
  LayerLabels,
  Letterbox,
  Months,
  NotHygiene,
  ScanHUD,
  SebumBars,
  SplitLabels,
  Tag,
} from "./Overlays";
import { COL, SHOT, clamp01, easeInOut } from "./theme";

type Fx = "flash" | "punch" | "whip" | "zoom" | "dim";
type Shot = {
  scene: (t: number, p: number) => ReactNode;
  caption: string;
  captionY?: number;
  captionSize?: number;
  over?: ReactNode;
  fx?: Fx[];
  letterbox?: boolean;
};

// Camera moves in bed space (see Bedroom3D: head on left pillow at x≈-0.45, z≈-0.8).
const M = {
  pillow: { from: [0.35, 1.4, 0.2], to: [0.05, 1.08, -0.25], lookFrom: [-0.46, 0.66, -0.82], lookTo: [-0.46, 0.68, -0.82], fovFrom: 45, fovTo: 42 },
  scan: { from: [1.6, 1.6, 1.4], to: [1.25, 1.35, 0.95], lookFrom: [-0.3, 0.6, -0.15], lookTo: [-0.35, 0.62, -0.25], fovFrom: 50, fovTo: 48 },
  torso: { from: [0.75, 1.45, 1.2], to: [0.5, 1.25, 0.85], lookFrom: [-0.45, 0.7, -0.4], lookTo: [-0.45, 0.72, -0.45], fovFrom: 45, fovTo: 42 },
  push: { from: [1.9, 1.9, 3.0], to: [0.6, 1.3, 0.6], lookFrom: [0.0, 0.8, -0.5], lookTo: [-0.42, 0.7, -0.75], fovFrom: 50, fovTo: 44 },
  side: { from: [1.6, 1.15, 0.6], to: [1.3, 1.08, 0.25], lookFrom: [-0.45, 0.72, -0.6], lookTo: [-0.45, 0.74, -0.7], fovFrom: 42, fovTo: 40 },
  crane: { from: [0.0, 1.25, -0.2], to: [1.7, 2.4, 2.6], lookFrom: [-0.45, 0.78, -0.8], lookTo: [0.0, 0.7, -0.4], fovFrom: 40, fovTo: 52 },
  cinema: { from: [0.6, 1.4, 2.9], to: [0.35, 1.28, 2.3], lookFrom: [-0.15, 0.78, -0.6], lookTo: [-0.25, 0.76, -0.65], fovFrom: 42, fovTo: 40 },
  pillowOrbit: { from: [-0.9, 1.25, -0.1], to: [-0.1, 1.2, -0.15], lookFrom: [-0.46, 0.66, -0.82], lookTo: [-0.46, 0.66, -0.82], fovFrom: 42, fovTo: 42 },
} satisfies Record<string, CamMove>;

const SHOTS: Shot[] = [
  // 0–2 HOOK
  {
    scene: (t, p) => <Bedroom3D move={CAM.wide} p={p} t={t} person={false} stainLeft={0.55} stainRight={0.12} />,
    caption: "¿Por qué el lado de la cama de un hombre se pone *amarillo*?",
    over: <Tag text="CIENCIA DEL SUEÑO" />,
  },
  // 2–4
  {
    scene: (t, p) => <Bedroom3D move={CAM.top} p={p} t={t} person={false} stainLeft={0.7} stainRight={0.15} />,
    caption: "…incluso si se *baña todos los días*?",
    over: <SplitLabels left="ÉL" right="ELLA" />,
    fx: ["punch"],
  },
  // 4–6
  {
    scene: (t, p) => <Bedroom3D move={M.pillow} p={p} t={t} person={false} stainLeft={0.65} stainRight={0.1} />,
    caption: "No necesariamente es *falta de higiene*.",
    over: <NotHygiene />,
    fx: ["flash"],
  },
  // 6–8
  {
    scene: (t, p) => <Bedroom3D move={M.scan} p={p} t={t + 6} person scan={p} stainLeft={0.25} />,
    caption: "La explicación está en *tu propio cuerpo*.",
    over: <ScanHUD label="ANÁLISIS NOCTURNO" />,
  },
  // 8–10 FIRST: sweat
  {
    scene: (t, p) => <Bedroom3D move={M.torso} p={p} t={t + 8} person stainLeft={0.2} lamp={0.6} />,
    caption: "Mientras duermes, *sigues sudando*…",
    captionY: 0.72,
    over: <Kicker n="01" label="SUDOR" color={COL.sweat} />,
    fx: ["whip"],
  },
  // 10–12
  {
    scene: (t, p) => <Macro3D move={MACRO_CAM.low} p={p} t={t} mode="sweat" />,
    caption: "…aunque *no lo notes*.",
    over: <Tag text="SUPERFICIE DE LA PIEL · VISTA MICRO" />,
    fx: ["flash"],
  },
  // 12–14
  {
    scene: (t, p) => <Macro3D move={MACRO_CAM.close} p={p} t={t + 2} mode="sweat" />,
    caption: "Noche tras noche, esa humedad llega a la *tela*.",
    fx: ["punch"],
  },
  // 14–16 SECOND: sebum
  {
    scene: (t, p) => <Macro3D move={MACRO_CAM.low} p={p} t={t} mode="sebum" />,
    caption: "Tu piel produce *sebo*…",
    captionY: 0.72,
    over: <Kicker n="02" label="SEBO" color={COL.yellow} />,
    fx: ["whip"],
  },
  // 16–18
  {
    scene: (t, p) => <Macro3D move={MACRO_CAM.close} p={p} t={t + 2} mode="sebum" />,
    caption: "una grasa natural que *protege* la piel.",
    fx: ["punch"],
  },
  // 18–20
  {
    scene: (t, p) => <Macro3D move={MACRO_CAM.top} p={p} t={t + 2} mode="all" />,
    caption: "Y aquí viene lo *interesante*…",
    captionY: 0.5,
    captionSize: 8.5,
    fx: ["flash"],
  },
  // 20–22
  {
    scene: (t, p) => <Bedroom3D move={CAM.wide} p={p * 0.5} t={t + 20} person exposure={0.8} />,
    caption: "Los hombres adultos suelen producir *más sebo*…",
    over: <SebumBars />,
    fx: ["dim", "punch"],
  },
  // 22–24
  {
    scene: (t, p) => <Macro3D move={MACRO_CAM.close} p={p} t={t + 3} mode="sebum" />,
    caption: "…en promedio, por *influencia hormonal*.",
    over: <Hormone />,
    fx: ["dim"],
  },
  // 24–26
  {
    scene: (t, p) => <Bedroom3D move={M.push} p={p} t={t + 24} person stainLeft={0.3} />,
    caption: "Pero eso *no es todo*.",
    captionY: 0.5,
    captionSize: 9.5,
    fx: ["flash", "punch"],
  },
  // 26–28 THIRD: dead cells
  {
    scene: (t, p) => <Macro3D move={MACRO_CAM.low} p={p} t={t} mode="cells" />,
    caption: "La piel se *renueva* y suelta células muertas.",
    captionY: 0.72,
    over: <Kicker n="03" label="CÉLULAS MUERTAS" color={COL.cells} />,
    fx: ["whip"],
  },
  // 28–30
  {
    scene: (t, p) => <Fibers3D move={FIBER_CAM.wide} p={p} t={t} particles={1} />,
    caption: "Sudor, aceites y células muertas…",
    over: <Tag text="FIBRAS DE LA SÁBANA · VISTA MICRO" />,
    fx: ["flash"],
  },
  // 30–32
  {
    scene: (t, p) => <Fibers3D move={FIBER_CAM.close} p={p} t={t + 1} particles={1} yellow={0.1} />,
    caption: "…se *acumulan* en las fibras.",
    fx: ["punch"],
  },
  // 32–34
  {
    scene: (t, p) => <Fibers3D move={FIBER_CAM.wide} p={p} t={t} particles={1} settled yellow={0.1 + p * 0.3} />,
    caption: "*Durante meses*.",
    captionY: 0.72,
    captionSize: 9,
    over: <Months />,
  },
  // 34–36
  {
    scene: (t, p) => <Fibers3D move={FIBER_CAM.close} p={1 - p} t={t} particles={1} settled yellow={0.4 + p * 0.5} />,
    caption: "Las fibras cambian de *color*.",
    fx: ["flash"],
  },
  // 36–38
  {
    scene: (t, p) => <Layers3D move={LAYERS_CAM} p={p} t={t} stain={0.75} />,
    caption: "En las sábanas… *y en el colchón*.",
    over: <LayerLabels />,
    fx: ["whip"],
  },
  // 38–40
  {
    scene: (t, p) => <Bedroom3D move={CAM.top} p={p} t={t} person={false} stainLeft={0.05 + easeInOut(p) * 0.85} stainRight={0.05 + p * 0.15} />,
    caption: "Con el tiempo, aparece la *coloración amarillenta*.",
    over: <Tag text="TIMELAPSE · VARIOS MESES" />,
    fx: ["punch"],
  },
  // 40–42
  {
    scene: (t, p) => <Bedroom3D move={M.pillowOrbit} p={p} t={t} person={false} stainLeft={0.85} />,
    caption: "Así que no…",
    captionY: 0.5,
    captionSize: 10,
    fx: ["flash"],
  },
  // 42–44
  {
    scene: (t, p) => <Bedroom3D move={M.side} p={p} t={t + 42} person stainLeft={0.3} lamp={1.3} />,
    caption: "No significa que estés *sucio*.",
    fx: ["punch"],
  },
  // 44–46
  {
    scene: (t, p) => <Bedroom3D move={M.crane} p={p} t={t + 44} person stainLeft={0.3} />,
    caption: "¡Tu cuerpo puede dejar su *huella*… incluso mientras duermes!",
    captionSize: 6.4,
  },
  // 46–48 CONCLUSIÓN · plano cinematográfico
  {
    scene: (t, p) => <Bedroom3D move={M.cinema} p={p} t={t + 46} person stainLeft={0.3} lamp={0.9} />,
    caption: "Tu cuerpo deja residuos *naturalmente*.",
    letterbox: true,
  },
  // 48–50 REFUERZO · corte dividido
  {
    scene: (t, p) => <Bedroom3D move={CAM.top} p={p} t={t} person={false} stainLeft={0.65} stainRight={0.5} />,
    caption: "No es una regla exclusiva de los *hombres*.",
    over: <SplitLabels left="LADO A" right="LADO B" />,
    fx: ["flash"],
  },
  // 50–52 REFUERZO · iconos animados
  {
    scene: (t, p) => <Fibers3D move={FIBER_CAM.wide} p={p} t={t} particles={1} settled yellow={0.3} />,
    caption: "Depende de *varios factores*.",
    over: <Factors />,
    fx: ["dim", "punch"],
  },
  // 52–54 IMPACTO · zoom extremo
  {
    scene: (t, p) => <Fibers3D move={FIBER_CAM.extreme} p={p} t={t} particles={1} settled yellow={0.6} fullStain={easeInOut(p)} />,
    caption: "Incluso mientras duermes…",
    captionY: 0.5,
    captionSize: 9,
    fx: ["flash", "zoom"],
  },
];

export const TOTAL_FRAMES = SHOTS.length * SHOT;

const ShotView: React.FC<{ shot: Shot; last: boolean }> = ({ shot, last }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const p = clamp01(f / (SHOT - 1));
  const fx = shot.fx ?? [];
  let transform = "";
  let filter = "";
  if (fx.includes("punch")) transform += ` scale(${interpolate(f, [0, 10], [1.12, 1], { extrapolateRight: "clamp", easing: (x) => 1 - (1 - x) ** 3 })})`;
  if (fx.includes("whip")) {
    const k = interpolate(f, [0, 7], [1, 0], { extrapolateRight: "clamp" });
    transform += ` translateX(${k * 35}%)`;
    filter += ` blur(${k * 18}px)`;
  }
  if (fx.includes("zoom")) transform += ` scale(${1 + easeInOut(p) ** 2 * 0.5})`;
  const end = last ? interpolate(f, [SHOT - 12, SHOT - 1], [0, 1], { extrapolateLeft: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: COL.night }}>
      <AbsoluteFill style={{ transform, filter }}>{shot.scene(t, p)}</AbsoluteFill>
      {fx.includes("dim") && <AbsoluteFill style={{ background: "rgba(4,8,20,0.55)" }} />}
      {fx.includes("zoom") && <AbsoluteFill style={{ background: `radial-gradient(circle, rgba(242,193,78,${0.35 * p}) 0%, rgba(120,80,10,${0.5 * p}) 100%)`, mixBlendMode: "soft-light" }} />}
      <Finish />
      {shot.letterbox && <Letterbox />}
      {shot.over}
      <Caption text={shot.caption} y={shot.captionY} size={shot.captionSize} />
      {fx.includes("flash") && <Flash />}
      {last && <AbsoluteFill style={{ background: "#000", opacity: end }} />}
    </AbsoluteFill>
  );
};

export const CamaAmarilla: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COL.night }}>
    {SHOTS.map((s, i) => (
      <Sequence key={i} from={i * SHOT} durationInFrames={SHOT} name={`${i * 2}–${i * 2 + 2}s`}>
        <ShotView shot={s} last={i === SHOTS.length - 1} />
      </Sequence>
    ))}
    <Audio src={staticFile("cama-audio.wav")} />
  </AbsoluteFill>
);

import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, type CamMove } from "./CameraRig";
import { COL, clamp01, easeOut, hash } from "./theme";

// Macro view of woven sheet fabric. Particles of sweat (blue), sebum (gold)
// and skin cells (white) settle into the weave; `yellow` tints the threads.

const N = 13;
const GAP = 0.5;
const R = 0.11;

const threadPath = (k: number, dir: "x" | "z") => {
  const pts: THREE.Vector3[] = [];
  const half = (N * GAP) / 2 + 0.6;
  for (let i = 0; i <= 80; i++) {
    const s = -half + (i / 80) * half * 2;
    const y = 0.09 * Math.sin((s / GAP) * Math.PI + (k % 2) * Math.PI + (dir === "x" ? 0 : Math.PI));
    const c = (k - (N - 1) / 2) * GAP;
    pts.push(dir === "x" ? new THREE.Vector3(s, y, c) : new THREE.Vector3(c, y, s));
  }
  return new THREE.CatmullRomCurve3(pts);
};

const PARTICLES = Array.from({ length: 150 }, (_, i) => {
  const type = i % 3; // 0 sweat, 1 sebum, 2 cells
  const gx = Math.floor(hash(i + 3) * N) - (N - 1) / 2;
  const gz = Math.floor(hash(i + 7) * N) - (N - 1) / 2;
  return {
    type,
    x: (gx + 0.5) * GAP,
    z: (gz + 0.5) * GAP,
    start: hash(i + 11) * 1.6,
    s: 0.035 + hash(i + 13) * 0.035,
  };
});

const PCOL = [COL.sweat, COL.amber, COL.cells];

export const Fibers3D: React.FC<{
  move: CamMove;
  p: number;
  t: number;
  particles?: number; // 0 = none, 1 = all falling per their schedule
  settled?: boolean; // particles already lodged
  yellow?: number; // 0..1 thread tint
  fullStain?: number; // 0..1 extreme close-up: everything golden
}> = ({ move, p, t, particles = 0, settled = false, yellow = 0, fullStain = 0 }) => {
  const { width, height } = useVideoConfig();
  const tubes = useMemo(() => {
    const list: THREE.TubeGeometry[] = [];
    for (let k = 0; k < N; k++) {
      list.push(new THREE.TubeGeometry(threadPath(k, "x"), 120, R, 14, false));
      list.push(new THREE.TubeGeometry(threadPath(k, "z"), 120, R, 14, false));
    }
    return list;
  }, []);
  // Fibre "fuzz" bump texture
  const fuzz = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#808080";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = hash(i) > 0.5 ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)";
      g.beginPath();
      const x = hash(i + 1) * 256;
      const y = hash(i + 2) * 256;
      g.moveTo(x, y);
      g.lineTo(x + 30, y + (hash(i + 3) - 0.5) * 4);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 1);
    return t;
  }, []);

  const thread = new THREE.Color("#eef2fb").lerp(new THREE.Color("#e3bf63"), Math.max(fullStain * 0.9, yellow * 0.75));
  const bg = new THREE.Color(COL.night).lerp(new THREE.Color("#3a2a0c"), fullStain);

  return (
    <ThreeCanvas
      width={width}
      height={height}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <CameraRig move={move} p={p} />
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 3, 9]} />
      <hemisphereLight args={["#6b84b8", "#0a0d18", 0.65]} />
      <directionalLight position={[-3, 4, 2]} color="#c3d5ff" intensity={2} />
      <directionalLight position={[3, 1, -2]} color="#ffd38a" intensity={0.6 + fullStain} />
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            color={thread}
            roughness={0.85}
            bumpMap={fuzz}
            bumpScale={1.5}
            emissive="#6a4a0e"
            emissiveIntensity={fullStain * 0.5}
          />
        </mesh>
      ))}
      {particles > 0 &&
        PARTICLES.map((q, i) => {
          const k = settled ? 1 : easeOut(clamp01((t - q.start) / 1.1));
          if (k <= 0) return null;
          const y = 0.13 + (1 - k) * 3.5;
          const flat = q.type === 1 ? 0.45 : q.type === 2 ? 0.2 : 1;
          return (
            <mesh key={i} position={[q.x, y, q.z]} scale={[1.4, flat * (k > 0.98 ? 0.7 : 1), 1.4]}>
              {q.type === 2 ? <cylinderGeometry args={[q.s * 1.4, q.s * 1.4, 0.02, 6]} /> : <sphereGeometry args={[q.s, 16, 12]} />}
              <meshPhysicalMaterial
                color={PCOL[q.type]}
                roughness={q.type === 2 ? 0.7 : 0.1}
                clearcoat={q.type === 2 ? 0 : 1}
                transparent
                opacity={(q.type === 0 ? 0.7 : 0.85) * particles}
                emissive={PCOL[q.type]}
                emissiveIntensity={0.25}
              />
            </mesh>
          );
        })}
    </ThreeCanvas>
  );
};

export const FIBER_CAM = {
  wide: { from: [1.2, 5.0, 3.0], to: [0.9, 4.2, 2.4], lookFrom: [0, 0, -0.2], lookTo: [0, 0, -0.2], fovFrom: 45, fovTo: 45 },
  close: { from: [0.6, 2.8, 1.8], to: [0.4, 2.1, 1.3], lookFrom: [0, 0, -0.1], lookTo: [0, 0, -0.1], fovFrom: 42, fovTo: 40 },
  extreme: { from: [0.3, 2.2, 1.0], to: [0.12, 1.05, 0.4], lookFrom: [0, 0, 0], lookTo: [0.0, 0.05, 0.0], fovFrom: 45, fovTo: 26 },
} satisfies Record<string, CamMove>;

import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, type CamMove } from "./CameraRig";
import { COL, clamp01, easeOut, hash } from "./theme";

// Close-up of skin: pores, sweat droplets, sebum, shedding cells.
// Units are arbitrary (≈ 1 unit = 1 mm).

export type MacroMode = "sweat" | "sebum" | "cells" | "all";

const PORES = Array.from({ length: 70 }, (_, i) => ({
  x: (hash(i + 1) - 0.5) * 10,
  z: (hash(i + 101) - 0.5) * 10,
  d: hash(i + 201),
}));

const skinHeight = (x: number, z: number) => {
  // Fine skin texture: crossing micro-furrows (like real skin lines)
  let h =
    0.05 * Math.sin(x * 2.1 + z * 1.3) +
    0.04 * Math.sin(x * -1.4 + z * 2.7 + 1) +
    0.025 * Math.abs(Math.sin(x * 3.3 + z * 0.4)) +
    0.02 * Math.abs(Math.sin(z * 3.7 - x * 0.9));
  for (const p of PORES) {
    const d2 = (x - p.x) ** 2 + (z - p.z) ** 2;
    if (d2 < 0.09) h -= 0.12 * (1 - d2 / 0.09);
  }
  return h;
};

export const Macro3D: React.FC<{ move: CamMove; p: number; t: number; mode: MacroMode; amount?: number }> = ({
  move,
  p,
  t,
  mode,
  amount = 1,
}) => {
  const { width, height } = useVideoConfig();

  const skin = useMemo(() => {
    const g = new THREE.PlaneGeometry(12, 12, 220, 220);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, skinHeight(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    return g;
  }, []);

  const lines = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#888";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(40,40,40,${0.25 + hash(i) * 0.3})`;
      g.lineWidth = 1 + hash(i + 1) * 2;
      g.beginPath();
      const x = hash(i + 2) * 512;
      const y = hash(i + 3) * 512;
      const a = (i % 2 ? 0.5 : -0.7) + (hash(i + 4) - 0.5) * 0.4;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * 90, y + Math.sin(a) * 90);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    return t;
  }, []);

  const showSweat = mode === "sweat" || mode === "all";
  const showSebum = mode === "sebum" || mode === "all";
  const showCells = mode === "cells" || mode === "all";

  return (
    <ThreeCanvas
      width={width}
      height={height}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <CameraRig move={move} p={p} />
      <color attach="background" args={[COL.night]} />
      <fog attach="fog" args={[COL.night, 4, 11]} />
      <hemisphereLight args={["#5d77ad", "#120c10", 0.6]} />
      <directionalLight position={[-4, 3, -2]} color="#a9c4ff" intensity={2.2} />
      <directionalLight position={[3, 1.5, 2]} color="#ffcf8a" intensity={0.55} />
      <pointLight position={[0, 1.2, 1]} color="#ffffff" intensity={1.5} distance={6} />

      <mesh geometry={skin}>
        <meshStandardMaterial color="#c99a86" roughness={0.58} bumpMap={lines} bumpScale={2.5} />
      </mesh>

      {PORES.map((pore, i) => {
        // Sweat: a bead grows out of the pore, wobbles, catches the light.
        const start = pore.d * 0.9;
        const g = showSweat ? easeOut(clamp01((t - start) / 0.9)) * amount : 0;
        // Sebum: a flatter, golden film spreading from the pore.
        const sg = showSebum ? easeOut(clamp01((t - start * 0.8) / 1.2)) * amount : 0;
        const r = 0.1 + pore.d * 0.14;
        return (
          <group key={i} position={[pore.x, skinHeight(pore.x, pore.z), pore.z]}>
            {g > 0.01 && (
              <mesh position={[0, r * g * 0.55, 0]} scale={[g, g * (0.85 + 0.05 * Math.sin(t * 5 + i)), g]}>
                <sphereGeometry args={[r, 32, 24]} />
                <meshPhysicalMaterial
                  color={COL.sweat}
                  roughness={0.04}
                  metalness={0}
                  clearcoat={1}
                  transparent
                  opacity={0.55}
                  emissive="#1d3c7a"
                  emissiveIntensity={0.3}
                />
              </mesh>
            )}
            {sg > 0.01 && (
              <mesh position={[0, 0.02, 0]} scale={[sg * 1.5, sg * 0.14, sg * 1.25]} rotation-y={pore.d * 3}>
                <sphereGeometry args={[r * 1.3, 32, 16]} />
                <meshPhysicalMaterial
                  color="#e6b84a"
                  roughness={0.08}
                  clearcoat={1}
                  transparent
                  opacity={0.5}
                  emissive="#7a5410"
                  emissiveIntensity={0.35}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Dead skin cells: thin translucent flakes lifting and drifting away */}
      {showCells &&
        Array.from({ length: 40 }, (_, i) => {
          const st = hash(i + 500) * 1.4;
          const k = clamp01((t - st) / 2.2);
          if (k <= 0) return null;
          const x = (hash(i + 600) - 0.5) * 8;
          const z = (hash(i + 700) - 0.5) * 8;
          return (
            <mesh
              key={`c${i}`}
              position={[x + k * 0.6, skinHeight(x, z) + 0.03 + easeOut(k) * (0.4 + hash(i) * 1.2), z - k * 0.3]}
              rotation={[0.3 + k * 2 * hash(i + 1), hash(i + 2) * 6, k * 1.5]}
            >
              <cylinderGeometry args={[0.13 + hash(i + 3) * 0.1, 0.13 + hash(i + 3) * 0.1, 0.008, 6]} />
              <meshStandardMaterial color={COL.cells} transparent opacity={0.75 * amount} roughness={0.7} emissive="#33415e" emissiveIntensity={0.4} />
            </mesh>
          );
        })}
    </ThreeCanvas>
  );
};

export const MACRO_CAM = {
  low: { from: [0, 4.2, 3.4], to: [0.2, 3.3, 2.5], lookFrom: [0, 0, -0.6], lookTo: [0.1, 0, -0.5], fovFrom: 50, fovTo: 48 },
  close: { from: [0.4, 2.4, 1.9], to: [0.2, 1.7, 1.3], lookFrom: [0, 0, -0.3], lookTo: [0, 0, -0.2], fovFrom: 45, fovTo: 42 },
  top: { from: [0, 4.2, 0.6], to: [0, 3.4, 0.4], lookFrom: [0, 0, 0], lookTo: [0, 0, 0], fovFrom: 45, fovTo: 45 },
} satisfies Record<string, CamMove>;

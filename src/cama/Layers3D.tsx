import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CameraRig, type CamMove } from "./CameraRig";
import { makeStainTexture } from "./textures";
import { COL, easeInOut } from "./theme";

/** Exploded view: sheet above mattress; the stain reaches both. */
export const Layers3D: React.FC<{ move: CamMove; p: number; t: number; stain: number }> = ({ move, p, t, stain }) => {
  const { width, height } = useVideoConfig();
  const g = useMemo(
    () => ({
      mattress: new RoundedBoxGeometry(1.9, 0.32, 2.2, 4, 0.06),
      stainA: makeStainTexture(3, "body"),
      stainB: makeStainTexture(8, "body"),
    }),
    [],
  );
  const lift = easeInOut(Math.min(1, t / 1.2)) * 0.55;
  return (
    <ThreeCanvas
      width={width}
      height={height}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <CameraRig move={move} p={p} />
      <color attach="background" args={[COL.night]} />
      <hemisphereLight args={["#4d659a", "#0a0d18", 0.6]} />
      <directionalLight position={[3, 4, 2]} color="#cbdaff" intensity={1.3} />
      <pointLight position={[-2, 1, 1]} color="#ffbf66" intensity={1.2} distance={6} />
      <group rotation-y={-0.5 + t * 0.06}>
        {/* Mattress */}
        <mesh geometry={g.mattress} position={[0, 0, 0]}>
          <meshStandardMaterial color="#dfe6f4" roughness={0.9} />
        </mesh>
        <mesh position={[-0.45, 0.161, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.85, 1.95]} />
          <meshStandardMaterial map={g.stainB} emissiveMap={g.stainB} emissive="#ffcf5a" emissiveIntensity={0.35} transparent opacity={stain * 0.7} depthWrite={false} />
        </mesh>
        {/* Sheet, lifted above */}
        <mesh position={[0, 0.2 + lift, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.95, 2.25, 1, 1]} />
          <meshStandardMaterial color="#f3f6fc" roughness={0.95} side={THREE.DoubleSide} transparent opacity={0.92} />
        </mesh>
        <mesh position={[-0.45, 0.202 + lift, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.85, 1.95]} />
          <meshStandardMaterial map={g.stainA} emissiveMap={g.stainA} emissive="#ffcf5a" emissiveIntensity={0.35} transparent opacity={stain} depthWrite={false} />
        </mesh>
        {/* Guide lines between the layers */}
        {[
          [-0.95, -1.1],
          [0.95, -1.1],
          [-0.95, 1.1],
          [0.95, 1.1],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.18 + lift / 2, z]}>
            <boxGeometry args={[0.006, lift + 0.04, 0.006]} />
            <meshBasicMaterial color={COL.moon} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    </ThreeCanvas>
  );
};

export const LAYERS_CAM: CamMove = {
  from: [3.3, 3.9, 4.4],
  to: [2.8, 3.3, 3.7],
  lookFrom: [0, 0.25, 0],
  lookTo: [0, 0.3, 0],
  fovFrom: 45,
  fovTo: 45,
};

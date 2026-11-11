import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CameraRig, type CamMove } from "./CameraRig";
import { makeFabricBump, makeShaftTexture, makeStainTexture } from "./textures";
import { COL, hash } from "./theme";

// Bed dimensions (metres). Bed centred at origin, headboard toward -z.
const TOP = 0.6; // mattress top
const HW = 0.95; // half width
const HL = 1.1; // half length
const PERSON_X = -0.45;

export type BedroomProps = {
  move: CamMove;
  p: number; // camera progress 0..1
  t: number; // seconds (for breathing / dust)
  stainLeft?: number; // 0..1
  stainRight?: number;
  person?: boolean;
  scan?: number | null; // 0..1 sweep, null = off
  lamp?: number; // warm lamp intensity multiplier
  exposure?: number;
};

type HeightFn = (x: number, z: number) => number;

/** Heightfield cloth over the mattress that drapes down over the edges. */
const drapeCloth = (
  geo: THREE.BufferGeometry,
  base: THREE.BufferGeometry,
  h: HeightFn,
  zStart: number,
  top: number,
  overhang = 0.035,
) => {
  const src = base.attributes.position as THREE.BufferAttribute;
  const dst = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < src.count; i++) {
    const x = src.getX(i);
    const z = src.getZ(i);
    const ax = Math.abs(x);
    const dx = Math.max(0, ax - HW);
    const dz = Math.max(0, z - HL);
    const inside = dx === 0 && dz === 0 && z >= zStart;
    const fold = Math.max(0, 1 - (z - zStart) / 0.06); // rolled top edge
    let y = top + (inside ? h(x, z) : 0) + fold * 0.035;
    y -= dx + dz;
    const nx = Math.sign(x) * (Math.min(ax, HW) + overhang * Math.min(1, dx * 8)) + Math.sin(z * 9 + x) * 0.01 * Math.min(1, dx * 4);
    const nz = Math.max(Math.min(z, HL), zStart) + overhang * Math.min(1, dz * 8);
    dst.setXYZ(i, nx, Math.max(y, 0.22), nz);
  }
  dst.needsUpdate = true;
  geo.computeVertexNormals();
};

const clothBase = (w: number, l: number, zCenter: number, seg = 120) => {
  const g = new THREE.PlaneGeometry(w, l, seg, Math.round(seg * (l / w)));
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, zCenter);
  return g;
};

const bump = (x: number, z: number, cx: number, cz: number, rx: number, rz: number, hgt: number) => {
  const d = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
  if (d >= 1) return 0;
  const k = 1 - d;
  return hgt * k * k * (3 - 2 * k);
};

const wrinkles = (x: number, z: number, amp: number) =>
  amp * (Math.sin(x * 7 + z * 3.1) * 0.5 + Math.sin(x * 2.3 - z * 8.7 + 1.3) * 0.35 + Math.sin(x * 13 + z * 11) * 0.15);

const Room: React.FC<{ lamp: number; t: number; shaft: THREE.Texture }> = ({ lamp, t, shaft }) => {
  const curtain = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.7, 2.6, 30, 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 22) * 0.05);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#0c1426" roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 2, -1.3]} receiveShadow>
        <planeGeometry args={[10, 4]} />
        <meshStandardMaterial color="#17264a" roughness={0.95} />
      </mesh>
      {/* Side wall */}
      <mesh position={[2.6, 2, 1]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color="#0e1930" roughness={0.95} />
      </mesh>
      {/* Window on the back wall, right of the bed */}
      <mesh position={[1.45, 1.95, -1.29]}>
        <planeGeometry args={[0.95, 1.2]} />
        <meshStandardMaterial color="#000" emissive="#b7cdfa" emissiveIntensity={1.5} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[1.45, 1.95, -1.28]}>
          <boxGeometry args={i ? [0.035, 1.2, 0.03] : [0.95, 0.035, 0.03]} />
          <meshStandardMaterial color="#0a1122" />
        </mesh>
      ))}
      {[0.85, 2.05].map((x, i) => (
        <mesh key={x} geometry={curtain} position={[x, 1.6, -1.22]} rotation-y={i ? -0.06 : 0.06}>
          <meshStandardMaterial color="#1b2b4d" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Light shafts from the window */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[1.6 + (i - 1) * 0.25, 1.55, 0.1]}
          rotation={[0, 0.3, 0.75]}
        >
          <planeGeometry args={[0.55, 2.6]} />
          <meshBasicMaterial
            map={shaft}
            color={COL.moon}
            transparent
            opacity={0.07 + 0.015 * Math.sin(t * 0.7 + i)}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Nightstands + lamp */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.35, 0.27, -0.95]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.54, 0.42]} />
          <meshStandardMaterial color="#18223b" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[-1.35, 0.62, -0.95]}>
        <cylinderGeometry args={[0.05, 0.08, 0.16, 24]} />
        <meshStandardMaterial color="#2a3550" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[-1.35, 0.83, -0.95]}>
        <cylinderGeometry args={[0.1, 0.16, 0.2, 32, 1, true]} />
        <meshStandardMaterial
          color="#f1d9a6"
          emissive={COL.yellow}
          emissiveIntensity={0.55 * lamp}
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>
      <pointLight position={[-1.35, 0.8, -0.8]} color="#ffbf66" intensity={1.4 * lamp} distance={3.2} decay={2} />
    </group>
  );
};

export const Bedroom3D: React.FC<BedroomProps> = ({
  move,
  p,
  t,
  stainLeft = 0,
  stainRight = 0,
  person = true,
  scan = null,
  lamp = 1,
  exposure = 1.25,
}) => {
  const { width, height } = useVideoConfig();

  const tex = useMemo(
    () => ({
      stainL: makeStainTexture(3, "body"),
      stainR: makeStainTexture(17, "body"),
      pillowL: makeStainTexture(5, "pillow"),
      pillowR: makeStainTexture(9, "pillow"),
      fabric: (() => {
        const b = makeFabricBump(2);
        b.repeat.set(6, 6);
        return b;
      })(),
      shaft: makeShaftTexture(),
    }),
    [],
  );

  const geo = useMemo(() => {
    const mattress = new RoundedBoxGeometry(HW * 2, 0.26, HL * 2, 4, 0.06);
    const pillow = new RoundedBoxGeometry(0.66, 0.15, 0.42, 5, 0.07);
    const sheetBase = clothBase(HW * 2 + 0.5, HL * 2 + 0.3, 0.15, 90);
    const blanketBase = clothBase(HW * 2 + 0.5, 1.9, 0.6, 110);
    return { mattress, pillow, sheetBase, sheet: sheetBase.clone(), blanketBase, blanket: blanketBase.clone() };
  }, []);

  // Sheet: gentle wrinkles + a soft dent where the person lies.
  useLayoutEffect(() => {
    drapeCloth(geo.sheet, geo.sheetBase, (x, z) => wrinkles(x, z, 0.004) - (person ? bump(x, z, PERSON_X, 0.1, 0.3, 0.9, 0.012) : 0), -HL, TOP + 0.004);
  }, [geo, person]);

  // Blanket: covers the person (breathing) or lies folded at the foot.
  const breath = Math.sin((t / 4.2) * Math.PI * 2);
  useLayoutEffect(() => {
    const zStart = person ? -0.6 : 0.62;
    drapeCloth(
      geo.blanket,
      geo.blanketBase,
      (x, z) => {
        let h = wrinkles(x * 0.8, z * 0.8, 0.012) + 0.02;
        if (person) {
          const b = 1 + breath * 0.035;
          const parts = [
            bump(x, z, PERSON_X, -0.15, 0.34, 0.55, 0.16 * b),
            bump(x, z, PERSON_X, -0.52, 0.3, 0.14, 0.09),
            bump(x, z, PERSON_X, 0.3, 0.28, 0.36, 0.12),
            bump(x, z, PERSON_X - 0.09, 0.75, 0.13, 0.5, 0.075),
            bump(x, z, PERSON_X + 0.11, 0.77, 0.13, 0.5, 0.075),
            bump(x, z, PERSON_X - 0.08, 1.04, 0.08, 0.08, 0.1),
            bump(x, z, PERSON_X + 0.12, 1.05, 0.08, 0.08, 0.1),
          ];
          const mx = Math.max(...parts);
          h += mx + 0.25 * (parts.reduce((a, v) => a + v, 0) - mx);
        } else {
          h += 0.03 + bump(x, z, 0, 0.75, 1.4, 0.18, 0.05);
        }
        return h;
      },
      zStart,
      TOP + 0.01,
      0.06,
    );
  }, [geo, person, breath]);

  const dust = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        x: -0.4 + hash(i) * 2.4,
        y: 0.7 + hash(i + 10) * 1.2,
        z: -0.9 + hash(i + 20) * 1.4,
        s: 0.004 + hash(i + 30) * 0.006,
        ph: hash(i + 40) * 6.28,
      })),
    [],
  );

  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure }}
      style={{ position: "absolute", inset: 0 }}
    >
      <CameraRig move={move} p={p} />
      <color attach="background" args={[COL.night]} />
      <fog attach="fog" args={[COL.night, 5, 13]} />
      <hemisphereLight args={["#5670a3", "#0a0e1a", 0.75]} />
      <pointLight position={[0.4, 2.3, 0.6]} color="#3d5fa8" intensity={2.2} distance={5} decay={1.6} />
      <directionalLight
        position={[3.2, 4.2, 0.6]}
        color="#c9d9ff"
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={2.5}
        shadow-camera-bottom={-2.5}
      />
      <directionalLight position={[-2, 2, 3]} color="#294c8f" intensity={0.5} />

      <Room lamp={lamp} t={t} shaft={tex.shaft} />

      {/* Bed frame, headboard, mattress */}
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <boxGeometry args={[HW * 2 + 0.1, 0.34, HL * 2 + 0.1]} />
        <meshStandardMaterial color="#1a2441" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.85, -HL - 0.08]} castShadow receiveShadow>
        <boxGeometry args={[HW * 2 + 0.16, 1.1, 0.08]} />
        <meshStandardMaterial color="#223156" roughness={0.8} />
      </mesh>
      <mesh geometry={geo.mattress} position={[0, TOP - 0.13, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d9e2f2" roughness={0.9} />
      </mesh>

      {/* Fitted sheet + stains */}
      <mesh geometry={geo.sheet} castShadow receiveShadow>
        <meshStandardMaterial color="#f1f4fb" roughness={0.92} bumpMap={tex.fabric} bumpScale={0.6} side={THREE.DoubleSide} />
      </mesh>
      {[
        { x: -0.47, v: stainLeft, map: tex.stainL },
        { x: 0.47, v: stainRight, map: tex.stainR },
      ].map((s) =>
        s.v > 0.001 ? (
          <mesh key={s.x} position={[s.x, TOP + 0.0075, 0.02]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.85, 1.95]} />
            <meshStandardMaterial map={s.map} emissiveMap={s.map} emissive="#ffcf5a" emissiveIntensity={0.35} transparent opacity={s.v} depthWrite={false} roughness={0.95} />
          </mesh>
        ) : null,
      )}

      {/* Pillows (+ stains) */}
      {[-0.46, 0.46].map((x, i) => (
        <group key={x} position={[x, TOP + 0.08, -0.82]} rotation={[0.08, i ? -0.04 : 0.05, 0]}>
          <mesh geometry={geo.pillow} castShadow receiveShadow scale={[1, 1, 1]}>
            <meshStandardMaterial color="#f4f6fc" roughness={0.95} bumpMap={tex.fabric} bumpScale={0.4} />
          </mesh>
          {(i ? stainRight : stainLeft) > 0.001 && (
            <mesh position={[0, 0.0755, 0]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.5, 0.32]} />
              <meshStandardMaterial
                map={i ? tex.pillowR : tex.pillowL}
                transparent
                emissiveMap={i ? tex.pillowR : tex.pillowL}
                emissive="#ffcf5a"
                emissiveIntensity={0.35}
                opacity={i ? stainRight : stainLeft}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Blanket */}
      <mesh geometry={geo.blanket} castShadow receiveShadow>
        <meshStandardMaterial color="#46526e" roughness={0.9} bumpMap={tex.fabric} bumpScale={1.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Sleeping person: head turned toward the window, one arm over the blanket */}
      {person && (
        <group>
          {/* Head turned away from camera (toward the lamp side): mostly hair shows */}
          <group position={[PERSON_X, TOP + 0.2, -0.8]} rotation={[0.1, -1.35, 0.25]}>
            <mesh castShadow scale={[0.88, 1.0, 1.1]}>
              <sphereGeometry args={[0.1, 48, 48]} />
              <meshStandardMaterial color="#cf9f86" roughness={0.55} />
            </mesh>
            {/* hair: covers top and back, leaves the face (+z) open */}
            <mesh castShadow scale={[0.93, 1.04, 1.13]} rotation-y={Math.PI}>
              <sphereGeometry args={[0.104, 48, 48, -Math.PI * 0.62, Math.PI * 1.24, 0, Math.PI * 0.82]} />
              <meshStandardMaterial color="#3d322c" roughness={0.88} side={THREE.DoubleSide} />
            </mesh>
            <mesh castShadow position={[0, 0.035, 0.02]} scale={[0.92, 0.75, 1.0]}>
              <sphereGeometry args={[0.1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
              <meshStandardMaterial color="#3d322c" roughness={0.88} />
            </mesh>
            <mesh position={[0.09, -0.005, -0.01]} scale={[0.35, 1, 0.6]}>
              <sphereGeometry args={[0.03, 16, 16]} />
              <meshStandardMaterial color="#c4947b" roughness={0.6} />
            </mesh>
          </group>
        </group>
      )}

      {/* Scan sweep */}
      {scan !== null && (
        <group position={[0, TOP + 0.25, -HL + scan * HL * 2]}>
          <mesh>
            <boxGeometry args={[HW * 2 + 0.3, 0.6, 0.006]} />
            <meshBasicMaterial color={COL.moon} transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.24, 0]}>
            <boxGeometry args={[HW * 2 + 0.3, 0.012, 0.012]} />
            <meshBasicMaterial color="#cfe0ff" />
          </mesh>
          <pointLight color="#7fb0ff" intensity={1.2} distance={1.2} />
        </group>
      )}

      {/* Dust in the moonlight */}
      {dust.map((d, i) => (
        <mesh key={i} position={[d.x + Math.sin(t * 0.3 + d.ph) * 0.05, d.y + Math.sin(t * 0.2 + d.ph) * 0.08, d.z + t * 0.01]}>
          <sphereGeometry args={[d.s, 6, 6]} />
          <meshBasicMaterial color="#cfe0ff" transparent opacity={0.35 + 0.3 * Math.sin(t + d.ph)} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </ThreeCanvas>
  );
};

/** Handy camera presets (bed space). */
export const CAM = {
  wide: { from: [1.0, 2.9, 2.9], to: [0.75, 2.45, 2.3], lookFrom: [0.0, 0.55, -0.15], lookTo: [-0.05, 0.6, -0.3], fovFrom: 52, fovTo: 50 },
  top: { from: [0, 4.4, 0.05], to: [0, 4.0, 0.05], lookFrom: [0, 0.6, 0.05], lookTo: [0, 0.6, 0.05], up: [0, 0, -1], fovFrom: 40, fovTo: 40 },
} satisfies Record<string, CamMove>;

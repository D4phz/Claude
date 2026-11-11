import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import type { PerspectiveCamera } from "three";
import { easeInOut, lerp, lerp3, type V3 } from "./theme";

export type CamMove = {
  from: V3;
  to: V3;
  lookFrom: V3;
  lookTo: V3;
  fovFrom?: number;
  fovTo?: number;
  /** Camera "up" vector (top-down shots need [0,0,-1]). */
  up?: V3;
  roll?: number;
};

/** Places the camera for progress p (0..1) of a move. Driven by Remotion frames. */
export const CameraRig: React.FC<{ move: CamMove; p: number }> = ({ move, p }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    const e = easeInOut(p);
    const pos = lerp3(move.from, move.to, e);
    const look = lerp3(move.lookFrom, move.lookTo, e);
    camera.up.set(...(move.up ?? [0, 1, 0]));
    camera.position.set(...pos);
    camera.lookAt(...look);
    if (move.roll) camera.rotateZ(move.roll);
    camera.fov = lerp(move.fovFrom ?? 35, move.fovTo ?? move.fovFrom ?? 35, e);
    camera.aspect = size.width / size.height;
    camera.near = 0.01;
    camera.far = 100;
    camera.updateProjectionMatrix();
  }, [camera, move, p, size]);
  return null;
};

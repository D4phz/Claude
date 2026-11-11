import { useCurrentFrame } from "remotion";
import { Bedroom3D, CAM } from "./Bedroom3D";
import { Fibers3D, FIBER_CAM } from "./Fibers3D";
import { Macro3D, MACRO_CAM } from "./Macro3D";

export const CamaTest: React.FC<{ shot: string }> = ({ shot }) => {
  const f = useCurrentFrame();
  const t = f / 30 + 1.5;
  if (shot === "top") return <Bedroom3D move={CAM.top} p={0.5} t={t} stainLeft={0.8} stainRight={0.25} person={false} />;
  if (shot === "sweat") return <Macro3D move={MACRO_CAM.low} p={0.5} t={t} mode="sweat" />;
  if (shot === "sebum") return <Macro3D move={MACRO_CAM.close} p={0.5} t={t} mode="sebum" />;
  if (shot === "cells") return <Macro3D move={MACRO_CAM.low} p={0.5} t={t} mode="cells" />;
  if (shot === "fibers") return <Fibers3D move={FIBER_CAM.close} p={0.5} t={t} particles={1} yellow={0.4} />;
  if (shot === "extreme") return <Fibers3D move={FIBER_CAM.extreme} p={0.9} t={t} fullStain={1} />;
  return <Bedroom3D move={CAM.wide} p={0} t={t} stainLeft={0} />;
};

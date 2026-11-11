import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pix } from "./engine";

export const LW = 180;
export const LH = 320;

/** Draws a frame into a 180x320 buffer and shows it scaled with crisp pixels. */
export const PixelCanvas: React.FC<{ draw: (px: Pix) => void; deps: unknown[]; style?: React.CSSProperties }> = ({ draw, deps, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const px = new Pix(LW, LH);
    draw(px);
    ctx.putImageData(new ImageData(px.data, LW, LH), 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return (
    <AbsoluteFill style={style}>
      <canvas ref={ref} width={LW} height={LH} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
    </AbsoluteFill>
  );
};

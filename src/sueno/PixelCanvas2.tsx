import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pix, SOFT } from "../castillo/engine";

export const SW = 270;
export const SH = 480;

/** 270x480 pixel buffer shown at 4x (1080x1920) with crisp pixels. */
export const PixelCanvas2: React.FC<{ draw: (px: Pix) => void; deps: unknown[] }> = ({ draw, deps }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const px = new Pix(SW, SH);
    SOFT.on = true;
    try {
      draw(px);
    } finally {
      SOFT.on = false;
    }
    ctx.putImageData(new ImageData(px.data, SW, SH), 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={SW} height={SH} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
    </AbsoluteFill>
  );
};

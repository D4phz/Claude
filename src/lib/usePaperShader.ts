import { useCallback, useEffect, useRef, useState } from "react";
import {
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { PaperShaderElement } from "@paper-design/shaders";

/**
 * Makes a Paper Shaders component frame-accurate inside Remotion.
 *
 * Spread the result onto any shader from `@paper-design/shaders-react`:
 *
 *   const shader = usePaperShader();
 *   <MeshGradient {...shader} colors={[...]} />
 *
 * - `speed={0}` stops the shader's own requestAnimationFrame clock.
 * - `frame` (ms) is driven by Remotion's current frame, scaled by `speed`.
 * - The render is held with delayRender() until the WebGL program is
 *   initialised (it loads asynchronously), so no blank frames are captured.
 */
export const usePaperShader = (speed = 1, offsetMs = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [handle] = useState(() => delayRender("Initialising Paper Shader"));
  const done = useRef(false);
  const el = useRef<PaperShaderElement | null>(null);

  const release = useCallback(() => {
    if (!done.current) {
      done.current = true;
      continueRender(handle);
    }
  }, [handle]);

  useEffect(() => {
    let raf = 0;
    const poll = () => {
      if (el.current?.paperShaderMount) {
        // One more frame so the first draw has landed on the canvas.
        raf = requestAnimationFrame(release);
      } else {
        raf = requestAnimationFrame(poll);
      }
    };
    poll();
    return () => cancelAnimationFrame(raf);
  }, [release]);

  return {
    ref: el,
    speed: 0,
    frame: offsetMs + (frame / fps) * 1000 * speed,
  } as const;
};

---
name: paper-shaders
description: Use Paper Shaders (@paper-design/shaders-react, github.com/paper-design/shaders) as animated WebGL backgrounds, textures and image effects inside Remotion compositions — mesh gradients, grain gradients, god rays, liquid metal, water, dithering, halftone, smoke, metaballs, warp, paper texture and more. Use when the user asks for shader backgrounds, gradients, noise, glow, dithering or "Paper Shaders" in a video, or wants a Remotion scene to look rich and textured.
---

# Paper Shaders in Remotion

`@paper-design/shaders-react` is installed at an exact version (it ships breaking
changes under 0.0.x; keep it pinned). Every shader is a React component that
renders a WebGL canvas.

## The one rule: drive shaders from Remotion's frame

By default a shader runs its own `requestAnimationFrame` clock, which is not
deterministic and renders wrong in `remotion render`. Always spread
`usePaperShader()` from `src/lib/usePaperShader.ts` onto the component:

```tsx
import { GrainGradient } from "@paper-design/shaders-react";
import { usePaperShader } from "./lib/usePaperShader";

const shader = usePaperShader(0.5); // speed multiplier; optional 2nd arg = offset in ms
<GrainGradient
  {...shader}
  width={width}
  height={height}
  colors={["#7300ff", "#eba8ff", "#00bfff", "#2a00ff"]}
  colorBack="#000000"
  shape="corners"
/>;
```

The hook sets `speed={0}`, sets `frame` (ms) from `useCurrentFrame()`, and holds
the render with `delayRender()` until the WebGL program is ready. Never pass your
own `speed` alongside it. One hook call per shader instance.

Inside a `<Sequence>`, `useCurrentFrame()` is local to the sequence, so the
shader restarts at 0; pass an offset if it should continue.

## Available shaders

`MeshGradient`, `StaticMeshGradient`, `StaticRadialGradient`, `GrainGradient`,
`GodRays`, `LiquidMetal`, `Water`, `SmokeRing`, `NeuroNoise`, `PerlinNoise`,
`SimplexNoise`, `Voronoi`, `Warp`, `Swirl`, `Spiral`, `Waves`, `Metaballs`,
`DotOrbit`, `DotGrid`, `ColorPanels`, `PulsingBorder`, `Dithering`,
`HalftoneDots`, `HalftoneCmyk`, `GemSmoke`, `FlutedGlass`, `PaperTexture`,
`ImageDithering`, `LensDistortion`, `Heatmap`.

Each exports presets (e.g. `meshGradientPresets`, `grainGradientPresets`) whose
`params` are good starting points:
`<MeshGradient {...meshGradientPresets[2].params} {...shader} />` (spread the
hook last so it wins over the preset's `speed`/`frame`).

For a shader's exact props, read its typings:
`node_modules/@paper-design/shaders-react/dist/shaders/<name>.d.ts` and the
params in `node_modules/@paper-design/shaders/dist/shaders/<name>.d.ts`.
Interactive docs: https://shaders.paper.design/

Common sizing props on every shader: `width`, `height`, `fit`
(`"contain" | "cover"`), `scale`, `rotation`, `offsetX`, `offsetY`,
`originX`, `originY`, `worldWidth`, `worldHeight`.

## Images

Image shaders (`ImageDithering`, `FlutedGlass`, `HalftoneDots`, `PaperTexture`,
`LensDistortion`, `Heatmap`, …) take `image` as a URL. Use
`staticFile("photo.jpg")` from Remotion for files in `public/`. The hook's
`delayRender` waits for the program; if an image is slow, also wrap with
Remotion's `prefetch` or `delayRender` until loaded.

## Rendering

`remotion.config.ts` sets `--gl=swangle` (software WebGL that works on any
machine, including headless servers). On a machine with a GPU, render with
`--gl=angle` for speed. Check a still before a full render:

```bash
npx remotion still <CompId> out/check.png --frame=60 --scale=0.5
```

If a still is blank or throws "WebGL is not supported", the GL backend is the
problem: try `--gl=swangle`.

## Look

- Shaders make great backgrounds; keep text above them with enough contrast
  (a soft shadow or a darker `colorBack`).
- Slow is usually better: speed multipliers of 0.2–0.8 read as calm and premium.
- Animate shader props (colors, `distortion`, `swirl`, `offsetX`) with
  `interpolate()`/`spring()` for scene-to-scene transitions.

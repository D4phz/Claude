# Claude Remotion Studio

A [Remotion](https://www.remotion.dev) video project set up for Claude Code, with
agent skills for shaders, HTML video, film styles and hand-painted character animation.

## Quick start

```bash
npm install
npm run dev        # Remotion Studio
npm run render     # out/shader-intro.mp4
npm run still      # out/shader-intro.png
```

### Compositions

- **`PandaWalk`** (10 s): a pixel-art panda walking slowly through a moonlit
  bamboo valley with a lo-fi chill soundtrack. Render with
  `npx remotion render PandaWalk out/panda-walk.mp4`. The art is drawn on a
  240×135 canvas (`src/panda/`) and scaled 8× with nearest-neighbour filtering;
  the sky is a Paper Shaders `Dithering` layer at the same pixel size. The music
  is synthesized by `node scripts/make-chill-audio.mjs` into `public/chill.wav`.
- **`ShaderIntro`**: the starter example below.

The example composition `ShaderIntro` (`src/ShaderIntro.tsx`) puts a title over an
animated Paper Shaders mesh gradient. `src/lib/usePaperShader.ts` makes any Paper
Shader frame-accurate in Remotion.

## Installed

| What | Source | Where |
|---|---|---|
| Remotion 4 + official Remotion skills | [remotion-dev/skills](https://github.com/remotion-dev/skills) | `package.json`, `.claude/skills/remotion-*` |
| Paper Shaders | [paper-design/shaders](https://github.com/paper-design/shaders) | `@paper-design/shaders-react` (pinned), skill `paper-shaders` |
| HyperFrames | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | `hyperframes` CLI (`npx hyperframes`), skills `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `reverse-any-video`, `style-sampling`, `figma`, `slideshow`, `remotion-to-hyperframes` |
| Lemo-Opuscar | [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | skill `lemo-opuscar` (fetches the style library to `~/lemo-opuscar` on first use) |
| Claude Animation Base | [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) | kit vendored in `kits/claude-animation-base/`, skill `claude-animation-base` |

Skills live in `.agents/skills/` and are linked into `.claude/skills/`, so Claude
Code picks them up when started in this folder. `skills-lock.json` records the
sources; update with `npx skills update`.

## Rendering notes

Paper Shaders need WebGL. `remotion.config.ts` uses `swangle` (software WebGL,
works without a GPU) and a local Chromium at `/opt/pw-browsers/chromium` when
present (override with `REMOTION_BROWSER_EXECUTABLE`). With a GPU, pass
`--gl=angle` for faster renders.

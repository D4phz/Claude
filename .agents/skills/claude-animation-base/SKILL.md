---
name: claude-animation-base
description: Make a short hand-painted cartoon of Clawd (or any character) with the Claude Animation Base kit (github.com/JohnHeibel/ClaudeAnimationBase) — p5.js + p5.brush, watercolour washes, boiling ink lines, drawn key views, 31 emotions, hats, dances and brush-wipe transitions, rendered to MP4. Use when the user asks for a Clawd animation, a hand-drawn / painted / watercolour cartoon, or character animation in p5.brush.
---

# Claude Animation Base

The kit is vendored at `kits/claude-animation-base/` in this repository.

1. **Read the guide first.** Read all of `kits/claude-animation-base/ANIMATION_GUIDE.md`
   before drawing anything. It holds the rules (handmade, alive, one piece, no
   text, transitions always), the workflow (storyboard → build → review → render)
   and the full API for `src/clawd.js`, `src/core.js` and `src/timeline.js`.
   Look at the model sheets `docs/emotions.jpg` and `docs/views.jpg`.
2. **Install once:** `cd kits/claude-animation-base && npm install`.
3. **Write your video** in `kits/claude-animation-base/src/scenes/` (see
   `demo.js`) and set length/tempo in `src/config.js`.
4. **Review with contact sheets** before the final render, as the guide's
   review loop describes: `node render.mjs --sheet=0,1,2,3,4,5 --out=out/sheet.jpg`.
5. **Render:** `node render.mjs --clip --out=out/video.mp4`.

Running from the kit folder (`cd kits/claude-animation-base`). Rendering needs
Node, Chrome/Chromium and ffmpeg.

- In cloud sessions, pass the preinstalled Chromium:
  `--chrome=/opt/pw-browsers/chromium` (or set `CHROME_PATH`).
- With no GPU, add `--soft-gl`. Watercolour `fill`s are slow in software GL;
  consider fewer or smaller fills when render time matters.

## Using it with Remotion

The kit renders its own MP4. To combine it with a Remotion composition (titles,
Paper Shaders backgrounds, music), render the clip first, copy it into
`public/`, and place it with `<OffthreadVideo src={staticFile("clawd.mp4")} />`.

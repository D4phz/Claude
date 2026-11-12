---
name: tiktok-explainer
description: Write and produce short-form explainer videos (TikTok / Reels / Shorts, Spanish by default) in the "glowing vector" style — dark background, flat vector objects with a warm golden neon outline, glossy floor reflections, floating particles, white word-by-word captions — narrated with a free ElevenLabs deep voice. Use when the user asks for a "¿Por qué…?" style curiosity video, a script with hook/setup/body/payoff/outro, or a video "como la imagen" of glowing bottles/objects.
---

# TikTok explainer (glowing vector style)

## 1 · Script rules (always)

Structure for a full video (~4 min; scale down proportionally for shorter cuts):

1. **HOOK (0:00–0:15)** — a shocking fact, question or scene that stops the scroll. Never "Hey guys" or channel intros.
2. **SETUP (0:15–0:40)** — why this matters to the viewer; open a curiosity loop.
3. **MAIN BODY (0:40–3:00)** — 3–5 escalating beats. Each beat ends with a mini-cliffhanger or a transition that pulls into the next.
4. **PAYOFF / TWIST (3:00–3:30)** — the biggest reveal or most powerful insight.
5. **OUTRO (3:30–4:00)** — memorable closing line + natural call to action (comment/subscribe prompt tied to the topic).

Format the script as:

- Section headers with timestamps
- `[NARRATION]` text written to be spoken aloud
- `[VISUAL]` a short B-roll / visual cue under each paragraph
- `(pause)`, *emphasis* and tone notes where they help the voiceover

Write the script to a file (`scripts/<slug>.md`) before animating. Keep facts accurate; prefer "los estudios sugieren…" over invented numbers, and name sources in the script notes.

## 2 · Visual style (match the reference)

- Background near-black (#0b0b0d → #141217), soft floating dust particles.
- Objects are flat vector illustrations (SVG) with a **thick warm golden outline glow** (#ffd77a core, blurred #ffb84a halo) and translucent fills.
- A glossy floor line with a faded mirror reflection of every object.
- Captions: white, heavy sans (Montserrat 800), top-left area, **word-by-word** synced to the voice, the current word highlighted.
- Motion: slow push-ins, objects rising into place with springs, bubbles/particles drifting up, a visual change every ~2 s.
- Vertical 1080×1920, 30 fps.

## 3 · Voice (free ElevenLabs)

- Free plans can only use built-in voices via the API. Deep male: **Brian** `nPczCjzI2devNBz1zQrb` (alt: Adam `pNInz6obpgDQGcFmaJgB`, Bill `pqHfZKP75CvOlQylNhV4`).
- Model `eleven_multilingual_v2`, endpoint `/v1/text-to-speech/{voice}/with-timestamps` so captions sync per word.
- In cloud sessions the key is injected by the proxy: run Node with `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
- Free plan: no commercial use, credit ElevenLabs; ~10k characters/month.

## 4 · Production in this repo

- Generator: `node scripts/tiktok-voice.mjs <slug>` reads `src/tiktok/<slug>.json` lines, writes `public/tiktok/<slug>.mp3` + `<slug>.words.json`.
- Composition: `src/tiktok/` (`GlowVideo`), sized from the audio length.
- Review a still before rendering; render with `npx remotion render <CompId>`.

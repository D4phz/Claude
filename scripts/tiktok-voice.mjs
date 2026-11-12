// ElevenLabs TTS with word timestamps for the tiktok-explainer skill.
// NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node scripts/tiktok-voice.mjs <slug>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const slug = process.argv[2];
const cfg = JSON.parse(readFileSync(`src/tiktok/${slug}.json`, "utf8"));
const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.voice}/with-timestamps?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": "sk_proxy_injected", "Content-Type": "application/json" },
  body: JSON.stringify({
    text: cfg.text,
    model_id: cfg.model ?? "eleven_multilingual_v2",
    voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: cfg.speed ?? 0.92 },
  }),
});
if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 300)}`);
const j = await r.json();
mkdirSync("public/tiktok", { recursive: true });
writeFileSync(`public/tiktok/${slug}.mp3`, Buffer.from(j.audio_base64, "base64"));
// characters → words
const a = j.alignment;
const words = [];
let cur = null;
for (let i = 0; i < a.characters.length; i++) {
  const ch = a.characters[i];
  if (/\s/.test(ch)) {
    if (cur) words.push(cur);
    cur = null;
    continue;
  }
  if (!cur) cur = { w: "", start: a.character_start_times_seconds[i], end: 0 };
  cur.w += ch;
  cur.end = a.character_end_times_seconds[i];
}
if (cur) words.push(cur);
writeFileSync(`public/tiktok/${slug}.words.json`, JSON.stringify(words, null, 1));
console.log(`${words.length} words, ${words.at(-1).end.toFixed(2)}s`);

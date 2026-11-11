// Spanish narration for "El castillo que siempre regresa" with ElevenLabs.
// The API key is injected by the session's network proxy (never stored here).
//
// Run with: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt (cloud sessions)
//   node scripts/castillo-voice.mjs voices            # list Spanish-capable voices
//   node scripts/castillo-voice.mjs sample <voiceId>  # one test line → out/voz-muestra.mp3
//   node scripts/castillo-voice.mjs build <voiceId> [model]   # all lines + mix
//
// Output: public/voz/castillo/NN.mp3 (cached), public/castillo-narracion.wav,
// public/castillo-mix.wav (ambience ducked under the voice).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const KEY = process.env.ELEVENLABS_API_KEY || "sk_proxy_injected"; // proxy overwrites the header
const API = "https://api.elevenlabs.io";
const H = { "xi-api-key": KEY, "Content-Type": "application/json" };

// One line per 2-second beat (matches the on-screen narration).
export const LINES = [
  "Cuatro jóvenes entraron al bosque.",
  "Allí, sobre los árboles, flotaba un castillo.",
  "Su reina parecía amable…",
  "Lior, Mara, Teo y Bram: invitados de honor.",
  "Pero cada noche, un soldado desaparecía.",
  "Uno por uno.",
  "Hasta que vieron su verdadero rostro…",
  "Devoraba a sus propios soldados.",
  "Lucharon contra ella… y la derrotaron.",
  "El castillo cayó del cielo…",
  "…y quedó reducido a escombros.",
  "Pero entre las ruinas había una cabaña.",
  "Allí estaba la misma reina… convertida en anciana.",
  "Volvieron a matarla.",
  "El castillo estaba intacto… y había otros cuatro.",
  "Eran ellos mismos, antes de entrar.",
  "Intentaron cambiar el pasado.",
  "Pero la bruja regresó…",
  "…una y otra vez.",
  "Una energía morada envolvió la cabaña.",
  "Sus cuerpos comenzaron a deteriorarse.",
  "El reino entero estaba bajo su control.",
  "Lior comprendió: la cabaña era el origen de todo…",
  "…pero ya era demasiado tarde.",
  "Una espada atravesó su pecho.",
  "Antes de morir, los vio entrar al bosque.",
  "Eran ellos mismos.",
  "La historia comenzaba otra vez.",
  "La reina seguía esperando.",
  "El ciclo nunca terminaría.",
];

const api = async (path, init = {}) => {
  const r = await fetch(API + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${path}: ${(await r.text()).slice(0, 300)}`);
  return r;
};

const tts = async (voice, text, model, file) => {
  const r = await api(`/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    body: JSON.stringify({
      text,
      model_id: model,
      language_code: model === "eleven_multilingual_v2" ? undefined : "es",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 0.95 },
    }),
  });
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
};

const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

const [cmd, voice, model = "eleven_multilingual_v2"] = process.argv.slice(2);

if (cmd === "voices") {
  const mine = await (await api("/v2/voices?page_size=100")).json();
  console.log("— Your voices —");
  for (const v of mine.voices) console.log(v.voice_id, "|", v.name, "|", JSON.stringify(v.labels || {}));
  const lib = await (await api("/v1/shared-voices?page_size=25&language=es&use_cases=narrative_story&sort=trending")).json();
  console.log("— Library: Spanish narrative —");
  for (const v of lib.voices || []) console.log(v.voice_id, "|", v.name, "|", v.gender, v.age, v.accent, "|", v.descriptive || "", "| owner", v.public_owner_id);
} else if (cmd === "sample") {
  mkdirSync("out", { recursive: true });
  await tts(voice, "Cuatro jóvenes entraron al bosque. Allí, sobre los árboles, flotaba un castillo.", model, "out/voz-muestra.mp3");
  console.log("out/voz-muestra.mp3", dur("out/voz-muestra.mp3").toFixed(2) + "s");
} else if (cmd === "build") {
  const dir = "public/voz/castillo";
  mkdirSync(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < LINES.length; i++) {
    const f = `${dir}/${String(i).padStart(2, "0")}.mp3`;
    if (!existsSync(f)) {
      await tts(voice, LINES[i], model, f);
      process.stdout.write(`${i} `);
    }
    files.push(f);
  }
  // Schedule: narrate the lines that fit (the rest stay as on-screen text),
  // each at its beat or right after the previous one, at near-natural speed.
  // [line index, earliest start (s), tempo]
  const PLAN = [
    [0, 0.15, 1], [1, 2.4, 1.15], [2, 5.1, 1], [4, 8.15, 1], [5, 11.0, 1], [6, 12.2, 1.05],
    [7, 14.2, 1], [8, 16.5, 1], [9, 19.8, 1], [11, 22.0, 1.05], [12, 24.3, 1.15], [13, 27.4, 1],
    [14, 29.0, 1.1], [16, 32.5, 1], [17, 34.55, 1], [18, 36.3, 1], [19, 38.15, 1], [20, 40.7, 1],
    [22, 44.1, 1.1], [24, 48.1, 1], [25, 50.25, 1.05], [26, 52.6, 1], [27, 54.3, 1], [28, 56.45, 1.1], [29, 58.2, 1.1],
  ];
  let prevEnd = 0;
  const parts = [];
  for (const [i, at, tempo] of PLAN) {
    const start = Math.max(at, prevEnd + 0.06);
    const d = dur(files[i]) / tempo;
    parts.push({ f: files[i], start, tempo });
    prevEnd = start + d;
    console.log(`${String(i).padStart(2)} ${start.toFixed(2)}s → ${prevEnd.toFixed(2)}s${tempo > 1 ? ` x${tempo}` : ""}  ${LINES[i]}`);
  }
  if (prevEnd > 60) console.warn("WARNING: narration runs past 60 s");
  // Narration track (60 s), then duck the ambience under it.
  const inputs = parts.flatMap((p) => ["-i", p.f]);
  const chains = parts.map((p, i) => `[${i}:a]aresample=44100,atempo=${p.tempo.toFixed(3)},adelay=${Math.round(p.start * 1000)}|${Math.round(p.start * 1000)},aformat=channel_layouts=stereo[a${i}]`);
  const mixIn = parts.map((_, i) => `[a${i}]`).join("");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${chains.join(";")};${mixIn}amix=inputs=${parts.length}:normalize=0,apad=whole_dur=60,atrim=0:60[v]`, "-map", "[v]", "public/castillo-narracion.wav"]);
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-i", "public/castillo-audio.wav",
    "-i", "public/castillo-narracion.wav",
    "-filter_complex",
    "[1:a]asplit=2[vsc][vmix];[0:a][vsc]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=350[duck];[duck][vmix]amix=inputs=2:normalize=0:weights='1 1.15',alimiter=limit=0.95[out]",
    "-map", "[out]", "public/castillo-mix.wav",
  ]);
  console.log("public/castillo-mix.wav");
} else {
  console.log("usage: voices | sample <voiceId> [model] | build <voiceId> [model]");
}

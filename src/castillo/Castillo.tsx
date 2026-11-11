import "@fontsource/pixelify-sans/latin-400.css";
import "@fontsource/pixelify-sans/latin-700.css";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { HEROES, ORDER, heroPortrait, heroSprite, queenPortrait, queenSprite, soldierSprite, witchPortrait, witchSprite, type Pose } from "./chars";
import { Pix, clamp01, ease, easeOut, hash, mix } from "./engine";
import { blitScaled, decayMotes, desaturate, dissolve, magicAura, slash, vignette } from "./fx";
import { P } from "./palette";
import { CABIN, cabin, cabinInside, castle, corridor, forest, hall, kingdomMap, moon, nightSky, ruins, torch } from "./places";
import { PixelCanvas } from "./PixelCanvas";

const SHOT = 60;
const FONT = "'Pixelify Sans', monospace";

// ------------------------------------------------------------------ helpers

/** The four heroes walking in formation (Lior leads). Feet at y. */
const party = (px: Pix, x: number, y: number, t: number, o: Pose & { gap?: number; flip?: boolean; scale?: number } = {}) => {
  const gap = o.gap ?? 13;
  const s = o.scale ?? 1;
  const ids = [...ORDER].reverse(); // draw back to front
  ids.forEach((id, i) => {
    const k = ids.length - 1 - i; // 0 = Lior
    const dir = o.flip ? 1 : -1;
    const hx = x + dir * k * gap * s;
    const hy = y - (k % 2) * 2 * s;
    const spr = heroSprite(HEROES[id], { ...o, phase: (o.phase ?? 0) + k * 0.23 });
    if (s === 1) px.blit(spr, hx - 8, hy - 21, o.flip);
    else blitScaled(px, spr, hx - 8 * s, hy - 21 * s, s, o.flip);
  });
};

/** Shared opening composition (0 s, 50 s, 52 s): heroes walking into the forest. */
const openingForest = (px: Pix, t: number, p: number, extra: { purple?: number } = {}) => {
  forest(px, t, { purple: extra.purple });
  const x = 44 + p * 44;
  const y = 262 - p * 16;
  party(px, x, y, t, { phase: t * 1.4, stride: 1, gap: 11 });
};

type Shot = {
  draw: (px: Pix, t: number, p: number, f: number) => void;
  text: string;
  fx?: ("shake" | "flash" | "zoom" | "rotate" | "push" | "stutter" | "purpleFlash")[];
  title?: boolean;
};

const SHOTS: Shot[] = [
  // 0–2 · El bosque (ancla del ciclo)
  { draw: (px, t, p) => openingForest(px, t, p), text: "Cuatro jóvenes entraron al bosque." },
  // 2–4 · El castillo flotando
  {
    draw: (px, t, p) => {
      nightSky(px, 0, 320, t);
      moon(px, 140, 40);
      castle(px, 90, 170 - ease(p) * 22, t);
      for (let x = 0; x < 180; x++) {
        const h = 66 + Math.abs(x - 90) * 0.5 + Math.sin(x / 5) * 4;
        for (let y = 320 - h; y < 320; y++) px.set(x, y, P.leaf);
      }
      party(px, 120, 266, t, { stride: 0, gap: 12 });
    },
    text: "Allí, sobre los árboles, flotaba un *castillo*.",
    fx: ["push"],
  },
  // 4–6 · La reina amable
  {
    draw: (px, t) => {
      hall(px, t);
      px.blit(queenSprite(0), 82, 96);
      for (let i = 0; i < 3; i++) {
        px.blit(soldierSprite(), 40 + i * 2, 150 + i * 30, false);
        px.blit(soldierSprite(), 126 - i * 2, 150 + i * 30, true);
      }
      party(px, 124, 262, t, { stride: 0, gap: 14 });
    },
    text: "Su reina parecía *amable*…",
  },
  // 6–8 · Los cuatro (hoja de personajes)
  {
    draw: (px, t, p) => {
      hall(px, t, { shaft: 0.5 });
      dissolve(px, 0.7, P.ink);
      ORDER.forEach((id, i) => {
        const k = easeOut(clamp01(p * 3 - i * 0.35));
        const x = 2 + (i % 2) * 90;
        const y = 22 + Math.floor(i / 2) * 120 + (1 - k) * 20;
        if (k > 0.05) blitScaled(px, heroPortrait(HEROES[id], "smile", P.goldHi), x, y, 2);
      });
    },
    text: "Lior, Mara, Teo y Bram: *invitados* de honor.",
  },
  // 8–10 · Pasillo: los soldados desaparecen
  {
    draw: (px, t, p) => {
      corridor(px, t, 0.2 + p * 0.5);
      px.blit(soldierSprite(t * 1.2, 1), 90, 120 - p * 4);
      blitScaled(px, heroSprite(HEROES.lior), -14, 176, 4);
    },
    text: "Pero cada noche, un soldado *desaparecía*.",
  },
  // 10–12 · Sombras en la pared
  {
    draw: (px, t, p) => {
      for (let y = 0; y < 320; y++)
        for (let x = 0; x < 180; x++) {
          const d = Math.hypot(x - 160, y - 250) / 260;
          const base = mix(mix(P.goldDk, P.violet2, 0.35), P.violet, Math.min(1, d * 1.3));
          px.set(x, y, y % 8 === 0 || (x + (Math.floor(y / 8) % 2) * 6) % 12 === 0 ? mix(base, P.ink, 0.35) : base);
        }
      torch(px, 160, 250, t, 1.6);
      const lean = ease(p);
      const S = mix(P.ink, P.violet, 0.12);
      // soldier shadow (right), cowering
      px.ellipse(140, 176, 9, 10, S); // helmet
      px.line(140, 166, 146, 156, S); // plume
      px.line(141, 166, 147, 157, S);
      px.poly([[128, 186], [152, 186], [156, 262], [124, 262]], S);
      px.rect(126, 262, 8, 30, S);
      px.rect(146, 262, 8, 30, S);
      px.line(160, 150, 168 + lean * 6, 300, S); // spear
      px.line(161, 150, 169 + lean * 6, 300, S);
      // queen shadow (left), looming closer
      const hx = 58 + lean * 18;
      const hy = 92 + lean * 8;
      px.poly([[4, 320], [24, 160], [hx - 6, hy + 30], [hx + 22, hy + 40], [98, 320]], S); // gown & body
      px.poly([[hx - 12, hy - 4], [hx - 30, hy + 50], [hx - 40, hy + 120], [hx - 14, hy + 40]], S); // hair
      px.ellipse(hx, hy, 13, 15, S); // head
      px.rect(hx - 11, hy - 18, 22, 5, S); // crown band
      for (const dx of [-11, -5, 0, 5, 10]) px.poly([[hx + dx - 2, hy - 18], [hx + dx, hy - 25 - (dx === 0 ? 4 : 0)], [hx + dx + 2, hy - 18]], S);
      // reaching arm with claws
      const ax = 104 + lean * 22;
      const ay = 150 - lean * 4;
      for (let w = -2; w <= 2; w++) px.line(hx + 14, hy + 40 + w, ax, ay + w, S);
      for (const [cx2, cy2] of [[8, -6], [10, 0], [8, 6], [3, 9]]) px.line(ax, ay, ax + cx2 * (1 + lean * 0.5), ay + cy2, S);
      if (lean > 0.55) px.poly([[hx + 4, hy + 2], [hx + 16, hy - 2 - (lean - 0.55) * 12], [hx + 16, hy + 10 + (lean - 0.55) * 12]], mix(P.goldDk, P.violet2, 0.35)); // jaw opening
    },
    text: "Uno por uno.",
  },
  // 12–14 · El rostro amable (parpadea)
  {
    draw: (px, t, p, f) => {
      hall(px, t, { shaft: 0.4 });
      dissolve(px, 0.75, P.ink);
      const glitch = p > 0.7 && f % 7 < 2;
      blitScaled(px, queenPortrait(glitch ? 1 : 0, 0.2), 18, 50, 3);
    },
    text: "Hasta que vieron su *verdadero rostro*…",
  },
  // 14–16 · VERDADERO ROSTRO (retención 14 s)
  {
    draw: (px, t, p) => {
      px.clear(P.ink);
      px.glow(90, 150, 140, P.magicDk, 0.6);
      blitScaled(px, queenPortrait(1, easeOut(p * 1.5)), 18, 50, 3);
      magicAura(px, 90, 120, 70, t, 0.5);
    },
    text: "Devoraba a sus *propios soldados*.",
    fx: ["flash", "shake"],
  },
  // 16–18 · La batalla
  {
    draw: (px, t, p, f) => {
      hall(px, t, { shaft: 0.6 });
      blitScaled(px, queenSprite(1), 60, 70, 2);
      magicAura(px, 76, 110, 34, t, 0.6);
      const hit = (f % 20) / 20;
      ORDER.forEach((id, i) => {
        const x = 26 + i * 36;
        px.blit(heroSprite(HEROES[id], { attack: (hit + i * 0.25) % 1 }), x, 226 - (i % 2) * 8, i > 1);
      });
      slash(px, 80, 120, 26, -2.4 + hit * 2, -0.6 + hit * 2);
      // Teo's blue bolt
      const bx = 110 - hit * 30;
      px.line(118, 214, bx, 130 + hit * 20, P.blueMagic);
      px.glow(bx, 130 + hit * 20, 10, P.blueMagic, 0.6);
    },
    text: "Lucharon contra ella… y la *derrotaron*.",
    fx: ["shake"],
  },
  // 18–20 · El castillo cae del cielo
  {
    draw: (px, t, p) => {
      nightSky(px, 0, 320, t);
      moon(px, 140, 40);
      const fall = p * p * 170;
      castle(px, 90, 120 + fall, t, { crack: 0.4 + p * 0.6, lit: 1 - p, glow: 1 - p });
      for (let i = 0; i < 30; i++) {
        const k = (p * 1.4 + hash(i)) % 1;
        px.rect(50 + hash(i + 1) * 80, 100 + fall + k * 120, 2, 2, i % 3 ? P.stone : P.violet2);
      }
      for (let x = 0; x < 180; x++) {
        const h = 40 + Math.sin(x / 6) * 5;
        for (let y = 320 - h; y < 320; y++) px.set(x, y, P.leaf);
      }
    },
    text: "El castillo *cayó del cielo*…",
    fx: ["shake"],
  },
  // 20–22 · Escombros
  {
    draw: (px, t) => {
      ruins(px, t, { smoke: 1 });
      party(px, 64, 262, t, { stride: 0, gap: 14 });
    },
    text: "…y quedó reducido a *escombros*.",
    fx: ["flash"],
  },
  // 22–24 · La cabaña
  {
    draw: (px, t) => {
      ruins(px, t, { smoke: 0.4 });
      party(px, 64, 262, t, { stride: 0, gap: 14 });
    },
    text: "Pero entre las ruinas había una *cabaña*.",
    fx: ["push"],
  },
  // 24–26 · La anciana: la misma reina
  {
    draw: (px, t, p) => {
      cabinInside(px, t);
      dissolve(px, 0.45, P.ink);
      blitScaled(px, witchPortrait(p > 0.6 ? "glare" : "calm"), 24, 40, 3);
    },
    text: "Allí estaba *la misma reina*… convertida en anciana.",
  },
  // 26–28 · Volvieron a matarla
  {
    draw: (px, t, p) => {
      cabinInside(px, t);
      const fallen = p > 0.45;
      if (!fallen) blitScaled(px, witchSprite(), 60, 150, 3);
      else {
        const k = (p - 0.45) / 0.55;
        blitScaled(px, witchSprite(), 60, 150 + k * 10, 3, false, mix(P.violet, P.ink, k));
        decayMotes(px, 60, 150, 48, 60, t, 1 - k);
      }
      px.blit(heroSprite(HEROES.mara, { attack: clamp01(p * 2.2) }), 112, 196);
      if (p > 0.35 && p < 0.55) slash(px, 90, 190, 30, -2.6, -0.2);
    },
    text: "Volvieron a *matarla*.",
    fx: ["shake"],
  },
  // 28–30 · REVELACIÓN: castillo intacto + otras versiones (retención 28 s)
  {
    draw: (px, t, p) => {
      forest(px, t, { behind: (q) => castle(q, 90, 132, t) });
      // the "other four" at the forest entrance: same formation as 0 s
      party(px, 44 + p * 20, 240, t, { phase: t * 1.4, stride: 1, gap: 9 });
      // our heroes in the foreground, watching (bigger)
      party(px, 150, 270, t, { stride: 0, gap: 13, flip: true, scale: 2, decay: 0.15 });
    },
    text: "El castillo estaba *intacto*… y había *otros cuatro*.",
    fx: ["flash"],
  },
  // 30–32 · Eran ellos mismos
  {
    draw: (px, t) => {
      px.clear(P.ink);
      // top: the past selves (fresh) · bottom: the present (worn)
      ORDER.forEach((id, i) => {
        blitScaled(px, heroPortrait(HEROES[id], "neutral", P.goldHi), 4 + i * 44, 34, 1);
        blitScaled(px, heroPortrait(HEROES[id], "fear", P.magic, 0.35), 4 + i * 44, 200, 1);
      });
      px.rect(0, 158, 180, 1, P.magic);
      px.glow(90, 158, 50, P.magicDk, 0.4);
      decayMotes(px, 0, 200, 180, 52, t, 0.4);
    },
    text: "Eran *ellos mismos*, antes de entrar.",
  },
  // 32–34 · Intentaron cambiar el pasado
  {
    draw: (px, t, p) => {
      forest(px, t);
      party(px, 60 + p * 30, 236 - p * 8, t, { phase: t * 1.4, stride: 1, gap: 9 });
      party(px, 150 - p * 60, 268, t, { phase: t * 2.4, stride: 1.6, gap: 14, flip: true, decay: 0.2 });
    },
    text: "Intentaron *cambiar el pasado*.",
  },
  // 34–36 · La bruja regresó
  {
    draw: (px, t, p) => {
      ruins(px, t, { purple: 0.3 });
      cabin(px, CABIN.x, CABIN.y, t, { door: true, purple: 0.6 });
      px.glow(CABIN.x + 11, CABIN.y - 8, 18, P.magicDk, 0.6);
      if (p > 0.25) px.blit(witchSprite(), CABIN.x + 4, CABIN.y - 20);
      party(px, 64, 262, t, { stride: 0, gap: 14, decay: 0.25 });
    },
    text: "Pero la bruja *regresó*…",
    fx: ["purpleFlash"],
  },
  // 36–38 · …una y otra vez
  {
    draw: (px, t, p, f) => {
      cabinInside(px, t, { purple: 0.5 });
      const beat = Math.floor(f / 15);
      if (beat % 2 === 0) {
        blitScaled(px, witchSprite(), 60, 150, 3);
        magicAura(px, 84, 180, 30, t, 0.4);
      } else {
        px.blit(heroSprite(HEROES[ORDER[beat % 4]], { attack: (f % 15) / 15 }), 100, 196);
        slash(px, 84, 190, 28, -2.6, -0.3);
      }
    },
    text: "…una y otra vez.",
    fx: ["shake"],
  },
  // 38–40 · Energía morada
  {
    draw: (px, t, p) => {
      ruins(px, t, { purple: 0.4 + p * 0.6 });
      magicAura(px, CABIN.x + 20, CABIN.y - 20, 50, t, 0.4 + p * 0.6);
    },
    text: "Una *energía morada* envolvió la cabaña.",
  },
  // 40–42 · Los cuerpos se deterioran
  {
    draw: (px, t, p) => {
      px.clear(P.ink);
      px.glow(90, 160, 120, P.magicDk, 0.4);
      ORDER.forEach((id, i) => {
        const d = 0.2 + p * 0.65;
        const x = 2 + (i % 2) * 90;
        const y = 22 + Math.floor(i / 2) * 120;
        blitScaled(px, heroPortrait(HEROES[id], i === 0 ? "fear" : "pain", P.magic, d), x, y, 2);
        decayMotes(px, x, y, 88, 104, t, d);
      });
    },
    text: "Sus cuerpos comenzaron a *deteriorarse*.",
  },
  // 42–44 · El reino bajo su control
  {
    draw: (px, t, p) => kingdomMap(px, t, 0.15 + p * 0.85),
    text: "El reino entero estaba *bajo su control*.",
  },
  // 44–46 · Lior comprende
  {
    draw: (px, t, p) => {
      ruins(px, t, { purple: 1 });
      magicAura(px, CABIN.x + 20, CABIN.y - 20, 46, t, 0.8);
      dissolve(px, 0.5, P.ink);
      blitScaled(px, heroPortrait(HEROES.lior, p > 0.5 ? "fear" : "determined", P.magic, 0.3), 2, 60 + (1 - easeOut(p)) * 10, 3);
    },
    text: "Lior comprendió: la cabaña era *el origen de todo*…",
  },
  // 46–48 · Demasiado tarde
  {
    draw: (px, t, p) => {
      ruins(px, t, { purple: 1 });
      magicAura(px, CABIN.x + 20, CABIN.y - 20, 46, t, 0.8);
      blitScaled(px, heroSprite(HEROES.lior, { decay: 0.3 }), 76, 166, 4);
      const rise = easeOut(p);
      const sy = 200 - rise * 50;
      blitScaled(px, soldierSprite(), -6, sy, 4, false, undefined, 0.55);
      px.rect(34, sy - 44, 3, 44, P.steel); // raised sword
      px.rect(35, sy - 44, 1, 44, P.white);
      px.rect(28, sy - 2, 15, 3, P.gold);
    },
    text: "…pero ya era *demasiado tarde*.",
  },
  // 48–50 · La espada
  {
    draw: (px, t, p) => {
      px.clear(P.ink);
      px.glow(90, 150, 170, P.magic, 0.55);
      px.glow(90, 150, 90, P.magicHi, 0.35);
      magicAura(px, 90, 150, 70, t, 0.6);
      blitScaled(px, heroSprite(HEROES.lior, { decay: 0.4 }), 26, 50, 8, false, P.ink);
      // the blade crosses his silhouette (no gore: a line of light)
      const k = easeOut(clamp01(p * 3));
      px.rect(0, 130, Math.round(160 * k), 3, P.steel);
      px.rect(0, 131, Math.round(160 * k), 1, P.white);
      if (k > 0.9) px.glow(112, 131, 24, P.white, 0.6);
    },
    text: "Una espada atravesó su *pecho*.",
    fx: ["flash", "shake"],
  },
  // 50–52 · Conexión con la primera escena (retención 50 s)
  {
    draw: (px, t, p) => {
      openingForest(px, t, p, { purple: 0.2 });
      desaturate(px, 0.35);
      vignette(px, 0.25 + p * 0.25);
    },
    text: "Antes de morir, vio a cuatro jóvenes *entrar al bosque*.",
  },
  // 52–54 · EL RECONOCIMIENTO · repetición visual
  {
    draw: (px, t, p, f) => {
      forest(px, t);
      // the elf runs between the trees; the same half-second repeats with echoes
      const loopT = (f % 15) / 30;
      for (let e = 3; e >= 0; e--) {
        const x = 30 + (loopT - e * 0.06) * 160;
        const spr = heroSprite(HEROES.lior, { phase: (loopT - e * 0.06) * 3, stride: 1.6 });
        if (e === 0) blitScaled(px, spr, x - 16, 214, 2);
        else blitScaled(px, spr, x - 16, 214, 2, false, e === 1 ? P.magic : e === 2 ? P.magicDk : P.violet2);
      }
    },
    text: "Eran ellos mismos.",
    fx: ["stutter"],
  },
  // 54–56 · EL BUCLE · rotación de cámara
  {
    draw: (px, t, p) => {
      forest(px, t, { lift: ease(p), behind: (q, dy) => castle(q, 90, -110 + dy, t) });
    },
    text: "La historia comenzaba otra vez.",
    fx: ["rotate"],
  },
  // 56–58 · LA REVELACIÓN · música ascendente
  {
    draw: (px, t, p) => {
      nightSky(px, 0, 320, t);
      moon(px, 140, 40);
      castle(px, 90, 190, t, { silhouette: clamp01(p * 3) });
      for (let x = 0; x < 180; x++) {
        const h = 40 + Math.sin(x / 6) * 5;
        for (let y = 320 - h; y < 320; y++) px.set(x, y, P.leaf);
      }
    },
    text: "La reina seguía *esperando*.",
    fx: ["push"],
  },
  // 58–60 · CIERRE
  { draw: (px) => px.clear(P.ink), text: "El ciclo nunca terminaría.", title: true },
];

export const CASTILLO_FRAMES = SHOTS.length * SHOT;

// ------------------------------------------------------------------ overlays

const Narration: React.FC<{ text: string; top?: boolean }> = ({ text, top }) => {
  const f = useCurrentFrame();
  const plain = text.replace(/\*/g, "");
  const shown = Math.floor(interpolate(f, [3, 30], [0, plain.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const out = interpolate(f, [53, 59], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const parts: { s: string; hi: boolean }[] = [];
  let count = 0;
  text.split("*").forEach((s, i) => {
    const take = Math.max(0, Math.min(s.length, shown - count));
    parts.push({ s: s.slice(0, take), hi: i % 2 === 1 });
    count += s.length;
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: top ? 300 : undefined,
        bottom: top ? undefined : 70,
        padding: "26px 34px",
        background: "rgba(10,11,22,0.78)",
        border: "6px solid #2a1840",
        boxShadow: "0 0 0 6px #0a0b16",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 52,
        lineHeight: 1.25,
        color: "#d8dae6",
        textAlign: "center",
        opacity: out,
        minHeight: 140,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span>
        {parts.map((pt, i) => (
          <span key={i} style={{ color: pt.hi ? "#ecd08a" : undefined }}>
            {pt.s}
          </span>
        ))}
        <span style={{ opacity: f % 16 < 8 ? 1 : 0, color: "#9b4dff" }}>▌</span>
      </span>
    </div>
  );
};

const Title: React.FC = () => {
  const f = useCurrentFrame();
  const k = interpolate(f, [8, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hit = interpolate(f, [8, 12, 40], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lines = ["EL CASTILLO", "QUE SIEMPRE", "REGRESA"];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, rgba(91,42,154,${0.35 * hit}) 0%, transparent 60%)` }} />
      {[3, 2, 1, 0].map((e) => (
        <div
          key={e}
          style={{
            position: "absolute",
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 118,
            lineHeight: 1.05,
            letterSpacing: 6,
            color: e === 0 ? "#c9a24a" : "#9b4dff",
            opacity: e === 0 ? k : k * (0.35 / e) * (1 - k * 0.5),
            transform: `scale(${1 + e * 0.07 * (1 + Math.sin(f / 9))})`,
            textShadow: e === 0 ? "0 0 0 #000, 8px 8px 0 #2a1840" : undefined,
          }}
        >
          {lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      ))}
    </AbsoluteFill>
  );
};

const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const fx = shot.fx ?? [];
  // stutter: repeat each 15-frame block twice (visual repetition)
  const tf = fx.includes("stutter") ? Math.floor(f / 30) * 15 + (f % 15) : f;
  const t = tf / 30;
  const p = clamp01(f / (SHOT - 1));
  let transform = "";
  if (fx.includes("shake")) {
    const s = Math.max(0, 1 - p * 1.2);
    transform += ` translate(${Math.round((hash(f) - 0.5) * 4 * s) * 6}px, ${Math.round((hash(f + 99) - 0.5) * 4 * s) * 6}px)`;
  }
  if (fx.includes("push")) transform += ` scale(${1 + ease(p) * 0.12})`;
  if (fx.includes("zoom")) transform += ` scale(${1 + ease(p) * 0.4})`;
  if (fx.includes("rotate")) transform += ` rotate(${-ease(p) * 9}deg) scale(${1.18 + ease(p) * 0.06})`;
  const flash = fx.includes("flash") ? interpolate(f, [0, 6], [0.85, 0], { extrapolateRight: "clamp" }) : 0;
  const pflash = fx.includes("purpleFlash") ? interpolate(f, [12, 16, 28], [0, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0b16", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform }}>
        <PixelCanvas deps={[tf, p]} draw={(px) => shot.draw(px, t, p, tf)} />
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: "#e9e6f2", opacity: flash }} />}
      {pflash > 0 && <AbsoluteFill style={{ background: "#9b4dff", opacity: pflash, mixBlendMode: "screen" }} />}
      {shot.title && <Title />}
      <Narration text={shot.text} top={shot.title} />
      {/* scanline texture for a CRT-ish pixel finish */}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 3px, transparent 3px 6px)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export const Castillo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0a0b16" }}>
    {SHOTS.map((s, i) => (
      <Sequence key={i} from={i * SHOT} durationInFrames={SHOT} name={`${i * 2}–${i * 2 + 2}s`}>
        <ShotView shot={s} />
      </Sequence>
    ))}
    <Audio src={staticFile("castillo-audio.wav")} />
  </AbsoluteFill>
);

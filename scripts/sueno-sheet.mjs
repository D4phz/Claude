// One still per shot of the Sueno timeline → contact sheet.
// node scripts/sueno-sheet.mjs out/sueno-sheet.png [scale] [at=0.6] [first-last]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [out = "out/sueno-sheet.png", scale = "0.15", at = "0.6", range] = process.argv.slice(2);
const src = readFileSync("src/sueno/timeline.ts", "utf8");
const shots = [...src.matchAll(/\{ id: "([^"]+)", d: ([0-9.]+)/g)].map((m) => ({ id: m[1], d: Number(m[2]) }));
let acc = 0;
const frames = shots.map((s) => {
  const f0 = acc;
  acc += Math.round(s.d * 30);
  return { ...s, frame: f0 + Math.floor(Math.round(s.d * 30) * Number(at)) };
});
const [a, b] = range ? range.split("-").map(Number) : [0, frames.length - 1];
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const opts = { browserExecutable: "/opt/pw-browsers/chromium", chromiumOptions: { gl: "swangle" } };
const composition = await selectComposition({ serveUrl, id: "Sueno", ...opts });
mkdirSync("out/sueno-frames", { recursive: true });
const files = [];
for (let i = a; i <= b; i++) {
  const output = `out/sueno-frames/s${String(i).padStart(3, "0")}.png`;
  await renderStill({ serveUrl, composition, frame: frames[i].frame, output, scale: Number(scale), overwrite: true, ...opts });
  files.push(`${output}|${i} ${frames[i].id}`);
}
execFileSync("python3", ["-c", `
import sys
from PIL import Image, ImageDraw
items=[a.split('|') for a in sys.argv[2:]]; ims=[Image.open(f) for f,_ in items]; w,h=ims[0].size; cols=min(10,len(ims)); rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(w*cols,h*rows),'black'); d=ImageDraw.Draw(S)
for i,((f,lab),im) in enumerate(zip(items,ims)):
  x,y=(i%cols)*w,(i//cols)*h; S.paste(im,(x,y)); d.text((x+3,y+3),lab,fill='yellow')
S.save(sys.argv[1])`, out, ...files]);
console.log(out);

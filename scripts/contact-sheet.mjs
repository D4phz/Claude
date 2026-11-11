// Renders one still per 2 s beat and tiles them into a contact sheet.
// Usage: node scripts/contact-sheet.mjs <compId> <out.png> [offsetFrames=40] [scale=0.2] [first-last]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [comp = "CamaAmarilla", out = "out/sheet.png", off = "40", scale = "0.2", range] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = "/opt/pw-browsers/chromium";
const chromiumOptions = { gl: "swangle" };
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions });
const beats = Math.floor(composition.durationInFrames / 60);
const [a, b] = range ? range.split("-").map(Number) : [0, beats - 1];
const dir = "out/sheet-frames";
mkdirSync(dir, { recursive: true });
const files = [];
for (let i = a; i <= b; i++) {
  const frame = i * 60 + Number(off);
  const output = `${dir}/b${String(i).padStart(2, "0")}.png`;
  await renderStill({ serveUrl, composition, frame, output, scale: Number(scale), browserExecutable, chromiumOptions, overwrite: true });
  files.push(output);
  process.stdout.write(`${i} `);
}
execFileSync("python3", ["-c", `
import sys
from PIL import Image, ImageDraw
fs=sys.argv[2:]; ims=[Image.open(f) for f in fs]; w,h=ims[0].size; cols=min(9,len(ims)); rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(w*cols,h*rows),'black'); d=ImageDraw.Draw(S)
for i,(f,im) in enumerate(zip(fs,ims)):
  x,y=(i%cols)*w,(i//cols)*h; S.paste(im,(x,y)); n=int(f.split('/b')[-1][:2]); d.text((x+6,y+6),f'{n*2}s',fill='yellow')
S.save(sys.argv[1])`, out, ...files]);
console.log("\n" + out);

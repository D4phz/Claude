import * as THREE from "three";
import { hash } from "./theme";

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** Soft, irregular yellow body-shaped stain (alpha in the texture). */
export const makeStainTexture = (seed = 1, shape: "body" | "pillow" | "full" = "body") => {
  const W = 512;
  const H = shape === "pillow" ? 320 : 1024;
  const c = canvas(W, H);
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, W, H);
  const blob = (x: number, y: number, r: number, a: number) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(214,170,78,${a})`);
    gr.addColorStop(0.6, `rgba(220,182,96,${a * 0.55})`);
    gr.addColorStop(1, "rgba(225,190,110,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  if (shape === "pillow") {
    for (let i = 0; i < 26; i++)
      blob(W * (0.35 + hash(seed + i) * 0.3), H * (0.3 + hash(seed + i + 40) * 0.45), 50 + hash(seed + i + 80) * 70, 0.18);
  } else if (shape === "full") {
    for (let i = 0; i < 90; i++)
      blob(W * hash(seed + i), H * hash(seed + i + 100), 90 + hash(seed + i + 200) * 160, 0.14);
  } else {
    // Upper body (shoulders/back), head area, lower body: a soft silhouette.
    const pts: [number, number, number][] = [
      [0.5, 0.16, 0.5], // shoulders
      [0.5, 0.3, 0.55], // upper back
      [0.5, 0.45, 0.45],
      [0.5, 0.58, 0.32], // hips
      [0.45, 0.75, 0.2], // legs
      [0.58, 0.75, 0.2],
    ];
    let k = 0;
    for (const [px, py, s] of pts)
      for (let i = 0; i < 26; i++, k++)
        blob(
          W * (px + (hash(seed + k) - 0.5) * 0.45 * s),
          H * (py + (hash(seed + k + 300) - 0.5) * 0.18 * s),
          (90 + hash(seed + k + 600) * 110) * s * 1.7,
          0.12 * s + 0.04,
        );
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Fine fabric weave + wrinkle noise, for bump maps. */
export const makeFabricBump = (scale = 1) => {
  const S = 512;
  const c = canvas(S, S);
  const g = c.getContext("2d")!;
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const weave = ((x * scale) & 3) < 2 !== ((y * scale) & 3) < 2 ? 18 : 0;
      const n = hash(x * 0.37 + y * 913.1) * 22;
      const v = 110 + weave + n;
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** Vertical gradient used for fake light shafts. */
export const makeShaftTexture = () => {
  const c = canvas(64, 256);
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "rgba(255,255,255,0.9)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 256);
  const gx = g.createLinearGradient(0, 0, 64, 0);
  gx.addColorStop(0, "rgba(0,0,0,1)");
  gx.addColorStop(0.3, "rgba(0,0,0,0)");
  gx.addColorStop(0.7, "rgba(0,0,0,0)");
  gx.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = gx;
  g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
};

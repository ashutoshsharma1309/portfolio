// Decor-only procedural textures (trophies, frames, whiteboard, plants).
//
// The foundation's texture set (materials/textures.ts) has no marble, clay,
// soil, leaf, whiteboard-ghosting or soft-shadow kinds, so they're generated
// here, on the main thread, at small sizes (≈5–25 ms each). Everything is
// seeded and deterministic; nothing touches the network.
//
// Textures are cached per (kind, size) and ref-counted through
// useDecorTextures(): the last component to unmount disposes them (deferred
// one tick so StrictMode's mount → unmount → mount doesn't thrash).

import { useEffect, useMemo } from "react";
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
} from "three";

// ---------------------------------------------------------------------------
// Noise helpers
// ---------------------------------------------------------------------------

function rng(seed: number) {
  let s = (Math.imul(seed | 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Tileable value-noise fBm over a w×h grid, normalised to ~0..1. `freq` is
 *  the number of lattice cells across the width of the texture. */
function fbm(w: number, h: number, freq: number, octaves: number, seed: number, gain = 0.5): Float32Array {
  const out = new Float32Array(w * h);
  let amp = 1;
  let total = 0;
  let f = freq;
  for (let o = 0; o < octaves; o++) {
    const gx = Math.max(1, Math.round(f));
    const gy = Math.max(1, Math.round((f * h) / w));
    const lat = new Float32Array(gx * gy);
    const r = rng(seed * 131 + o * 977 + 7);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * gy;
      const yi = Math.floor(fy);
      const ty = smooth(fy - yi);
      const y0 = (yi % gy) * gx;
      const y1 = ((yi + 1) % gy) * gx;
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * gx;
        const xi = Math.floor(fx);
        const tx = smooth(fx - xi);
        const x0 = xi % gx;
        const x1 = (xi + 1) % gx;
        const a = lat[y0 + x0] + (lat[y0 + x1] - lat[y0 + x0]) * tx;
        const b = lat[y1 + x0] + (lat[y1 + x1] - lat[y1 + x0]) * tx;
        out[y * w + x] += (a + (b - a) * ty) * amp;
      }
    }
    total += amp;
    amp *= gain;
    f *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Tangent-space normal map (OpenGL, +Y up) from a tileable height field. */
function normalFromHeight(hgt: Float32Array, w: number, h: number, strength: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const yu = ((y + 1) % h) * w;
    const yd = ((y - 1 + h) % h) * w;
    for (let x = 0; x < w; x++) {
      const xr = (x + 1) % w;
      const xl = (x - 1 + w) % w;
      const dx = (hgt[y * w + xr] - hgt[y * w + xl]) * strength;
      const dy = (hgt[yu + x] - hgt[yd + x]) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * w + x) * 4;
      out[i] = (-dx * inv * 0.5 + 0.5) * 255;
      out[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      out[i + 2] = (inv * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}

function dataTex(data: Uint8Array<ArrayBuffer>, w: number, h: number, srgb: boolean): DataTexture {
  const t = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function canvasTex(c: HTMLCanvasElement, srgb: boolean): CanvasTexture {
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.generateMipmaps = true;
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  return { c, ctx };
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

export interface DecorTextureSet {
  map?: Texture;
  normalMap?: Texture;
  roughnessMap?: Texture;
  alphaMap?: Texture;
  emissiveMap?: Texture;
}

/** Polished black marble (Nero Marquina-like): charcoal body, thin warped
 *  white veins plus fainter secondary veins. Roughness in G. */
function genMarble(n: number): DecorTextureSet {
  const warp = fbm(n, n, 3, 5, 11);
  const warp2 = fbm(n, n, 7, 4, 12);
  const cloud = fbm(n, n, 4, 4, 13);
  const fade = fbm(n, n, 2, 3, 14);
  const col = new Uint8Array(n * n * 4);
  const rough = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    const v = y / n;
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const u = x / n;
      const t1 = u + v + (warp[i] - 0.5) * 1.5 + (warp2[i] - 0.5) * 0.35;
      const t2 = 2 * u - v + (warp2[i] - 0.5) * 1.2 + (warp[i] - 0.5) * 0.4;
      const s1 = Math.abs(Math.sin(Math.PI * 2 * t1));
      const s2 = Math.abs(Math.sin(Math.PI * 2 * t2));
      const vein1 = (1 - smoothstep(0.0, 0.045, s1)) * smoothstep(0.25, 0.6, fade[i]);
      const vein2 = (1 - smoothstep(0.0, 0.03, s2)) * 0.45 * smoothstep(0.35, 0.7, cloud[i]);
      const halo = (1 - smoothstep(0.0, 0.22, s1)) * 0.12 * smoothstep(0.25, 0.6, fade[i]);
      const vein = Math.min(1, vein1 + vein2 + halo);
      const base = 15 + cloud[i] * 16;
      const vc = 196 + warp2[i] * 30;
      const k = vein;
      col[i * 4] = base + (vc - base) * k;
      col[i * 4 + 1] = base + 1 + (vc - base) * k;
      col[i * 4 + 2] = base + 3 + (vc + 4 - base) * k;
      col[i * 4 + 3] = 255;
      const r = 0.1 + cloud[i] * 0.06 + vein * 0.05;
      rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = r * 255;
      rough[i * 4 + 3] = 255;
    }
  }
  return { map: dataTex(col, n, n, true), roughnessMap: dataTex(rough, n, n, false) };
}

/** Unglazed terracotta. Tile is laid out for the pot lathe (v = arc length
 *  from the base centre, outer wall → rim → inside): mineral bloom near the
 *  rim band, darker water staining near the foot. */
export const CLAY_RIM_V: readonly [number, number] = [0.58, 0.86];
function genClay(n: number): DecorTextureSet {
  const mottle = fbm(n, n, 5, 4, 21);
  const fine = fbm(n, n, 48, 2, 22);
  const bloomN = fbm(n, n, 9, 4, 23);
  const streak = fbm(n, n * 2, 24, 3, 24);
  const r = rng(25);
  const col = new Uint8Array(n * n * 4);
  const rough = new Uint8Array(n * n * 4);
  const hgt = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const v = y / n;
    const bloomBand = smoothstep(CLAY_RIM_V[0] - 0.12, CLAY_RIM_V[0] + 0.02, v) * (1 - smoothstep(CLAY_RIM_V[1], CLAY_RIM_V[1] + 0.06, v));
    const stain = 1 - smoothstep(0.24, 0.4, v); // outer wall starts at v≈0.23
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const m = (mottle[i] - 0.5) * 0.22 + (fine[i] - 0.5) * 0.1 + (streak[(y * 2 % n) * n + x] - 0.5) * 0.05;
      let R = 184 * (1 + m);
      let G = 98 * (1 + m * 1.15);
      let B = 64 * (1 + m * 1.2);
      // grog specks
      const rs = r();
      let h = fine[i] * 0.5 + mottle[i] * 0.3;
      if (rs < 0.012) {
        R *= 0.62;
        G *= 0.58;
        B *= 0.6;
        h -= 0.25;
      } else if (rs < 0.018) {
        R = R * 0.6 + 225 * 0.4;
        G = G * 0.6 + 170 * 0.4;
        B = B * 0.6 + 130 * 0.4;
        h += 0.2;
      }
      // efflorescence (white mineral bloom), patchy
      const bloom = bloomBand * smoothstep(0.5, 0.75, bloomN[i]) * 0.3 * (0.6 + fine[i] * 0.8);
      R += (222 - R) * bloom;
      G += (210 - G) * bloom;
      B += (196 - B) * bloom;
      // water stain at the foot
      const st = stain * (0.25 + 0.15 * mottle[i]);
      R *= 1 - st;
      G *= 1 - st * 1.05;
      B *= 1 - st;
      col[i * 4] = Math.min(255, R);
      col[i * 4 + 1] = Math.min(255, G);
      col[i * 4 + 2] = Math.min(255, B);
      col[i * 4 + 3] = 255;
      const ro = 0.86 + (fine[i] - 0.5) * 0.08 + bloom * 0.08;
      rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = clamp01(ro) * 255;
      rough[i * 4 + 3] = 255;
      hgt[i] = h;
    }
  }
  return {
    map: dataTex(col, n, n, true),
    roughnessMap: dataTex(rough, n, n, false),
    normalMap: dataTex(normalFromHeight(hgt, n, n, 0.9), n, n, false),
  };
}

/** Potting mix: dark peat with bark crumbs and white perlite. */
function genSoil(n: number): DecorTextureSet {
  const big = fbm(n, n, 6, 4, 31);
  const grain = fbm(n, n, 64, 2, 32);
  const r = rng(33);
  const col = new Uint8Array(n * n * 4);
  const rough = new Uint8Array(n * n * 4);
  const hgt = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const g = grain[i];
    const b = big[i];
    const k = 0.7 + b * 0.45 + (g - 0.5) * 0.7;
    col[i * 4] = 52 * k;
    col[i * 4 + 1] = 37 * k;
    col[i * 4 + 2] = 27 * k;
    col[i * 4 + 3] = 255;
    hgt[i] = g * 0.8 + b * 0.4;
    rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = 240;
    rough[i * 4 + 3] = 255;
  }
  // perlite + bark crumbs (2–3 px blobs)
  for (let s = 0; s < n * n * 0.0035; s++) {
    const cx = Math.floor(r() * n);
    const cy = Math.floor(r() * n);
    const perlite = r() < 0.55;
    const rad = 1 + r() * 1.6;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue;
        const i = ((cy + dy + n) % n) * n + ((cx + dx + n) % n);
        if (perlite) {
          col[i * 4] = 214;
          col[i * 4 + 1] = 210;
          col[i * 4 + 2] = 200;
          rough[i * 4 + 1] = 190;
        } else {
          col[i * 4] = 92;
          col[i * 4 + 1] = 60;
          col[i * 4 + 2] = 38;
        }
        hgt[i] += 0.5;
      }
  }
  return {
    map: dataTex(col, n, n, true),
    roughnessMap: dataTex(rough, n, n, false),
    normalMap: dataTex(normalFromHeight(hgt, n, n, 3), n, n, false),
  };
}

/** Leaf blade: u across (midrib at 0.5), v base→tip. Neutral-ish green so
 *  per-instance colours can tint it. */
function genLeaf(): DecorTextureSet {
  const W = 128;
  const H = 256;
  const { c, ctx } = makeCanvas(W, H);
  // canvas y=0 is the TIP (v=1, flipY), y=H is the base.
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#3c7a35");
  g.addColorStop(0.42, "#4b8f41");
  g.addColorStop(0.5, "#4f9444");
  g.addColorStop(0.58, "#4b8f41");
  g.addColorStop(1, "#3c7a35");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // darker tip + slightly paler base
  const gv = ctx.createLinearGradient(0, 0, 0, H);
  gv.addColorStop(0, "rgba(20,50,20,0.25)");
  gv.addColorStop(0.5, "rgba(0,0,0,0)");
  gv.addColorStop(1, "rgba(150,190,110,0.18)");
  ctx.fillStyle = gv;
  ctx.fillRect(0, 0, W, H);
  // lateral veins (curving toward the tip)
  ctx.lineCap = "round";
  for (let k = 0; k < 13; k++) {
    const y0 = H * (0.94 - k * 0.068);
    for (const side of [-1, 1]) {
      ctx.strokeStyle = "rgba(40,80,30,0.35)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(W / 2, y0);
      ctx.quadraticCurveTo(W / 2 + side * W * 0.28, y0 - H * 0.05, W / 2 + side * W * 0.48, y0 - H * 0.13);
      ctx.stroke();
      ctx.strokeStyle = "rgba(170,205,130,0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // midrib
  const mg = ctx.createLinearGradient(0, H, 0, 0);
  mg.addColorStop(0, "rgba(190,215,140,0.95)");
  mg.addColorStop(1, "rgba(150,190,110,0.5)");
  ctx.strokeStyle = mg;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2, H);
  ctx.lineTo(W / 2, H * 0.03);
  ctx.stroke();
  // faint blemishes
  const r = rng(41);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${r() < 0.5 ? "30,55,25" : "120,140,70"},${0.05 + r() * 0.08})`;
    ctx.beginPath();
    ctx.arc(r() * W, r() * H, 1 + r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const map = canvasTex(c, true);
  map.wrapS = map.wrapT = ClampToEdgeWrapping;
  return { map };
}

/** Melamine whiteboard: near-white with faint ghosting (old marker residue),
 *  eraser swirls and edge grime. Roughness map (G) marks the hazed areas. */
function genWhiteboard(): DecorTextureSet {
  const W = 1024;
  const H = 640;
  const a = makeCanvas(W, H);
  const b = makeCanvas(W, H);
  const r = rng(51);
  a.ctx.fillStyle = "#f6f6f3";
  a.ctx.fillRect(0, 0, W, H);
  b.ctx.fillStyle = "rgb(22,22,22)";
  b.ctx.fillRect(0, 0, W, H);
  // eraser swirls: big soft elongated hazes
  for (let i = 0; i < 16; i++) {
    const x = r() * W;
    const y = r() * H;
    const rx = 60 + r() * 220;
    const ry = 20 + r() * 70;
    const rot = (r() - 0.5) * 1.2;
    for (const [ctx, colr] of [
      [a.ctx, `rgba(118,124,140,${0.008 + r() * 0.012})`],
      [b.ctx, `rgba(90,90,90,${0.25 + r() * 0.2})`],
    ] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, colr);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  // ghost handwriting: scribbly polylines in old ink colours
  const inks = ["60,70,120", "40,40,48", "140,40,40", "40,110,60"];
  a.ctx.lineCap = b.ctx.lineCap = "round";
  a.ctx.lineJoin = b.ctx.lineJoin = "round";
  a.ctx.filter = "blur(1.5px)";
  for (let line = 0; line < 9; line++) {
    let x = 40 + r() * (W - 300);
    const y = 40 + r() * (H - 80);
    const len = 80 + r() * 320;
    const ink = inks[Math.floor(r() * inks.length)];
    const alpha = 0.004 + r() * 0.006;
    a.ctx.strokeStyle = `rgba(${ink},${alpha})`;
    b.ctx.strokeStyle = `rgba(120,120,120,${0.25 + r() * 0.2})`;
    a.ctx.lineWidth = b.ctx.lineWidth = 3 + r() * 3;
    a.ctx.beginPath();
    b.ctx.beginPath();
    a.ctx.moveTo(x, y);
    b.ctx.moveTo(x, y);
    const end = x + len;
    let ph = r() * 6;
    while (x < end) {
      x += 3 + r() * 3;
      ph += 0.3 + r() * 1.6;
      const yy = y + Math.sin(ph) * (3 + r() * 9) + (r() - 0.5) * 7;
      a.ctx.lineTo(x, yy);
      b.ctx.lineTo(x, yy);
      if (r() < 0.04) {
        x += 12 + r() * 16;
        a.ctx.moveTo(x, y);
        b.ctx.moveTo(x, y);
      }
    }
    a.ctx.stroke();
    b.ctx.stroke();
  }
  a.ctx.filter = "none";
  // edge grime and slight vignette (hands, dust)
  for (const [ctx, colr] of [
    [a.ctx, "rgba(70,70,60,0.03)"],
    [b.ctx, "rgba(120,120,120,0.5)"],
  ] as const) {
    const edges: [number, number, number, number][] = [
      [0, 0, 0, 40],
      [0, H, 0, H - 40],
      [0, 0, 40, 0],
      [W, 0, W - 40, 0],
    ];
    for (const [x0, y0, x1, y1] of edges) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, colr);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }
  const map = canvasTex(a.c, true);
  const roughnessMap = canvasTex(b.c, false);
  map.wrapS = map.wrapT = roughnessMap.wrapS = roughnessMap.wrapT = ClampToEdgeWrapping;
  return { map, roughnessMap };
}

/** Soft rectangular drop shadow, white-on-black (use as alphaMap). The
 *  occluder occupies the inner 80% of the texture. */
function genSoftShadow(): DecorTextureSet {
  const S = 128;
  const { c, ctx } = makeCanvas(S, S);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, S, S);
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 9;
  ctx.shadowOffsetX = 1000;
  ctx.fillStyle = "#fff";
  ctx.fillRect(S * 0.1 - 1000, S * 0.1, S * 0.8, S * 0.8);
  const t = canvasTex(c, false);
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  return { alphaMap: t };
}

/** Glass glare: faint diagonal sheen bands on black (use as emissiveMap on an
 *  additive glass sheet). */
function genGlare(): DecorTextureSet {
  const S = 256;
  const { c, ctx } = makeCanvas(S, S);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, S, S);
  const band = (p: number, w: number, a: number) => {
    const g = ctx.createLinearGradient(0, S, S, 0);
    g.addColorStop(Math.max(0, p - w), "rgba(255,255,255,0)");
    g.addColorStop(p, `rgba(255,255,255,${a})`);
    g.addColorStop(Math.min(1, p + w), "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  };
  band(0.3, 0.12, 0.85);
  band(0.42, 0.03, 0.5);
  band(0.78, 0.07, 0.35);
  const vg = ctx.createRadialGradient(S * 0.3, S * 0.3, 0, S * 0.3, S * 0.3, S * 0.9);
  vg.addColorStop(0, "rgba(255,255,255,0.12)");
  vg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, S, S);
  const t = canvasTex(c, true);
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  return { emissiveMap: t };
}


/** Seamless walnut veneer (no board seams/joints): grain runs along V.
 *  One tile = WALNUT_TILE_M metres. Albedo + roughness (G) + normal. */
export const WALNUT_TILE_M = 0.5;
function genWalnut(n: number): DecorTextureSet {
  const warp = fbm(n, n, 2, 3, 61);
  const warpV = fbm(n, n, 5, 3, 62);
  const fibre = fbm(n * 4, n / 4, 64, 2, 63); // anisotropic → stretched along V
  const fig = fbm(n, n, 6, 3, 64);
  const col = new Uint8Array(n * n * 4);
  const rough = new Uint8Array(n * n * 4);
  const hgt = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const u = x / n;
      // gentle, mostly straight figure (quarter-sawn veneer), not zebra ripples
      const t = u * 48 + (warp[i] - 0.5) * 1.1 + (warpV[i] - 0.5) * 0.25;
      const ring = Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 2), 2);
      const fx = Math.floor((x / n) * n * 4) % (n * 4);
      const fy = Math.floor((y / n) * (n / 4)) % (n / 4);
      const f = fibre[fy * n * 4 + fx];
      const k = 0.9 + ring * 0.08 + (f - 0.5) * 0.26 + (fig[i] - 0.5) * 0.16;
      col[i * 4] = Math.min(255, 104 * k);
      col[i * 4 + 1] = Math.min(255, 70 * k);
      col[i * 4 + 2] = Math.min(255, 48 * k);
      col[i * 4 + 3] = 255;
      const r = 0.42 + ring * 0.05 + (f - 0.5) * 0.1;
      rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = clamp01(r) * 255;
      rough[i * 4 + 3] = 255;
      hgt[i] = ring * 0.15 + f * 0.85;
    }
  }
  const set = {
    map: dataTex(col, n, n, true),
    roughnessMap: dataTex(rough, n, n, false),
    normalMap: dataTex(normalFromHeight(hgt, n, n, 0.5), n, n, false),
  };
  // Every walnut user maps UVs in metres, so the repeat lives on the texture.
  for (const t of Object.values(set)) t.repeat.set(1 / WALNUT_TILE_M, 1 / WALNUT_TILE_M);
  return set;
}

// ---------------------------------------------------------------------------
// Cache + hook
// ---------------------------------------------------------------------------

export type DecorTextureKind = "marble" | "clay" | "soil" | "leaf" | "whiteboard" | "softShadow" | "glare" | "walnut";

interface Entry {
  set: DecorTextureSet;
  refs: number;
}
const cache = new Map<string, Entry>();

function generate(kind: DecorTextureKind, size: number): DecorTextureSet {
  switch (kind) {
    case "marble":
      return genMarble(size);
    case "clay":
      return genClay(Math.min(size, 256));
    case "soil":
      return genSoil(Math.min(size, 256));
    case "leaf":
      return genLeaf();
    case "whiteboard":
      return genWhiteboard();
    case "softShadow":
      return genSoftShadow();
    case "glare":
      return genGlare();
    case "walnut":
      return genWalnut(Math.min(size, 512));
  }
}

function key(kind: DecorTextureKind, size: number) {
  return `${kind}:${size}`;
}

function getOrCreate(kind: DecorTextureKind, size: number, anisotropy: number): DecorTextureSet {
  const k = key(kind, size);
  let e = cache.get(k);
  if (!e) {
    const set = generate(kind, size);
    for (const t of Object.values(set)) if (t) (t as Texture).anisotropy = anisotropy;
    e = { set, refs: 0 };
    cache.set(k, e);
  }
  return e.set;
}

/** Shared, ref-counted decor texture set. Never dispose the returned textures
 *  yourself. `size` is the requested base size (use useRoomQuality().textureSize). */
export function useDecorTextures(kind: DecorTextureKind, size: number, anisotropy: number): DecorTextureSet {
  const set = useMemo(() => getOrCreate(kind, size, anisotropy), [kind, size, anisotropy]);
  useEffect(() => {
    const k = key(kind, size);
    const e = cache.get(k);
    if (!e) return;
    e.refs++;
    return () => {
      e.refs--;
      setTimeout(() => {
        if (e.refs <= 0 && cache.get(k) === e) {
          cache.delete(k);
          for (const t of Object.values(e.set)) (t as Texture | undefined)?.dispose();
        }
      }, 0);
    };
  }, [kind, size, set]);
  return set;
}

export { rng as decorRng, fbm as decorFbm, smoothstep as decorSmoothstep };

// Pure (three-free) generator for the walnut furniture-panel texture; runs in
// workspace/veneerWorker.ts (or on the main thread as a fallback).
//
//   one tile = 4.0 m along the grain (U) × 1.0 m across (V), 5 glued staves
//   (seamless across V on a stave boundary).

export const VENEER_TILE_U = 4.0; // metres along the grain
export const VENEER_TILE_V = 1.0; // metres across the grain
const STAVES = 5;

export interface VeneerData {
  albedo: Uint8Array<ArrayBuffer>;
  normal: Uint8Array<ArrayBuffer>;
  orm: Uint8Array<ArrayBuffer>;
}

// --- tiny deterministic value noise -----------------------------------------
function h2(x: number, y: number, s: number): number {
  let n = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi, s);
  const b = h2(xi + 1, yi, s);
  const c = h2(xi, yi + 1, s);
  const d = h2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, s: number): number {
  return 0.55 * vnoise(x, y, s) + 0.3 * vnoise(x * 2.03, y * 2.03, s + 7) + 0.15 * vnoise(x * 4.1, y * 4.1, s + 13);
}

export function generateVeneerData(w: number, h: number): VeneerData {
  const albedo = new Uint8Array(w * h * 4);
  const orm = new Uint8Array(w * h * 4);
  const height = new Float32Array(w * h);
  // Walnut palette (sRGB 0..255): pale streak, mid heartwood, dark latewood.
  const L0 = 116, L1 = 82, L2 = 60;
  const M0 = 88, M1 = 60, M2 = 43;
  const D0 = 50, D1 = 33, D2 = 24;
  const staves = Array.from({ length: STAVES }, (_, b) => ({
    tone: 0.9 + h2(b, 3, 91) * 0.2,
    freq: 55 + h2(b, 5, 91) * 45, // rings per metre across the stave
    phase: h2(b, 7, 91) * 10,
    arch: 0.25 + h2(b, 9, 91) * 0.5, // cathedral arch strength
    archLen: 0.7 + h2(b, 11, 91) * 1.2, // metres between arches
    hue: (h2(b, 13, 91) - 0.5) * 0.06,
  }));

  // Slowly varying fields on a coarse grid, bilinearly sampled per pixel
  // (keeps generation to a few tens of ms instead of seconds).
  const gw = 257;
  const gh = 65;
  const warpG = new Float32Array(gw * gh);
  const figG = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    const vM = (j / (gh - 1)) * VENEER_TILE_V;
    const sv = (vM / VENEER_TILE_V) * STAVES;
    const b = Math.min(STAVES - 1, Math.floor(sv));
    const local = sv - b;
    for (let i = 0; i < gw; i++) {
      const uM = (i / (gw - 1)) * VENEER_TILE_U;
      warpG[j * gw + i] = (fbm(uM * 1.3, local * 3 + b * 4, 3) - 0.5) * 0.9;
      figG[j * gw + i] = fbm(uM * 0.6, vM * 9, 17);
    }
  }
  // Cathedral arch per stave per column.
  const archT = new Float32Array(STAVES * w);
  for (let b = 0; b < STAVES; b++) {
    const st = staves[b];
    for (let x = 0; x < w; x++) {
      const uM = ((x + 0.5) / w) * VENEER_TILE_U;
      const sn = Math.abs(Math.sin((uM / st.archLen + st.phase) * Math.PI));
      archT[b * w + x] = st.arch * sn * Math.sqrt(sn);
    }
  }
  const cellsU = 220; // pore cells per tile along U (≤ 18 mm streaks)
  for (let y = 0; y < h; y++) {
    const vM = ((y + 0.5) / h) * VENEER_TILE_V;
    const sv = (vM / VENEER_TILE_V) * STAVES;
    const b = Math.min(STAVES - 1, Math.floor(sv));
    const local = sv - b;
    const st = staves[b];
    const glue = Math.min(local, 1 - local) < 0.004 ? 0.82 : 1;
    const gy = (y / (h - 1)) * (gh - 1);
    const j0 = Math.min(gh - 2, Math.floor(gy));
    const fy = gy - j0;
    const ringBase = local * 0.2 * st.freq + st.phase;
    const rowSeed = Math.floor(h2(y, 1, 5) * 1000);
    const rowPhase = h2(y, 2, 41);
    const toneR = st.tone * (1 + st.hue);
    const toneB = st.tone * (1 - st.hue);
    for (let x = 0; x < w; x++) {
      const gx = (x / (w - 1)) * (gw - 1);
      const i0 = Math.min(gw - 2, Math.floor(gx));
      const fx = gx - i0;
      const k00 = j0 * gw + i0;
      const k10 = k00 + gw;
      const warp =
        (warpG[k00] * (1 - fx) + warpG[k00 + 1] * fx) * (1 - fy) + (warpG[k10] * (1 - fx) + warpG[k10 + 1] * fx) * fy;
      const figure =
        (figG[k00] * (1 - fx) + figG[k00 + 1] * fx) * (1 - fy) + (figG[k10] * (1 - fx) + figG[k10 + 1] * fx) * fy;
      const ring = ringBase + archT[b * w + x] * 5 + warp * 1.6;
      const fr = ring - Math.floor(ring);
      let sl = Math.sin(fr * Math.PI);
      sl *= sl;
      sl *= sl;
      const late = sl * sl; // sin^8: sharp latewood line
      // Pores: short dark streaks along the grain (hash per row × cell),
      // each with its own length and a sin² taper so the ends fade instead
      // of stopping square; the per-row phase keeps ends from lining up.
      const cp = (x / w) * cellsU + rowPhase;
      const cell = Math.floor(cp);
      const ph = h2(cell + rowSeed, y >> 1, 29);
      let pore = 0;
      if (ph > 0.9) {
        const len = 0.45 + 0.55 * h2(cell + rowSeed, y >> 1, 37);
        const f = (cp - cell) / len;
        if (f < 1) {
          const tp = Math.sin(f * Math.PI);
          pore = (ph - 0.9) * 10 * tp * tp;
        }
      }
      let k = 0.32 + 0.5 * figure - 0.38 * late;
      k = k < 0 ? 0 : k > 1 ? 1 : k;
      const t = k > 0.5 ? (k - 0.5) * 2 : k * 2;
      const shade = (1 - pore * 0.35) * glue;
      const o = (y * w + x) * 4;
      let r: number, g: number, bl: number;
      if (k > 0.5) {
        r = M0 + (L0 - M0) * t;
        g = M1 + (L1 - M1) * t;
        bl = M2 + (L2 - M2) * t;
      } else {
        r = D0 + (M0 - D0) * t;
        g = D1 + (M1 - D1) * t;
        bl = D2 + (M2 - D2) * t;
      }
      albedo[o] = Math.min(255, r * toneR * shade);
      albedo[o + 1] = Math.min(255, g * st.tone * shade);
      albedo[o + 2] = Math.min(255, bl * toneB * shade);
      albedo[o + 3] = 255;
      // Shallow: a deep 1 px groove caught the clearcoat specular as grey dashes.
      height[y * w + x] = -late * 0.08 - pore * 0.16;
      const rough = 0.4 + late * 0.06 + pore * 0.22 + (figure - 0.5) * 0.06;
      orm[o] = 255;
      orm[o + 1] = rough * 255;
      orm[o + 2] = 0;
      orm[o + 3] = 255;
    }
  }
  // Normal map from the height field (wraps in both directions).
  const normal = new Uint8Array(w * h * 4);
  const strength = 1.6;
  for (let y = 0; y < h; y++) {
    const yd = ((y - 1 + h) % h) * w;
    const yu = ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const xl = x === 0 ? w - 1 : x - 1;
      const xr = x === w - 1 ? 0 : x + 1;
      const nx = (height[y * w + xl] - height[y * w + xr]) * strength;
      const ny = (height[yd + x] - height[yu + x]) * strength;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const o = (y * w + x) * 4;
      normal[o] = (nx * inv * 0.5 + 0.5) * 255;
      normal[o + 1] = (ny * inv * 0.5 + 0.5) * 255;
      normal[o + 2] = (inv * 0.5 + 0.5) * 255;
      normal[o + 3] = 255;
    }
  }
  return { albedo, normal, orm };
}


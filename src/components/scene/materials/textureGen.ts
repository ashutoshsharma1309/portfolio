// Pure, dependency-free procedural PBR texture generators.
//
// Everything here works on typed arrays only (no DOM, no three.js) so it is
// fast, deterministic (seeded), tileable (all noise is periodic on the tile)
// and can be benchmarked outside the browser. textures.ts wraps the output in
// three.js DataTextures and caches it.
//
// Conventions
// - Pixel row 0 is UV v = 0 (DataTexture.flipY = false), so "+y" == "+v".
// - `albedo` is sRGB-encoded RGBA8.
// - `normal` is tangent-space OpenGL convention (+G = +v), RGBA8.
// - `orm` packs R = ambient occlusion, G = roughness (absolute, assumes
//   material.roughness = 1), B = metalness (absolute, assumes
//   material.metalness = 1), like glTF.

export type TextureKind =
  | "woodPlanks"
  | "paintedPlaster"
  | "rubberMat"
  | "brushedSteel"
  | "powderCoat"
  | "syntheticLeather"
  | "knurling"
  | "fabricWeave"
  | "microSurface";

export const TEXTURE_KINDS: readonly TextureKind[] = [
  "woodPlanks",
  "paintedPlaster",
  "rubberMat",
  "brushedSteel",
  "powderCoat",
  "syntheticLeather",
  "knurling",
  "fabricWeave",
  "microSurface",
];

export interface TextureKindInfo {
  /** Real-world edge length (meters) that ONE tile of the texture represents. */
  readonly tileMeters: number;
  /** Mean of the ORM green channel, i.e. the average absolute roughness baked
   *  into the map. Use roughnessScaleFor() to hit a desired mean roughness. */
  readonly meanRoughness: number;
  /** True when the ORM blue channel carries metalness (bind as metalnessMap). */
  readonly metallic: boolean;
  /** True when the ORM red channel carries meaningful AO (bind as aoMap). */
  readonly hasAO: boolean;
  /** True when the albedo is a near-white luminance pattern meant to be tinted
   *  with material.color (vs. a finished color). */
  readonly tintable: boolean;
  /** Multiplier on the tier texture size. Fine, uniform patterns (weave,
   *  knurl, leather grain, brushed/powder finishes) tile densely and look the
   *  same at half resolution, so they get 0.5 to keep generation fast. */
  readonly sizeScale: number;
  readonly description: string;
}

export const TEXTURE_KIND_INFO: Readonly<Record<TextureKind, TextureKindInfo>> = {
  woodPlanks: {
    tileMeters: 1.2,
    meanRoughness: 0.5,
    metallic: false,
    hasAO: true,
    tintable: false,
    sizeScale: 1,
    description:
      "Oak floor boards running along V: 6 boards of 0.20 m across one 1.2 m tile, two staggered end-joints per board, grain, per-board tone, seams, satin finish wear.",
  },
  paintedPlaster: {
    tileMeters: 5,
    meanRoughness: 0.88,
    metallic: false,
    hasAO: false,
    tintable: true,
    sizeScale: 1,
    description:
      "Matte painted wall. One tile = 5 m (full wall height) so the scuff/dirt band sits at UV v≈0 (skirting). Fine orange-peel, faint mottling.",
  },
  rubberMat: {
    tileMeters: 1,
    meanRoughness: 0.88,
    metallic: false,
    hasAO: true,
    tintable: false,
    sizeScale: 1,
    description:
      "EPDM-speckled black gym rubber; one tile = one 1 m interlocking tile with a seam on the tile border.",
  },
  brushedSteel: {
    tileMeters: 0.25,
    meanRoughness: 0.32,
    metallic: true,
    hasAO: false,
    tintable: true,
    sizeScale: 0.5,
    description: "Brushed steel; brushing streaks run along U.",
  },
  powderCoat: {
    tileMeters: 0.5,
    meanRoughness: 0.5,
    metallic: false,
    hasAO: false,
    tintable: true,
    sizeScale: 0.5,
    description: "Powder-coated finish: fine orange-peel speckle + sparse burnished micro-scratches.",
  },
  syntheticLeather: {
    tileMeters: 0.12,
    meanRoughness: 0.62,
    metallic: false,
    hasAO: true,
    tintable: true,
    sizeScale: 0.5,
    description: "Pebbled vinyl/PU upholstery grain (~1.6 mm pebbles).",
  },
  knurling: {
    tileMeters: 0.04,
    meanRoughness: 0.42,
    metallic: true,
    hasAO: true,
    tintable: true,
    sizeScale: 0.5,
    description: "Diamond knurl, 16 diamonds per 4 cm tile (2.5 mm pitch), worn flat tops, grimy valleys.",
  },
  fabricWeave: {
    tileMeters: 0.08,
    meanRoughness: 0.93,
    metallic: false,
    hasAO: true,
    tintable: true,
    sizeScale: 0.5,
    description: "Plain weave, 32 threads per 8 cm tile (2.5 mm pitch), heathered per-thread tone.",
  },
  microSurface: {
    tileMeters: 0.3,
    meanRoughness: 0.5,
    metallic: false,
    hasAO: false,
    tintable: true,
    sizeScale: 0.5,
    description: "Generic ceramic / molded-plastic micro-roughness: soft undulation + faint roughness variation.",
  },
};

export interface TextureData {
  readonly size: number;
  readonly albedo: Uint8Array;
  readonly normal: Uint8Array;
  readonly orm: Uint8Array;
}

// ---------------------------------------------------------------------------
// Seeded randomness + tileable noise
// ---------------------------------------------------------------------------

/** mulberry32 PRNG → float in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash → [0, 1). */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Precomputed per-axis lattice lookups for a periodic value-noise octave. */
function axisTable(n: number, cells: number) {
  const i0 = new Int32Array(n);
  const i1 = new Int32Array(n);
  const w = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const f = (p * cells) / n;
    const i = Math.floor(f);
    i0[p] = i % cells;
    i1[p] = (i + 1) % cells;
    w[p] = smooth(f - i);
  }
  return { i0, i1, w };
}

/**
 * Periodic (tileable) value-noise fBm on an n×n grid, normalised to [0, 1].
 * `cellsX/cellsY` is the lattice count of the first octave across the tile;
 * unequal counts give anisotropic (stretched) noise. Each octave doubles the
 * lattice so periodicity is preserved.
 */
export function fbm(
  n: number,
  cellsX: number,
  cellsY: number,
  octaves: number,
  seed: number,
  gain = 0.5,
): Float32Array {
  const out = new Float32Array(n * n);
  let amp = 1;
  let total = 0;
  let cx = Math.max(1, Math.round(cellsX));
  let cy = Math.max(1, Math.round(cellsY));
  for (let o = 0; o < octaves; o++) {
    const lat = new Float32Array(cx * cy);
    const r = rng(seed * 7919 + o * 104729 + 17);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    const tx = axisTable(n, cx);
    const ty = axisTable(n, cy);
    for (let y = 0; y < n; y++) {
      const r0 = ty.i0[y] * cx;
      const r1 = ty.i1[y] * cx;
      const wy = ty.w[y];
      const row = y * n;
      for (let x = 0; x < n; x++) {
        const a = lat[r0 + tx.i0[x]];
        const b = lat[r0 + tx.i1[x]];
        const c = lat[r1 + tx.i0[x]];
        const d = lat[r1 + tx.i1[x]];
        const wx = tx.w[x];
        const top = a + (b - a) * wx;
        const bot = c + (d - c) * wx;
        out[row + x] += (top + (bot - top) * wy) * amp;
      }
    }
    total += amp;
    amp *= gain;
    cx = Math.min(cx * 2, n);
    cy = Math.min(cy * 2, n);
  }
  const inv = 1 / total;
  for (let i = 0; i < out.length; i++) out[i] *= inv;
  return out;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

/**
 * Sobel-filtered tangent-space normal map from a height field (wraps at the
 * edges so it tiles). `strength` is calibrated for a 512 px tile and scaled by
 * size so normals look the same at every resolution.
 */
export function heightToNormal(h: Float32Array, n: number, strength: number): Uint8Array {
  const out = new Uint8Array(n * n * 4);
  const s = (strength * n) / 512;
  const xm = new Int32Array(n);
  const xp = new Int32Array(n);
  for (let x = 0; x < n; x++) {
    xm[x] = (x - 1 + n) % n;
    xp[x] = (x + 1) % n;
  }
  for (let y = 0; y < n; y++) {
    const rm = xm[y] * n;
    const r0 = y * n;
    const rp = xp[y] * n;
    for (let x = 0; x < n; x++) {
      const a = xm[x];
      const c = xp[x];
      const tl = h[rm + a], t = h[rm + x], tr = h[rm + c];
      const l = h[r0 + a], r = h[r0 + c];
      const bl = h[rp + a], b = h[rp + x], br = h[rp + c];
      const dx = tr + 2 * r + br - (tl + 2 * l + bl);
      const dy = bl + 2 * b + br - (tl + 2 * t + tr);
      const nx = -dx * s;
      const ny = -dy * s;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const o = (r0 + x) * 4;
      out[o] = (nx * inv * 0.5 + 0.5) * 255 + 0.5;
      out[o + 1] = (ny * inv * 0.5 + 0.5) * 255 + 0.5;
      out[o + 2] = (inv * 0.5 + 0.5) * 255 + 0.5;
      out[o + 3] = 255;
    }
  }
  return out;
}

class Buffers {
  readonly albedo: Uint8Array;
  readonly orm: Uint8Array;
  readonly height: Float32Array;
  constructor(readonly n: number) {
    this.albedo = new Uint8Array(n * n * 4);
    this.orm = new Uint8Array(n * n * 4);
    this.height = new Float32Array(n * n);
  }
  /** rgb/ao/rough/metal in 0..1 (rgb already in sRGB space). */
  set(i: number, r: number, g: number, b: number, ao: number, rough: number, metal: number) {
    const o = i * 4;
    const A = this.albedo;
    A[o] = clamp01(r) * 255 + 0.5;
    A[o + 1] = clamp01(g) * 255 + 0.5;
    A[o + 2] = clamp01(b) * 255 + 0.5;
    A[o + 3] = 255;
    const M = this.orm;
    M[o] = clamp01(ao) * 255 + 0.5;
    M[o + 1] = clamp01(rough) * 255 + 0.5;
    M[o + 2] = clamp01(metal) * 255 + 0.5;
    M[o + 3] = 255;
  }
  finish(normalStrength: number): TextureData {
    return {
      size: this.n,
      albedo: this.albedo,
      orm: this.orm,
      normal: heightToNormal(this.height, this.n, normalStrength),
    };
  }
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function woodPlanks(n: number, seed: number): TextureData {
  const B = new Buffers(n);
  const BOARDS = 6;
  const boardPx = n / BOARDS;
  const r = rng(seed);
  // Two staggered end-joints per board column → two planks per column.
  const J0 = new Float32Array(BOARDS);
  const J1 = new Float32Array(BOARDS);
  const tone = new Float32Array(BOARDS * 2);
  const hue = new Float32Array(BOARDS * 2);
  const ringOff = new Float32Array(BOARDS * 2);
  const ringFreq = new Float32Array(BOARDS * 2);
  for (let b = 0; b < BOARDS; b++) {
    const j0 = r();
    const j1 = (j0 + 0.35 + r() * 0.3) % 1;
    J0[b] = Math.min(j0, j1);
    J1[b] = Math.max(j0, j1);
    for (let k = 0; k < 2; k++) {
      tone[b * 2 + k] = (r() - 0.5) * 0.16;
      hue[b * 2 + k] = (r() - 0.5) * 0.04;
      ringOff[b * 2 + k] = r() * 10;
      ringFreq[b * 2 + k] = 8 + r() * 8;
    }
  }
  // Per-column lookups (board index, position across board, side distance).
  const colB = new Int32Array(n);
  const colLu = new Float32Array(n);
  const colSide = new Float32Array(n);
  for (let x = 0; x < n; x++) {
    const bu = (x + 0.5) / boardPx;
    const b = Math.min(BOARDS - 1, Math.floor(bu));
    colB[x] = b;
    colLu[x] = bu - b;
    colSide[x] = Math.min(bu - b, 1 - (bu - b)) * boardPx;
  }
  // Grain warp: stretched along v (board length).
  const warp = fbm(n, BOARDS * 3, 3, 3, seed + 1);
  // Fine fibres: very stretched along v.
  const fibre = fbm(n, n / 2, 6, 2, seed + 2);
  // Broad wear/patina mottling.
  const wear = fbm(n, 3, 3, 3, seed + 3);
  // Figure variation.
  const figure = fbm(n, BOARDS * 2, 8, 2, seed + 4);
  const H = B.height;

  for (let y = 0; y < n; y++) {
    const v = (y + 0.5) / n;
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const b = colB[x];
      const lu = colLu[x]; // 0..1 across the board
      const j0 = J0[b];
      const j1 = J1[b];
      const plank = b * 2 + (v >= j0 && v < j1 ? 0 : 1);

      // Distance (px) to the nearest seam: board sides + end joints.
      const dSide = colSide[x];
      const dv0 = Math.abs(v - j0);
      const dv1 = Math.abs(v - j1);
      const dEnd = Math.min(dv0, 1 - dv0, dv1, 1 - dv1) * n;
      const d = Math.min(dSide, dEnd);
      const seam = 1 - smoothstep(0.4, 1.6, d); // dark gap
      const bevel = 1 - smoothstep(1.0, 3.5, d); // eased edge

      // Growth rings: stripes across u, warped along v.
      const w = warp[i];
      const ring = lu * ringFreq[plank] + ringOff[plank] + w * 1.5 + figure[i] * 0.5;
      const fr = ring - Math.floor(ring);
      const late = smoothstep(0.55, 0.95, fr) * (1 - smoothstep(0.95, 1.0, fr)); // latewood band
      const f = fibre[i];

      let k = 1 + tone[plank] - late * 0.16 + (f - 0.5) * 0.12;
      const wr = smoothstep(0.58, 0.82, wear[i]);
      k += wr * 0.06;
      k *= 1 - seam * 0.6 - bevel * 0.12;
      const hs = hue[plank];
      // Oak-ish base (sRGB).
      const R = 0.56 * k * (1 + hs);
      const G = 0.415 * k;
      const Bc = 0.27 * k * (1 - hs * 1.5);

      const rough = 0.44 + late * 0.07 + (f - 0.5) * 0.06 + wr * 0.14 + seam * 0.35;
      const ao = 1 - seam * 0.65 - bevel * 0.15;
      H[i] = late * 0.05 + f * 0.03 - seam * 0.5 - bevel * 0.12;
      B.set(i, R, G, Bc, ao, rough, 0);
    }
  }
  return B.finish(1.2);
}

function paintedPlaster(n: number, seed: number): TextureData {
  const B = new Buffers(n);
  const peel = fbm(n, n / 2, n / 2, 1, seed + 1);
  const mottle = fbm(n, 4, 4, 3, seed + 2);
  const scuffN = fbm(n, 6, n / 6, 2, seed + 3); // horizontal streaks
  const grime = fbm(n, 16, 4, 2, seed + 4);
  const H = B.height;
  const BAND = 0.14; // fraction of the tile (≈0.7 m at 5 m) with scuffs
  for (let y = 0; y < n; y++) {
    const v = (y + 0.5) / n;
    const low = v < BAND ? Math.pow(1 - v / BAND, 2) : 0;
    const floorDirt = v < 0.035 ? (1 - v / 0.035) * (0.4 + grime[y * n] * 0.6) : 0;
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const p = peel[i];
      const m = (mottle[i] - 0.5) * 0.06;
      const sc = smoothstep(0.66, 0.82, scuffN[i]) * low * (0.5 + grime[i]);
      const dirt = floorDirt * (0.6 + grime[i] * 0.4);
      const k = 0.965 + m - sc * 0.16 - dirt * 0.12 + (p - 0.5) * 0.015;
      const warm = sc * 0.02 + dirt * 0.02;
      H[i] = p * 0.35;
      B.set(i, k, k - warm * 0.5, k - warm, 1, 0.9 + (p - 0.5) * 0.06 - sc * 0.12, 0);
    }
  }
  return B.finish(0.035);
}

function rubberMat(n: number, seed: number): TextureData {
  const B = new Buffers(n);
  const grain = fbm(n, n / 3, n / 3, 2, seed + 1, 0.55);
  const blot = fbm(n, 5, 5, 3, seed + 2);
  const H = B.height;
  // Speckle layer: palette index per pixel (0 = none).
  const speck = new Uint8Array(n * n);
  const r = rng(seed + 3);
  const count = Math.round(n * n * 0.012);
  for (let s = 0; s < count; s++) {
    const cx = r() * n;
    const cy = r() * n;
    const rad = 0.7 + r() * 1.5;
    const pick = r();
    const col = pick < 0.5 ? 1 : pick < 0.8 ? 2 : pick < 0.95 ? 3 : 4;
    const R = Math.ceil(rad);
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const px = Math.floor(cx) + dx;
        const py = Math.floor(cy) + dy;
        const ddx = px + 0.5 - cx;
        const ddy = py + 0.5 - cy;
        if (ddx * ddx + ddy * ddy > rad * rad * (0.7 + 0.6 * hash2(px, py, s))) continue;
        speck[((py + n) % n) * n + ((px + n) % n)] = col;
      }
    }
  }
  // sRGB palette: grey, blue-grey, light grey, muted teal.
  const PAL = [
    [0, 0, 0],
    [0.42, 0.42, 0.43],
    [0.3, 0.34, 0.42],
    [0.62, 0.62, 0.6],
    [0.28, 0.38, 0.38],
  ];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const g = grain[i];
      const dEdge = Math.min(x + 0.5, n - x - 0.5, y + 0.5, n - y - 0.5);
      const seam = 1 - smoothstep(0.3, 1.4, dEdge);
      const s = speck[i];
      let R: number, G: number, Bc: number, rough: number;
      if (s) {
        const c = PAL[s];
        const k = 0.85 + g * 0.3;
        R = c[0] * k;
        G = c[1] * k;
        Bc = c[2] * k;
        rough = 0.8;
      } else {
        const k = 0.085 + (g - 0.5) * 0.03 + (blot[i] - 0.5) * 0.02;
        R = k;
        G = k;
        Bc = k * 1.04;
        rough = 0.9 + (g - 0.5) * 0.06;
      }
      R *= 1 - seam * 0.5;
      G *= 1 - seam * 0.5;
      Bc *= 1 - seam * 0.5;
      H[i] = g * 0.4 + (s ? 0.15 : 0) - seam * 0.8;
      B.set(i, R, G, Bc, 1 - seam * 0.6, rough + seam * 0.05, 0);
    }
  }
  return B.finish(0.8);
}

function brushedSteel(n: number, seed: number): TextureData {
  const B = new Buffers(n);
  // Streaks run along U: few cells across u, many along v.
  const fine = fbm(n, 4, n, 2, seed + 1, 0.6);
  const mid = fbm(n, 2, n / 4, 3, seed + 2);
  const blot = fbm(n, 3, 3, 3, seed + 3);
  const H = B.height;
  for (let i = 0; i < n * n; i++) {
    const s = fine[i] * 0.6 + mid[i] * 0.4;
    const k = 0.78 + (s - 0.5) * 0.12 + (blot[i] - 0.5) * 0.04;
    H[i] = fine[i] * 0.25;
    B.set(i, k, k, k * 1.01, 1, 0.3 + (s - 0.5) * 0.16 + (blot[i] - 0.5) * 0.06, 1);
  }
  return B.finish(0.35);
}

/** Draws `count` short anti-aliased line segments into `dst` (0..1). */
function scratches(
  n: number,
  dst: Float32Array,
  count: number,
  seed: number,
  minLen: number,
  maxLen: number,
  dominantAngle: number | null,
) {
  const r = rng(seed);
  for (let s = 0; s < count; s++) {
    let x = r() * n;
    let y = r() * n;
    const ang = dominantAngle === null ? r() * Math.PI : dominantAngle + (r() - 0.5) * 0.6;
    const len = minLen + r() * (maxLen - minLen);
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const strength = 0.4 + r() * 0.6;
    const steps = Math.ceil(len);
    for (let k = 0; k < steps; k++) {
      // Taper at both ends.
      const t = k / steps;
      const a = strength * Math.sin(Math.PI * t);
      const i = (((y | 0) % n) + n) % n * n + ((((x | 0) % n) + n) % n);
      if (dst[i] < a) dst[i] = a;
      x += dx;
      y += dy;
    }
  }
}

function powderCoat(n: number, seed: number): TextureData {
  const B = new Buffers(n);
  const peel = fbm(n, n / 3, n / 3, 2, seed + 1, 0.55);
  const tone = fbm(n, 6, 6, 3, seed + 2);
  const scr = new Float32Array(n * n);
  scratches(n, scr, Math.round((n * n) / 4000), seed + 3, n * 0.02, n * 0.12, null);
  const H = B.height;
  for (let i = 0; i < n * n; i++) {
    const p = peel[i];
    const sc = scr[i];
    const k = 0.94 + (p - 0.5) * 0.04 + (tone[i] - 0.5) * 0.03 + sc * 0.05;
    H[i] = p * 0.3 - sc * 0.2;
    B.set(i, k, k, k, 1, 0.52 + (p - 0.5) * 0.08 + (tone[i] - 0.5) * 0.05 - sc * 0.2, 0);
  }
  return B.finish(0.45);
}

/** Tileable Worley (F1, F2) on a jittered grid of `cells`×`cells`. */
function worley(n: number, cells: number, seed: number, f1: Float32Array, f2: Float32Array) {
  // Feature points stored with a 1-cell wrapped border so the 3×3 search
  // never needs a modulo. Index (cy + 1) * P + (cx + 1), cx/cy in [-1, cells].
  const P = cells + 2;
  const fx = new Float32Array(P * P);
  const fy = new Float32Array(P * P);
  for (let cy = -1; cy <= cells; cy++) {
    const wy = (cy + cells) % cells;
    for (let cx = -1; cx <= cells; cx++) {
      const wx = (cx + cells) % cells;
      const j = (cy + 1) * P + (cx + 1);
      fx[j] = cx + hash2(wx, wy, seed);
      fy[j] = cy + hash2(wx, wy, seed + 101);
    }
  }
  const scale = cells / n;
  for (let y = 0; y < n; y++) {
    const py = (y + 0.5) * scale;
    const cy0 = Math.floor(py);
    for (let x = 0; x < n; x++) {
      const px = (x + 0.5) * scale;
      const cx0 = Math.floor(px);
      let d1 = 9;
      let d2 = 9;
      for (let oy = 0; oy <= 2; oy++) {
        const row = (cy0 + oy) * P + cx0;
        for (let ox = 0; ox <= 2; ox++) {
          const j = row + ox;
          const ddx = fx[j] - px;
          const ddy = fy[j] - py;
          const dd = ddx * ddx + ddy * ddy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
          } else if (dd < d2) d2 = dd;
        }
      }
      const i = y * n + x;
      f1[i] = Math.sqrt(d1);
      f2[i] = Math.sqrt(d2);
    }
  }
}

function syntheticLeather(n: number, seed: number): TextureData {
  const B = new Buffers(n);
  const f1 = new Float32Array(n * n);
  const f2 = new Float32Array(n * n);
  // ~1.5 mm pebbles on a 0.25 m tile → ~160 cells; scale with resolution so
  // pebbles stay ≥3 px.
  const cells = Math.max(16, Math.round(n / 3.5));
  worley(n, cells, seed + 1, f1, f2);
  const fine = fbm(n, n / 2, n / 2, 1, seed + 2);
  const tone = fbm(n, 5, 5, 3, seed + 3);
  const H = B.height;
  for (let i = 0; i < n * n; i++) {
    const edge = f2[i] - f1[i]; // 0 on cell borders
    const crease = 1 - smoothstep(0.02, 0.22, edge);
    const dome = 1 - smoothstep(0.0, 0.75, f1[i]);
    const k = 0.92 - crease * 0.1 + (tone[i] - 0.5) * 0.04 + (fine[i] - 0.5) * 0.02;
    H[i] = dome * 0.35 - crease * 0.35 + fine[i] * 0.04;
    B.set(i, k, k, k, 1 - crease * 0.3, 0.58 + crease * 0.18 + (fine[i] - 0.5) * 0.06 - dome * 0.04, 0);
  }
  return B.finish(0.9);
}

function knurling(n: number, seed: number): TextureData {
  const B = new Buffers(n);
  const DIAMONDS = 16;
  const pitch = n / DIAMONDS;
  const grime = fbm(n, 4, 4, 3, seed + 1);
  const H = B.height;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const a = (x + y + 1) / pitch;
      const b = (x - y + n) / pitch;
      const ta = 1 - Math.abs(2 * (a - Math.floor(a)) - 1);
      const tb = 1 - Math.abs(2 * (b - Math.floor(b)) - 1);
      // Pyramid with worn (flattened) tops.
      const h = Math.min(1, Math.min(ta, tb) * 1.7);
      const valley = 1 - smoothstep(0.05, 0.45, h);
      const top = smoothstep(0.85, 1, h);
      const g = grime[i];
      const k = 0.7 - valley * (0.25 + g * 0.1) + top * 0.08;
      H[i] = h * 0.5;
      B.set(i, k, k * 0.99, k * 0.97, 1 - valley * 0.55, 0.36 + valley * 0.28 - top * 0.1 + (g - 0.5) * 0.05, 1);
    }
  }
  return B.finish(0.55);
}

function fabricWeave(n: number, seed: number): TextureData {
  const B = new Buffers(n);
  const THREADS = 32;
  const pitch = n / THREADS;
  const fibU = fbm(n, n / 3, 8, 2, seed + 1); // fibres along u (weft)
  const fibV = fbm(n, 8, n / 3, 2, seed + 2); // fibres along v (warp)
  const tone = fbm(n, 4, 4, 3, seed + 3);
  const H = B.height;
  const profile = (t: number) => {
    const d = (t - 0.5) / 0.46;
    return d * d >= 1 ? 0 : Math.sqrt(1 - d * d);
  };
  for (let y = 0; y < n; y++) {
    const cv = y / pitch;
    const iv = Math.floor(cv);
    const fv = cv - iv;
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const cu = x / pitch;
      const iu = Math.floor(cu);
      const fu = cu - iu;
      const warpTop = ((iu + iv) & 1) === 0;
      const archV = Math.sin(Math.PI * fv);
      const archU = Math.sin(Math.PI * fu);
      const hWarp = profile(fu) * (warpTop ? 0.55 + 0.45 * archV : 0.5 - 0.3 * archV);
      const hWeft = profile(fv) * (!warpTop ? 0.55 + 0.45 * archU : 0.5 - 0.3 * archU);
      const isWarp = hWarp >= hWeft;
      const h = isWarp ? hWarp : hWeft;
      const fib = isWarp ? fibV[i] : fibU[i];
      const thread = isWarp ? hash2(iu, 0, seed) : hash2(0, iv, seed + 7);
      const k = (0.62 + h * 0.36) * (0.95 + thread * 0.1) * (0.94 + fib * 0.1) * (0.97 + tone[i] * 0.06);
      H[i] = h * 0.6 + fib * 0.08;
      B.set(i, k, k, k, 0.5 + h * 0.5, 0.9 + (1 - h) * 0.07 + (fib - 0.5) * 0.04, 0);
    }
  }
  return B.finish(0.9);
}

function microSurface(n: number, seed: number): TextureData {
  const B = new Buffers(n);
  const soft = fbm(n, 8, 8, 3, seed + 1);
  const fine = fbm(n, n / 4, n / 4, 1, seed + 2);
  const H = B.height;
  for (let i = 0; i < n * n; i++) {
    const s = soft[i];
    const f = fine[i];
    const k = 0.97 + (s - 0.5) * 0.03;
    H[i] = s * 0.4 + f * 0.08;
    B.set(i, k, k, k, 1, 0.5 + (s - 0.5) * 0.1 + (f - 0.5) * 0.06, 0);
  }
  return B.finish(0.25);
}

const GENERATORS: Record<TextureKind, (n: number, seed: number) => TextureData> = {
  woodPlanks,
  paintedPlaster,
  rubberMat,
  brushedSteel,
  powderCoat,
  syntheticLeather,
  knurling,
  fabricWeave,
  microSurface,
};

/** Generate raw RGBA8 data for one texture kind. `size` must be a power of two. */
export function generateTextureData(kind: TextureKind, size: number, seed = 1): TextureData {
  return GENERATORS[kind](size, seed);
}

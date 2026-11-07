// Procedural PBR texture sets for the /room scene.
//
// - Lazily generated on first request, cached per (kind, size, seed).
// - Generation runs in a Web Worker (falls back to the main thread when
//   workers are unavailable). getTextureSet() returns IMMEDIATELY with
//   correctly-sized textures pre-filled with a neutral placeholder (the kind's
//   mean colour / flat normal / mean roughness); the real data is copied in
//   when the worker finishes and every texture sharing that data is flagged
//   for re-upload. `set.ready` resolves at that point. Scene.tsx holds the
//   loading screen until texturesSettled() so the swap is never visible.
// - Textures are three.js DataTextures (RGBA8, no canvas round-trip), with
//   RepeatWrapping, trilinear mipmaps and anisotropy.

import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
} from "three";
import {
  TEXTURE_KINDS,
  TEXTURE_KIND_INFO,
  generateTextureData,
  type TextureKind,
  type TextureKindInfo,
} from "./textureGen";
import type { TextureJob, TextureJobResult } from "./textureWorker";

export { TEXTURE_KINDS, TEXTURE_KIND_INFO, type TextureKind, type TextureKindInfo };

/** A shared, cached texture set. NEVER dispose it and never mutate its
 *  textures (repeat/offset/etc.) — use createTextureSet() for that. */
export interface PbrTextureSet {
  readonly kind: TextureKind;
  /** Actual edge length in px (tier size × kind sizeScale). */
  readonly size: number;
  readonly info: TextureKindInfo;
  /** Albedo, SRGBColorSpace. */
  readonly map: Texture;
  /** Tangent-space normal map (OpenGL / +Y up), linear. */
  readonly normalMap: Texture;
  /** Packed occlusion (R) / roughness (G) / metalness (B), linear. */
  readonly orm: Texture;
  /** Same texture as `orm` (three reads the G channel). */
  readonly roughnessMap: Texture;
  /** `orm` for metallic kinds (three reads B), otherwise null. */
  readonly metalnessMap: Texture | null;
  /** `orm` for kinds with baked occlusion (three reads R), otherwise null. */
  readonly aoMap: Texture | null;
  /** Resolves when the generated data has replaced the placeholder. */
  readonly ready: Promise<void>;
  isReady(): boolean;
}

/** A per-material copy of a set (textures are clones sharing the cached GPU
 *  data) with its own repeat/offset/rotation. The owner MUST call dispose(). */
export interface OwnedTextureSet extends PbrTextureSet {
  readonly repeat: readonly [number, number];
  dispose(): void;
}

export interface TextureRequest {
  /** Tier base size (RoomQualityState.textureSize). Default 512. The actual
   *  size is base × TEXTURE_KIND_INFO[kind].sizeScale (min 64). */
  readonly size?: number;
  /** RoomQualityState.anisotropy. Default 4. */
  readonly anisotropy?: number;
  /** Variant seed (different seeds = different but equivalent patterns). */
  readonly seed?: number;
}

export interface OwnedTextureRequest extends TextureRequest {
  /** Physical width (m) of the surface along U. With heightM, sets repeat so
   *  the texture has its real-world scale (see TEXTURE_KIND_INFO.tileMeters). */
  readonly widthM?: number;
  /** Physical height (m) of the surface along V. */
  readonly heightM?: number;
  /** Explicit repeat; overrides widthM/heightM. */
  readonly repeat?: readonly [number, number];
  readonly offset?: readonly [number, number];
  /** UV rotation in radians (around `center`, default 0.5/0.5). */
  readonly rotation?: number;
}

// ---------------------------------------------------------------------------
// Physical scale helpers
// ---------------------------------------------------------------------------

/** Repeat needed for a surface of widthM × heightM meters so one tile covers
 *  TEXTURE_KIND_INFO[kind].tileMeters. */
export function repeatForMeters(kind: TextureKind, widthM: number, heightM: number): [number, number] {
  const t = TEXTURE_KIND_INFO[kind].tileMeters;
  return [widthM / t, heightM / t];
}

/** Set repeat on textures you own (an OwnedTextureSet's or your own clones). */
export function applyRepeat(textures: readonly (Texture | null)[], repeat: readonly [number, number]) {
  for (const t of textures) if (t) t.repeat.set(repeat[0], repeat[1]);
}

/** Actual generated size for a kind at a tier base size. */
export function textureSizeFor(kind: TextureKind, baseSize: number): number {
  const s = baseSize * TEXTURE_KIND_INFO[kind].sizeScale;
  return Math.max(64, 2 ** Math.round(Math.log2(s)));
}

/** material.roughness multiplier that makes a kind's map average `desired`. */
export function roughnessScaleFor(kind: TextureKind, desired: number): number {
  return desired / TEXTURE_KIND_INFO[kind].meanRoughness;
}

// ---------------------------------------------------------------------------
// Cache + generation
// ---------------------------------------------------------------------------

/** sRGB placeholder albedo per kind (≈ the generated mean). */
const PLACEHOLDER_ALBEDO: Record<TextureKind, [number, number, number]> = {
  woodPlanks: [140, 104, 68],
  paintedPlaster: [244, 244, 243],
  rubberMat: [32, 32, 34],
  brushedSteel: [199, 199, 201],
  powderCoat: [240, 240, 240],
  syntheticLeather: [225, 225, 225],
  knurling: [150, 148, 145],
  fabricWeave: [205, 205, 205],
  microSurface: [247, 247, 247],
};

interface CacheEntry {
  readonly set: PbrTextureSet;
  readonly albedo: Uint8Array<ArrayBuffer>;
  readonly normal: Uint8Array<ArrayBuffer>;
  readonly orm: Uint8Array<ArrayBuffer>;
  /** Owned clones that must be re-flagged for upload when data lands. */
  readonly dependents: Set<Texture>;
  ready: boolean;
  resolve: () => void;
}

export interface TextureStat {
  readonly kind: TextureKind;
  readonly size: number;
  /** Generation time inside the generator (worker or main thread). */
  readonly ms: number;
  /** Request → data available on the main thread. */
  readonly latencyMs: number;
  readonly where: "worker" | "main";
}

const cache = new Map<string, CacheEntry>();
const stats: TextureStat[] = [];
let pending = 0;
let settleWaiters: (() => void)[] = [];

function fillPlaceholder(kind: TextureKind, n: number) {
  const info = TEXTURE_KIND_INFO[kind];
  const [r, g, b] = PLACEHOLDER_ALBEDO[kind];
  const albedo = new Uint8Array(n * n * 4);
  const normal = new Uint8Array(n * n * 4);
  const orm = new Uint8Array(n * n * 4);
  // Little-endian RGBA packed into one u32 → a single fill() per map.
  new Uint32Array(albedo.buffer).fill((255 << 24) | (b << 16) | (g << 8) | r);
  new Uint32Array(normal.buffer).fill((255 << 24) | (255 << 16) | (128 << 8) | 128);
  const rough = Math.round(info.meanRoughness * 255);
  const metal = info.metallic ? 255 : 0;
  new Uint32Array(orm.buffer).fill((255 << 24) | (metal << 16) | (rough << 8) | 255);
  return { albedo, normal, orm };
}

function makeTexture(data: Uint8Array<ArrayBuffer>, n: number, srgb: boolean, anisotropy: number, name: string) {
  const t = new DataTexture(data, n, n, RGBAFormat, UnsignedByteType);
  t.name = name;
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = anisotropy;
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.flipY = false;
  t.unpackAlignment = 4;
  t.needsUpdate = true;
  return t;
}

// --- Worker pool -----------------------------------------------------------

let workers: Worker[] | null = null;
let workersFailed = false;
const outstanding = new Map<Worker, number>();
const jobs = new Map<number, { entry: CacheEntry; t0: number; kind: TextureKind; size: number; seed: number }>();
let nextJobId = 1;

function getWorkers(): Worker[] | null {
  if (workersFailed || typeof Worker === "undefined") return null;
  if (workers) return workers;
  try {
    const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
    const count = cores > 2 ? 2 : 1;
    workers = [];
    for (let i = 0; i < count; i++) {
      const w = new Worker(new URL("./textureWorker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<TextureJobResult>) => onWorkerResult(w, e.data);
      w.onerror = (e) => {
        e.preventDefault();
        failOverToMainThread();
      };
      outstanding.set(w, 0);
      workers.push(w);
    }
    return workers;
  } catch {
    workersFailed = true;
    workers = null;
    return null;
  }
}

/** A worker failed to load or crashed: finish every queued job on the main
 *  thread so nothing stays on its placeholder. */
function failOverToMainThread() {
  if (workersFailed) return;
  workersFailed = true;
  for (const w of workers ?? []) w.terminate();
  workers = null;
  const queued = [...jobs.values()];
  jobs.clear();
  for (const j of queued) scheduleMainThread(j.entry, j.kind, j.size, j.seed, j.t0);
}

function onWorkerResult(w: Worker, r: TextureJobResult) {
  outstanding.set(w, Math.max(0, (outstanding.get(w) ?? 1) - 1));
  const job = jobs.get(r.id);
  if (!job) return;
  jobs.delete(r.id);
  commit(job.entry, r.albedo, r.normal, r.orm, r.ms, job.t0, "worker");
}

function scheduleMainThread(entry: CacheEntry, kind: TextureKind, size: number, seed: number, t0: number) {
  setTimeout(() => {
    const g0 = performance.now();
    const d = generateTextureData(kind, size, seed);
    commit(entry, d.albedo, d.normal, d.orm, performance.now() - g0, t0, "main");
  }, 0);
}

function commit(
  entry: CacheEntry,
  albedo: Uint8Array,
  normal: Uint8Array,
  orm: Uint8Array,
  ms: number,
  t0: number,
  where: "worker" | "main",
) {
  entry.albedo.set(albedo);
  entry.normal.set(normal);
  entry.orm.set(orm);
  const s = entry.set;
  s.map.needsUpdate = true;
  s.normalMap.needsUpdate = true;
  s.orm.needsUpdate = true;
  entry.dependents.forEach((t) => {
    t.needsUpdate = true;
  });
  entry.dependents.clear();
  entry.ready = true;
  entry.resolve();
  const stat: TextureStat = { kind: s.kind, size: s.size, ms, latencyMs: performance.now() - t0, where };
  stats.push(stat);
  if (import.meta.env.DEV) {
    console.info(
      `[room-textures] ${stat.kind} ${stat.size}px generated in ${stat.ms.toFixed(1)} ms (${where}), ready after ${stat.latencyMs.toFixed(1)} ms`,
    );
  }
  pending--;
  if (pending === 0) {
    const waiters = settleWaiters;
    settleWaiters = [];
    waiters.forEach((f) => f());
  }
}

function requestGeneration(entry: CacheEntry, kind: TextureKind, size: number, seed: number) {
  pending++;
  const t0 = performance.now();
  const pool = getWorkers();
  if (!pool) {
    scheduleMainThread(entry, kind, size, seed, t0);
    return;
  }
  let best = pool[0];
  for (const w of pool) if ((outstanding.get(w) ?? 0) < (outstanding.get(best) ?? 0)) best = w;
  outstanding.set(best, (outstanding.get(best) ?? 0) + 1);
  const id = nextJobId++;
  jobs.set(id, { entry, t0, kind, size, seed });
  const job: TextureJob = { id, kind, size, seed };
  best.postMessage(job);
}

/**
 * Shared, cached texture set for `kind`. Cheap after the first call. Do NOT
 * dispose or mutate the returned textures; for per-surface repeat use
 * createTextureSet().
 */
export function getTextureSet(kind: TextureKind, req: TextureRequest = {}): PbrTextureSet {
  const size = textureSizeFor(kind, req.size ?? 512);
  const seed = req.seed ?? 1;
  const key = `${kind}:${size}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit.set;

  const anisotropy = req.anisotropy ?? 4;
  const info = TEXTURE_KIND_INFO[kind];
  const data = fillPlaceholder(kind, size);
  const map = makeTexture(data.albedo, size, true, anisotropy, `${key}:albedo`);
  const normalMap = makeTexture(data.normal, size, false, anisotropy, `${key}:normal`);
  const orm = makeTexture(data.orm, size, false, anisotropy, `${key}:orm`);
  let resolve: () => void = () => {};
  const ready = new Promise<void>((r) => {
    resolve = r;
  });
  const entry: CacheEntry = {
    albedo: data.albedo,
    normal: data.normal,
    orm: data.orm,
    dependents: new Set(),
    ready: false,
    resolve,
    set: {
      kind,
      size,
      info,
      map,
      normalMap,
      orm,
      roughnessMap: orm,
      metalnessMap: info.metallic ? orm : null,
      aoMap: info.hasAO ? orm : null,
      ready,
      isReady: () => entry.ready,
    },
  };
  entry.resolve = () => resolve();
  cache.set(key, entry);
  requestGeneration(entry, kind, size, seed);
  return entry.set;
}

/**
 * Owned copy of a set with its own UV transform (clones share the cached GPU
 * texture, so this costs no extra memory or generation). Call dispose() when
 * the material using it is disposed — it only releases the clones.
 */
export function createTextureSet(kind: TextureKind, req: OwnedTextureRequest = {}): OwnedTextureSet {
  const base = getTextureSet(kind, req);
  const entry = cache.get(`${kind}:${base.size}:${req.seed ?? 1}`)!;
  const repeat: [number, number] = req.repeat
    ? [req.repeat[0], req.repeat[1]]
    : req.widthM !== undefined && req.heightM !== undefined
      ? repeatForMeters(kind, req.widthM, req.heightM)
      : [1, 1];
  const clone = (t: Texture) => {
    const c = t.clone();
    c.repeat.set(repeat[0], repeat[1]);
    if (req.offset) c.offset.set(req.offset[0], req.offset[1]);
    if (req.rotation) {
      c.center.set(0.5, 0.5);
      c.rotation = req.rotation;
    }
    if (req.anisotropy !== undefined) c.anisotropy = req.anisotropy;
    c.needsUpdate = true;
    // Only clones made before the data lands need re-flagging; commit()
    // clears the set afterwards, so nothing is retained long-term.
    if (!entry.ready) entry.dependents.add(c);
    return c;
  };
  const map = clone(base.map);
  const normalMap = clone(base.normalMap);
  const orm = clone(base.orm);
  return {
    kind,
    size: base.size,
    info: base.info,
    map,
    normalMap,
    orm,
    roughnessMap: orm,
    metalnessMap: base.metalnessMap ? orm : null,
    aoMap: base.aoMap ? orm : null,
    ready: base.ready,
    isReady: base.isReady,
    repeat,
    // Idempotent and safe under StrictMode's effect replay: a disposed clone
    // that is rendered again simply re-uploads from the shared source.
    dispose() {
      map.dispose();
      normalMap.dispose();
      orm.dispose();
    },
  };
}

/** Number of texture sets still generating. */
export function texturesPending(): number {
  return pending;
}

/** Resolves once every requested texture set has its generated data. */
export function texturesSettled(): Promise<void> {
  if (pending === 0) return Promise.resolve();
  return new Promise((r) => settleWaiters.push(r));
}

/** Generation timings recorded so far (one row per generated set). */
export function getTextureStats(): readonly TextureStat[] {
  return stats;
}

/**
 * Dev/benchmark helper: synchronously generates every kind at `baseSize` on
 * the CURRENT thread, bypassing the cache, and returns ms per kind. Not used
 * at runtime.
 */
export function benchmarkTextureGeneration(baseSize = 512): Record<TextureKind | "total", number> {
  const out = { total: 0 } as Record<TextureKind | "total", number>;
  for (const kind of TEXTURE_KINDS) {
    const t0 = performance.now();
    generateTextureData(kind, textureSizeFor(kind, baseSize), 1);
    const ms = performance.now() - t0;
    out[kind] = Math.round(ms * 10) / 10;
    out.total += ms;
  }
  out.total = Math.round(out.total * 10) / 10;
  return out;
}

declare global {
  interface Window {
    /** Dev-only texture diagnostics. */
    __roomTextures?: {
      stats: typeof getTextureStats;
      pending: typeof texturesPending;
      benchmark: typeof benchmarkTextureGeneration;
    };
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__roomTextures = {
    stats: getTextureStats,
    pending: texturesPending,
    benchmark: benchmarkTextureGeneration,
  };
}

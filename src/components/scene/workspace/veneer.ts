// Walnut furniture panel texture (desk top, drawer-unit top, wall shelf).
//
// The foundation's `woodPlanks` set is a FLOOR texture (0.2 m boards with end
// joints and seams) — on furniture it reads as decking. Furniture tops are
// glued-up panels: 0.2 m staves running the full length, no gaps, no end
// joints, flat-sawn "cathedral" figure, open pores. This generates exactly
// that, at physical scale:
//
//   one tile = 4.0 m along the grain (U) × 1.0 m across (V), 5 staves per tile
//   (tiles seamlessly across V on a stave boundary; 4 m covers every piece of
//   furniture here, so U never visibly repeats).
//
// Outputs albedo (sRGB), a tangent-space normal map (pores + growth rings)
// and an ORM map (R = AO 1, G = roughness, B = 0). Generated once in a Web
// Worker (veneerWorker.ts, generator in veneerGen.ts) into full-size
// placeholders and cached for the session; the cached textures are shared by
// every walnut material and are never disposed.

import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
} from "three";
import type { MaterialQuality } from "../materials";
import { VENEER_TILE_U, VENEER_TILE_V, generateVeneerData, type VeneerData } from "./veneerGen";
import type { VeneerJob, VeneerJobResult } from "./veneerWorker";

export { VENEER_TILE_U, VENEER_TILE_V };

interface VeneerSet {
  map: DataTexture;
  normalMap: DataTexture;
  orm: DataTexture;
  /** Texture clones that must be re-flagged when the data lands. */
  dependents: Set<Texture>;
  ready: boolean;
}

const cache = new Map<number, VeneerSet>();

function makeTex(data: Uint8Array<ArrayBuffer>, w: number, h: number, srgb: boolean): DataTexture {
  const t = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType);
  t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** Full-size placeholder: mean walnut colour, flat normal, satin roughness,
 *  so the swap to real data never changes texture dimensions. */
function placeholder(w: number, h: number): VeneerData {
  const n = w * h * 4;
  const albedo = new Uint8Array(n);
  const normal = new Uint8Array(n);
  const orm = new Uint8Array(n);
  for (let o = 0; o < n; o += 4) {
    albedo[o] = 84;
    albedo[o + 1] = 57;
    albedo[o + 2] = 41;
    albedo[o + 3] = 255;
    normal[o] = 128;
    normal[o + 1] = 128;
    normal[o + 2] = 255;
    normal[o + 3] = 255;
    orm[o] = 255;
    orm[o + 1] = 107;
    orm[o + 2] = 0;
    orm[o + 3] = 255;
  }
  return { albedo, normal, orm };
}

function commit(set: VeneerSet, d: VeneerData) {
  (set.map.image.data as Uint8Array).set(d.albedo);
  (set.normalMap.image.data as Uint8Array).set(d.normal);
  (set.orm.image.data as Uint8Array).set(d.orm);
  set.map.needsUpdate = true;
  set.normalMap.needsUpdate = true;
  set.orm.needsUpdate = true;
  for (const t of set.dependents) t.needsUpdate = true;
  set.dependents.clear();
  set.ready = true;
}

function requestData(set: VeneerSet, w: number, h: number) {
  const fallback = () => commit(set, generateVeneerData(w, h));
  if (typeof Worker === "undefined") {
    fallback();
    return;
  }
  try {
    const worker = new Worker(new URL("./veneerWorker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<VeneerJobResult>) => {
      commit(set, e.data);
      if (import.meta.env.DEV) console.info(`[workspace] walnut veneer ${w}×${h} generated in ${e.data.ms.toFixed(1)} ms (worker)`);
      worker.terminate();
    };
    worker.onerror = () => {
      worker.terminate();
      fallback();
    };
    const job: VeneerJob = { w, h };
    worker.postMessage(job);
  } catch {
    fallback();
  }
}

function getVeneer(q: MaterialQuality): VeneerSet {
  const w = q.textureSize >= 512 ? 2048 : 1024;
  let set = cache.get(w);
  if (!set) {
    const h = w / 4;
    const p = placeholder(w, h);
    set = {
      map: makeTex(p.albedo, w, h, true),
      normalMap: makeTex(p.normal, w, h, false),
      orm: makeTex(p.orm, w, h, false),
      dependents: new Set(),
      ready: false,
    };
    cache.set(w, set);
    requestData(set, w, h);
  }
  return set;
}

export interface VeneerOptions {
  /** Texture repeat (default: UVs in metres → [1/4, 1/1]). */
  readonly repeat?: readonly [number, number];
  readonly offset?: readonly [number, number];
  readonly clearcoat?: number;
  readonly envMapIntensity?: number;
}

/**
 * Walnut panel material. Texture clones share the cached image data; dispose
 * the material with disposeMaterial() as usual (it owns only the clones'
 * uniforms, never the shared image).
 */
export function createWalnut(q: MaterialQuality, o: VeneerOptions = {}): MeshStandardMaterial | MeshPhysicalMaterial {
  const set = getVeneer(q);
  const repeat = o.repeat ?? [1 / VENEER_TILE_U, 1 / VENEER_TILE_V];
  const clone = (t: DataTexture) => {
    const c = t.clone();
    c.repeat.set(repeat[0], repeat[1]);
    if (o.offset) c.offset.set(o.offset[0], o.offset[1]);
    c.anisotropy = q.anisotropy;
    c.needsUpdate = true;
    if (!set.ready) set.dependents.add(c);
    return c;
  };
  const map = clone(set.map);
  const normalMap = clone(set.normalMap);
  const orm = clone(set.orm);
  const params = {
    color: "#ffffff",
    map,
    normalMap,
    roughnessMap: orm,
    roughness: 1,
    metalness: 0,
    envMapIntensity: o.envMapIntensity ?? 0.9,
  };
  const cc = o.clearcoat ?? 0.25;
  const mat =
    q.config.physicalMaterials && q.config.clearcoat && cc > 0
      ? new MeshPhysicalMaterial({ ...params, clearcoat: cc, clearcoatRoughness: 0.32 })
      : new MeshStandardMaterial(params);
  // Low: at grazing angles the env reflection otherwise breaks into grey streaks.
  const ns = 0.18 * q.config.normalStrength;
  mat.normalScale.set(ns, ns);
  mat.name = "walnutVeneer";
  // Same contract as the factories: disposeMaterial() disposes these clones
  // (texture.dispose() on a clone only releases its GPU upload of the shared
  // image, which three re-uploads if another clone is still in use).
  mat.userData.ownedTextures = { dispose: () => [map, normalMap, orm].forEach((t) => t.dispose()) };
  return mat;
}

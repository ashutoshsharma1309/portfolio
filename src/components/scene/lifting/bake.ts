// Static batching: every non-moving part of the lifting corner is described
// as (geometry, transforms, material key) and baked into ONE merged geometry
// per material, so the whole rack/bar/bench/dumbbell set costs ~15 draw calls
// instead of ~50. The worn-metal shader works in world space, so merging
// does not change how wear/rust land.

import type { BufferGeometry, Matrix4 } from "three";
import { merge } from "./geometry";
import type { LiftingMaterials } from "./materials";

export type MatKey = keyof LiftingMaterials;

export interface Part {
  key: MatKey;
  geometry: BufferGeometry;
  /** Rack-local transforms; one copy of the geometry per matrix. */
  matrices: readonly Matrix4[];
}

export type Baked = Partial<Record<MatKey, BufferGeometry>>;

/** Merge parts by material key. Source geometries are disposed. */
export function bakeParts(parts: readonly Part[]): Baked {
  const byKey = new Map<MatKey, BufferGeometry[]>();
  const sources = new Set<BufferGeometry>();
  for (const p of parts) {
    sources.add(p.geometry);
    const list = byKey.get(p.key) ?? [];
    for (const m of p.matrices) list.push(p.geometry.clone().applyMatrix4(m));
    byKey.set(p.key, list);
  }
  const out: Baked = {};
  for (const [key, list] of byKey) {
    const g = merge(list);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    out[key] = g;
  }
  sources.forEach((g) => g.dispose());
  return out;
}

/** Pre-multiply a group transform into every part (e.g. the bench). */
export function inGroup(group: Matrix4, parts: Part[]): Part[] {
  return parts.map((p) => ({ ...p, matrices: p.matrices.map((m) => group.clone().multiply(m)) }));
}

// Decor material helpers built on decor textures (see decorTextures.ts).
import { Color, MeshPhysicalMaterial, MeshStandardMaterial, type ColorRepresentation } from "three";
import type { MaterialQuality } from "../materials";
import type { DecorTextureSet } from "./decorTextures";

/** Oiled/lacquered walnut veneer. UVs must be in metres. High tier adds a
 *  thin satin clearcoat. Owns no textures (shared set) — plain dispose(). */
export function createWalnut(
  q: MaterialQuality,
  set: DecorTextureSet,
  o: { color?: ColorRepresentation; clearcoat?: number; envMapIntensity?: number } = {},
): MeshStandardMaterial {
  const params = {
    color: new Color(o.color ?? "#ffffff"),
    map: set.map ?? null,
    roughnessMap: set.roughnessMap ?? null,
    normalMap: set.normalMap ?? null,
    roughness: 1,
    metalness: 0,
    envMapIntensity: o.envMapIntensity ?? 0.9,
  };
  const mat =
    q.config.physicalMaterials && q.config.clearcoat
      ? new MeshPhysicalMaterial({ ...params, clearcoat: o.clearcoat ?? 0.25, clearcoatRoughness: 0.3 })
      : new MeshStandardMaterial(params);
  const ns = 0.6 * q.config.normalStrength;
  mat.normalScale.set(ns, ns);
  return mat;
}

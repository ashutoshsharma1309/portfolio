// Pre-tuned PBR material factories. Every factory is a pure function of
// (quality, options): call it inside useMemo (or useDisposable) and dispose the
// result on unmount with disposeMaterial(). The shared texture cache is never
// disposed by these helpers — only the per-material texture clones are.

import {
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type ColorRepresentation,
  type Material,
} from "three";
import type { RoomQualityState } from "../quality/context";
import { createTextureSet, roughnessScaleFor, type OwnedTextureSet, type TextureKind } from "./textures";
import {
  WORN_METAL_PRESETS,
  createWornMetal,
  type WornMetalMaterial,
  type WornMetalOptions,
  type WornMetalPresetName,
} from "./wornMetal";

/** What the factories need from useRoomQuality(). Passing the whole state
 *  object is fine (and the natural useMemo dependency). */
export type MaterialQuality = Pick<RoomQualityState, "config" | "textureSize" | "anisotropy">;

export type PbrMaterial = MeshStandardMaterial | MeshPhysicalMaterial;

export interface SurfaceOptions {
  /** Physical size (m) of the surface along U and V. Sets texture repeat so
   *  the pattern has real-world scale. Ignored when `repeat` is given. */
  readonly widthM?: number;
  readonly heightM?: number;
  readonly repeat?: readonly [number, number];
  readonly offset?: readonly [number, number];
  /** UV rotation (radians), e.g. Math.PI / 2 to run boards along U. */
  readonly rotation?: number;
  /** Pattern variant. */
  readonly seed?: number;
  /** Multiplies the texture albedo (tint for the near-white kinds). */
  readonly color?: ColorRepresentation;
  /** Desired MEAN roughness; the baked roughness map is rescaled to it. */
  readonly roughness?: number;
  readonly envMapIntensity?: number;
  /** Multiplier on the factory's default normal strength. */
  readonly normalScale?: number;
  readonly aoMapIntensity?: number;
}

interface BuildExtras {
  readonly defaultColor: ColorRepresentation;
  readonly defaultRoughness: number;
  readonly defaultNormal: number;
  readonly defaultEnv: number;
  readonly metalness?: number;
  /** Physical-only parameters (applied when the tier allows physical). */
  readonly physical?: (opts: SurfaceOptions, q: MaterialQuality) => Partial<MeshPhysicalMaterial> | null;
}

function build(kind: TextureKind, q: MaterialQuality, o: SurfaceOptions, x: BuildExtras): PbrMaterial {
  const set = createTextureSet(kind, {
    size: q.textureSize,
    anisotropy: q.anisotropy,
    widthM: o.widthM,
    heightM: o.heightM,
    repeat: o.repeat,
    offset: o.offset,
    rotation: o.rotation,
    seed: o.seed,
  });
  const physicalParams = q.config.physicalMaterials && x.physical ? x.physical(o, q) : null;
  const params = {
    color: new Color(o.color ?? x.defaultColor),
    map: set.map,
    normalMap: set.normalMap,
    roughnessMap: set.roughnessMap,
    roughness: roughnessScaleFor(kind, o.roughness ?? x.defaultRoughness),
    metalnessMap: set.metalnessMap,
    metalness: x.metalness ?? (set.info.metallic ? 1 : 0),
    aoMap: set.aoMap,
    aoMapIntensity: o.aoMapIntensity ?? 1,
    envMapIntensity: o.envMapIntensity ?? x.defaultEnv,
  };
  const mat: PbrMaterial = physicalParams
    ? Object.assign(new MeshPhysicalMaterial(params), physicalParams)
    : new MeshStandardMaterial(params);
  const ns = (o.normalScale ?? 1) * x.defaultNormal * q.config.normalStrength;
  mat.normalScale.set(ns, ns);
  mat.name = kind;
  mat.userData.ownedTextures = set;
  return mat;
}

/** Dispose a material made by these factories (or any material) plus the
 *  texture clones it owns. Never touches the shared texture cache. */
export function disposeMaterial(mat: Material | null | undefined): void {
  if (!mat) return;
  (mat.userData.ownedTextures as OwnedTextureSet | undefined)?.dispose();
  mat.dispose();
}

// ---------------------------------------------------------------------------

/** Oak floor boards / desk tops. Boards run along V; widthM/heightM = surface
 *  size in meters. Tint darker for walnut (e.g. color "#8a6a55"). High tier
 *  adds a thin satin clearcoat (polyurethane finish). */
export function createWood(q: MaterialQuality, o: SurfaceOptions & { readonly clearcoat?: number } = {}) {
  return build("woodPlanks", q, o, {
    defaultColor: "#ffffff",
    defaultRoughness: 0.5,
    defaultNormal: 1,
    defaultEnv: 0.9,
    physical: (_opts, qq) =>
      qq.config.clearcoat && (o.clearcoat ?? 0.18) > 0
        ? { clearcoat: o.clearcoat ?? 0.18, clearcoatRoughness: 0.32 }
        : null,
  });
}

/** Matte painted plaster wall. Use widthM = wall width, heightM = wall height
 *  so the scuff band lands at the skirting (UV v = 0 must be the floor edge). */
export function createPlaster(q: MaterialQuality, o: SurfaceOptions = {}) {
  return build("paintedPlaster", q, o, {
    defaultColor: "#e6dfd3",
    defaultRoughness: 0.88,
    defaultNormal: 1,
    defaultEnv: 0.8,
  });
}

/** EPDM-speckled gym rubber flooring (1 m tiles). */
export function createRubber(q: MaterialQuality, o: SurfaceOptions = {}) {
  return build("rubberMat", q, o, {
    defaultColor: "#ffffff",
    defaultRoughness: 0.88,
    defaultNormal: 1,
    defaultEnv: 0.6,
  });
}

/** Pebbled synthetic leather (bench pads, chair seat). */
export function createLeather(q: MaterialQuality, o: SurfaceOptions = {}) {
  return build("syntheticLeather", q, o, {
    defaultColor: "#161616",
    defaultRoughness: 0.6,
    defaultNormal: 1,
    defaultEnv: 0.9,
    physical: (_o, qq) => (qq.config.clearcoat ? { clearcoat: 0.12, clearcoatRoughness: 0.55 } : null),
  });
}

/** Woven upholstery / rug / beanbag. High tier adds a sheen lobe. */
export function createFabric(q: MaterialQuality, o: SurfaceOptions & { readonly sheen?: number } = {}) {
  return build("fabricWeave", q, o, {
    defaultColor: "#808080",
    defaultRoughness: 0.93,
    defaultNormal: 1,
    defaultEnv: 0.7,
    physical: () => {
      const sheen = o.sheen ?? 1;
      if (sheen <= 0) return null;
      const c = new Color(o.color ?? "#808080");
      return {
        sheen,
        sheenRoughness: 0.75,
        sheenColor: c.clone().lerp(new Color(1, 1, 1), 0.35),
      };
    },
  });
}

/** Brushed steel sheet / tube without wear (desk frame, monitor arm). Streaks
 *  run along U. For gym steel with wear use createWornMetalMaterial. */
export function createBrushedSteel(q: MaterialQuality, o: SurfaceOptions = {}) {
  return build("brushedSteel", q, o, {
    defaultColor: "#d9dbde",
    defaultRoughness: 0.32,
    defaultNormal: 1,
    defaultEnv: 1,
  });
}

/** Clean powder-coated metal (desk legs, monitor stands, shelf brackets). */
export function createPowderCoat(q: MaterialQuality, o: SurfaceOptions = {}) {
  return build("powderCoat", q, o, {
    defaultColor: "#1e1f22",
    defaultRoughness: 0.5,
    defaultNormal: 1,
    defaultEnv: 1,
    physical: (_o, qq) => (qq.config.clearcoat ? { clearcoat: 0.25, clearcoatRoughness: 0.45 } : null),
  });
}

/** Knurled bar grip. U runs around the bar, V along it: pass circumferenceM
 *  (2πr) and lengthM of the knurled section. */
export function createKnurledSteel(
  q: MaterialQuality,
  o: Omit<SurfaceOptions, "widthM" | "heightM"> & { readonly circumferenceM: number; readonly lengthM: number },
) {
  return build("knurling", q, { ...o, widthM: o.circumferenceM, heightM: o.lengthM }, {
    defaultColor: "#c9cbce",
    defaultRoughness: 0.42,
    defaultNormal: 1,
    defaultEnv: 1,
  });
}

/** Molded plastic (keyboard, mouse, monitor bezels, plant pots). */
export function createPlastic(q: MaterialQuality, o: SurfaceOptions = {}) {
  return build("microSurface", q, o, {
    defaultColor: "#202022",
    defaultRoughness: 0.45,
    defaultNormal: 1,
    defaultEnv: 0.9,
  });
}

/** Glazed ceramic (mugs, pots). High tier: clearcoat glaze. */
export function createCeramic(q: MaterialQuality, o: SurfaceOptions = {}) {
  return build("microSurface", q, o, {
    defaultColor: "#f2efe9",
    defaultRoughness: 0.35,
    defaultNormal: 0.5,
    defaultEnv: 1,
    physical: (_o, qq) => (qq.config.clearcoat ? { clearcoat: 0.8, clearcoatRoughness: 0.08 } : null),
  });
}

/** Worn metal from a preset (+ overrides). See wornMetal.ts. */
export function createWornMetalMaterial(
  q: MaterialQuality,
  preset: WornMetalPresetName,
  overrides: WornMetalOptions = {},
): WornMetalMaterial {
  return createWornMetal({ ...WORN_METAL_PRESETS[preset], ...overrides }, q.config);
}

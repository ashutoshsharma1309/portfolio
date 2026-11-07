// Worn metal material: MeshStandardMaterial / MeshPhysicalMaterial with
// procedural WORLD-SPACE wear injected via onBeforeCompile. No UVs needed, so
// it works on any primitive (boxes, cylinders, instanced meshes) and the
// pattern stays continuous across separate meshes of one object (rack posts,
// crossbars, J-hooks all share one rust field).
//
// Layers (all subtle by default — used gym equipment, not abandoned):
//   1. base coat   = material.color / roughness / metalness (paint or metal)
//   2. edge wear   = noisy patches (+ near hotspots) exposing bare steel:
//                    darker, metallic, smoother
//   3. rust        = brown/dark oxide patches whose probability rises below
//                    `rustHeight` (world Y) and near `hotspots` (joints/bolts)
//   4. scratches   = thin anisotropic lines modulating roughness (+ a little
//                    bare metal showing through)
//   5. (optional) derivative bump on rust pits / scratches

import {
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector2,
  Vector3,
  Vector4,
  type ColorRepresentation,
  type Texture,
  type Vector3Tuple,
  type WebGLProgramParametersWithUniforms,
} from "three";
import type { RoomQualityConfig } from "../quality/config";

export const WORN_MAX_HOTSPOTS = 8;

export interface WornMetalHotspot {
  /** World-space position (e.g. a bolt, weld, J-hook contact point). */
  readonly position: Vector3Tuple;
  /** Influence radius in meters. Default: WornMetalOptions.hotspotRadius. */
  readonly radius?: number;
}

export interface WornMetalOptions {
  /** Base coat color (paint / powder coat / metal tint). */
  readonly color?: ColorRepresentation;
  /** Base coat roughness. */
  readonly roughness?: number;
  /** Base coat metalness (0 for paint, 1 for bare metal / chrome). */
  readonly metalness?: number;
  /** Color of exposed steel in worn areas. */
  readonly bareColor?: ColorRepresentation;
  /** Roughness of exposed steel. */
  readonly bareRoughness?: number;
  /** Metalness of exposed steel. */
  readonly bareMetalness?: number;
  /** Rust tones (light / dark oxide). */
  readonly rustColor?: ColorRepresentation;
  readonly rustDarkColor?: ColorRepresentation;
  /** 0..1 amount of edge-wear chips (0.45 ≈ used gym rack, 0.9 = heavily
   *  abused). Default 0.35. */
  readonly wear?: number;
  /** 0..1 overall rust amount (0.3 ≈ a few small spots near the floor and
   *  joints, 0.9 = neglected). Default 0.2. */
  readonly rust?: number;
  /** World Y (m) below which rust probability rises. Default 0.3. */
  readonly rustHeight?: number;
  /** Fade distance (m) above rustHeight. Default 0.45. */
  readonly rustFalloff?: number;
  /** Up to 8 world-space points where wear + rust concentrate. */
  readonly hotspots?: readonly (WornMetalHotspot | Vector3Tuple)[];
  /** Default hotspot radius in meters. Default 0.12. */
  readonly hotspotRadius?: number;
  /** 0..1 density/visibility of micro-scratches. Default 0.5. */
  readonly scratches?: number;
  /** Roughness delta inside scratches (negative = burnished/shinier, positive
   *  = duller). Default -0.12. */
  readonly scratchRoughness?: number;
  /** World-space frequency multiplier for all noise (1 = tuned for meter-scale
   *  gym equipment). */
  readonly noiseScale?: number;
  /** Pattern seed; change it so two identical objects don't wear identically. */
  readonly seed?: number;
  /** Bump strength for rust pits / scratches. Default 1. Ignored when the
   *  tier disables wornMetalBump. */
  readonly bump?: number;
  /** 'world' (default) or 'object': use object space for meshes that move
   *  (otherwise the pattern swims as they animate). */
  readonly space?: "world" | "object";
  /** Use MeshPhysicalMaterial clearcoat (powder coat / lacquer). Only applied
   *  when the quality tier allows clearcoat. 0 = off. */
  readonly clearcoat?: number;
  readonly clearcoatRoughness?: number;
  readonly envMapIntensity?: number;
  /** Optional UV textures layered under the procedural wear (e.g. a
   *  powderCoat or knurling set from createTextureSet()). */
  readonly map?: Texture | null;
  readonly normalMap?: Texture | null;
  readonly normalScale?: number;
  readonly roughnessMap?: Texture | null;
  readonly metalnessMap?: Texture | null;
  readonly aoMap?: Texture | null;
}

export type WornMetalMaterial = MeshStandardMaterial | MeshPhysicalMaterial;

interface WornUniforms {
  uWornBare: { value: Color };
  uWornRust: { value: Color };
  uWornRustDark: { value: Color };
  /** x wear, y rust, z scratches, w noiseScale */
  uWornAmount: { value: Vector4 };
  /** x rustHeight, y rustFalloff */
  uWornRustHeight: { value: Vector2 };
  /** x bareRoughness, y bareMetalness, z scratchRoughness, w bump */
  uWornBareRM: { value: Vector4 };
  uWornSeed: { value: Vector3 };
  uWornHotspots: { value: Vector4[] };
  uWornHotspotCount: { value: number };
}

const SHADER_VERSION = 1;

const NOISE_GLSL = /* glsl */ `
varying vec3 vWornPos;
uniform vec3 uWornBare;
uniform vec3 uWornRust;
uniform vec3 uWornRustDark;
uniform vec4 uWornAmount;
uniform vec2 uWornRustHeight;
uniform vec4 uWornBareRM;
uniform vec3 uWornSeed;
uniform vec4 uWornHotspots[${WORN_MAX_HOTSPOTS}];
uniform int uWornHotspotCount;

float wornHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float wornNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = wornHash(i);
  float b = wornHash(i + vec3(1.0, 0.0, 0.0));
  float c = wornHash(i + vec3(0.0, 1.0, 0.0));
  float d = wornHash(i + vec3(1.0, 1.0, 0.0));
  float e = wornHash(i + vec3(0.0, 0.0, 1.0));
  float g = wornHash(i + vec3(1.0, 0.0, 1.0));
  float h = wornHash(i + vec3(0.0, 1.0, 1.0));
  float k = wornHash(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}
float wornFbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int o = 0; o < 4; o++) {
    s += a * wornNoise(p);
    p = p * 2.03 + vec3(17.1, 9.2, 4.7);
    a *= 0.5;
  }
  // Value-noise fBm clusters tightly around 0.5; stretch it to ~[0,1].
  return clamp((s / 0.9375 - 0.5) * 2.2 + 0.5, 0.0, 1.0);
}
// One random straight scratch per unit cell (present with probability
// "density"). Branch-free so fwidth() stays well-defined across the quad.
// Returns 0..1 line coverage, faded toward 35% once the line is sub-pixel so
// distant surfaces get a faint roughness mottle instead of aliasing.
float wornScratchLayer(vec3 p, float density) {
  vec3 cell = floor(p);
  vec3 f = p - cell;
  vec3 c = vec3(wornHash(cell + 1.1), wornHash(cell + 2.3), wornHash(cell + 3.7));
  vec3 dir = normalize(vec3(wornHash(cell + 4.1), wornHash(cell + 5.3), wornHash(cell + 6.7)) - 0.5 + 1e-3);
  vec3 d = f - c;
  float t = dot(d, dir);
  float halfLen = 0.2 + 0.35 * wornHash(cell + 7.9);
  float dist = length(d - dir * t);
  float along = 1.0 - smoothstep(halfLen * 0.6, halfLen, abs(t));
  float w = 0.012;
  float aa = fwidth(dist) + 1e-4;
  float line = 1.0 - smoothstep(w, w + aa, dist);
  float present = step(wornHash(cell + 0.37), density);
  return present * line * along * mix(0.35, 1.0, clamp(w / aa, 0.0, 1.0));
}
`;

const BUMP_GLSL = /* glsl */ `
vec3 wornPerturbNormal(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = normalize(dFdx(surfPos));
  vec3 sy = normalize(dFdy(surfPos));
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`;

function vertexPosGlsl(space: "world" | "object") {
  return /* glsl */ `
  vec4 wornP = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    wornP = batchingMatrix * wornP;
  #endif
  #ifdef USE_INSTANCING
    wornP = instanceMatrix * wornP;
  #endif
  ${space === "world" ? "wornP = modelMatrix * wornP;" : ""}
  vWornPos = wornP.xyz;
`;
}

const MASKS_GLSL = /* glsl */ `
  vec3 wornWp = vWornPos * uWornAmount.w + uWornSeed;
  float wnBig = wornFbm(wornWp * 1.6);
  float wnMid = wornNoise(wornWp * 9.0);
  float wnFine = wornNoise(wornWp * 37.0);

  float wHot = 0.0;
  for (int k = 0; k < ${WORN_MAX_HOTSPOTS}; k++) {
    if (k >= uWornHotspotCount) break;
    vec4 hs = uWornHotspots[k];
    wHot = max(wHot, 1.0 - smoothstep(hs.w * 0.25, hs.w, distance(vWornPos, hs.xyz)));
  }
  float wFloor = 1.0 - smoothstep(uWornRustHeight.x, uWornRustHeight.x + uWornRustHeight.y, vWornPos.y);

  // Edge-wear chips: small jagged islands (mid + fine noise) that cluster
  // where the low-frequency field is high and around hotspots.
  float wornCluster = smoothstep(0.35, 0.85, wnBig);
  float wornChips = (wnMid * 0.65 + wnFine * 0.35) * (0.55 + 0.45 * wornCluster) + wHot * 0.3;
  float wornWearT = 0.82 - uWornAmount.x * 0.32;
  float wornWear = smoothstep(wornWearT, wornWearT + 0.04, wornChips) * step(0.001, uWornAmount.x);

  // Rust: rises toward the floor and around hotspots.
  float wornRustDrive = clamp(uWornAmount.y * (0.2 + 0.8 * max(wFloor, wHot)), 0.0, 1.0);
  float wornRustField = wornFbm(wornWp * 4.3 + 3.7) * 0.75 + wnMid * 0.25;
  float wornRustT = 0.9 - wornRustDrive * 0.4;
  float wornRust = smoothstep(wornRustT, wornRustT + 0.12, wornRustField) * step(0.001, uWornAmount.y);

  // Micro-scratches: short straight segments, one candidate per lattice cell
  // (two scales), clustered by a low-frequency mask.
  float wornSMask = smoothstep(0.4, 0.75, wornNoise(wornWp * 2.7 + 5.0));
  float wornScratch = max(wornScratchLayer(wornWp * 22.0, 0.55), wornScratchLayer(wornWp * 57.0 + 13.0, 0.45) * 0.7);
  wornScratch *= wornSMask * uWornAmount.z;

  vec3 wornBareCol = uWornBare * (0.85 + 0.3 * wnMid);
  vec3 wornRustCol = mix(uWornRustDark, uWornRust, smoothstep(0.2, 0.8, wnFine * 0.6 + wnMid * 0.4));
  vec3 wornBase = diffuseColor.rgb;
  wornBase = mix(wornBase, wornBareCol, wornWear);
  wornBase = mix(wornBase, mix(wornBase, wornBareCol, 0.55), wornScratch * (1.0 - wornWear));
  wornBase = mix(wornBase, wornRustCol, wornRust);
  diffuseColor.rgb = wornBase;
  float wornMetalMix = clamp(wornWear + wornScratch * 0.35, 0.0, 1.0) * (1.0 - wornRust);
`;

const ROUGHNESS_GLSL = /* glsl */ `
  roughnessFactor = mix(roughnessFactor, uWornBareRM.x, wornMetalMix);
  roughnessFactor += wornScratch * uWornBareRM.z * (1.0 - wornRust);
  roughnessFactor = mix(roughnessFactor, 0.78 + 0.18 * wnFine, wornRust);
  roughnessFactor = clamp(roughnessFactor, 0.04, 1.0);
`;

const METALNESS_GLSL = /* glsl */ `
  metalnessFactor = mix(metalnessFactor, uWornBareRM.y, wornMetalMix);
  metalnessFactor = mix(metalnessFactor, 0.0, wornRust);
`;

const NORMAL_GLSL = /* glsl */ `
  {
    float wornH = wornRust * (0.5 + 0.5 * wnFine) - wornScratch * 0.6 - wornWear * 0.25;
    vec2 wdH = vec2(dFdx(wornH), dFdy(wornH)) * uWornBareRM.w;
    normal = wornPerturbNormal(-vViewPosition, normal, wdH, faceDirection);
  }
`;

function toVec4(h: WornMetalHotspot | Vector3Tuple, defRadius: number): Vector4 {
  if (Array.isArray(h)) return new Vector4(h[0], h[1], h[2], defRadius);
  const p = (h as WornMetalHotspot).position;
  return new Vector4(p[0], p[1], p[2], (h as WornMetalHotspot).radius ?? defRadius);
}

/** Quality knobs the factory needs (pass useRoomQuality().config). */
export type WornMetalQuality = Pick<RoomQualityConfig, "physicalMaterials" | "clearcoat" | "wornMetalBump" | "normalStrength">;

/**
 * Create a worn-metal material. Pure function of (options, quality): call it
 * in useMemo and dispose() the material on unmount (see useDisposable).
 */
export function createWornMetal(options: WornMetalOptions, quality: WornMetalQuality): WornMetalMaterial {
  const o = options;
  const wantClearcoat = (o.clearcoat ?? 0) > 0 && quality.physicalMaterials && quality.clearcoat;
  const common = {
    color: new Color(o.color ?? "#1c1d1f"),
    roughness: o.roughness ?? 0.55,
    metalness: o.metalness ?? 0,
    envMapIntensity: o.envMapIntensity ?? 1,
    map: o.map ?? null,
    normalMap: o.normalMap ?? null,
    roughnessMap: o.roughnessMap ?? null,
    metalnessMap: o.metalnessMap ?? null,
    aoMap: o.aoMap ?? null,
  };
  const mat: WornMetalMaterial = wantClearcoat
    ? new MeshPhysicalMaterial({
        ...common,
        clearcoat: o.clearcoat ?? 0,
        clearcoatRoughness: o.clearcoatRoughness ?? 0.35,
      })
    : new MeshStandardMaterial(common);
  if (o.normalMap) {
    const s = (o.normalScale ?? 1) * quality.normalStrength;
    mat.normalScale.set(s, s);
  }

  const hotspots = (o.hotspots ?? []).slice(0, WORN_MAX_HOTSPOTS).map((h) => toVec4(h, o.hotspotRadius ?? 0.12));
  const padded = hotspots.concat(
    Array.from({ length: WORN_MAX_HOTSPOTS - hotspots.length }, () => new Vector4(0, -1000, 0, 0)),
  );
  const seed = o.seed ?? 1;
  const uniforms: WornUniforms = {
    uWornBare: { value: new Color(o.bareColor ?? "#8a8c8f") },
    uWornRust: { value: new Color(o.rustColor ?? "#7a4a2a") },
    uWornRustDark: { value: new Color(o.rustDarkColor ?? "#3a2418") },
    uWornAmount: {
      value: new Vector4(o.wear ?? 0.35, o.rust ?? 0.2, o.scratches ?? 0.5, o.noiseScale ?? 1),
    },
    uWornRustHeight: { value: new Vector2(o.rustHeight ?? 0.3, o.rustFalloff ?? 0.45) },
    uWornBareRM: {
      value: new Vector4(
        o.bareRoughness ?? 0.32,
        o.bareMetalness ?? 1,
        o.scratchRoughness ?? -0.12,
        (o.bump ?? 1) * quality.normalStrength,
      ),
    },
    uWornSeed: { value: new Vector3(seed * 17.31, seed * 7.13, seed * 3.77) },
    uWornHotspots: { value: padded },
    uWornHotspotCount: { value: hotspots.length },
  };

  const space = o.space ?? "world";
  const bump = quality.wornMetalBump && (o.bump ?? 1) > 0;

  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWornPos;")
      .replace("#include <project_vertex>", `#include <project_vertex>\n${vertexPosGlsl(space)}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${NOISE_GLSL}\n${bump ? BUMP_GLSL : ""}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${MASKS_GLSL}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n${ROUGHNESS_GLSL}`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>\n${METALNESS_GLSL}`)
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>\n${bump ? NORMAL_GLSL : ""}`,
      );
  };
  // The generated source depends only on these structural switches; every
  // numeric option is a uniform, so equal keys really do share one program
  // and different structures never collide.
  const cacheKey = `worn-metal:v${SHADER_VERSION}:${space}:${bump ? "bump" : "flat"}`;
  mat.customProgramCacheKey = () => cacheKey;
  mat.userData.wornUniforms = uniforms;
  mat.name = "WornMetal";
  return mat;
}

/** Access a worn-metal material's live uniforms (e.g. to animate rust). */
export function getWornUniforms(mat: WornMetalMaterial): WornUniforms | undefined {
  return mat.userData.wornUniforms as WornUniforms | undefined;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** Rack uprights / crossmembers / J-hook bodies: satin black powder coat with
 *  chipped edges, a little rust near the floor and at joints. */
export const darkPowderCoat: WornMetalOptions = {
  color: "#16171a",
  roughness: 0.5,
  metalness: 0,
  bareColor: "#7d8085",
  bareRoughness: 0.34,
  bareMetalness: 1,
  wear: 0.45,
  rust: 0.3,
  rustHeight: 0.25,
  rustFalloff: 0.4,
  scratches: 0.55,
  scratchRoughness: -0.14,
  clearcoat: 0.35,
  clearcoatRoughness: 0.45,
  bump: 1,
};

/** Barbell shaft / sleeves: brushed bare steel; scratches dull it slightly,
 *  faint surface rust only near hotspots (pass the knurl/sleeve joints). */
export const brushedSteelPreset: WornMetalOptions = {
  color: "#b9bcc0",
  roughness: 0.3,
  metalness: 1,
  bareColor: "#9a9da2",
  bareRoughness: 0.38,
  bareMetalness: 1,
  wear: 0,
  rust: 0.06,
  rustHeight: -1,
  rustFalloff: 0.01,
  scratches: 0.6,
  scratchRoughness: 0.12,
  bump: 0.6,
};

/** Collars, chrome dumbbell handles: polished chrome, light hairline scratches. */
export const chromePreset: WornMetalOptions = {
  color: "#e4e6e9",
  roughness: 0.1,
  metalness: 1,
  bareColor: "#c9ccd0",
  bareRoughness: 0.2,
  bareMetalness: 1,
  wear: 0,
  rust: 0,
  scratches: 0.35,
  scratchRoughness: 0.18,
  bump: 0.4,
};

/** Plate hubs / cast dumbbell heads: dark grey cast iron, matte, mottled with
 *  more pronounced (still restrained) oxidation. */
export const castIronPreset: WornMetalOptions = {
  color: "#3a3a3b",
  roughness: 0.62,
  metalness: 0.8,
  bareColor: "#6c6d70",
  bareRoughness: 0.42,
  bareMetalness: 1,
  wear: 0.25,
  rust: 0.28,
  rustHeight: 0.2,
  rustFalloff: 0.5,
  scratches: 0.3,
  scratchRoughness: -0.08,
  bump: 1,
};

export const WORN_METAL_PRESETS = {
  darkPowderCoat,
  brushedSteel: brushedSteelPreset,
  chrome: chromePreset,
  castIron: castIronPreset,
} as const;

export type WornMetalPresetName = keyof typeof WORN_METAL_PRESETS;

import type { WebGLRenderer } from "three";
import type { DeviceTier } from "../../../hooks/useDeviceTier";

/** Rendering quality tier for the /room scene. */
export type RoomQuality = "high" | "medium" | "low";

export const QUALITY_ORDER: readonly RoomQuality[] = ["low", "medium", "high"];

/** Per-tier rendering knobs. Every value is a plain number/boolean so the
 *  object can be used directly as a useMemo dependency. */
export interface RoomQualityConfig {
  readonly tier: RoomQuality;
  /** Edge length (px) of generated procedural textures. Power of two. */
  readonly textureSize: number;
  /** Directional-light shadow map edge length (px). */
  readonly shadowMapSize: number;
  /** Use MeshPhysicalMaterial where it buys something visible (clearcoat on
   *  powder coat / varnished wood, sheen on fabric). False → MeshStandard. */
  readonly physicalMaterials: boolean;
  /** Allow clearcoat lobes (only meaningful when physicalMaterials). */
  readonly clearcoat: boolean;
  /** Cube render-target resolution of the local (Lightformer) environment. */
  readonly envResolution: number;
  /** Upper bound for texture anisotropic filtering (clamped to the GPU max). */
  readonly maxAnisotropy: number;
  /** Device-pixel-ratio range handed to <Canvas dpr>. */
  readonly dpr: readonly [number, number];
  /** Resolution of the static contact-shadow render target. */
  readonly contactShadowResolution: number;
  /** Worn-metal shader: derivative-based bump on rust/scratches. */
  readonly wornMetalBump: boolean;
  /** Global multiplier applied to normalScale by the material factories. Low
   *  tier slightly flattens normals so minified high-frequency detail doesn't
   *  shimmer at small DPR. */
  readonly normalStrength: number;
}

export const QUALITY_CONFIGS: Readonly<Record<RoomQuality, RoomQualityConfig>> = {
  high: {
    tier: "high",
    textureSize: 512,
    shadowMapSize: 2048,
    physicalMaterials: true,
    clearcoat: true,
    envResolution: 256,
    maxAnisotropy: 8,
    dpr: [1, 2],
    contactShadowResolution: 1024,
    wornMetalBump: true,
    normalStrength: 1,
  },
  medium: {
    tier: "medium",
    textureSize: 512,
    shadowMapSize: 2048,
    physicalMaterials: false,
    clearcoat: false,
    envResolution: 128,
    maxAnisotropy: 4,
    dpr: [1, 1.5],
    contactShadowResolution: 512,
    wornMetalBump: true,
    normalStrength: 1,
  },
  low: {
    tier: "low",
    textureSize: 256,
    shadowMapSize: 1024,
    physicalMaterials: false,
    clearcoat: false,
    envResolution: 64,
    maxAnisotropy: 2,
    dpr: [1, 1.25],
    contactShadowResolution: 256,
    wornMetalBump: false,
    normalStrength: 0.8,
  },
};

export function stepDown(q: RoomQuality, steps = 1): RoomQuality {
  const i = QUALITY_ORDER.indexOf(q);
  return QUALITY_ORDER[Math.max(0, i - steps)];
}

export function deviceTierToQuality(tier: DeviceTier): RoomQuality {
  return tier === "mobile" ? "low" : tier === "tablet" ? "medium" : "high";
}

export interface RendererProbe {
  /** Unmasked renderer string (or the masked one when unavailable). */
  readonly renderer: string;
  /** True for CPU rasterizers (SwiftShader, llvmpipe, "Software", softpipe). */
  readonly software: boolean;
  /** navigator.hardwareConcurrency (0 when unknown). */
  readonly cores: number;
  /** GPU anisotropic filtering limit. */
  readonly gpuMaxAnisotropy: number;
}

export function probeRenderer(gl: WebGLRenderer): RendererProbe {
  let renderer = "";
  try {
    const ctx = gl.getContext();
    const ext = ctx.getExtension("WEBGL_debug_renderer_info");
    if (ext) renderer = String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "");
    if (!renderer) renderer = String(ctx.getParameter(ctx.RENDERER) ?? "");
  } catch {
    renderer = "";
  }
  const software = /swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(renderer);
  const cores =
    typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 0;
  return {
    renderer,
    software,
    cores,
    gpuMaxAnisotropy: gl.capabilities.getMaxAnisotropy(),
  };
}

/** Initial tier: device tier → quality, then one step down for software
 *  rasterizers or ≤4 logical cores (one step total, not cumulative). */
export function initialQuality(deviceTier: DeviceTier, probe: RendererProbe): RoomQuality {
  const base = deviceTierToQuality(deviceTier);
  const weak = probe.software || (probe.cores > 0 && probe.cores <= 4);
  return weak ? stepDown(base) : base;
}

/** `?quality=high|medium|low` pins the tier (and disables runtime
 *  downgrades). Intended for screenshots and debugging. */
export function readQualityOverride(): RoomQuality | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("quality");
  return v === "high" || v === "medium" || v === "low" ? v : null;
}

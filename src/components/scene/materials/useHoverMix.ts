import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type ColorRepresentation, type Material } from "three";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

/** Default hover tint: the site's warm gold, kept dim so it reads as a
 *  highlight, not a glow. */
export const HOVER_COLOR = new Color("#f4b942");
export const HOVER_MAX_INTENSITY = 0.22;

/**
 * Smoothly eases a 0..1 value toward `hovered ? 1 : 0` with frame-rate
 * independent exponential damping (`lambda` ≈ 1/time-constant; 12 → ~90%
 * of the way in ~0.19 s). Snaps instantly when the user prefers reduced
 * motion. Read `.current` inside your own useFrame — the hook never causes
 * React re-renders.
 */
export function useHoverMix(hovered: boolean, lambda = 12): MutableRefObject<number> {
  const mix = useRef(hovered ? 1 : 0);
  const reduced = usePrefersReducedMotion();
  useFrame((_, dt) => {
    const target = hovered ? 1 : 0;
    const cur = mix.current;
    if (cur === target) return;
    if (reduced) {
      mix.current = target;
      return;
    }
    const next = cur + (target - cur) * (1 - Math.exp(-lambda * Math.min(dt, 0.1)));
    mix.current = Math.abs(next - target) < 1e-3 ? target : next;
  });
  return mix;
}

interface HoverBase {
  color: Color;
  intensity: number;
  lastMix: number;
}

type EmissiveMaterial = Material & { emissive: Color; emissiveIntensity: number };

function hasEmissive(m: Material): m is EmissiveMaterial {
  return (m as Partial<EmissiveMaterial>).emissive instanceof Color;
}

const scratchColor = new Color();
const scratchHover = new Color();

/**
 * Drives an additive emissive highlight from a hover mix (0..1). The
 * material's own emissive (e.g. a screen) is captured on first call and kept:
 * result = baseEmissive·baseIntensity + color·mix·maxIntensity. Cheap to call
 * every frame — it skips materials whose mix hasn't changed.
 *
 * Do not use on materials whose emissive is animated elsewhere (pulsing rims);
 * highlight a sibling material instead.
 */
export function applyHoverEmissive(
  materials: Material | readonly (Material | null | undefined)[] | null | undefined,
  mix: number,
  color: ColorRepresentation = HOVER_COLOR,
  maxIntensity = HOVER_MAX_INTENSITY,
): void {
  if (!materials) return;
  const list = Array.isArray(materials) ? materials : [materials as Material];
  const hover = color instanceof Color ? color : scratchHover.set(color);
  for (const m of list) {
    if (!m || !hasEmissive(m)) continue;
    let base = m.userData.hoverBase as HoverBase | undefined;
    if (!base) {
      base = { color: m.emissive.clone(), intensity: m.emissiveIntensity, lastMix: -1 };
      m.userData.hoverBase = base;
    }
    if (base.lastMix === mix) continue;
    base.lastMix = mix;
    scratchColor.copy(base.color).multiplyScalar(base.intensity);
    scratchColor.r += hover.r * mix * maxIntensity;
    scratchColor.g += hover.g * mix * maxIntensity;
    scratchColor.b += hover.b * mix * maxIntensity;
    m.emissive.copy(scratchColor);
    m.emissiveIntensity = 1;
  }
}

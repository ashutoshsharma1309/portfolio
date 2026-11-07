// All materials for the lifting corner, built once per quality state and
// shared by every part (one worn powder-coat for the whole black frame, one
// for the red accents, etc.). Disposed by useDisposable on unmount.

import { useMemo } from "react";
import { Color, MeshStandardMaterial } from "three";
import {
  WORN_METAL_PRESETS,
  createBrushedSteel,
  createKnurledSteel,
  createLeather,
  createPlastic,
  createRubber,
  createWornMetal,
  createWornMetalMaterial,
  useDisposable,
  type MaterialQuality,
  type WornMetalHotspot,
} from "../materials";
import { useRoomQuality } from "../quality";
import {
  BAR_Y,
  BAR_Z,
  FOOT_TOP,
  FOOT_Z0,
  FOOT_Z1,
  FRONT_XM_Z,
  JHOOK_BENCH_Y,
  LOW_XM_Y,
  PLATFORM_RADIUS,
  TOP_XM_Y,
  TUBE,
  UPRIGHT_INNER,
  UPRIGHT_X,
  rackToWorld,
} from "./constants";

const hs = (p: [number, number, number], radius?: number): WornMetalHotspot => ({
  position: rackToWorld(p),
  radius,
});

function buildMaterials(q: MaterialQuality) {
  const dark = WORN_METAL_PRESETS.darkPowderCoat;

  // Black frame: uprights, crossmembers, feet, gussets, bench-height J-hooks,
  // bench frame. Wear + rust concentrate at bolted joints and the feet.
  const frame = createWornMetal(
    {
      ...dark,
      color: "#131416",
      roughness: 0.52,
      wear: 0.44,
      rust: 0.38,
      // Height rust kept to the last few cm above the feet; everything else
      // comes from the joint/bolt hotspots (no mid-span stains).
      rustHeight: 0.07,
      rustFalloff: 0.1,
      hotspotRadius: 0.11,
      hotspots: [
        hs([-UPRIGHT_X, JHOOK_BENCH_Y + 0.03, TUBE / 2 + 0.02], 0.1),
        hs([UPRIGHT_X, JHOOK_BENCH_Y + 0.03, TUBE / 2 + 0.02], 0.1),
        hs([-UPRIGHT_INNER, TOP_XM_Y, 0], 0.13),
        hs([UPRIGHT_INNER, TOP_XM_Y, 0], 0.13),
        hs([-UPRIGHT_X, FOOT_TOP + 0.02, 0.05], 0.09),
        hs([UPRIGHT_X, FOOT_TOP + 0.02, -0.05], 0.09),
        hs([-UPRIGHT_X - 0.05, 0.06, FOOT_Z1 - 0.06], 0.08),
        hs([UPRIGHT_X + 0.05, 0.06, FOOT_Z0 + 0.06], 0.08),
      ],
      seed: 3,
    },
    q.config,
  );

  // Red accent powder coat (squat J-hooks, lower crossmembers, bench legs).
  // Chips reveal dark primer/steel; a little rust where the bar bites.
  const accent = createWornMetal(
    {
      ...dark,
      color: "#9c1b15",
      roughness: 0.46,
      bareColor: "#6f7276",
      wear: 0.48,
      rust: 0.3,
      rustHeight: 0.06,
      rustFalloff: 0.08,
      hotspotRadius: 0.1,
      hotspots: [
        hs([-UPRIGHT_X, BAR_Y - 0.02, BAR_Z], 0.08),
        hs([UPRIGHT_X, BAR_Y - 0.02, BAR_Z], 0.08),
        hs([-UPRIGHT_INNER, LOW_XM_Y, 0], 0.12),
        hs([UPRIGHT_INNER, LOW_XM_Y, 0], 0.12),
        hs([-UPRIGHT_X, LOW_XM_Y + 0.05, FRONT_XM_Z], 0.12),
        hs([UPRIGHT_X, LOW_XM_Y + 0.05, FRONT_XM_Z], 0.12),
      ],
      seed: 7,
    },
    q.config,
  );

  // Zinc-plated hardware: rusts near the floor.
  const bolt = createWornMetal(
    {
      ...WORN_METAL_PRESETS.brushedSteel,
      color: "#a3a6aa",
      roughness: 0.42,
      rust: 0.55,
      rustHeight: 0.32,
      rustFalloff: 0.5,
      scratches: 0.3,
      noiseScale: 2.2,
      seed: 9,
    },
    q.config,
  );

  const uhmw = createPlastic(q, { color: "#1b1c1e", roughness: 0.66, widthM: 0.06, heightM: 0.07, seed: 4 });
  const caps = createPlastic(q, { color: "#0c0c0d", roughness: 0.5, widthM: 0.08, heightM: 0.08, seed: 5 });

  const holeDark = new MeshStandardMaterial({
    color: "#040404",
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const holeRim = new MeshStandardMaterial({
    color: "#6d7075",
    metalness: 1,
    roughness: 0.42,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  // Barbell ---------------------------------------------------------------
  const shaft = createWornMetalMaterial(q, "brushedSteel", {
    color: "#b4b7bb",
    roughness: 0.3,
    rust: 0.2,
    hotspots: [hs([-UPRIGHT_X, BAR_Y, BAR_Z], 0.05), hs([UPRIGHT_X, BAR_Y, BAR_Z], 0.05)],
    seed: 5,
  });
  // UVs of knurled meshes are pre-scaled to meters (u: 0.1 m, v: 1 m).
  const knurl = createKnurledSteel(q, { circumferenceM: 0.1, lengthM: 1, color: "#c4c6c9", roughness: 0.4 });
  const chrome = createWornMetalMaterial(q, "chrome", { roughness: 0.14, scratches: 0.4, seed: 7 });
  const bronze = new MeshStandardMaterial({ color: "#a47a45", metalness: 1, roughness: 0.34 });

  // Plates: molded rubber with scuffs (worn shader with dielectric "bare"
  // = dusty, duller scuff tone), steel hub inserts.
  const plateCommon = {
    metalness: 0,
    bareMetalness: 0,
    bareRoughness: 0.9,
    wear: 0.34,
    rust: 0,
    scratches: 0.75,
    scratchRoughness: 0.14,
    noiseScale: 1.6,
    bump: 0.5,
    clearcoat: 0,
    envMapIntensity: 0.8,
  } as const;
  const plateRed = createWornMetal(
    { ...plateCommon, color: "#a01d16", roughness: 0.74, bareColor: "#9a5a54", seed: 21 },
    q.config,
  );
  const plateBlue = createWornMetal(
    { ...plateCommon, color: "#1c4a92", roughness: 0.72, bareColor: "#4e6890", seed: 23 },
    q.config,
  );
  const hub = createWornMetalMaterial(q, "brushedSteel", { color: "#c2c5c9", roughness: 0.26, seed: 13 });

  // Bench ---------------------------------------------------------------------
  const leather = createLeather(q, { widthM: 1.2, heightM: 0.3, color: "#151515", roughness: 0.58 });
  const piping = createLeather(q, { widthM: 2.8, heightM: 0.02, color: "#0e0e0e", roughness: 0.5, seed: 3 });

  // Dumbbells: rubber-coated hex heads with scuffs.
  const dbRubber = createWornMetal(
    {
      ...plateCommon,
      color: "#1a1a1b",
      roughness: 0.74,
      bareColor: "#3b3b3c",
      wear: 0.25,
      seed: 31,
    },
    q.config,
  );

  // Platform (rotates -> UV / object-space only) ------------------------------
  const platformRubber = createRubber(q, {
    widthM: PLATFORM_RADIUS * 2,
    heightM: PLATFORM_RADIUS * 2,
    roughness: 0.86,
    // One 1 m rubber tile has a seam on its border; a round turntable must
    // not show a square grid, so map the disc inside a single tile (UV
    // 0.03..0.97) - no seam crosses it. Flecks dimmed to stay subtle.
    repeat: [0.94, 0.94],
    offset: [0.03, 0.03],
    color: "#6e6e6e",
  });
  const platformBand = createBrushedSteel(q, {
    widthM: Math.PI * 2 * PLATFORM_RADIUS,
    heightM: 0.05,
    color: "#b9bcc0",
    roughness: 0.36,
  });
  const rim = new MeshStandardMaterial({
    color: new Color("#8e1812"),
    emissive: new Color("#ff3a22"),
    emissiveIntensity: 0.18,
    roughness: 0.55,
  });
  const notch = new MeshStandardMaterial({
    color: new Color("#7a1611"),
    emissive: new Color("#ff3a22"),
    emissiveIntensity: 0.08,
    roughness: 0.6,
  });

  return {
    frame,
    accent,
    bolt,
    uhmw,
    caps,
    holeDark,
    holeRim,
    shaft,
    knurl,
    chrome,
    bronze,
    plateRed,
    plateBlue,
    hub,
    leather,
    piping,
    dbRubber,
    platformRubber,
    platformBand,
    rim,
    notch,
  };
}

export type LiftingMaterials = ReturnType<typeof buildMaterials>;

export function useLiftingMaterials(): LiftingMaterials {
  const q = useRoomQuality();
  // Depend only on what buildMaterials reads: the quality context object is
  // recreated on DPR-only steps, which must not rebuild/recompile materials.
  const mq = useMemo<MaterialQuality>(
    () => ({ config: q.config, textureSize: q.textureSize, anisotropy: q.anisotropy }),
    [q.config, q.textureSize, q.anisotropy],
  );
  return useDisposable(() => buildMaterials(mq), [mq]);
}

/** Materials that receive the smooth gold hover highlight. */
export function hoverTargets(m: LiftingMaterials) {
  return [m.frame, m.accent, m.plateRed, m.plateBlue, m.leather, m.dbRubber, m.platformBand];
}

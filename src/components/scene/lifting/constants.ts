// Shared dimensions for the lifting corner. All values are meters in the
// rack group's LOCAL space (group sits at RACK_POSITION, rotated RACK_ROT_Y).
// Real commercial proportions: 75x75 mm 11-gauge uprights, 28.5 mm bar shaft,
// 50 mm sleeves, 450 mm bumper plates.

import type { Vector3Tuple } from "three";

export const RACK_POSITION: Vector3Tuple = [3.4, 0, 2.2];
export const RACK_ROT_Y = Math.PI / 4;

/** Top surface of the rubber turntable platform (old disc top). */
export const PLATFORM_TOP = 0.05;
export const PLATFORM_RADIUS = 1.35;
/** Floor-board top (Walls.tsx boards are 0.04 tall). */
export const FLOOR_TOP = 0.04;

// --- Rack frame -----------------------------------------------------------
export const TUBE = 0.075; // 75 mm square tube
export const TUBE_R = 0.007; // outer corner radius of formed tube
export const UPRIGHT_X = 0.7; // centre x of each upright (unchanged)
export const UPRIGHT_INNER = UPRIGHT_X - TUBE / 2; // 0.6625
export const UPRIGHT_OUTER = UPRIGHT_X + TUBE / 2; // 0.7375
export const FOOT_H = 0.075;
export const FOOT_TOP = PLATFORM_TOP + FOOT_H; // 0.125
export const UPRIGHT_TOP = 2.5;
export const FOOT_Z0 = -0.55;
export const FOOT_Z1 = 0.9;
export const TOP_XM_Y = 2.4625; // top crossmember centre
export const LOW_XM_Y = 0.18; // lower crossmembers centre (unchanged)
export const LOW_XM_H = 0.11;
export const FRONT_XM_Z = 0.7; // front lower crossmember (unchanged)

// --- J-hooks ----------------------------------------------------------------
export const JHOOK_BENCH_Y = 1.0;
export const JHOOK_SQUAT_Y = 1.55;
export const JHOOK_W = 0.06;
/** Cup floor (top of steel) above the hook origin. */
export const JHOOK_CUP_FLOOR = 0.0295;
export const JHOOK_CUP_S0 = 0.012; // cup back (from upright front face)
export const JHOOK_CUP_S1 = 0.078; // cup front (inside of lip)
export const UHMW_T = 0.006;

// --- Barbell ----------------------------------------------------------------
export const BAR_R = 0.0143; // 28.6 mm shaft
export const KNURL_R = 0.01455;
export const SLEEVE_R = 0.025; // 50 mm sleeve
export const BAR_COLLAR_X = 0.74; // inner collar face (shaft spans ±0.74)
export const BAR_END_X = 1.1; // 2.2 m overall
/** Bar centre: sits on the UHMW liner of the squat-height cups. */
export const BAR_Y = JHOOK_SQUAT_Y + JHOOK_CUP_FLOOR + UHMW_T + BAR_R + 0.0002; // ≈ 1.6
export const BAR_Z = TUBE / 2 + (JHOOK_CUP_S0 + JHOOK_CUP_S1) / 2; // ≈ 0.0825

export const RED_PLATE = { R: 0.225, T: 0.06 } as const; // 450 mm bumper
export const BLUE_PLATE = { R: 0.165, T: 0.045 } as const; // smaller plate
export const RED_PLATE_X = 0.772 + RED_PLATE.T / 2;
export const BLUE_PLATE_X = RED_PLATE_X + RED_PLATE.T / 2 + 0.002 + BLUE_PLATE.T / 2;
export const LOCK_COLLAR_W = 0.04;
export const LOCK_COLLAR_X = BLUE_PLATE_X + BLUE_PLATE.T / 2 + 0.002 + LOCK_COLLAR_W / 2;

// --- Bench (modelled along local x, then rotated to run front-to-back) -------
export const BENCH_POS: Vector3Tuple = [0, 0, 0.05];
export const BENCH_ROT_Y = Math.PI / 2;
export const BENCH_PAD_TOP = 0.48;

/** Rack-local -> world (parents of the rack group are identity). */
export function rackToWorld(p: Vector3Tuple): Vector3Tuple {
  const c = Math.cos(RACK_ROT_Y);
  const s = Math.sin(RACK_ROT_Y);
  return [RACK_POSITION[0] + p[0] * c + p[2] * s, RACK_POSITION[1] + p[1], RACK_POSITION[2] - p[0] * s + p[2] * c];
}

/** Bench-local -> rack-local. */
export function benchToRack(p: Vector3Tuple): Vector3Tuple {
  const c = Math.cos(BENCH_ROT_Y);
  const s = Math.sin(BENCH_ROT_Y);
  return [BENCH_POS[0] + p[0] * c + p[2] * s, BENCH_POS[1] + p[1], BENCH_POS[2] - p[0] * s + p[2] * c];
}

export const noRaycast = () => null;

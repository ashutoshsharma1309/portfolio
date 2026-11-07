// Flat bench inside the rack: tapered, crowned, rounded upholstered pad with
// welt piping on a plywood base, steel spine + red legs on T-feet with rubber
// caps, bolted brackets. Modelled along +X (head end), then turned so it runs
// front-to-back under the bar like a real bench-press setup.

import type { Vector3Tuple } from "three";
import { inGroup, type Part } from "./bake";
import { BENCH_PAD_TOP, BENCH_POS, BENCH_ROT_Y, PLATFORM_TOP } from "./constants";
import { cushionGeometry, pipingGeometry, placeEuler, rbox, type CushionSpec } from "./geometry";

const PAD: CushionSpec = { len: 1.2, th: 0.075, wHead: 0.3, wFoot: 0.27, r: 0.028, crown: 0.008 };
const PAD_Y = BENCH_PAD_TOP - PAD.th / 2;
const BOARD_Y = PAD_Y - PAD.th / 2 - 0.008;
const SPINE_H = 0.05;
const SPINE_Y = BOARD_Y - 0.008 - SPINE_H / 2;
const PAD_LIFT = 0.004; // rubber pads under the feet
const FOOT_H = 0.055;
const FOOT_Y = PLATFORM_TOP + PAD_LIFT + FOOT_H / 2;
const LEG_BOTTOM = PLATFORM_TOP + PAD_LIFT + FOOT_H;
const LEG_TOP = SPINE_Y - SPINE_H / 2;
const LEG_H = LEG_TOP - LEG_BOTTOM;
const LEG_X = [-0.42, 0.45] as const;
const FOOT_W = 0.44;
const BRACKET_Y = LEG_TOP + 0.005;

/** Bench hardware in bench-local space (picked up by the rack's bolt
 *  instancer so all hardware is one draw call). */
export const BENCH_BOLTS: { p: Vector3Tuple; n: Vector3Tuple; spin: number }[] = LEG_X.flatMap((x, i) =>
  [-1, 1].flatMap((side) =>
    [-0.026, 0.026].map((dx) => ({
      p: [x + dx, BRACKET_Y, side * 0.0425] as Vector3Tuple,
      n: [0, 0, side] as Vector3Tuple,
      spin: i + dx * 30 + side,
    })),
  ),
);

const LEGS = LEG_X.map((x) => placeEuler([x, LEG_BOTTOM + LEG_H / 2, 0]));
const FEET = LEG_X.map((x) => placeEuler([x, FOOT_Y, 0]));
const FOOT_CAPS = LEG_X.flatMap((x) => [-1, 1].map((s) => placeEuler([x, FOOT_Y, s * (FOOT_W / 2 + 0.004)])));
const RUBBER_PADS = LEG_X.flatMap((x) => [-1, 1].map((s) => placeEuler([x, PLATFORM_TOP + PAD_LIFT / 2, s * 0.17])));
const BRACKETS = LEG_X.flatMap((x) => [-1, 1].map((s) => placeEuler([x, BRACKET_Y, s * 0.04])));
const SPINE = [placeEuler([0.0, SPINE_Y, 0])];
const BOARD = [placeEuler([0, BOARD_Y, 0])];

const BENCH_MATRIX = placeEuler(BENCH_POS, 0, BENCH_ROT_Y, 0);

/** Static bench parts in rack-local space (baked per material). */
export function benchParts(low: boolean): Part[] {
  const seg = low ? 1 : 2;
  const pad = [placeEuler([0, PAD_Y, 0])];
  return inGroup(BENCH_MATRIX, [
    // Upholstered pad + welt piping
    { key: "leather", geometry: cushionGeometry(PAD, low), matrices: pad },
    { key: "piping", geometry: pipingGeometry(PAD, low), matrices: pad },
    // Molded base board, rubber caps + floor pads
    { key: "caps", geometry: rbox(1.17, 0.016, 0.255, 0.004, 1), matrices: BOARD },
    { key: "caps", geometry: rbox(0.079, FOOT_H + 0.003, 0.01, 0.0035, 2), matrices: FOOT_CAPS },
    { key: "caps", geometry: rbox(0.07, PAD_LIFT, 0.07, 0.0015, 1), matrices: RUBBER_PADS },
    // Frame: spine + T-feet + brackets (black), legs (red accent)
    { key: "frame", geometry: rbox(1.02, SPINE_H, 0.075, 0.006, seg), matrices: SPINE },
    { key: "frame", geometry: rbox(0.075, FOOT_H, FOOT_W, 0.006, seg), matrices: FEET },
    { key: "frame", geometry: rbox(0.1, 0.075, 0.005, 0.002, 1), matrices: BRACKETS },
    { key: "accent", geometry: rbox(0.075, LEG_H, 0.05, 0.006, seg), matrices: LEGS },
  ]);
}

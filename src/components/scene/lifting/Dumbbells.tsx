// Two rubber hex dumbbells lying on the floor beside the platform, each on a
// flat face (no gaps), axis tangent to the platform edge, knurled chrome
// handles. The baked rubber mesh stays pickable so a click on a dumbbell
// still opens the rack.

import { CylinderGeometry, Matrix4, type Vector3Tuple } from "three";
import type { Part } from "./bake";
import { FLOOR_TOP } from "./constants";
import {
  DB,
  DB_HEAD_CX,
  DB_HEAD_X0,
  DB_REST_H,
  dumbbellChromeGeometry,
  hexHeadGeometry,
  placeEuler,
  scaleUV,
} from "./geometry";

/** Rack-local floor spots. The originals at [1.3,_,0.6] / [1.55,_,0.95]
 *  clipped the platform / hung off the room (world x > 5), so both sit just
 *  outside the platform (r = 1.48 m, platform r = 1.35) on the same +x side
 *  as before, kept together as a pair ~0.6 m apart. Outermost head corner
 *  stays at world x ≈ 4.93 (floor ends at 5). */
const SPOTS: { x: number; z: number; twist: number }[] = [
  { x: 1.48, z: 0.0, twist: 0.12 },
  { x: 1.352, z: 0.602, twist: -0.06 },
];

const BASES = SPOTS.map(({ x, z, twist }) => {
  // Three's Y rotation turns +X toward -Z, so negate the polar angle to lay
  // the handle tangent to the platform edge.
  const ry = -Math.atan2(z, x) + Math.PI / 2 + twist;
  return placeEuler([x, FLOOR_TOP + DB_REST_H, z] as Vector3Tuple, 0, ry, 0);
});
const HEADS = BASES.flatMap((b) =>
  [DB_HEAD_CX, -DB_HEAD_CX].map((x) => new Matrix4().multiplyMatrices(b, placeEuler([x, 0, 0]))),
);

/** Static dumbbell parts in rack-local space (baked per material). */
export function dumbbellParts(low: boolean): Part[] {
  const len = DB_HEAD_X0 * 2 + 0.01;
  const handle = new CylinderGeometry(DB.handleR, DB.handleR, len, low ? 12 : 22, 1, true);
  handle.rotateZ(Math.PI / 2);
  scaleUV(handle, (2 * Math.PI * DB.handleR) / 0.1, len);
  return [
    { key: "dbRubber", geometry: hexHeadGeometry(), matrices: HEADS },
    { key: "knurl", geometry: handle, matrices: BASES },
    { key: "chrome", geometry: dumbbellChromeGeometry(low ? 16 : 28), matrices: BASES },
  ];
}

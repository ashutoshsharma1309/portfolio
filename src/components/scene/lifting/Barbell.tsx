// Loaded barbell resting in the squat-height J-hook cups: 28.6 mm brushed
// shaft with knurled grips (and ring-mark gaps), smooth centre, inner collars
// with bronze bushings, 50 mm hard-chrome sleeves with end caps; per side a
// 450 mm red bumper, a smaller blue bumper and a lock collar.

import { CylinderGeometry } from "three";
import { inGroup, type Part } from "./bake";
import {
  BAR_COLLAR_X,
  BAR_R,
  BAR_Y,
  BAR_Z,
  BLUE_PLATE,
  BLUE_PLATE_X,
  KNURL_R,
  LOCK_COLLAR_X,
  RED_PLATE,
  RED_PLATE_X,
} from "./constants";
import {
  bushingGeometry,
  collarKnobGeometry,
  lockCollarRingGeometry,
  placeEuler,
  plateBodyGeometry,
  plateHubGeometry,
  scaleUV,
  sleeveGeometry,
} from "./geometry";

const KNURL_IN = { x0: 0.21, x1: 0.395 };
const KNURL_OUT = { x0: 0.415, x1: 0.66 };

const BAR_MATRIX = placeEuler([0, BAR_Y, BAR_Z]);
const both = (x: number) => [placeEuler([x, 0, 0]), placeEuler([-x, 0, 0], 0, Math.PI, 0)];
const SIDES = both(0);
const RED = both(RED_PLATE_X);
const BLUE = both(BLUE_PLATE_X);
const COLLARS = both(LOCK_COLLAR_X);
const K_IN = both((KNURL_IN.x0 + KNURL_IN.x1) / 2);
const K_OUT = both((KNURL_OUT.x0 + KNURL_OUT.x1) / 2);

function knurlGeometry(len: number, seg: number) {
  const g = new CylinderGeometry(KNURL_R, KNURL_R, len, seg, 1, true);
  g.rotateZ(Math.PI / 2);
  return scaleUV(g, (2 * Math.PI * KNURL_R) / 0.1, len);
}

/** Static barbell parts in rack-local space (baked per material). */
export function barbellParts(low: boolean): Part[] {
  const plateSeg = low ? 28 : 56;
  const barSeg = low ? 14 : 28;
  const ringSeg = low ? 18 : 36;
  const shaft = new CylinderGeometry(BAR_R, BAR_R, BAR_COLLAR_X * 2 + 0.002, barSeg, 1, true);
  shaft.rotateZ(Math.PI / 2);
  return inGroup(BAR_MATRIX, [
    { key: "shaft", geometry: shaft, matrices: [placeEuler([0, 0, 0])] },
    { key: "knurl", geometry: knurlGeometry(KNURL_IN.x1 - KNURL_IN.x0, barSeg), matrices: K_IN },
    { key: "knurl", geometry: knurlGeometry(KNURL_OUT.x1 - KNURL_OUT.x0, barSeg), matrices: K_OUT },
    { key: "chrome", geometry: sleeveGeometry(ringSeg), matrices: SIDES },
    { key: "bronze", geometry: bushingGeometry(ringSeg), matrices: SIDES },
    // 450 mm red bumpers, smaller blue bumpers, steel hubs
    { key: "plateRed", geometry: plateBodyGeometry(RED_PLATE.R, RED_PLATE.T, plateSeg), matrices: RED },
    { key: "plateBlue", geometry: plateBodyGeometry(BLUE_PLATE.R, BLUE_PLATE.T, plateSeg), matrices: BLUE },
    { key: "hub", geometry: plateHubGeometry(RED_PLATE.T, ringSeg), matrices: RED },
    { key: "hub", geometry: plateHubGeometry(BLUE_PLATE.T, ringSeg), matrices: BLUE },
    // Lock collars
    { key: "chrome", geometry: lockCollarRingGeometry(ringSeg), matrices: COLLARS },
    { key: "caps", geometry: collarKnobGeometry(low), matrices: COLLARS },
  ]);
}

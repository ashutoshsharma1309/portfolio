// The power rack itself: two 75x75 mm uprights on bolted-down feet, a top
// crossmember with end plates + gussets, two red lower crossmembers, four
// J-hooks with UHMW liners, Westside-style hole columns and all hardware.
// Repeated parts are instanced; every static part shares the frame/accent
// worn powder-coat materials.

import { Matrix4, Vector3, type Vector3Tuple } from "three";
import { useDisposable } from "../materials";
import { useRoomQuality } from "../quality";
import { StaticInstances } from "./StaticInstances";
import type { LiftingMaterials } from "./materials";
import {
  FOOT_H,
  FOOT_TOP,
  FOOT_Z0,
  FOOT_Z1,
  FRONT_XM_Z,
  JHOOK_BENCH_Y,
  JHOOK_SQUAT_Y,
  LOW_XM_H,
  LOW_XM_Y,
  PLATFORM_TOP,
  TOP_XM_Y,
  TUBE,
  TUBE_R,
  UPRIGHT_INNER,
  UPRIGHT_OUTER,
  UPRIGHT_TOP,
  UPRIGHT_X,
  benchToRack,
} from "./constants";
import {
  boltGeometry,
  gussetGeometry,
  holeGeometries,
  jHookGeometry,
  merge,
  placeAlong,
  placeEuler,
  rbox,
  uhmwGeometry,
} from "./geometry";
import { BENCH_BOLTS } from "./Bench";
import type { Part } from "./bake";

const SIDES = [-1, 1] as const;
const PLATE_T = 0.006;
const XM_LEN = 2 * UPRIGHT_INNER - 2 * PLATE_T;
const UPRIGHT_H = UPRIGHT_TOP - FOOT_TOP;
const HOLE_R = 0.0112;

/** Hole centres along an upright: 1" Westside spacing through the bench
 *  zone, 2" elsewhere. */
function holeHeights(): number[] {
  const ys: number[] = [];
  for (let y = 0.34; y < 0.56; y += 0.1016) ys.push(y);
  for (let y = 0.6; y < 1.36; y += 0.0508) ys.push(y);
  for (let y = 1.42; y < 2.3; y += 0.1016) ys.push(y);
  return ys;
}

function m(p: Vector3Tuple, rx = 0, ry = 0, rz = 0, s?: Vector3Tuple) {
  return placeEuler(p, rx, ry, rz, s);
}

// --- static transform tables (module level, computed once) -----------------

const UPRIGHTS = SIDES.map((s) => m([s * UPRIGHT_X, FOOT_TOP + UPRIGHT_H / 2, 0]));
const FEET = SIDES.map((s) => m([s * UPRIGHT_X, PLATFORM_TOP + FOOT_H / 2, (FOOT_Z0 + FOOT_Z1) / 2]));
const TOP_PLATES = SIDES.map((s) => m([s * (UPRIGHT_INNER - PLATE_T / 2), TOP_XM_Y, 0]));
const LOW_PLATES = SIDES.map((s) => m([s * (UPRIGHT_INNER - PLATE_T / 2), LOW_XM_Y, 0]));
const UPRIGHT_CAPS = SIDES.map((s) => m([s * UPRIGHT_X, UPRIGHT_TOP + 0.004, 0]));
const FOOT_CAPS = SIDES.flatMap((s) => [
  m([s * UPRIGHT_X, PLATFORM_TOP + FOOT_H / 2, FOOT_Z0 - 0.004]),
  m([s * UPRIGHT_X, PLATFORM_TOP + FOOT_H / 2, FOOT_Z1 + 0.004]),
]);
const ANCHOR_Z = [FOOT_Z0 + 0.07, FOOT_Z1 - 0.07];
const ANCHOR_TABS = SIDES.flatMap((s) =>
  ANCHOR_Z.map((z) => m([s * (UPRIGHT_OUTER + 0.033), PLATFORM_TOP + 0.004, z])),
);
// Top gussets only (under the crossmember): base gussets read as bright
// edge-on slivers from every camera, so the base uses welded sleeves instead.
const GUSSETS = [
  m([-UPRIGHT_INNER + PLATE_T, TOP_XM_Y - TUBE / 2, 0], Math.PI, 0, 0, [0.85, 0.85, 1]),
  m([UPRIGHT_INNER - PLATE_T, TOP_XM_Y - TUBE / 2, 0], 0, 0, Math.PI, [0.85, 0.85, 1]),
];
/** Welded base sleeve around each upright where it meets the foot. */
const SLEEVE_T = 0.008;
const SLEEVE_W = TUBE + 2 * SLEEVE_T;
const SLEEVE_H = 0.14;
const BASE_SLEEVES = SIDES.map((s) => m([s * UPRIGHT_X, FOOT_TOP + SLEEVE_H / 2, 0]));
const WELDS = SIDES.flatMap((s) => [
  m([s * UPRIGHT_X, FOOT_TOP, 0], 0, 0, 0, [SLEEVE_W / TUBE, 1, SLEEVE_W / TUBE]),
  m([s * UPRIGHT_X, FOOT_TOP + SLEEVE_H, 0]),
]);
const JHOOKS_BENCH = SIDES.map((s) => m([s * UPRIGHT_X, JHOOK_BENCH_Y, TUBE / 2]));
const JHOOKS_SQUAT = SIDES.map((s) => m([s * UPRIGHT_X, JHOOK_SQUAT_Y, TUBE / 2]));
const LINERS = [...JHOOKS_BENCH, ...JHOOKS_SQUAT];
const STRIPES = SIDES.map((s) => m([s * (UPRIGHT_OUTER + 0.0006), 1.3, 0]));

const HOLES: Matrix4[] = (() => {
  const out: Matrix4[] = [];
  for (const s of SIDES) {
    for (const y of holeHeights()) {
      out.push(m([s * UPRIGHT_X, y, TUBE / 2 + 0.0003]));
      out.push(m([s * UPRIGHT_X, y, -TUBE / 2 - 0.0003], 0, Math.PI, 0));
    }
  }
  return out;
})();

const BOLTS: Matrix4[] = (() => {
  const out: Matrix4[] = [];
  const add = (p: Vector3Tuple, n: Vector3Tuple, spin = 0) => out.push(placeAlong(p, n, spin));
  for (const s of SIDES) {
    // Top crossmember end plates (inside) + nuts on the outside face.
    for (const dy of [-0.058, 0.058]) {
      add([s * (UPRIGHT_INNER - PLATE_T), TOP_XM_Y + dy, 0], [-s, 0, 0], 0.3 + dy * 7);
      add([s * UPRIGHT_OUTER, TOP_XM_Y + dy, 0], [s, 0, 0], 0.8 + dy * 5);
    }
    // Rear lower crossmember: bolts through the base sleeve walls.
    for (const dy of [-0.045, 0.045]) {
      add([s * (UPRIGHT_INNER - SLEEVE_T), LOW_XM_Y + dy, 0], [-s, 0, 0], 0.1 + dy * 9);
      add([s * (UPRIGHT_OUTER + SLEEVE_T), LOW_XM_Y + dy, 0], [s, 0, 0], 0.5 - dy * 4);
    }
    // Front crossmember bolted down onto the feet.
    for (const dz of [-0.02, 0.02]) {
      add([s * UPRIGHT_X, FOOT_TOP + LOW_XM_H, FRONT_XM_Z + dz], [0, 1, 0], 0.4 + dz * 20);
    }
    // Upright-to-sleeve bolts on the front and back faces.
    for (const dz of [-1, 1]) {
      add([s * UPRIGHT_X, FOOT_TOP + 0.085, dz * (TUBE / 2 + SLEEVE_T)], [0, 0, dz], 0.2 + dz);
    }
    // Floor anchors through the base tabs.
    for (const z of ANCHOR_Z) add([s * (UPRIGHT_OUTER + 0.04), PLATFORM_TOP + 0.008, z], [0, 1, 0], z * 3);
  }
  // Bench hardware (bench-local -> rack-local).
  const benchRot = new Vector3();
  for (const b of BENCH_BOLTS) {
    const p = benchToRack(b.p);
    // Bench is rotated +90° about Y: (x, z) normal -> (z, -x).
    benchRot.set(b.n[2], b.n[1], -b.n[0]);
    add(p, [benchRot.x, benchRot.y, benchRot.z], b.spin);
  }
  return out;
})();

/** Static rack parts (baked per material by LiftingStatic). */
export function rackParts(low: boolean): Part[] {
  const seg = low ? 1 : 3;
  const weld = merge([
    rbox(TUBE + 0.008, 0.006, 0.006, 0.0029, 1).translate(0, 0.003, TUBE / 2 + 0.0015),
    rbox(TUBE + 0.008, 0.006, 0.006, 0.0029, 1).translate(0, 0.003, -TUBE / 2 - 0.0015),
    rbox(0.006, 0.006, TUBE + 0.008, 0.0029, 1).translate(TUBE / 2 + 0.0015, 0.003, 0),
    rbox(0.006, 0.006, TUBE + 0.008, 0.0029, 1).translate(-TUBE / 2 - 0.0015, 0.003, 0),
  ]);
  const jhook = jHookGeometry();
  return [
    // Black worn powder coat
    { key: "frame", geometry: rbox(TUBE, UPRIGHT_H, TUBE, TUBE_R, seg), matrices: UPRIGHTS },
    { key: "frame", geometry: rbox(TUBE, FOOT_H, FOOT_Z1 - FOOT_Z0, TUBE_R, seg), matrices: FEET },
    { key: "frame", geometry: rbox(XM_LEN, TUBE, TUBE, TUBE_R, seg), matrices: [m([0, TOP_XM_Y, 0])] },
    { key: "frame", geometry: rbox(PLATE_T, 0.15, TUBE - 0.002, 0.0018, 1), matrices: TOP_PLATES },
    { key: "frame", geometry: gussetGeometry(0.11, 0.008), matrices: GUSSETS },
    { key: "frame", geometry: rbox(SLEEVE_W, SLEEVE_H, SLEEVE_W, 0.009, seg), matrices: BASE_SLEEVES },
    { key: "frame", geometry: weld, matrices: WELDS },
    { key: "frame", geometry: rbox(0.07, 0.008, 0.095, 0.0025, 1), matrices: ANCHOR_TABS },
    { key: "frame", geometry: jhook, matrices: JHOOKS_BENCH },
    // Red accents: lower crossmembers, end plates, stripes, squat J-hooks
    { key: "accent", geometry: rbox(XM_LEN, LOW_XM_H, TUBE, TUBE_R, seg), matrices: [m([0, LOW_XM_Y, 0])] },
    {
      key: "accent",
      geometry: rbox(2 * UPRIGHT_OUTER + 0.01, LOW_XM_H, TUBE, TUBE_R, seg),
      matrices: [m([0, FOOT_TOP + LOW_XM_H / 2, FRONT_XM_Z])],
    },
    { key: "accent", geometry: rbox(PLATE_T, 0.13, TUBE - 0.002, 0.0018, 1), matrices: LOW_PLATES },
    { key: "accent", geometry: rbox(0.0016, 1.7, 0.024, 0.0007, 1), matrices: STRIPES },
    { key: "accent", geometry: jhook.clone(), matrices: JHOOKS_SQUAT },
    // UHMW liners + plastic end caps
    { key: "uhmw", geometry: uhmwGeometry(), matrices: LINERS },
    { key: "caps", geometry: rbox(TUBE + 0.003, 0.009, TUBE + 0.003, 0.0035, 2), matrices: UPRIGHT_CAPS },
    { key: "caps", geometry: rbox(TUBE + 0.003, FOOT_H + 0.003, 0.01, 0.0035, 2), matrices: FOOT_CAPS },
  ];
}

/** Repeated small hardware stays instanced: hole columns + all bolts. */
export function RackHardware({ m: mats }: { m: LiftingMaterials }) {
  const q = useRoomQuality();
  const low = q.tier === "low";
  const g = useDisposable(() => {
    const holes = holeGeometries(HOLE_R, low);
    return { holeInner: holes.inner, holeRing: holes.ring, bolt: boltGeometry(low) };
  }, [low]);
  return (
    <group>
      <StaticInstances geometry={g.holeInner} material={mats.holeDark} matrices={HOLES} />
      <StaticInstances geometry={g.holeRing} material={mats.holeRim} matrices={HOLES} />
      <StaticInstances geometry={g.bolt} material={mats.bolt} matrices={BOLTS} />
    </group>
  );
}

// Floating wall shelf above the desk: a solid walnut board with eased edges on
// black powder-coated L-brackets (gusseted, screwed to the wall), a row of
// cloth-bound hardcovers (instanced boards / page blocks / foil bands, the
// last one leaning on its neighbour) and a trailing pothos in a terracotta pot
// at the left end. The right end stays clear for the hackathon trophy.
//
// Shelf origin (world 2.0, 3.0, -4.78): board centred on it, top at y = 0.03.
// The back wall's front face is at local z = -0.145.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type Group, type InstancedMesh, Matrix4, MeshStandardMaterial, DoubleSide, ExtrudeGeometry, Shape, Vector3, CatmullRomCurve3, TubeGeometry } from "three";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { createPowderCoat, useDisposable } from "./materials";
import { VENEER_TILE_U, VENEER_TILE_V, createWalnut } from "./workspace/veneer";
import { useRoomQuality } from "./quality";
import { Books, type BookSpec } from "./workspace/Books";
import { cyl, hash01, lathe, mergeParts, metricBoxUVs, place, rbox } from "./workspace/geometry";
import { createLeafGeometry, leafMatrix } from "./workspace/leaf";

const WALL_Z = -0.145;
const BOARD_TOP = 0.03;

// Bookshelf right end hosts the hackathon trophy, so the books stay on the
// left/middle and the small plant sits at the left end.
const BOOK_COLORS = [
  "#a23a2a",
  "#2d4a8a",
  "#d4a847",
  "#1f4d2b",
  "#6e2d6a",
  "#102030",
];

const BOOK_SIZES: readonly (readonly [number, number, number])[] = [
  [0.062, 0.3, 0.22],
  [0.078, 0.272, 0.205],
  [0.052, 0.33, 0.232],
  [0.086, 0.288, 0.212],
  [0.064, 0.252, 0.19],
  [0.07, 0.312, 0.222],
];
const BOOK_BANDS = ["#c9a95a", null, "#2a2a2a", "#c9a95a", "#d8cfbd", "#b8b8b8"];

function buildShelfBooks(): BookSpec[] {
  const out: BookSpec[] = [];
  const spineZ = 0.235;
  let x = -0.76;
  for (let i = 0; i < 5; i++) {
    const [t, h, d] = BOOK_SIZES[i];
    const gap = 0.0015 + hash01(i + 3) * 0.002;
    out.push({
      position: [x + t / 2, BOARD_TOP, spineZ - d / 2 - hash01(i) * 0.012],
      rotation: [0, (hash01(i + 9) - 0.5) * 0.03, 0],
      size: [t, h, d],
      color: BOOK_COLORS[i],
      band: BOOK_BANDS[i],
    });
    x += t + gap;
  }
  // Last book leans left against the top-right corner of its neighbour,
  // pivoting on its bottom-left edge.
  const [t5, h5] = BOOK_SIZES[4];
  const [t, h, d] = BOOK_SIZES[5];
  const theta = 0.21;
  const xr = out[4].position[0] + t5 / 2;
  const p0x = xr + h5 * Math.tan(theta);
  out.push({
    position: [p0x + (t / 2) * Math.cos(theta), BOARD_TOP + (t / 2) * Math.sin(theta), spineZ - d / 2 - 0.006],
    rotation: [0, 0, theta],
    size: [t, h, d],
    color: BOOK_COLORS[5],
    band: BOOK_BANDS[5],
  });
  return out;
}
const SHELF_BOOKS = buildShelfBooks();

// --- Plant -----------------------------------------------------------------

interface LeafSpec {
  base: Vector3;
  dir: Vector3;
  facing: Vector3;
  len: number;
  tone: number;
}

/** Rosette + two trailing vines (one over the front edge, one over the left
 *  end), all relative to the soil centre. */
function buildPlantLayout(): { leaves: LeafSpec[]; stems: Vector3[][] } {
  const leaves: LeafSpec[] = [];
  const stems: Vector3[][] = [];
  const up = new Vector3(0, 1, 0);
  const golden = 2.39996;
  // Upright mound.
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a = i * golden + 0.4;
    const tilt = 0.15 + (i / N) * 1.05 + hash01(i) * 0.15; // from vertical
    const stemLen = 0.04 + hash01(i + 20) * 0.06 + (1 - i / N) * 0.03;
    const out = new Vector3(Math.cos(a), 0, Math.sin(a));
    const stemDir = out.clone().multiplyScalar(Math.sin(tilt * 0.8)).add(up.clone().multiplyScalar(Math.cos(tilt * 0.8))).normalize();
    const base = stemDir.clone().multiplyScalar(stemLen).add(new Vector3(out.x * 0.015, 0, out.z * 0.015));
    stems.push([new Vector3(out.x * 0.01, 0, out.z * 0.01), base.clone().multiplyScalar(0.55).add(new Vector3(0, 0.01, 0)), base]);
    const droop = Math.min(1.35, tilt + 0.35);
    const dir = out.clone().multiplyScalar(Math.sin(droop)).add(up.clone().multiplyScalar(Math.cos(droop))).normalize();
    const facing = up.clone().add(out.clone().multiplyScalar(0.35));
    leaves.push({ base, dir, facing, len: 0.07 + hash01(i + 40) * 0.035, tone: hash01(i + 60) });
  }
  // Trailing vines: [path control points] relative to soil centre (y = 0).
  const vines: Vector3[][] = [
    // over the front edge (+z), board edge at z ≈ 0.275 → hangs below the shelf
    [new Vector3(0.03, 0.0, 0.05), new Vector3(0.05, 0.01, 0.12), new Vector3(0.06, -0.12, 0.24), new Vector3(0.05, -0.14, 0.295), new Vector3(0.04, -0.3, 0.3), new Vector3(0.06, -0.46, 0.29)],
    // over the left end of the board (x ≈ -0.2 from the pot centre)
    [new Vector3(-0.04, 0.0, 0.0), new Vector3(-0.1, 0.0, 0.03), new Vector3(-0.19, -0.1, 0.05), new Vector3(-0.215, -0.16, 0.06), new Vector3(-0.22, -0.3, 0.07)],
  ];
  vines.forEach((pts, vi) => {
    const curve = new CatmullRomCurve3(pts);
    stems.push(curve.getPoints(24));
    const n = vi === 0 ? 8 : 6;
    for (let k = 1; k <= n; k++) {
      const s = k / (n + 0.6);
      const p = curve.getPointAt(s);
      const tan = curve.getTangentAt(s);
      // Leaves alternate sides and hang off the vine, facing outward.
      const side = new Vector3().crossVectors(tan, up);
      if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
      side.normalize().multiplyScalar(k % 2 === 0 ? 1 : -1);
      const dir = side.clone().multiplyScalar(0.8).add(tan.clone().multiplyScalar(0.5)).add(new Vector3(0, -0.25, 0)).normalize();
      const facing = vi === 0 ? new Vector3(0, 0.4, 1) : new Vector3(-1, 0.4, 0.2);
      leaves.push({ base: p, dir, facing, len: 0.045 + hash01(vi * 30 + k) * 0.02, tone: hash01(vi * 13 + k + 100) });
    }
  });
  return { leaves, stems };
}

const LEAF_DARK = new Color("#2a5a2e");
const LEAF_LIGHT = new Color("#5f9a45");

function ShelfPlantFoliage() {
  const ref = useRef<Group>(null);
  const reducedMotion = usePrefersReducedMotion();
  const q = useRoomQuality();
  const low = q.tier === "low";
  // Distinct phase from the floor plants. Damped toward the sine target so a
  // tab switch (clock jump) never snaps the plant.
  useFrame((state, dt) => {
    if (!ref.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    const k = 1 - Math.exp(-6 * Math.min(dt, 0.1));
    ref.current.rotation.x += (Math.sin(t * 0.8 + 4.3) * 0.04 - ref.current.rotation.x) * k;
    ref.current.rotation.z += (Math.cos(t * 0.6 + 4.3) * 0.03 - ref.current.rotation.z) * k;
  });

  const layout = useMemo(buildPlantLayout, []);
  const res = useDisposable(() => {
    const stemGeos = layout.stems.map((pts) => new TubeGeometry(new CatmullRomCurve3(pts), pts.length > 3 ? 32 : 6, 0.0018, 4, false));
    return {
      leaf: createLeafGeometry(low ? 2 : 4, low ? 4 : 7),
      stems: mergeParts(stemGeos),
      leafMat: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.48, side: DoubleSide, envMapIntensity: 0.8 }),
      stemMat: new MeshStandardMaterial({ color: "#5d7a3a", roughness: 0.6 }),
    };
  }, [layout, low]);

  const setLeaves = (mesh: InstancedMesh | null) => {
    if (!mesh) return;
    const m = new Matrix4();
    const c = new Color();
    layout.leaves.forEach((l, i) => {
      mesh.setMatrixAt(i, leafMatrix(m, l.base, l.dir, l.facing, l.len, 0.95 + l.tone * 0.15));
      mesh.setColorAt(i, c.copy(LEAF_DARK).lerp(LEAF_LIGHT, 0.2 + l.tone * 0.7));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  };

  return (
    <group ref={ref}>
      <instancedMesh ref={setLeaves} args={[res.leaf, res.leafMat, layout.leaves.length]} castShadow />
      <mesh geometry={res.stems} material={res.stemMat} />
    </group>
  );
}

// --- Shelf -----------------------------------------------------------------

export function Bookshelf() {
  const q = useRoomQuality();
  const low = q.tier === "low";

  const mats = useDisposable(
    () => ({
      // Solid walnut board, grain along x. Box UVs are 0..1 per face, so the
      // repeat maps the 2.4 × 0.55 m top face to physical scale.
      wood: createWalnut(q, { repeat: [2.4 / VENEER_TILE_U, 0.55 / VENEER_TILE_V], offset: [0.52, 0.13], clearcoat: 0.15 }),
      // Fine, low-relief orange peel: the gusset (UVs at true scale, facing the
      // window) showed the full-strength bump as grey speckle.
      steel: createPowderCoat(q, { color: "#1b1c1e", widthM: 0.3, heightM: 0.3, roughness: 0.6, normalScale: 0.35, envMapIntensity: 0.7 }),
      pot: new MeshStandardMaterial({ color: "#a65a36", roughness: 0.92, envMapIntensity: 0.6 }),
      soil: new MeshStandardMaterial({ color: "#2b2019", roughness: 1 }),
    }),
    [q],
  );

  const geo = useDisposable(() => {
    const seg = low ? 2 : 4;
    const board = rbox(2.4, 0.06, 0.55, 0.009, seg);
    // L-brackets: wall plate + shelf arm + triangular gusset + screw heads.
    const parts = [];
    for (const bx of [-1.0, 1.0]) {
      // UVs at true scale (1 UV = 0.3 m, as the material's widthM) so plate,
      // arm and gusset all show the same powder-coat finish.
      parts.push(place(metricBoxUVs(rbox(0.036, 0.24, 0.006, 0.0025, 2), 0.036, 0.24, 0.006, 0.3), [bx, -0.03 - 0.12, WALL_Z + 0.003]));
      parts.push(place(metricBoxUVs(rbox(0.036, 0.006, 0.36, 0.0025, 2), 0.036, 0.006, 0.36, 0.3), [bx, -0.033, WALL_Z + 0.18]));
      const tri = new Shape();
      // Shape (a, b) → world (z = -a, y = b) after the rotation below.
      tri.moveTo(-(WALL_Z + 0.004), -0.036);
      tri.lineTo(-(WALL_Z + 0.26), -0.036);
      tri.lineTo(-(WALL_Z + 0.004), -0.24);
      tri.closePath();
      // Tiny bevel so the plate edges catch light like the rbox parts; cap UVs
      // are shape coords in metres → rescale to the material's 0.3 m per UV.
      const g = new ExtrudeGeometry(tri, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1, curveSegments: 1 });
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / 0.3, uv.getY(k) / 0.3);
      g.rotateY(Math.PI / 2);
      g.translate(bx - 0.0015, 0, 0); // centre the 5 mm plate (z −0.001..0.004) on bx
      parts.push(g);
      for (const sy of [-0.09, -0.23]) {
        parts.push(place(cyl(0.006, 0.0065, 0.004, 10), [bx, sy, WALL_Z + 0.008], [Math.PI / 2, 0, 0]));
      }
    }
    // Terracotta pot with a rolled rim, and its soil.
    const pot = lathe(
      [
        [0.0, -0.15],
        [0.062, -0.15],
        [0.066, -0.147],
        [0.078, -0.055],
        [0.079, -0.05],
        [0.088, -0.048],
        [0.09, -0.03],
        [0.088, -0.015],
        [0.079, -0.015],
        [0.075, -0.03],
      ],
      low ? 16 : 32,
    );
    const soil = place(cyl(0.075, 0.075, 0.004, low ? 12 : 24), [0, -0.034, 0]);
    return { board, brackets: mergeParts(parts), pot, soil };
  }, [low]);

  return (
    <group position={[2.0, 3.0, -4.78]}>
      <mesh geometry={geo.board} material={mats.wood} castShadow receiveShadow />
      <mesh geometry={geo.brackets} material={mats.steel} castShadow />

      {/* Books — left to middle of the shelf only; right end is for the
          hackathon trophy. */}
      <Books books={SHELF_BOOKS} castShadow />

      {/* Small plant at the left end of the shelf (pot base on the board). */}
      <group position={[-1.0, 0.18, 0]}>
        <mesh geometry={geo.pot} material={mats.pot} castShadow receiveShadow />
        <mesh geometry={geo.soil} material={mats.soil} />
        <group position={[0, -0.032, 0]}>
          <ShelfPlantFoliage />
        </group>
      </group>
    </group>
  );
}

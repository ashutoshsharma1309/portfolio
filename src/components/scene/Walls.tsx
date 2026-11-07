import { type ReactNode } from "react";
import { BoxGeometry, Color } from "three";
import { useRoomQuality } from "./quality";
import { createPlaster, createPlastic, createWood, useDisposable } from "./materials";
import { patchFloorMaterial, patchWallMaterial } from "./architecture/roomShading";
import { buildProfileSweep, buildWallSlab, skirtingProfile } from "./architecture/shellGeometry";
import { WALL_THICKNESS, WINDOW_OPENING, WINDOW_POS } from "./architecture/windowSpec";

const ROOM_HALF = 5;
const WALL_HEIGHT = 5;
const FLOOR_SIZE = ROOM_HALF * 2;
const BACK_WALL_Z = -ROOM_HALF;
// Front face of the back wall (the wall is a slab centered at z=-ROOM_HALF
// with thickness 0.15 — its front face is at z=-ROOM_HALF + 0.075).
const BACK_WALL_FRONT_Z_OFFSET = 0.075;

/** Top of the finished floor (world y). Furniture, rug and contact shadows
 *  are tuned to this height. */
const FLOOR_TOP = 0.04;
const WOOD_THICKNESS = 0.03;
const SLAB_DEPTH = 0.26;
const HALF_T = WALL_THICKNESS / 2;

// Warm painted plaster, close to the original wall colours.
const BACK_WALL_COLOR = "#e4d9c4";
const LEFT_WALL_COLOR = "#ddd0b6";
/** Cut faces of the cutaway (wall tops/ends): unpainted plaster core. */
const WALL_CUT_COLOR = "#a79f94";
/** Semi-gloss painted skirting. */
const TRIM_COLOR = "#efe6d3";
/** Exposed floor build-up below the boards (screed/subfloor edge). */
const SLAB_COLOR = "#7a736a";

// ---------------------------------------------------------------------------
// Floor: one wood mesh (3 cm board layer) on one slab. The board pattern,
// per-board tone, worn lanes and wall-edge occlusion all live in the floor
// shader (architecture/roomShading.ts).

function Floor() {
  const q = useRoomQuality();
  const mats = useDisposable(() => {
    // Isotropic physical scale (one 1.2 m tile, 0.2 m boards) so the grain
    // keeps its true proportions; long planks come from the floor shader
    // (architecture/roomShading.ts), not from stretching the texture.
    const wood = createWood(q, {
      repeat: [FLOOR_SIZE / 1.2, FLOOR_SIZE / 1.2],
      color: new Color(1.6, 1.47, 1.34),
      roughness: 0.44,
      envMapIntensity: 0.85,
      // Board gaps stay crisp in albedo; the AO groove is softened so seams
      // read as fine joints rather than drawn lines.
      aoMapIntensity: 0.5,
      // Grain shows mostly in colour; strong fibre relief reads as ribbed
      // composite decking.
      normalScale: 0.35,
    });
    patchFloorMaterial(wood);
    const slab = createPlaster(q, {
      color: SLAB_COLOR,
      repeat: [2, 0.06],
      offset: [0, 0.45],
      roughness: 0.94,
      envMapIntensity: 0.6,
    });
    return { wood, slab };
  }, [q]);
  const geos = useDisposable(
    () => ({
      wood: new BoxGeometry(FLOOR_SIZE, WOOD_THICKNESS, FLOOR_SIZE),
      // Extends under the walls' full thickness (to the outer faces).
      slab: new BoxGeometry(FLOOR_SIZE + HALF_T, SLAB_DEPTH, FLOOR_SIZE + HALF_T),
    }),
    [],
  );
  return (
    <group>
      <mesh geometry={geos.wood} material={mats.wood} position={[0, FLOOR_TOP - WOOD_THICKNESS / 2, 0]} receiveShadow />
      <mesh
        geometry={geos.slab}
        material={mats.slab}
        position={[-HALF_T / 2, FLOOR_TOP - WOOD_THICKNESS - SLAB_DEPTH / 2 + 0.001, -HALF_T / 2]}
        receiveShadow
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Walls: extruded slabs (front/back faces = painted plaster, cut faces =
// plaster core), profiled skirting boards. The back wall has the window's
// rough opening cut through it.

function useWallMaterials(surf: 2 | 3, color: string, uOffset: number) {
  const q = useRoomQuality();
  return useDisposable(() => {
    // Smooth skim-coated drywall: the plaster normal is kept faint so it
    // reads as paint over plaster up close, not as stucco.
    const face = createPlaster(q, {
      color,
      widthM: FLOOR_SIZE,
      heightM: WALL_HEIGHT,
      offset: [uOffset, 0],
      seed: 1,
      normalScale: 0.3,
    });
    patchWallMaterial(face, surf);
    const cut = createPlaster(q, { color: WALL_CUT_COLOR, repeat: [1, 1], offset: [0, 0.4], roughness: 0.93, normalScale: 0.6 });
    const skirting = createPlastic(q, { color: TRIM_COLOR, roughness: 0.36, repeat: [1 / 0.3, 1 / 0.3], envMapIntensity: 0.9 });
    patchWallMaterial(skirting, surf, false);
    return { face, cut, skirting };
  }, [q, surf, color, uOffset]);
}

const SKIRTING_Y = FLOOR_TOP - WALL_HEIGHT / 2;

// Back wall is a group so children (e.g. PhotoFrames) can be parented to it
// and use local coordinates. Center is at world (0, WALL_HEIGHT/2, -ROOM_HALF).
export function BackWall({ children }: { children?: ReactNode }) {
  const mats = useWallMaterials(2, BACK_WALL_COLOR, 0);
  const geos = useDisposable(() => {
    const wall = buildWallSlab({
      // Runs past the left wall's outer face so the outer corner is closed.
      x0: -ROOM_HALF - HALF_T,
      x1: ROOM_HALF,
      height: WALL_HEIGHT,
      thickness: WALL_THICKNESS,
      uOrigin: -ROOM_HALF,
      uSpan: FLOOR_SIZE,
      hole: { x: WINDOW_POS[0], y: WINDOW_POS[1], w: WINDOW_OPENING.w, h: WINDOW_OPENING.h },
    });
    const skirting = buildProfileSweep(skirtingProfile(), -ROOM_HALF + HALF_T, ROOM_HALF);
    return { wall, skirting };
  }, []);
  return (
    <group position={[0, WALL_HEIGHT / 2, BACK_WALL_Z]}>
      <mesh geometry={geos.wall} material={[mats.face, mats.cut]} receiveShadow />
      <mesh geometry={geos.skirting} material={mats.skirting} position={[0, SKIRTING_Y, HALF_T]} receiveShadow />
      {children}
    </group>
  );
}

export function LeftWall({ children }: { children?: ReactNode }) {
  const mats = useWallMaterials(3, LEFT_WALL_COLOR, 0.37);
  const geos = useDisposable(() => {
    // Built along +X then turned so the front face looks down +X (into the
    // room); local x in [-5, 4.925] becomes z in [-4.925, 5] (starts at the
    // back wall's front face).
    const wall = buildWallSlab({
      x0: -ROOM_HALF,
      x1: ROOM_HALF - HALF_T,
      height: WALL_HEIGHT,
      thickness: WALL_THICKNESS,
      uOrigin: -ROOM_HALF,
      uSpan: FLOOR_SIZE,
    });
    wall.rotateY(Math.PI / 2);
    const skirting = buildProfileSweep(skirtingProfile(), -ROOM_HALF, ROOM_HALF - HALF_T);
    skirting.rotateY(Math.PI / 2);
    return { wall, skirting };
  }, []);
  return (
    <group position={[-ROOM_HALF, WALL_HEIGHT / 2, 0]}>
      <mesh geometry={geos.wall} material={[mats.face, mats.cut]} receiveShadow />
      <mesh geometry={geos.skirting} material={mats.skirting} position={[HALF_T, SKIRTING_Y, 0]} receiveShadow />
      {children}
    </group>
  );
}

export function Walls() {
  return <Floor />;
}

export const ROOM_DIMS = {
  ROOM_HALF,
  WALL_HEIGHT,
  FLOOR_SIZE,
  BACK_WALL_FRONT_Z_OFFSET,
};

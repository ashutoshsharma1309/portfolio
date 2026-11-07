// 2-drawer steel filing cabinet next to the desk: black powder-coated carcass
// on a recessed plinth, two overlay drawer fronts with real 4–5 mm reveals,
// brushed-steel bar pulls on stand-offs, label holders, a lock cylinder, and
// a walnut top matching the desk. Two hardcovers lie on top.

import { MeshStandardMaterial } from "three";
import { createBrushedSteel, createWornMetalMaterial, useDisposable } from "./materials";
import { createWalnut } from "./workspace/veneer";
import { useRoomQuality } from "./quality";
import { Books, flatBook, type BookSpec } from "./workspace/Books";
import { FLOOR_Y, cyl, mergeParts, place, rbox, roundedRectShape, slab } from "./workspace/geometry";

const ORIGIN: [number, number, number] = [-0.4, 0, -4.3];
const W = 0.7;
const D = 0.7;
const CARCASS_TOP = 1.0;
const TOP_T = 0.04; // walnut top: 1.00 → 1.04
const FRONT_Z = D / 2; // carcass front face
const DRAWERS = [
  { y0: FLOOR_Y + 0.062, y1: 0.5 }, // lower
  { y0: 0.505, y1: 0.962 }, // upper
];

// Decorative item on top — small stack of books lying flat, spines forward.
const TOP_BOOKS_PLACED: readonly BookSpec[] = [
  flatBook([0.1, CARCASS_TOP + TOP_T + 0.03, 0.05], 0.08, [0.06, 0.32, 0.22], "#a23a2a", "#c9a95a"),
  flatBook([0.05, CARCASS_TOP + TOP_T + 0.09, 0.07], -0.1, [0.06, 0.32, 0.22], "#2d4a8a", "#d8cfbd"),
];

export function DrawerUnit() {
  const q = useRoomQuality();
  const low = q.tier === "low";

  const mats = useDisposable(
    () => ({
      // Lightly used office steel: faint scuffs near the floor and the pulls.
      body: createWornMetalMaterial(q, "darkPowderCoat", {
        color: "#202124",
        roughness: 0.5,
        wear: 0.1,
        rust: 0,
        scratches: 0.35,
        hotspots: [
          { position: [ORIGIN[0], 0.86, ORIGIN[2] + FRONT_Z + 0.02], radius: 0.1 },
          { position: [ORIGIN[0], 0.42, ORIGIN[2] + FRONT_Z + 0.02], radius: 0.1 },
        ],
        seed: 4,
      }),
      plinth: new MeshStandardMaterial({ color: "#0e0e0f", roughness: 0.8 }),
      // Same walnut as the desk (UVs in metres), offset so the figure differs.
      wood: createWalnut(q, { offset: [0.31, 0.4], clearcoat: 0.2 }),
      steel: createBrushedSteel(q, { color: "#c4c7cc", roughness: 0.3, widthM: 0.25, heightM: 0.05 }),
      card: new MeshStandardMaterial({ color: "#e9e2d0", roughness: 0.9 }),
    }),
    [q],
  );

  const geo = useDisposable(() => {
    const seg = low ? 2 : 3;
    const radial = low ? 10 : 18;
    const bodyH = CARCASS_TOP - (FLOOR_Y + 0.055);
    const body = [place(rbox(W, bodyH, D - 0.01, 0.006, seg), [0, FLOOR_Y + 0.055 + bodyH / 2, -0.005])];
    const steel = [];
    const cards = [];
    for (const d of DRAWERS) {
      const h = d.y1 - d.y0;
      const cy = (d.y0 + d.y1) / 2;
      // Overlay front (proud of the carcass by its thickness).
      body.push(place(rbox(W - 0.012, h, 0.02, 0.004, seg), [0, cy, FRONT_Z + 0.006]));
      // Pull: bar on two stand-offs, upper third of the front.
      const py = cy + h * 0.22;
      const pz = FRONT_Z + 0.016;
      steel.push(place(cyl(0.0065, 0.0065, 0.24, radial), [0, py, pz + 0.032], [0, 0, Math.PI / 2]));
      for (const sx of [-0.1, 0.1]) {
        steel.push(place(cyl(0.0055, 0.0055, 0.034, 10), [sx, py, pz + 0.016], [Math.PI / 2, 0, 0]));
      }
      // Label holder frame (4 thin rails) + blank card, above the pull.
      const ly = py + 0.062;
      const lz = FRONT_Z + 0.0175;
      steel.push(place(rbox(0.104, 0.005, 0.003, 0.001, 1), [0, ly + 0.0225, lz]));
      steel.push(place(rbox(0.104, 0.005, 0.003, 0.001, 1), [0, ly - 0.0225, lz]));
      steel.push(place(rbox(0.005, 0.05, 0.003, 0.001, 1), [-0.0495, ly, lz]));
      steel.push(place(rbox(0.005, 0.05, 0.003, 0.001, 1), [0.0495, ly, lz]));
      cards.push(place(rbox(0.096, 0.042, 0.001, 0.0003, 1), [0, ly, lz - 0.0008]));
    }
    // Lock cylinder, upper drawer top-right.
    const lockY = DRAWERS[1].y1 - 0.045;
    steel.push(place(cyl(0.012, 0.012, 0.006, radial), [W / 2 - 0.06, lockY, FRONT_Z + 0.019], [Math.PI / 2, 0, 0]));
    const keyway = place(rbox(0.0025, 0.012, 0.002, 0.0005, 1), [W / 2 - 0.06, lockY, FRONT_Z + 0.0225]);
    // Recessed kick plinth.
    const plinth = place(rbox(W - 0.06, 0.06, D - 0.08, 0.004, 1), [0, FLOOR_Y + 0.03, -0.03]);
    // Walnut top, slight overhang, eased edges.
    const top = place(slab(roundedRectShape(W + 0.03, D + 0.03, 0.012), TOP_T, 0.005, low ? 3 : 6, low ? 2 : 3), [0, CARCASS_TOP, 0]);
    return {
      body: mergeParts(body),
      steel: mergeParts(steel),
      cards: mergeParts(cards),
      // Plinth + keyway share the near-black material: one draw call.
      plinth: mergeParts([plinth, keyway]),
      top,
    };
  }, [low]);

  return (
    <group position={ORIGIN}>
      <mesh geometry={geo.body} material={mats.body} castShadow receiveShadow />
      <mesh geometry={geo.plinth} material={mats.plinth} />
      <mesh geometry={geo.top} material={mats.wood} castShadow receiveShadow />
      <mesh geometry={geo.steel} material={mats.steel} />
      <mesh geometry={geo.cards} material={mats.card} />

      {/* Decorative item on top — small stack of books */}
      <Books books={TOP_BOOKS_PLACED} />
    </group>
  );
}

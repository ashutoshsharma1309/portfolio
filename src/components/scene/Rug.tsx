// Round beige rug in the center.
//
// One tufted wool pile disc (foundation fabric texture at a chunky loop
// scale) with the original concentric-ring design woven into it by the
// shader (architecture/roomShading.ts), plus a rolled, bound edge so the rug
// has real thickness (~1.3 cm) and a soft rim instead of a paper-thin disc.

import { CircleGeometry, Color } from "three";
import { useRoomQuality } from "./quality";
import { createFabric, useDisposable } from "./materials";
import { patchRugMaterial, type RugDesign } from "./architecture/roomShading";
import { buildRugEdge } from "./architecture/shellGeometry";

const RADIUS = 2.0;
/** Original design: base disc + two darker rings. */
const DESIGN: RugDesign = {
  base: "#e8d8b8",
  ring: "#c9b48d",
  rings: [
    [1.0, 1.08],
    [1.5, 1.6],
  ],
  radius: RADIUS,
};
/** The original cream with a slight cool lift so it reads cream rather than
 *  khaki under the warm key light. (The old 1.5× boost compensated for the
 *  ContactShadows whole-floor darkening, since fixed, and now blew out.) */
const PILE_COLOR = new Color(DESIGN.base).multiply(new Color(0.98, 0.98, 1.06));
/** Shared pile settings for the top and the rolled edge. */
const PILE = { roughness: 0.95, sheen: 0.3, envMapIntensity: 0.6, aoMapIntensity: 0.3, normalScale: 0.6 } as const;
/** Visible loop pitch: one fabric tile = 0.3 m (≈9 mm loops). */
const PILE_TILE_M = 0.3;
/** Pile top / underside relative to the group (group y = 0.05; the floor
 *  top is world 0.04, contact shadows render at 0.058). */
const TOP_Y = 0.003;
const BOTTOM_Y = -0.0095;
const EDGE_OUT = 0.012;

export function Rug() {
  const q = useRoomQuality();
  const low = q.tier === "low";
  const geos = useDisposable(() => {
    const top = new CircleGeometry(RADIUS - EDGE_OUT, low ? 64 : 128);
    top.rotateX(-Math.PI / 2);
    top.translate(0, TOP_Y, 0);
    const edge = buildRugEdge(RADIUS - EDGE_OUT, EDGE_OUT, BOTTOM_Y, TOP_Y, low ? 64 : 128);
    return { top, edge };
  }, [low]);
  const mats = useDisposable(() => {
    const d = (RADIUS * 2) / PILE_TILE_M;
    const top = createFabric(q, { ...PILE, color: PILE_COLOR, repeat: [d, d] });
    patchRugMaterial(top, DESIGN, false);
    // Edge: U wraps the circumference, V crosses the small roll.
    const edge = createFabric(q, {
      color: PILE_COLOR,
      ...PILE,
      repeat: [(2 * Math.PI * RADIUS) / PILE_TILE_M, 0.25],
    });
    patchRugMaterial(edge, DESIGN, true);
    return { top, edge };
  }, [q]);

  return (
    <group position={[0.5, 0.05, 0.4]}>
      <mesh geometry={geos.top} material={mats.top} receiveShadow />
      <mesh geometry={geos.edge} material={mats.edge} receiveShadow />
    </group>
  );
}

// Rotating rubber lifting platform (the old display disc): EPDM rubber top,
// brushed-steel edge band, molded red inlay bead (gentle pulse, low emissive)
// and four red inlay strips so the rotation reads. Only this group spins —
// the rack, bar, bench and dumbbells above it stay put (as before).

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CircleGeometry, type Group } from "three";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import { useDisposable } from "../materials";
import { useRoomQuality } from "../quality";
import { StaticInstances } from "./StaticInstances";
import type { LiftingMaterials } from "./materials";
import { FLOOR_TOP, PLATFORM_RADIUS, PLATFORM_TOP, noRaycast } from "./constants";
import { placeEuler, platformBandGeometry, rbox, rimBeadGeometry } from "./geometry";

const BAND_IN = PLATFORM_RADIUS - 0.06;
const SPEED = 0.25; // rad/s (unchanged)
const SPIN_UP = 1.4; // s time constant of the eased start
const RIM_STATIC = 0.18;

const NOTCHES = [0, 1, 2, 3].map((i) => {
  const a = (i / 4) * Math.PI * 2;
  return placeEuler([Math.cos(a) * 1.1, PLATFORM_TOP + 0.0015, Math.sin(a) * 1.1], 0, -a, 0);
});

export function Platform({ m }: { m: LiftingMaterials }) {
  const ref = useRef<Group>(null);
  const speed = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  const q = useRoomQuality();
  const low = q.tier === "low";

  const g = useDisposable(() => {
    const seg = low ? 48 : 96;
    const top = new CircleGeometry(BAND_IN + 0.001, seg);
    top.rotateX(-Math.PI / 2);
    top.translate(0, PLATFORM_TOP, 0);
    return {
      top,
      band: platformBandGeometry(BAND_IN, PLATFORM_RADIUS, PLATFORM_TOP + 0.006, FLOOR_TOP, seg),
      rim: rimBeadGeometry(1.232, 1.268, PLATFORM_TOP, 0.0045, seg),
      notch: rbox(0.17, 0.004, 0.045, 0.0016, 1),
    };
  }, [low]);

  useFrame((state, dt) => {
    const rim = m.rim;
    if (reducedMotion) {
      rim.emissiveIntensity = RIM_STATIC;
      return;
    }
    const d = Math.min(dt, 0.1);
    // Eased start: speed glides from 0 to 0.25 rad/s instead of snapping.
    speed.current += (SPEED - speed.current) * (1 - Math.exp(-d / SPIN_UP));
    if (ref.current) ref.current.rotation.y += speed.current * d;
    // Gentle 4 s breathing on the rim (0.10 → 0.26), no bloom-style glow.
    const t = state.clock.getElapsedTime();
    const k = 0.5 + 0.5 * Math.sin((t / 4) * Math.PI * 2);
    rim.emissiveIntensity = 0.1 + k * 0.16;
  });

  return (
    <group ref={ref}>
      {/* Rubber top stays pickable so clicking the platform opens the rack */}
      <mesh geometry={g.top} material={m.platformRubber} receiveShadow />
      <mesh geometry={g.band} material={m.platformBand} receiveShadow raycast={noRaycast} />
      <mesh geometry={g.rim} material={m.rim} raycast={noRaycast} />
      <StaticInstances geometry={g.notch} material={m.notch} matrices={NOTCHES} />
    </group>
  );
}

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { PointLight } from "three";
import { useSceneStore } from "../../store/useSceneStore";
import { useHotspotHover } from "../../hooks/useHotspotHover";
import { HOVER_COLOR, applyHoverEmissive, useHoverMix } from "./materials";
import { hoverTargets, useLiftingMaterials } from "./lifting/materials";
import { RACK_POSITION, RACK_ROT_Y } from "./lifting/constants";
import { LiftingStatic } from "./lifting/LiftingStatic";
import { RackHardware } from "./lifting/RackFrame";
import { Platform } from "./lifting/Platform";
import { useRoomQuality } from "./quality";

// Lifting corner: commercial power rack (75x75 mm uprights, bolted feet,
// J-hooks with UHMW liners), loaded bar on the squat-height hooks, flat bench
// inside the rack, two hex dumbbells and the rotating rubber platform. All
// parts live in ./lifting; this file owns the hotspot, tap target and hover.

const HOVER_LIGHT_MAX = 1.2;
// The rack is mostly near-black powder coat, where the shared default (0.22)
// would turn the whole frame gold. A tenth of it reads as a warm sheen.
const HOVER_EMISSIVE_MAX = 0.02;

export function PowerliftingRack() {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover("rack");
  const mats = useLiftingMaterials();
  const targets = useMemo(() => hoverTargets(mats), [mats]);
  const mix = useHoverMix(hovered);
  const lightRef = useRef<PointLight>(null);
  // An always-mounted point light is shaded on every lit pixel. On the low
  // (mobile / weak-GPU) start tier the eased emissive hover alone carries the
  // feedback. startTier never changes, so this never forces a recompile.
  const hoverLight = useRoomQuality().startTier !== "low";

  // Smooth hover: eased warm emissive on the frame/plates/pad plus a soft
  // warm fill light. The light is always mounted (intensity animated) so
  // hovering never forces a shader recompile.
  useFrame(() => {
    applyHoverEmissive(targets, mix.current, HOVER_COLOR, HOVER_EMISSIVE_MAX);
    if (lightRef.current) lightRef.current.intensity = mix.current * HOVER_LIGHT_MAX;
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHotspot("rack");
  };

  // Rack sits at +x side (right), against the back wall area.
  return (
    <group
      position={RACK_POSITION}
      rotation={[0, RACK_ROT_Y, 0]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={handleClick}
    >
      {/* Invisible enlarged tap target wrapping the whole rack volume.
          Easier to land a finger on than the thin posts. */}
      <mesh position={[0, 1.4, 0.3]}>
        <boxGeometry args={[2.8, 2.8, 1.8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Power rack, J-hooks, loaded barbell, bench and the two dumbbells:
          static, merged into one mesh per material (see lifting/bake.ts). */}
      <LiftingStatic m={mats} />
      {/* Hole columns + hex bolts/washers (instanced) */}
      <RackHardware m={mats} />

      {/* Rotating platform beneath the rack — only the platform spins, the
          rack/barbell/bench/dumbbells above stay static. */}
      <Platform m={mats} />

      {/* Hover glow indicator (eased, warm, subtle) */}
      {hoverLight && (
        <pointLight ref={lightRef} position={[0, 1.5, 0.4]} intensity={0} distance={2.5} color="#ffd766" />
      )}
    </group>
  );
}

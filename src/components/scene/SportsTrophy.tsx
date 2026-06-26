// Gold cup trophy on the floor to the front-LEFT of the powerlifting rack.
// The rack sits at (3.4, 2.2) with a rotating display disc of radius ~1.35, so
// the trophy is placed clear of that disc and toward the open room/camera, where
// it has an unobstructed line of sight (it used to be tucked in the back-right
// corner and got hidden behind the rack).

import { Trophy } from "./Trophy";

export function SportsTrophy() {
  return (
    <Trophy
      position={[2.6, 0, 3.5]}
      hotspot="sportsTrophy"
      metalColor="#d4a747"
      metalEmissive="#f4b942"
      metalness={0.95}
      roughness={0.15}
      ringColor="#f4b942"
      spotColor="#fff5d6"
      spotIntensity={2.5}
      spotDistance={5}
      tooltip="🏆 Sports & Athletics"
    />
  );
}

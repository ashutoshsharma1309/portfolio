// Gold cup trophy on the floor in front of the powerlifting rack — pushed
// out toward the open part of the room so it has clear breathing space
// from the rack and dumbbells.

import { Trophy } from "./Trophy";

export function SportsTrophy() {
  return (
    <Trophy
      position={[4.5, 0, 3.8]}
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

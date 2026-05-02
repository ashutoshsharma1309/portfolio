// Silver/chrome cup with a glowing blue base strip — sits at the right end
// of the bookshelf above the desk. The bookshelf has been deepened to
// accommodate the larger 1u-tall trophy.
//
// Bookshelf is at world (2.0, 3.0, -4.78). Shelf board is 0.06 thick centered
// on y=3.0, so its top surface is at y=3.03. Trophy origin = bottom of base,
// so origin Y = 3.03 puts the base flush on the shelf.

import { Trophy } from "./Trophy";

export function HackathonTrophy() {
  return (
    <Trophy
      position={[2.85, 3.03, -4.78]}
      hotspot="hackathonTrophy"
      metalColor="#c4cdd6"
      metalEmissive="#3b82f6"
      metalness={0.98}
      roughness={0.1}
      accentColor="#3b82f6"
      ringColor="#3b82f6"
      spotColor="#dbeafe"
      spotIntensity={2.2}
      spotDistance={4}
      tooltip="🏆 Hackathons & Tech Wins"
    />
  );
}

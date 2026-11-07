// Polished nickel/chrome cup with a blue anodised band — sits at the right
// end of the bookshelf above the desk.
//
// Bookshelf is at world (2.0, 3.0, -4.78). Shelf board is 0.06 thick centered
// on y=3.0, so its top surface is at y=3.03. Trophy origin = bottom of base,
// so origin Y = 3.03 puts the base flush on the shelf.
//
// The shelf only has ~0.42 m of depth in front of the wall, so this trophy is
// built at 0.8× and nudged 8 cm off the wall inside its (unchanged) group.

import { Trophy } from "./Trophy";

export function HackathonTrophy() {
  return (
    <Trophy
      position={[2.85, 3.03, -4.78]}
      hotspot="hackathonTrophy"
      finish="silver"
      plinth="blackAcrylic"
      metalColor="#dfe3e8"
      metalEmissive="#3b82f6"
      metalness={1}
      roughness={0.1}
      accentColor="#3b82f6"
      ringColor="#3b82f6"
      spotColor="#dbeafe"
      spotIntensity={2.2}
      spotDistance={4}
      tooltip="🏆 Hackathons & Tech Wins"
      bodyScale={0.8}
      bodyOffsetZ={0.08}
      plinthWidth={0.36}
      displayRadius={0.26}
    />
  );
}

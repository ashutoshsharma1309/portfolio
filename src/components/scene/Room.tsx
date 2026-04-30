import { Walls, BackWall, LeftWall } from "./Walls";
import { Window } from "./Window";
import { Desk } from "./Desk";
import { Chair } from "./Chair";
import { DrawerUnit } from "./DrawerUnit";
import { Bookshelf } from "./Bookshelf";
import { PhotoFrames } from "./PhotoFrames";
import { Whiteboard } from "./Whiteboard";
import { PowerliftingRack } from "./PowerliftingRack";
import { Beanbag } from "./Beanbag";
import { Plants } from "./Plants";
import { Rug } from "./Rug";
import { DustMotes } from "./DustMotes";
import { useDeviceTier } from "../../hooks/useDeviceTier";

export function Room() {
  const tier = useDeviceTier();
  return (
    <group>
      <Walls />
      {/* Back wall hosts the photo frames AND the window so they all stay
          glued to the wall regardless of any future responsive transforms. */}
      <BackWall>
        <Window />
        <PhotoFrames />
      </BackWall>
      <LeftWall>
        <Whiteboard />
      </LeftWall>
      <Rug />
      <Desk />
      <Chair />
      <DrawerUnit />
      <Bookshelf />
      <PowerliftingRack />
      <Beanbag />
      <Plants />
      {/* Dust motes are pure ambiance; skip on mobile to save fillrate. */}
      {tier !== "mobile" && <DustMotes />}
    </group>
  );
}

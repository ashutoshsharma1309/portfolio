import { Walls } from "./Walls";
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

export function Room() {
  return (
    <group>
      <Walls />
      <Window />
      <Rug />
      <Desk />
      <Chair />
      <DrawerUnit />
      <Bookshelf />
      <PhotoFrames />
      <Whiteboard />
      <PowerliftingRack />
      <Beanbag />
      <Plants />
      <DustMotes />
    </group>
  );
}

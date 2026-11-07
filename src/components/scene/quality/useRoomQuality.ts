import { useContext } from "react";
import { RoomQualityContext, type RoomQualityState } from "./context";

/** Current room rendering quality. Must be called inside the <Canvas> (under
 *  <RoomQualityProvider>, which Scene.tsx mounts). Outside it returns a
 *  'medium' fallback so it never throws. */
export function useRoomQuality(): RoomQualityState {
  return useContext(RoomQualityContext);
}

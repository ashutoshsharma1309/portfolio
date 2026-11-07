// Renders every static part of the lifting corner (rack frame, J-hooks,
// barbell + plates, bench, dumbbells) as one merged mesh per material.

import { useDisposable } from "../materials";
import { useRoomQuality } from "../quality";
import { bakeParts, type MatKey } from "./bake";
import { noRaycast } from "./constants";
import type { LiftingMaterials } from "./materials";
import { rackParts } from "./RackFrame";
import { barbellParts } from "./Barbell";
import { benchParts } from "./Bench";
import { dumbbellParts } from "./Dumbbells";

/** Only the big parts cast shadows (frame, plates, bar, pad, heads). */
const CASTERS: ReadonlySet<MatKey> = new Set<MatKey>([
  "frame",
  "accent",
  "shaft",
  "chrome",
  "plateRed",
  "plateBlue",
  "leather",
  "dbRubber",
]);
/** Dumbbells sit outside the tap-target box, so they stay clickable. */
const PICKABLE: ReadonlySet<MatKey> = new Set<MatKey>(["dbRubber"]);

export function LiftingStatic({ m }: { m: LiftingMaterials }) {
  const q = useRoomQuality();
  const low = q.tier === "low";
  const baked = useDisposable(
    () => bakeParts([...rackParts(low), ...barbellParts(low), ...benchParts(low), ...dumbbellParts(low)]),
    [low],
  );
  return (
    <group>
      {(Object.keys(baked) as MatKey[]).map((key) => (
        <mesh
          key={key}
          geometry={baked[key]}
          material={m[key]}
          castShadow={CASTERS.has(key)}
          receiveShadow
          {...(PICKABLE.has(key) ? {} : { raycast: noRaycast })}
        />
      ))}
    </group>
  );
}

import { useLayoutEffect, useRef } from "react";
import type { BufferGeometry, InstancedMesh, Material, Matrix4 } from "three";
import { noRaycast } from "./constants";

interface Props {
  geometry: BufferGeometry;
  material: Material;
  matrices: readonly Matrix4[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Keep raycasting (default off: the rack's tap target handles hits). */
  pickable?: boolean;
}

/** InstancedMesh whose transforms are written once (static parts). */
export function StaticInstances({ geometry, material, matrices, castShadow, receiveShadow, pickable }: Props) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
  }, [matrices, geometry, material]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, matrices.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      {...(pickable ? {} : { raycast: noRaycast })}
    />
  );
}

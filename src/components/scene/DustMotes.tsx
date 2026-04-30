import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, type Points as ThreePoints } from "three";

const COUNT = 18;

// Floating volume bounds (matches the visible room volume).
const X_RANGE = 8;
const Y_MIN = 0.4;
const Y_MAX = 4.5;
const Z_RANGE = 8;

// Tiny near-white particles drifting through the room. Cheap: 18 verts in a
// single Points draw call.
export function DustMotes() {
  const ref = useRef<ThreePoints>(null);

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * X_RANGE;
      positions[i * 3 + 1] = Y_MIN + Math.random() * (Y_MAX - Y_MIN);
      positions[i * 3 + 2] = (Math.random() - 0.5) * Z_RANGE;
      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.04;
      velocities[i * 3 + 1] = 0.02 + Math.random() * 0.03;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    }
    return { positions, velocities };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.getAttribute(
      "position",
    ) as BufferAttribute;
    const arr = attr.array as Float32Array;
    const clampedDt = Math.min(dt, 0.05);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 0] += velocities[i * 3 + 0] * clampedDt;
      arr[i * 3 + 1] += velocities[i * 3 + 1] * clampedDt;
      arr[i * 3 + 2] += velocities[i * 3 + 2] * clampedDt;
      // Wrap around when leaving the room volume.
      if (arr[i * 3 + 1] > Y_MAX) arr[i * 3 + 1] = Y_MIN;
      if (arr[i * 3 + 0] > X_RANGE / 2) arr[i * 3 + 0] = -X_RANGE / 2;
      if (arr[i * 3 + 0] < -X_RANGE / 2) arr[i * 3 + 0] = X_RANGE / 2;
      if (arr[i * 3 + 2] > Z_RANGE / 2) arr[i * 3 + 2] = -Z_RANGE / 2;
      if (arr[i * 3 + 2] < -Z_RANGE / 2) arr[i * 3 + 2] = Z_RANGE / 2;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.03}
        sizeAttenuation
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </points>
  );
}

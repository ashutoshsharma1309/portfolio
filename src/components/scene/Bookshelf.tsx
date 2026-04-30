// Floating shelf above the desk with books and a small plant.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

const SHELF_COLOR = "#3a2a1a";

function ShelfPlantFoliage() {
  const ref = useRef<Group>(null);
  // Distinct phase from the floor plants.
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = Math.sin(t * 0.8 + 4.3) * 0.04;
    ref.current.rotation.z = Math.cos(t * 0.6 + 4.3) * 0.03;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#3f8e4a" roughness={0.85} />
      </mesh>
      <mesh position={[0.08, 0.22, 0.04]} castShadow>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#4ea356" roughness={0.85} />
      </mesh>
    </group>
  );
}

const BOOK_COLORS = [
  "#a23a2a",
  "#2d4a8a",
  "#d4a847",
  "#1f4d2b",
  "#6e2d6a",
  "#102030",
  "#a05a30",
  "#2d2d2d",
];

export function Bookshelf() {
  return (
    <group position={[2.0, 3.0, -4.78]}>
      {/* Shelf board */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.06, 0.32]} />
        <meshStandardMaterial color={SHELF_COLOR} roughness={0.7} />
      </mesh>
      {/* Brackets */}
      <mesh position={[-1.0, -0.16, -0.06]}>
        <boxGeometry args={[0.05, 0.32, 0.18]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[1.0, -0.16, -0.06]}>
        <boxGeometry args={[0.05, 0.32, 0.18]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* Books */}
      {BOOK_COLORS.map((c, i) => {
        const w = 0.14 + ((i * 13) % 5) / 60;
        const h = 0.45 + ((i * 19) % 7) / 60;
        const x = -1.0 + i * 0.18;
        return (
          <mesh key={i} position={[x, h / 2 + 0.04, 0]} castShadow>
            <boxGeometry args={[w, h, 0.22]} />
            <meshStandardMaterial color={c} roughness={0.6} />
          </mesh>
        );
      })}

      {/* Small plant on the right end (foliage sways with the others) */}
      <group position={[0.95, 0.18, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.08, 0.18, 16]} />
          <meshStandardMaterial color="#b8633a" roughness={0.9} />
        </mesh>
        <ShelfPlantFoliage />
      </group>
    </group>
  );
}

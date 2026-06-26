// Office chair in front of the desk. Slowly rotates around its own Y-axis
// at 0.15 rad/sec — like someone just spun it and walked away.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const DARK = "#222";
const INITIAL_Y = -0.4;

export function Chair() {
  const groupRef = useRef<Group>(null);
  const reducedMotion = usePrefersReducedMotion();

  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.y =
      INITIAL_Y + state.clock.getElapsedTime() * 0.15;
  });

  return (
    <group ref={groupRef} position={[2.6, 0, -2.6]} rotation={[0, INITIAL_Y, 0]}>
      {/* 5 legs */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        const r = 0.36;
        return (
          <group
            key={i}
            position={[Math.cos(a) * r, 0.03, Math.sin(a) * r]}
            rotation={[0, -a, 0]}
          >
            <mesh castShadow>
              <boxGeometry args={[0.36, 0.05, 0.08]} />
              <meshStandardMaterial color={DARK} />
            </mesh>
            <mesh position={[0.18, 0, 0]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshStandardMaterial color="#444" />
            </mesh>
          </group>
        );
      })}
      {/* Hub */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.62, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Seat */}
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[0.6, 0.1, 0.55]} />
        <meshStandardMaterial color="#181818" roughness={0.7} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 1.2, -0.27]} castShadow>
        <boxGeometry args={[0.6, 0.85, 0.08]} />
        <meshStandardMaterial color="#181818" roughness={0.7} />
      </mesh>
      {/* Armrests */}
      <mesh position={[-0.34, 0.95, -0.05]} castShadow>
        <boxGeometry args={[0.06, 0.08, 0.32]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.34, 0.95, -0.05]} castShadow>
        <boxGeometry args={[0.06, 0.08, 0.32]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
}

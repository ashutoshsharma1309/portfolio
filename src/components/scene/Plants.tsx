// Two potted plants for ambiance. Foliage sways gently with a sine breeze.
// Each plant takes a phase offset so they don't move in unison.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface PotProps {
  position: [number, number, number];
  scale?: number;
  phase: number;
}

export function SwayingFoliage({ phase }: { phase: number }) {
  const ref = useRef<Group>(null);
  const reducedMotion = usePrefersReducedMotion();
  useFrame((state) => {
    if (!ref.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = Math.sin(t * 0.8 + phase) * 0.04;
    ref.current.rotation.z = Math.cos(t * 0.6 + phase) * 0.03;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.36, 18, 18]} />
        <meshStandardMaterial color="#3f8e4a" roughness={0.85} />
      </mesh>
      <mesh position={[0.18, 0.5, 0.06]} castShadow>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color="#4ea356" roughness={0.85} />
      </mesh>
      <mesh position={[-0.16, 0.46, -0.1]} castShadow>
        <sphereGeometry args={[0.18, 14, 14]} />
        <meshStandardMaterial color="#56b262" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Pot({ position, scale = 1, phase }: PotProps) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.5, 20]} />
        <meshStandardMaterial color="#b8633a" roughness={0.9} />
      </mesh>
      <SwayingFoliage phase={phase} />
    </group>
  );
}

export function Plants() {
  return (
    <group>
      <Pot position={[-4.2, 0.25, -3.8]} scale={1.2} phase={0.0} />
      <Pot position={[-1.0, 0.25, 2.0]} scale={1} phase={2.1} />
    </group>
  );
}

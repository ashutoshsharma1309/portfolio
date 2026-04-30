import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color } from "three";
import type { DirectionalLight } from "three";
import { Environment, ContactShadows } from "@react-three/drei";

const WARM = new Color("#fff5e0");
const COOL = new Color("#e8f0ff");
// Reusable scratch color so we don't allocate every frame.
const tmpColor = new Color();

export function Lighting() {
  const sunRef = useRef<DirectionalLight>(null);

  useFrame((state) => {
    if (!sunRef.current) return;
    const t = state.clock.getElapsedTime();
    // Period ≈ 12 seconds.
    const k = 0.5 + 0.5 * Math.sin((t / 12) * Math.PI * 2);
    // Intensity 0.85 → 1.0 (relative to the base 1.6 in props, scaled here).
    sunRef.current.intensity = 1.6 * (0.85 + k * 0.15);
    // Color lerp warm <-> cool.
    tmpColor.copy(WARM).lerp(COOL, k);
    sunRef.current.color.copy(tmpColor);
  });

  return (
    <>
      <ambientLight intensity={0.55} color="#fff4d6" />
      {/* Warm key light from the window side (+x), pulses subtly. */}
      <directionalLight
        ref={sunRef}
        position={[8, 10, 4]}
        intensity={1.6}
        color="#ffd9a3"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0005}
      />
      {/* Cool blue rim under the desk */}
      <pointLight
        position={[2, 0.4, -3]}
        intensity={2.2}
        distance={4.5}
        color="#4ea8ff"
      />
      {/* Soft fill from camera side */}
      <pointLight position={[6, 5, 6]} intensity={0.45} color="#fff4d6" />

      <Environment preset="apartment" />

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.45}
        scale={20}
        blur={2.4}
        far={6}
      />
    </>
  );
}

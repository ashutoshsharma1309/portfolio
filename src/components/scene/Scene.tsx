import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace, PCFSoftShadowMap } from "three";
import { Lighting } from "./Lighting";
import { Room } from "./Room";
import { CameraRig } from "./CameraRig";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { useSceneStore } from "../../store/useSceneStore";

export function Scene() {
  const tier = useDeviceTier();
  const setSceneStatus = useSceneStore((s) => s.setSceneStatus);
  const dpr: [number, number] =
    tier === "mobile" ? [1, 1.5] : tier === "tablet" ? [1, 2] : [1.25, 2.5];

  return (
    <Canvas
      // Signal the app shell once the WebGL context + scene graph exist so the
      // loading screen waits for a real frame rather than a fixed timer.
      onCreated={() => setSceneStatus("ready")}
      shadows={{ type: PCFSoftShadowMap }}
      dpr={dpr}
      camera={{
        position: tier === "mobile" ? [13, 11, 13] : [16, 12, 16],
        fov: tier === "mobile" ? 52 : 36,
        near: 0.1,
        far: 100,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        outputColorSpace: SRGBColorSpace,
      }}
      style={{ background: "#0b1018" }}
    >
      <Suspense fallback={null}>
        <Lighting />
        <Room />
        <CameraRig />
      </Suspense>
    </Canvas>
  );
}

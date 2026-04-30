import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace, PCFSoftShadowMap } from "three";
import { Lighting } from "./Lighting";
import { Room } from "./Room";
import { CameraRig } from "./CameraRig";

export function Scene() {
  return (
    <Canvas
      shadows={{ type: PCFSoftShadowMap }}
      dpr={[1.25, 2.5]}
      camera={{ position: [16, 12, 16], fov: 36, near: 0.1, far: 100 }}
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

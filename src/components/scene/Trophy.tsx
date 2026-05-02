// Shared trophy geometry. SportsTrophy and HackathonTrophy both render this
// with different metal colors + accent / ring / spotlight palettes.
//
// Scene layout in local coords (origin = bottom of base):
//   base center            y = 0.10  (height 0.20)
//   stem center            y = 0.35  (height 0.30)
//   cup center             y = 0.75  (height 0.50)
//   cup rim                y = 1.00
//   handles                y = 0.75
//   floor ring (sibling)   y = 0.02  (sits on the surface, doesn't bob)
//   spotlight (sibling)    y = 3.50  (sibling, doesn't bob)

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { animated, config, useSpring } from "@react-spring/three";
import { Object3D } from "three";
import type { Group, MeshStandardMaterial } from "three";
import { useHotspotHover } from "../../hooks/useHotspotHover";
import { useSceneStore } from "../../store/useSceneStore";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import type { HotspotKey } from "../../config/cameraPositions";

interface TrophyProps {
  position: [number, number, number];
  hotspot: Extract<HotspotKey, "sportsTrophy" | "hackathonTrophy">;
  metalColor: string;
  metalEmissive: string;
  metalness?: number;
  roughness?: number;
  /** Optional thin glowing strip around the top of the base. */
  accentColor?: string;
  /** Color of the floor pedestal ring under the trophy. */
  ringColor: string;
  /** Color of the dedicated spotlight shining down on the trophy. */
  spotColor: string;
  /** Spotlight intensity (warm white usually 2.5, cool blue ~2.2). */
  spotIntensity?: number;
  /** Distance for the spotlight. */
  spotDistance?: number;
  tooltip?: string;
}

const BASE_COLOR = "#3a2818";

export function Trophy({
  position,
  hotspot,
  metalColor,
  metalEmissive,
  metalness = 0.95,
  roughness = 0.15,
  accentColor,
  ringColor,
  spotColor,
  spotIntensity = 2.5,
  spotDistance = 5,
  tooltip,
}: TrophyProps) {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover(hotspot);
  const tier = useDeviceTier();

  const bobRef = useRef<Group>(null);
  const ringMatRef = useRef<MeshStandardMaterial>(null);

  // Spring-driven hover values: scale, emissive bump, ring scale.
  const { scale, glowBoost, ringScale } = useSpring({
    scale: hovered ? 1.18 : 1,
    glowBoost: hovered ? 0.6 : 0,
    ringScale: hovered ? 1.15 : 1,
    config: config.wobbly,
  });

  // Spotlight target — created once and added to the local group via
  // <primitive>. Sits 0.5 above the trophy base, so the cone aims at the cup.
  const lightTarget = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    lightTarget.position.set(0, 0.5, 0);
  }, [lightTarget]);

  // Per-frame: vertical bob (faster on hover) + ring emissive pulse.
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (bobRef.current) {
      const speed = hovered ? 2.4 : 1.2;
      // Always non-negative so the trophy never sinks into the surface.
      bobRef.current.position.y = (Math.sin(t * speed) + 1) * 0.04;
    }
    if (ringMatRef.current) {
      const pulse = 0.7 + Math.sin(t * 1.5) * 0.3; // 0.4 → 1.0
      ringMatRef.current.emissiveIntensity = pulse * 1.5; // 0.6 → 1.5
    }
  });

  const castSpotShadow = tier === "desktop";

  return (
    <group position={position}>
      {/* Spotlight + invisible target object (both as siblings of the bob group
          so neither moves when the trophy bobs). */}
      <primitive object={lightTarget} />
      <spotLight
        position={[0, 3.5, 0]}
        target={lightTarget}
        angle={0.45}
        penumbra={0.6}
        intensity={spotIntensity}
        color={spotColor}
        distance={spotDistance}
        castShadow={castSpotShadow}
      />

      {/* Pulsing pedestal ring on the surface (does NOT bob with the trophy). */}
      <animated.mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={ringScale}
      >
        <torusGeometry args={[0.5, 0.025, 8, 64]} />
        <meshStandardMaterial
          ref={ringMatRef}
          color="#0a0a0a"
          emissive={ringColor}
          emissiveIntensity={1.2}
          roughness={0.4}
        />
      </animated.mesh>

      {/* The whole trophy bobs as one unit. */}
      <group ref={bobRef}>
        <animated.group scale={scale}>
          {/* Invisible enlarged hit volume for finger taps. */}
          <mesh
            position={[0, 0.55, 0]}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            onClick={(e) => {
              e.stopPropagation();
              setHotspot(hotspot);
            }}
          >
            <boxGeometry args={[1.0, 1.2, 1.0]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          {/* Base plinth */}
          <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.2, 0.7]} />
            <meshStandardMaterial color={BASE_COLOR} roughness={0.8} metalness={0} />
          </mesh>

          {/* Optional accent strip around the top of the base */}
          {accentColor && (
            <mesh position={[0, 0.21, 0]}>
              <boxGeometry args={[0.72, 0.025, 0.72]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={0.85}
                roughness={0.3}
              />
            </mesh>
          )}

          {/* Stem */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.16, 0.3, 16]} />
            <animated.meshStandardMaterial
              color={metalColor}
              metalness={metalness}
              roughness={roughness}
              emissive={metalEmissive}
              emissiveIntensity={glowBoost.to((g) => 0.45 + g)}
            />
          </mesh>

          {/* Cup body */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.2, 0.5, 24]} />
            <animated.meshStandardMaterial
              color={metalColor}
              metalness={metalness}
              roughness={roughness}
              emissive={metalEmissive}
              emissiveIntensity={glowBoost.to((g) => 0.45 + g)}
            />
          </mesh>

          {/* Cup rim */}
          <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.3, 0.04, 12, 32]} />
            <animated.meshStandardMaterial
              color={metalColor}
              metalness={metalness}
              roughness={roughness}
              emissive={metalEmissive}
              emissiveIntensity={glowBoost.to((g) => 0.45 + g)}
            />
          </mesh>

          {/* Two side handles */}
          <mesh
            position={[-0.3, 0.75, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <torusGeometry args={[0.13, 0.03, 8, 24]} />
            <animated.meshStandardMaterial
              color={metalColor}
              metalness={metalness}
              roughness={roughness}
              emissive={metalEmissive}
              emissiveIntensity={glowBoost.to((g) => 0.45 + g)}
            />
          </mesh>
          <mesh
            position={[0.3, 0.75, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <torusGeometry args={[0.13, 0.03, 8, 24]} />
            <animated.meshStandardMaterial
              color={metalColor}
              metalness={metalness}
              roughness={roughness}
              emissive={metalEmissive}
              emissiveIntensity={glowBoost.to((g) => 0.45 + g)}
            />
          </mesh>
        </animated.group>
      </group>

      {/* Hover tooltip — desktop only */}
      {hovered && tooltip && tier === "desktop" && (
        <Html
          position={[0, 1.35, 0]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[10, 0]}
        >
          <TooltipPill>{tooltip}</TooltipPill>
        </Html>
      )}
    </group>
  );
}

function TooltipPill({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(10, 22, 40, 0.95)",
        color: "#f4b942",
        fontFamily: "'Russo One', sans-serif",
        fontSize: 12,
        letterSpacing: "0.08em",
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid rgba(244,185,66,0.4)",
        whiteSpace: "nowrap",
        animation: "trophyTooltipFade 150ms ease-out",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

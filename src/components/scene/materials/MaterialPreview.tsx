// DEV-ONLY swatch board: every factory + worn-metal preset on simple shapes,
// laid out in front of the room (z ≈ 7.5). Mounted by Scene.tsx when the URL
// has ?materialPreview (dev server only). Look at it with
//   window.__setRoomCamera([0, 2.2, 12.5], [0, 0.6, 7.5], 40)
// Hover a swatch to see useHoverMix + applyHoverEmissive.

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Material } from "three";
import { useRoomQuality } from "../quality";
import {
  createBrushedSteel,
  createCeramic,
  createFabric,
  createKnurledSteel,
  createLeather,
  createPlaster,
  createPlastic,
  createPowderCoat,
  createRubber,
  createWood,
  createWornMetalMaterial,
} from "./factories";
import { useDisposable } from "./useDisposable";
import { applyHoverEmissive, useHoverMix } from "./useHoverMix";

const Z = 7.5;
const R = 0.3;
const SPHERE_W = 2 * Math.PI * R;
const SPHERE_H = Math.PI * R;

function Swatch({
  material,
  position,
  shape,
}: {
  material: Material;
  position: [number, number, number];
  shape: "sphere" | "post" | "bar" | "disc";
}) {
  const [hovered, setHovered] = useState(false);
  const mix = useHoverMix(hovered);
  const matRef = useRef(material);
  matRef.current = material;
  useFrame(() => applyHoverEmissive(matRef.current, mix.current));
  return (
    <mesh
      position={position}
      material={material}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      rotation={shape === "bar" || shape === "disc" ? [0, 0, Math.PI / 2] : [0, 0, 0]}
    >
      {shape === "sphere" && <sphereGeometry args={[R, 48, 24]} />}
      {shape === "post" && <boxGeometry args={[0.16, 1.4, 0.16]} />}
      {shape === "bar" && <cylinderGeometry args={[0.03, 0.03, 1.2, 32]} />}
      {shape === "disc" && <cylinderGeometry args={[0.25, 0.25, 0.06, 48]} />}
    </mesh>
  );
}

export function MaterialPreview() {
  const q = useRoomQuality();
  const m = useDisposable(
    () => ({
      floor: createWood(q, { widthM: 11, heightM: 3 }),
      plaster: createPlaster(q, { widthM: SPHERE_W, heightM: SPHERE_H, color: "#e6dfd3" }),
      rubber: createRubber(q, { widthM: SPHERE_W, heightM: SPHERE_H }),
      leather: createLeather(q, { widthM: SPHERE_W, heightM: SPHERE_H, color: "#1a1a1a" }),
      fabric: createFabric(q, { widthM: SPHERE_W, heightM: SPHERE_H, color: "#2b4a6f" }),
      brushed: createBrushedSteel(q, { widthM: SPHERE_W, heightM: SPHERE_H }),
      powder: createPowderCoat(q, { widthM: SPHERE_W, heightM: SPHERE_H, color: "#b3261e" }),
      plastic: createPlastic(q, { widthM: SPHERE_W, heightM: SPHERE_H, color: "#222326" }),
      ceramic: createCeramic(q, { widthM: SPHERE_W, heightM: SPHERE_H }),
      wood: createWood(q, { widthM: SPHERE_W, heightM: SPHERE_H, color: "#9a7a62" }),
      knurl: createKnurledSteel(q, { circumferenceM: 2 * Math.PI * 0.03, lengthM: 1.2 }),
      rackPost: createWornMetalMaterial(q, "darkPowderCoat", {
        hotspots: [{ position: [-4.2, 1.05, Z], radius: 0.15 }],
        seed: 2,
      }),
      rackPost2: createWornMetalMaterial(q, "darkPowderCoat", { seed: 5, color: "#9e1f19" }),
      bar: createWornMetalMaterial(q, "brushedSteel"),
      chrome: createWornMetalMaterial(q, "chrome"),
      iron: createWornMetalMaterial(q, "castIron"),
    }),
    [q],
  );
  const spheres: [Material, number][] = [
    [m.wood, -3],
    [m.plaster, -2.25],
    [m.rubber, -1.5],
    [m.leather, -0.75],
    [m.fabric, 0],
    [m.plastic, 0.75],
    [m.ceramic, 1.5],
    [m.powder, 2.25],
    [m.brushed, 3],
  ];
  return (
    <group>
      <mesh material={m.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, Z]} receiveShadow>
        <planeGeometry args={[11, 3]} />
      </mesh>
      {spheres.map(([mat, x]) => (
        <Swatch key={x} material={mat} position={[x, R + 0.01, Z]} shape="sphere" />
      ))}
      <Swatch material={m.rackPost} position={[-4.2, 0.7, Z]} shape="post" />
      <Swatch material={m.rackPost2} position={[-3.8, 0.7, Z + 0.6]} shape="post" />
      <Swatch material={m.knurl} position={[0, 1.15, Z + 0.7]} shape="bar" />
      <Swatch material={m.bar} position={[-1.5, 1.15, Z + 0.7]} shape="bar" />
      <Swatch material={m.chrome} position={[1.5, 1.15, Z + 0.7]} shape="bar" />
      <Swatch material={m.iron} position={[3.9, 0.3, Z + 0.6]} shape="disc" />
    </group>
  );
}

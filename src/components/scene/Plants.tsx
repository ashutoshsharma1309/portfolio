// Two potted plants for ambiance. Foliage sways gently with a sine breeze.
// Each plant takes a phase offset so they don't move in unison.
//
// Real build: an unglazed terracotta pot (lathe with rolled rim, wall
// thickness, procedural clay texture with mineral bloom near the rim and
// water staining at the foot) on a matching saucer, a domed potting-mix
// surface (peat + perlite texture), and a rosette of 30–40 arching leaves
// (one InstancedMesh per plant: shaped, V-folded, drooping blades with vein
// texture and per-leaf colour variation) on instanced petioles. Leaves also
// flutter individually (vertex shader, phase per instance) on top of the
// original whole-plant sway; both stop under prefers-reduced-motion.

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Group,
  type IUniform,
} from "three";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useRoomQuality } from "./quality";
import { useDisposable } from "./materials";
import { arcLathe, densify, leafGeometry } from "./decor/decorGeometry";
import { decorRng, useDecorTextures } from "./decor/decorTextures";

/** Top of the floor boards (Walls.tsx planks: 0.04 thick on y=0). */
const FLOOR_Y = 0.04;

interface PotProps {
  position: [number, number, number];
  scale?: number;
  phase: number;
}

// --- Pot (local units: pot is 0.5 tall, rim radius ≈ 0.285) ---------------
const POT_BOTTOM = -0.25;
const SOIL_Y = 0.195;
const POT_PROFILE: [number, number][] = [
  [0.0, -0.25],
  [0.185, -0.25],
  [0.203, -0.247],
  [0.213, -0.24],
  [0.218, -0.228],
  [0.25, 0.14],
  [0.262, 0.146],
  [0.279, 0.151],
  [0.285, 0.162],
  [0.286, 0.235],
  [0.283, 0.247],
  [0.275, 0.253],
  [0.262, 0.252],
  [0.256, 0.244],
  [0.254, 0.2],
  [0.25, SOIL_Y - 0.01],
];
const SAUCER_PROFILE: [number, number][] = [
  // Single rolled lip (the old profile zig-zagged into a second, detached
  // ridge inside the rim).
  [0.0, -0.25],
  [0.24, -0.25],
  [0.262, -0.247],
  [0.274, -0.236],
  [0.282, -0.219],
  [0.286, -0.212],
  [0.29, -0.214],
  [0.285, -0.222],
  [0.272, -0.238],
  [0.256, -0.2435],
  [0.0, -0.2435],
];

interface LeafInstance {
  matrix: Matrix4;
  color: Color;
  petiole: Matrix4;
}

/** Rosette layout: inner leaves upright on long petioles, outer ones arching
 *  out low. Deterministic per seed. */
function layoutRosette(count: number, seed: number): LeafInstance[] {
  const r = decorRng(seed);
  const out: LeafInstance[] = [];
  const up = new Vector3(0, 1, 0);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const k = i / (count - 1); // 0 = inner/young, 1 = outer/old
    const az = i * golden + (r() - 0.5) * 0.4;
    const hd = new Vector3(Math.cos(az), 0, Math.sin(az));
    // petiole: from soil near the crown to the leaf base
    const crown = new Vector3((r() - 0.5) * 0.05, SOIL_Y, (r() - 0.5) * 0.05);
    const petLen = 0.16 + (1 - k) * 0.2 + r() * 0.06;
    const petElev = (82 - k * 40 + (r() - 0.5) * 10) * (Math.PI / 180);
    const petDir = hd.clone().multiplyScalar(Math.cos(petElev)).addScaledVector(up, Math.sin(petElev)).normalize();
    const base = crown.clone().addScaledVector(petDir, petLen);
    // leaf blade direction: a bit flatter than the petiole
    const elev = (62 - k * 52 + (r() - 0.5) * 14) * (Math.PI / 180);
    const dir = hd.clone().multiplyScalar(Math.cos(elev)).addScaledVector(up, Math.sin(elev)).normalize();
    // basis: Y = blade direction, Z = upper surface (≈ up), X = Y × Z
    const z = up.clone().addScaledVector(dir, -up.dot(dir)).normalize();
    const x = new Vector3().crossVectors(dir, z).normalize();
    const roll = (r() - 0.5) * 0.5;
    const rollQ = new Quaternion().setFromAxisAngle(dir, roll);
    x.applyQuaternion(rollQ);
    z.applyQuaternion(rollQ);
    const len = 0.24 + (1 - Math.abs(k - 0.55)) * 0.1 + r() * 0.05;
    const m = new Matrix4().makeBasis(x, dir, z);
    m.scale(new Vector3(len, len, len));
    m.setPosition(base);
    const hue = 0.29 + (r() - 0.5) * 0.04;
    const light = 0.82 + r() * 0.3 - (1 - k) * 0.0 + (k < 0.15 ? 0.12 : 0);
    const color = new Color().setHSL(hue, 0.24 + r() * 0.12, 0.5).multiplyScalar(light * 1.3);
    // young leaves are lighter/yellower
    if (k < 0.15) color.lerp(new Color("#c9e08f"), 0.3);
    const pq = new Quaternion().setFromUnitVectors(up, petDir);
    const petiole = new Matrix4().compose(
      crown.clone().addScaledVector(petDir, petLen / 2),
      pq,
      new Vector3(1, petLen, 1),
    );
    out.push({ matrix: m, color, petiole });
  }
  return out;
}

const flutterTime: IUniform<number> = { value: 0 };

/** Adds a small per-leaf flutter (rotation-free bend near the tip, phase from
 *  the instance translation) to a leaf material. Shares one time uniform. */
function addFlutter(mat: MeshStandardMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFlutterTime = flutterTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uFlutterTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
#ifdef USE_INSTANCING
  float fph = instanceMatrix[3].x * 37.0 + instanceMatrix[3].z * 53.0;
  float tip = uv.y * uv.y;
  transformed.z += sin(uFlutterTime * 1.7 + fph) * 0.035 * tip;
  transformed.x += sin(uFlutterTime * 1.3 + fph * 1.3) * 0.015 * tip;
#endif`,
      );
  };
  mat.customProgramCacheKey = () => "decor-leaf-flutter";
}

export function SwayingFoliage({ phase, seed = 1, count = 34 }: { phase: number; seed?: number; count?: number }) {
  const ref = useRef<Group>(null);
  const leafRef = useRef<InstancedMesh>(null);
  const petRef = useRef<InstancedMesh>(null);
  const reducedMotion = usePrefersReducedMotion();
  const q = useRoomQuality();
  const leafTex = useDecorTextures("leaf", 256, q.anisotropy);
  const n = q.tier === "low" ? Math.round(count * 0.7) : count;

  const geo = useDisposable(
    () => ({
      leaf: leafGeometry({ aspect: 0.42, fold: 0.32, arch: 0.75, widest: 0.42, ripple: 0.05 }, q.tier === "low" ? 6 : 9, 4),
      petiole: new CylinderGeometry(0.0045, 0.0065, 1, 5, 1, true),
    }),
    [q.tier],
  );
  const mats = useDisposable(() => {
    const leaf = new MeshStandardMaterial({
      map: leafTex.map ?? null,
      roughness: 0.48,
      metalness: 0,
      side: DoubleSide,
      envMapIntensity: 0.8,
    });
    addFlutter(leaf);
    const petiole = new MeshStandardMaterial({ color: "#5d7f3a", roughness: 0.6 });
    return { leaf, petiole };
  }, [leafTex]);

  const leaves = useMemo(() => layoutRosette(n, seed), [n, seed]);
  useLayoutEffect(() => {
    const lm = leafRef.current;
    const pm = petRef.current;
    if (!lm || !pm) return;
    leaves.forEach((l, i) => {
      lm.setMatrixAt(i, l.matrix);
      lm.setColorAt(i, l.color);
      pm.setMatrixAt(i, l.petiole);
    });
    lm.instanceMatrix.needsUpdate = true;
    if (lm.instanceColor) lm.instanceColor.needsUpdate = true;
    pm.instanceMatrix.needsUpdate = true;
    lm.computeBoundingSphere();
    pm.computeBoundingSphere();
  }, [leaves, geo, mats]);

  useFrame((state) => {
    if (!ref.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = Math.sin(t * 0.8 + phase) * 0.04;
    ref.current.rotation.z = Math.cos(t * 0.6 + phase) * 0.03;
    flutterTime.value = t;
  });

  return (
    <group ref={ref} position={[0, SOIL_Y, 0]}>
      <group position={[0, -SOIL_Y, 0]}>
        <instancedMesh ref={leafRef} args={[geo.leaf, mats.leaf, n]} castShadow receiveShadow />
        <instancedMesh ref={petRef} args={[geo.petiole, mats.petiole, n]} castShadow />
      </group>
    </group>
  );
}

function Pot({ position, scale = 1, phase, seed }: PotProps & { seed: number }) {
  const q = useRoomQuality();
  const clay = useDecorTextures("clay", q.textureSize, q.anisotropy);
  const soil = useDecorTextures("soil", q.textureSize, q.anisotropy);
  const seg = q.tier === "high" ? 64 : q.tier === "medium" ? 44 : 28;

  const geo = useDisposable(() => {
    // Pot UV: U ×3 around (≈1.7 m circumference / 0.55 m tile), V = arc.
    const pot = arcLathe(densify(POT_PROFILE, 0.04), seg, { uScale: 3 });
    const saucer = arcLathe(SAUCER_PROFILE, seg, { uScale: 3, vScale: 0.4 });
    // Domed, slightly lumpy soil disc
    const soilGeo = new CylinderGeometry(0.252, 0.252, 0.001, seg, 1);
    const pos = soilGeo.getAttribute("position");
    const r = decorRng(seed + 9);
    const bumps = Array.from({ length: 6 }, () => [(r() - 0.5) * 0.35, (r() - 0.5) * 0.35, 0.004 + r() * 0.008]);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (pos.getY(i) <= 0) continue;
      const d = Math.hypot(x, z) / 0.252;
      let y = 0.012 * (1 - d * d);
      for (const [bx, bz, bh] of bumps) y += bh * Math.exp(-((x - bx) ** 2 + (z - bz) ** 2) / 0.004);
      pos.setY(i, y);
    }
    soilGeo.computeVertexNormals();
    return { pot, saucer, soil: soilGeo };
  }, [seg, seed]);

  const mats = useDisposable(
    () => ({
      clay: new MeshStandardMaterial({
        map: clay.map ?? null,
        normalMap: clay.normalMap ?? null,
        roughnessMap: clay.roughnessMap ?? null,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.7,
      }),
      soil: new MeshStandardMaterial({
        map: soil.map ?? null,
        normalMap: soil.normalMap ?? null,
        roughnessMap: soil.roughnessMap ?? null,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.5,
      }),
    }),
    [clay, soil],
  );

  // Keep the old group position/scale; lift the pot so its foot sits on the
  // floor boards instead of sinking into them.
  const lift = (FLOOR_Y - position[1]) / scale - POT_BOTTOM;

  return (
    <group position={position} scale={scale}>
      <group position={[0, lift, 0]}>
        <mesh geometry={geo.saucer} material={mats.clay} receiveShadow castShadow />
        <mesh geometry={geo.pot} material={mats.clay} position={[0, 0.006, 0]} castShadow receiveShadow />
        <mesh geometry={geo.soil} material={mats.soil} position={[0, SOIL_Y - 0.004, 0]} receiveShadow />
        <SwayingFoliage phase={phase} seed={seed} count={seed === 1 ? 40 : 32} />
      </group>
    </group>
  );
}

export function Plants() {
  return (
    <group>
      <Pot position={[-4.2, 0.25, -3.8]} scale={1.2} phase={0.0} seed={1} />
      <Pot position={[-1.0, 0.25, 2.0]} scale={1} phase={2.1} seed={2} />
    </group>
  );
}

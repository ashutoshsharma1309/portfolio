// L-shaped desk against the back wall, right of center.
// Two monitors on top, keyboard, mouse, mug, notebook stack.
// Clicking anywhere on the desk opens the About panel.
//
// Built at real scale: a solid walnut L top (one bevelled extrusion, grain
// running along the long arm, texture at physical scale) on a black
// powder-coated steel frame with rails, levelling glides and a cable tray;
// two ~40" monitors on aluminium VESA stands; full-size keyboard with
// instanced keycaps; cloth desk mat; ceramic mug; hardcover notebooks; and the
// soft blue LED strip under the back edge (the desk's blue rim light).

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import {
  DataTexture,
  LinearFilter,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  RGBAFormat,
  type Mesh,
  type Sprite,
  type SpriteMaterial,
} from "three";
import { useHotspotHover } from "../../hooks/useHotspotHover";
import { useSceneStore } from "../../store/useSceneStore";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import {
  HOVER_COLOR,
  applyHoverEmissive,
  createBrushedSteel,
  createCeramic,
  createFabric,
  createPlastic,
  createWornMetalMaterial,
  useDisposable,
  useHoverMix,
} from "./materials";
import { useRoomQuality } from "./quality";
import { Books, flatBook, type BookSpec } from "./workspace/Books";
import { FLOOR_Y, cyl, geometryGroup, mergeParts, place, rbox, roundedPolygonShape, slab } from "./workspace/geometry";
import { Monitor, SCREEN_W, createMonitorGeometry } from "./workspace/Monitor";
import {
  DESK_MAT,
  Keyboard,
  createDeskMatGeometry,
  createKeyboardGeometry,
  createMouseGeometry,
  createMugGeometry,
} from "./workspace/DeskProps";
import { createWalnut } from "./workspace/veneer";
import { createBlueDesktopTexture, createTerminalTexture } from "./workspace/screenTextures";

// Phosphor green, a touch softer than pure #7CFC00 so it reads as an LCD
// terminal rather than a neon sign.
const TERMINAL_GREEN = "#7fe35a";

const TYPEWRITER_SNIPPETS = [
  "deploying to production...",
  "build successful ✓",
  "watching for changes...",
  "tests passed (42/42) ✓",
  "vite ready in 247 ms",
];

const DESK_ORIGIN: [number, number, number] = [1.6, 0, -4.2];
const TOP_Y = 0.81; // desk surface
const TOP_T = 0.04;
const UNDER_Y = TOP_Y - TOP_T;

// L outline in desk-local (x, z): long arm x −0.85..2.8 / z −0.5..0.5, short
// arm x −0.85..0.05 / z up to 1.4 (toward the room).
const L_POINTS: readonly (readonly [number, number])[] = [
  [-0.85, -0.5],
  [2.8, -0.5],
  [2.8, 0.5],
  [0.05, 0.5],
  [0.05, 1.4],
  [-0.85, 1.4],
];
const L_RADII = [0.012, 0.012, 0.03, 0.05, 0.03, 0.03];

// Five legs (desk-local x, z) — same footprint as before.
const LEGS: readonly (readonly [number, number])[] = [
  [-0.2, -0.4],
  [2.7, -0.4],
  [2.7, 0.4],
  [-0.8, 1.3],
  [0.0, 1.3],
];

// Notebook stack on the short arm (lying flat, spines toward the room).
const NOTEBOOKS: readonly BookSpec[] = [
  flatBook([0, 0.011, 0], 0.06, [0.022, 0.3, 0.232], "#1e3a5f"),
  flatBook([0.012, 0.0335, -0.012], -0.07, [0.023, 0.3, 0.232], "#7a2e1f", "#c9a95a"),
  flatBook([-0.01, 0.055, 0.014], 0.16, [0.02, 0.3, 0.232], "#2d2d2d", "#b8b8b8"),
];

export function Desk() {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover("desk");
  const tier = useDeviceTier();
  const q = useRoomQuality();
  const low = q.tier === "low";
  const hoverMix = useHoverMix(hovered);

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHotspot("aboutFrames");
  };

  const mats = useDisposable(() => {
    const blue = createBlueDesktopTexture();
    const term = createTerminalTexture();
    return {
      // Glued-up walnut panel, grain along x. The extrusion's UVs are in
      // metres, so the default repeat gives physical scale.
      top: createWalnut(q, { clearcoat: 0.2 }),
      steel: createWornMetalMaterial(q, "darkPowderCoat", {
        color: "#17181a",
        roughness: 0.52,
        wear: 0.08,
        rust: 0,
        scratches: 0.3,
        hotspots: LEGS.map(([x, z]) => ({ position: [DESK_ORIGIN[0] + x, 0.1, DESK_ORIGIN[2] + z] as [number, number, number], radius: 0.12 })),
        seed: 11,
      }),
      monitorPlastic: createPlastic(q, { color: "#1b1c1f", roughness: 0.62, widthM: 0.5, heightM: 0.3 }),
      aluminium: createBrushedSteel(q, { color: "#a9adb3", roughness: 0.34, widthM: 0.2, heightM: 0.2 }),
      cable: new MeshStandardMaterial({ color: "#121212", roughness: 0.55 }),
      blueScreen: new MeshStandardMaterial({
        color: "#020304",
        roughness: 0.22,
        metalness: 0,
        emissive: "#ffffff",
        emissiveMap: blue,
        emissiveIntensity: 0.9,
        envMapIntensity: 0.55,
      }),
      termScreen: new MeshStandardMaterial({
        color: "#020304",
        roughness: 0.22,
        metalness: 0,
        emissive: "#ffffff",
        emissiveMap: term,
        emissiveIntensity: 1,
        envMapIntensity: 0.55,
      }),
      mat: createFabric(q, { color: "#2b2d31", widthM: 1, heightM: 1, roughness: 0.92, sheen: 0.4 }),
      kbCase: createPlastic(q, { color: "#1d1e21", roughness: 0.5, widthM: 0.45, heightM: 0.15 }),
      // Keyboard backlight (kept from the original blue key glow, dimmer):
      // the plate itself stays dark; the light shows as a thin halo leaking
      // around each keycap (instanced quads under the caps).
      kbPlate: new MeshStandardMaterial({ color: "#0d0e11", roughness: 0.6, emissive: "#7eb6ff", emissiveIntensity: 0.03 }),
      kbGlow: new MeshBasicMaterial({ color: "#2e4d7a" }),
      keycap: createPlastic(q, { color: "#ffffff", roughness: 0.58, widthM: 0.02, heightM: 0.02 }),
      mouse: createPlastic(q, { color: "#1a1b1e", roughness: 0.42, widthM: 0.07, heightM: 0.12 }),
      rubber: new MeshStandardMaterial({ color: "#2a2b2e", roughness: 0.85 }),
      mug: createCeramic(q, { color: "#e2a83c", widthM: 0.26, heightM: 0.1 }),
      coffee: new MeshStandardMaterial({ color: "#2a160b", roughness: 0.12, envMapIntensity: 0.9 }),
      led: new MeshBasicMaterial({ color: "#6f9fd8" }),
      blue,
      term,
    };
  }, [q]);

  const geo = useDisposable(() => {
    const seg = low ? 2 : 3;
    const radial = low ? 10 : 16;
    const top = slab(roundedPolygonShape(L_POINTS.map(([x, z]) => [x, -z] as const), L_RADII), TOP_T, 0.005, low ? 3 : 6, low ? 2 : 3);
    place(top, [0, UNDER_Y, 0]);

    // Steel frame: legs + mounting plates, rails, cable tray.
    const legBottom = FLOOR_Y + 0.022;
    const legH = UNDER_Y - legBottom;
    const steel = [];
    for (const [x, z] of LEGS) {
      steel.push(place(rbox(0.06, legH, 0.06, 0.007, seg), [x, legBottom + legH / 2, z]));
      steel.push(place(rbox(0.11, 0.008, 0.11, 0.003, 1), [x, UNDER_Y - 0.004, z]));
      // Levelling glide: foot disc + threaded stem (merged into the frame).
      steel.push(place(cyl(0.024, 0.026, 0.01, radial), [x, FLOOR_Y + 0.005, z]));
      steel.push(place(cyl(0.007, 0.007, 0.014, 8), [x, FLOOR_Y + 0.016, z]));
    }
    const railY = UNDER_Y - 0.026;
    const railX = (x0: number, x1: number, z: number) =>
      steel.push(place(rbox(x1 - x0, 0.05, 0.035, 0.005, seg), [(x0 + x1) / 2, railY, z]));
    const railZ = (z0: number, z1: number, x: number) =>
      steel.push(place(rbox(0.035, 0.05, z1 - z0, 0.005, seg), [x, railY, (z0 + z1) / 2]));
    railX(-0.8, 2.7, -0.42);
    railX(0.0, 2.7, 0.42);
    railX(-0.8, 0.0, 1.3);
    railZ(-0.42, 0.42, 2.7);
    railZ(-0.42, 1.3, -0.8);
    railZ(0.42, 1.3, 0.0);
    // Cable tray (sheet-steel U channel) under the back edge.
    steel.push(place(rbox(1.5, 0.004, 0.12, 0.0015, 1), [1.2, 0.64, -0.36]));
    steel.push(place(rbox(1.5, 0.06, 0.004, 0.0015, 1), [1.2, 0.668, -0.3]));
    steel.push(place(rbox(1.5, 0.06, 0.004, 0.0015, 1), [1.2, 0.668, -0.42]));
    for (const tx of [0.6, 1.8]) steel.push(place(rbox(0.03, 0.09, 0.004, 0.0015, 1), [tx, 0.715, -0.42]));

    // Blue LED strip on the underside of the back rail, facing the wall.
    const led = place(rbox(2.9, 0.006, 0.01, 0.002, 1), [0.95, railY - 0.028, -0.445]);

    // Mouse sits on the mat; its geometry is shared with nothing else.
    const mouse = createMouseGeometry(low);
    return {
      top,
      steel: mergeParts(steel),
      led,
      // Nested groups get a dispose() (useDisposable only walks one level).
      monitor: geometryGroup(createMonitorGeometry(low)),
      keyboard: geometryGroup(createKeyboardGeometry(low)),
      mouse: mouse.shell,
      wheel: mouse.wheel,
      mug: geometryGroup(createMugGeometry(low)),
      mat: createDeskMatGeometry(),
    };
  }, [low]);

  const ledTarget = useMemo(() => new Object3D(), []);
  const floorGlowTarget = useMemo(() => new Object3D(), []);

  // Smooth warm hover tint (no light pop). Kept faint: an additive emissive
  // reads strongly on dark surfaces, so each gets its own small ceiling — the
  // monitor bezels carry most of the highlight, as before.
  const hoverTargets = useMemo(
    () =>
      [
        [mats.monitorPlastic, 0.09],
        [mats.steel, 0.035],
        [mats.kbCase, 0.04],
        [mats.top, 0.025],
        [mats.aluminium, 0.03],
      ] as const,
    [mats],
  );
  useFrame(() => {
    const m = hoverMix.current;
    for (const [mat, max] of hoverTargets) applyHoverEmissive(mat, m, HOVER_COLOR, max);
  });

  return (
    <group
      position={DESK_ORIGIN}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={handleClick}>
      {/* Invisible enlarged tap target covering the desk surface + monitors.
          Sits low so it doesn't block other clickable items in front. */}
      <mesh position={[1.0, 1.0, 0.0]}>
        <boxGeometry args={[3.6, 1.4, 1.4]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Walnut L top (long arm along the wall + short arm toward the room) */}
      <mesh geometry={geo.top} material={mats.top} castShadow receiveShadow />
      {/* Steel frame: legs, rails, cable tray */}
      <mesh geometry={geo.steel} material={mats.steel} castShadow receiveShadow />

      {/* Cool blue rim under the desk: LED strip washing the wall and floor
          behind/below. A downward spot (not a point light) so the glow stays
          under the top instead of leaking onto the wall above it. */}
      <mesh geometry={geo.led} material={mats.led} />
      <spotLight
        position={[1.1, UNDER_Y - 0.06, -0.4]}
        target={ledTarget}
        angle={1.15}
        penumbra={1}
        intensity={1.5}
        distance={2.2}
        decay={2}
        color="#4ea8ff"
      />
      <primitive object={ledTarget} position={[1.1, 0, -0.55]} />
      {/* …and a soft blue pool on the floor in front of the desk, around the
          chair base (where the original blue point light glowed). Aimed
          down/forward with the cone's upper edge below horizontal, so it
          never lights anything above the desk. */}
      <spotLight
        position={[1.1, UNDER_Y - 0.08, 0.3]}
        target={floorGlowTarget}
        angle={0.85}
        penumbra={1}
        intensity={3.5}
        distance={2.4}
        decay={2}
        color="#4ea8ff"
      />
      <primitive object={floorGlowTarget} position={[1.0, 0, 1.2]} />

      {/* Monitor 1 (left) — blue desktop */}
      <Monitor
        position={[0.4, TOP_Y, -0.15]}
        rotateY={0.18}
        geometry={geo.monitor}
        plastic={mats.monitorPlastic}
        aluminium={mats.aluminium}
        cable={mats.cable}
        screen={mats.blueScreen}
      />
      {/* Monitor 2 (right) — terminal */}
      <Monitor
        position={[2.0, TOP_Y, -0.2]}
        rotateY={-0.18}
        geometry={geo.monitor}
        plastic={mats.monitorPlastic}
        aluminium={mats.aluminium}
        cable={mats.cable}
        screen={mats.termScreen}>
        <TerminalContent />
      </Monitor>

      {/* Desk mat under keyboard + mouse */}
      <mesh geometry={geo.mat} material={mats.mat} position={[1.35, TOP_Y, 0.22]} receiveShadow />

      {/* Keyboard */}
      <group position={[1.2, TOP_Y + DESK_MAT.t, 0.2]} rotation={[0, 0.015, 0]}>
        <Keyboard
          geometry={geo.keyboard}
          caseMaterial={mats.kbCase}
          plateMaterial={mats.kbPlate}
          capMaterial={mats.keycap}
          glowMaterial={mats.kbGlow}
        />
      </group>

      {/* Mouse */}
      <group position={[1.95, TOP_Y + DESK_MAT.t, 0.22]} rotation={[0, -0.14, 0]}>
        <mesh geometry={geo.mouse} material={mats.mouse} castShadow receiveShadow />
        <mesh geometry={geo.wheel} material={mats.rubber} />
      </group>

      {/* Mug + steam (steam particles skipped on mobile for perf) */}
      <group position={[2.55, TOP_Y, -0.05]} rotation={[0, -0.5, 0]}>
        <mesh geometry={geo.mug.body} material={mats.mug} castShadow receiveShadow />
        <mesh geometry={geo.mug.coffee} material={mats.coffee} />
        {tier !== "mobile" && <MugSteam />}
      </group>

      {/* Notebook stack */}
      <group position={[-0.4, TOP_Y, 0.95]}>
        <Books books={NOTEBOOKS} castShadow />
      </group>
    </group>
  );
}

// Original screen was 1.04 × 0.62; the terminal layout is scaled to the new
// panel so every line keeps its relative position.
const TERMINAL_SCALE = SCREEN_W / 1.04;

// Animated terminal content: prompt with blinking cursor and a typewriter line
// that cycles through snippets.
function TerminalContent() {
  const cursorRef = useRef<Mesh>(null);
  const [typed, setTyped] = useState("");
  const reducedMotion = usePrefersReducedMotion();
  const stateRef = useRef({
    snippet: 0,
    charIdx: 0,
    lastCharAt: 0,
    pausingUntil: 0,
  });

  // Reduced motion: show a complete static line instead of the typewriter.
  useEffect(() => {
    if (reducedMotion) setTyped(TYPEWRITER_SNIPPETS[0]);
  }, [reducedMotion]);

  useFrame((state) => {
    const cursor = cursorRef.current;
    if (reducedMotion) {
      if (cursor) {
        cursor.visible = true;
        (cursor.material as MeshBasicMaterial).opacity = 1;
      }
      return;
    }
    const t = state.clock.getElapsedTime();

    // Cursor blink every 0.5 s, with a short fade instead of a hard pop.
    if (cursor) {
      const phase = (t * 2) % 2; // 0..1 on, 1..2 off
      const on = phase < 1 ? Math.min(1, phase / 0.08) : Math.max(0, 1 - (phase - 1) / 0.08);
      (cursor.material as MeshBasicMaterial).opacity = on;
      cursor.visible = on > 0.01;
    }

    const s = stateRef.current;
    const target = TYPEWRITER_SNIPPETS[s.snippet];

    if (t < s.pausingUntil) return;

    if (s.charIdx < target.length) {
      // Type a char every 80ms.
      if (t - s.lastCharAt >= 0.08) {
        s.charIdx += 1;
        s.lastCharAt = t;
        setTyped(target.slice(0, s.charIdx));
      }
    } else if (s.pausingUntil === 0) {
      // Just finished — pause for 3s before clearing and moving to next snippet.
      s.pausingUntil = t + 3;
    } else {
      // Pause is over — reset for the next snippet.
      s.snippet = (s.snippet + 1) % TYPEWRITER_SNIPPETS.length;
      s.charIdx = 0;
      s.lastCharAt = t;
      s.pausingUntil = 0;
      setTyped("");
    }
  });

  return (
    <group scale={TERMINAL_SCALE}>
      {/* Prompt line: "$ npm run dev" */}
      <Text
        position={[-0.46, 0.18, 0]}
        anchorX="left"
        anchorY="middle"
        fontSize={0.046}
        color={TERMINAL_GREEN}
        onSync={(text: { textRenderInfo?: { blockBounds?: number[] } }) => {
          // Park the cursor one space after the prompt once its width is known.
          const b = text.textRenderInfo?.blockBounds;
          if (b && cursorRef.current) cursorRef.current.position.x = -0.46 + b[2] + 0.035;
        }}
      >
        $ npm run dev
      </Text>

      {/* Typewriter line */}
      <Text
        position={[-0.46, 0.08, 0]}
        anchorX="left"
        anchorY="middle"
        fontSize={0.04}
        color={TERMINAL_GREEN}
        maxWidth={0.95}
      >
        {typed}
      </Text>

      {/* Blinking cursor at the end of the prompt */}
      <mesh ref={cursorRef} position={[0.18, 0.18, 0]}>
        <planeGeometry args={[0.045, 0.052]} />
        <meshBasicMaterial color={TERMINAL_GREEN} transparent />
      </mesh>
    </group>
  );
}

// 4 small soft wisps rising from the coffee, fading out, then resetting.
// Camera-facing sprites with a soft, slightly irregular radial-alpha texture
// (no hard silhouette), unlit so they read as vapour, not glass beads.
function MugSteam() {
  // Each particle has its own phase offset so the column is continuous.
  const particles = useMemo(
    () => [
      { phase: 0.0, wobble: 1.0, spin: 0.3 },
      { phase: 0.75, wobble: -0.8, spin: 2.1 },
      { phase: 1.5, wobble: 0.6, spin: 4.0 },
      { phase: 2.25, wobble: -1.1, spin: 5.4 },
    ],
    [],
  );
  const map = getSteamTexture();
  return (
    <group position={[0, 0.09, 0]}>
      {particles.map((p, i) => (
        <SteamParticle key={i} phase={p.phase} wobble={p.wobble} spin={p.spin} map={map} />
      ))}
    </group>
  );
}

// Shared for the session (like the texture caches) — never disposed.
let steamTexture: DataTexture | null = null;
function getSteamTexture(): DataTexture {
  if (steamTexture) return steamTexture;
  const N = 64;
  const data = new Uint8Array(N * N * 4);
  // Soft gaussian falloff, modulated by a few low-frequency lobes so the
  // puff edge is irregular (wispy) rather than a perfect disc.
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x + 0.5) / N - 0.5;
      const dy = (y + 0.5) / N - 0.5;
      const a = Math.atan2(dy, dx);
      const lobes = 1 + 0.18 * Math.sin(a * 3 + 0.7) + 0.12 * Math.sin(a * 5 + 2.1);
      const r = Math.sqrt(dx * dx + dy * dy) / (0.5 * lobes);
      const alpha = r >= 1 ? 0 : Math.exp(-r * r * 4.5) * (1 - r * r);
      const o = (y * N + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = 255;
      data[o + 3] = Math.round(alpha * 255);
    }
  }
  steamTexture = new DataTexture(data, N, N, RGBAFormat);
  steamTexture.magFilter = LinearFilter;
  steamTexture.minFilter = LinearFilter;
  steamTexture.needsUpdate = true;
  return steamTexture;
}

const STEAM_LIFETIME = 3.0;
const noRaycast = () => null;

function SteamParticle({ phase, wobble, spin, map }: { phase: number; wobble: number; spin: number; map: DataTexture }) {
  const ref = useRef<Sprite>(null);
  const matRef = useRef<SpriteMaterial>(null);
  const reducedMotion = usePrefersReducedMotion();

  useFrame((state) => {
    if (!ref.current || !matRef.current) return;
    if (reducedMotion) {
      matRef.current.opacity = 0; // hide drifting steam for reduced motion
      ref.current.visible = false;
      return;
    }
    const t = state.clock.getElapsedTime() + phase;
    const tau = (t % STEAM_LIFETIME) / STEAM_LIFETIME; // 0 → 1 over lifetime
    // Vertical drift with gentle deceleration as it cools (~0.3 m total).
    ref.current.position.y = (1 - (1 - tau) * (1 - tau)) * 0.3;
    // Horizontal sine wobble, growing as it rises.
    ref.current.position.x = Math.sin(t * 1.4) * 0.014 * wobble * (0.4 + tau);
    ref.current.position.z = Math.cos(t * 1.1) * 0.007 * wobble * tau;
    // Smooth fade in then out, peak opacity 0.2 (soft-edged texture).
    const fade = Math.sin(tau * Math.PI);
    matRef.current.opacity = 0.2 * fade * fade;
    matRef.current.rotation = spin + tau * 0.8 * wobble;
    ref.current.visible = fade > 0.02;
    // Expands as it rises (≈ 4 cm → 12 cm across), slightly taller than wide.
    const d = 0.04 + tau * 0.08;
    ref.current.scale.set(d, d * 1.25, 1);
  });

  return (
    <sprite ref={ref} raycast={noRaycast} visible={false}>
      <spriteMaterial ref={matRef} map={map} color="#e4e7ea" transparent opacity={0} depthWrite={false} />
    </sprite>
  );
}

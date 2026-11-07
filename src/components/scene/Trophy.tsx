// Shared trophy. SportsTrophy (gold cup on a walnut + black-marble plinth, on
// the floor) and HackathonTrophy (polished nickel cup on a piano-black plinth
// with a blue anodised band, on the shelf) both render this.
//
// Build (local coords, origin = bottom of the display base):
//   display base   round stone/acrylic riser with an inlaid metal ring — the
//                  old "floor ring": still pulses (now a faint warm/cool
//                  sheen) and grows a touch on hover. Static: doesn't bob.
//   trophy         rests on a magnetic-levitation pad: the whole plinth + cup
//                  floats 8–32 mm above the base with a slow eased bob (the
//                  original bob animation, made physically plausible).
//     plinth       two tiers (RoundedBox, bevelled) + blank engraved plate
//     cup          one lathe (foot, knop, stem, collar, bowl, rolled lip,
//                  inner wall) merged with two swept tube handles → one draw
//                  call, polished metal with object-space hairline scratches
//                  and (high tier) a lacquer clearcoat.
//   spotlight      sibling, doesn't bob (unchanged role).

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import {
  CatmullRomCurve3,
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useHotspotHover } from "../../hooks/useHotspotHover";
import { useSceneStore } from "../../store/useSceneStore";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import type { HotspotKey } from "../../config/cameraPositions";
import { useRoomQuality } from "./quality";
import {
  applyHoverEmissive,
  createBrushedSteel,
  createWornMetal,
  useDisposable,
  useHoverMix,
} from "./materials";
import { arcLathe, boxProjectUVs, mergeSafe, mitredFrameGeometry } from "./decor/decorGeometry";
import { useDecorTextures } from "./decor/decorTextures";
import { createWalnut } from "./decor/decorMaterials";
import { useTrophyStudioEnv } from "./decor/trophyStudioEnv";

export type TrophyFinish = "gold" | "silver";
export type TrophyPlinth = "walnutMarble" | "blackAcrylic";

interface TrophyProps {
  position: [number, number, number];
  hotspot: Extract<HotspotKey, "sportsTrophy" | "hackathonTrophy">;
  /** Polished metal colour of the cup. */
  metalColor: string;
  /** Hover tint for the cup (smoothly mixed in, subtle). */
  metalEmissive: string;
  metalness?: number;
  roughness?: number;
  finish: TrophyFinish;
  plinth: TrophyPlinth;
  /** Anodised metal band around the top of the lower plinth tier. */
  accentColor?: string;
  /** Colour of the display-base ring. */
  ringColor: string;
  /** Color of the dedicated spotlight shining down on the trophy. */
  spotColor: string;
  spotIntensity?: number;
  spotDistance?: number;
  tooltip?: string;
  /** Uniform scale of base + plinth + cup (shelf trophy is smaller). */
  bodyScale?: number;
  /** Shift of the physical trophy inside the group (e.g. off the wall). */
  bodyOffsetZ?: number;
  /** Lower plinth tier width/depth in metres (before bodyScale). */
  plinthWidth?: number;
  /** Display base radius in metres (before bodyScale). */
  displayRadius?: number;
  /** Height of the supporting surface above the group origin (the floor
   *  boards sit 4 cm above y = 0). */
  surfaceY?: number;
}

// --- Dimensions (metres, unscaled) -----------------------------------------
const BASE_H = 0.036; // display base height
const LEVITATE_MIN = 0.008;
const LEVITATE_AMP = 0.012; // bob = MIN + (sin+1)*AMP → 8–32 mm gap
const LOWER_H = 0.07;
const BAND_H = 0.016;
const PLINTH_TOP = 0.2;

/** Cup profile [radius, y] in trophy space (y = 0 at the plinth bottom). */
const CUP_PROFILE: [number, number][] = [
  [0.0, 0.2],
  [0.15, 0.2],
  [0.162, 0.2015],
  [0.168, 0.207],
  [0.166, 0.213],
  [0.156, 0.218],
  [0.152, 0.224],
  [0.135, 0.236],
  [0.11, 0.252],
  [0.085, 0.268],
  [0.064, 0.284],
  [0.05, 0.3],
  [0.047, 0.312],
  [0.054, 0.322],
  [0.066, 0.334],
  [0.072, 0.346],
  [0.066, 0.358],
  [0.052, 0.37],
  [0.042, 0.382],
  [0.038, 0.41],
  [0.039, 0.44],
  [0.046, 0.462],
  [0.07, 0.474],
  [0.08, 0.482],
  [0.078, 0.492],
  [0.068, 0.498],
  [0.082, 0.512],
  [0.118, 0.54],
  [0.16, 0.58],
  [0.2, 0.635],
  [0.233, 0.7],
  [0.257, 0.77],
  [0.272, 0.83],
  [0.279, 0.852],
  [0.288, 0.858],
  [0.29, 0.866],
  [0.284, 0.873],
  [0.288, 0.9],
  [0.296, 0.945],
  [0.302, 0.978],
  [0.31, 0.993],
  [0.316, 1.0],
  [0.316, 1.007],
  [0.31, 1.012],
  [0.301, 1.009],
  [0.295, 0.998],
  [0.289, 0.97],
  [0.279, 0.9],
  [0.262, 0.82],
  [0.236, 0.74],
  [0.2, 0.665],
  [0.15, 0.605],
  [0.095, 0.57],
  [0.04, 0.556],
  [0.0, 0.553],
];

function buildCupGeometry(segments: number): BufferGeometry {
  const lathe = arcLathe(CUP_PROFILE, segments);
  const handlePts = [
    new Vector3(0.288, 0.93, 0),
    new Vector3(0.345, 0.958, 0),
    new Vector3(0.405, 0.94, 0),
    new Vector3(0.43, 0.88, 0),
    new Vector3(0.41, 0.79, 0),
    new Vector3(0.355, 0.715, 0),
    new Vector3(0.29, 0.676, 0),
    new Vector3(0.232, 0.668, 0),
  ];
  const curve = new CatmullRomCurve3(handlePts, false, "centripetal");
  const tubular = Math.max(24, Math.round(segments * 0.6));
  const radial = Math.max(8, Math.round(segments / 5));
  const h1 = new TubeGeometry(curve, tubular, 0.0165, radial, false);
  const h2 = h1.clone().rotateY(Math.PI);
  return mergeSafe([lathe, h1, h2]);
}

function buildDisplayBase(radius: number, segments: number): BufferGeometry {
  return arcLathe(
    [
      [0, 0],
      [radius - 0.008, 0],
      [radius, 0.006],
      [radius, BASE_H - 0.008],
      [radius - 0.003, BASE_H - 0.002],
      [radius - 0.009, BASE_H],
      [0, BASE_H],
    ],
    segments,
    { uScale: 2 },
  );
}

export function Trophy({
  position,
  hotspot,
  metalColor,
  metalEmissive,
  metalness = 1,
  roughness = 0.14,
  finish,
  plinth,
  accentColor,
  ringColor,
  spotColor,
  spotIntensity = 2.5,
  spotDistance = 5,
  tooltip,
  bodyScale = 1,
  bodyOffsetZ = 0,
  plinthWidth = 0.62,
  displayRadius = 0.5,
  surfaceY = 0,
}: TrophyProps) {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover(hotspot);
  const tier = useDeviceTier();
  const reducedMotion = usePrefersReducedMotion();
  const q = useRoomQuality();
  const hoverMix = useHoverMix(hovered, 10);

  const bobRef = useRef<Group>(null);
  const phase = useRef(0);
  const speed = useRef(1.2);

  // Smooth, critically-damped hover lift (was a wobbly 1.18× pop).
  const { scale, ringScale } = useSpring({
    scale: hovered ? 1.06 : 1,
    ringScale: hovered ? 1.04 : 1,
    config: { tension: 190, friction: 26 },
    immediate: reducedMotion,
  });

  const lightTarget = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    lightTarget.position.set(0, 0.5, 0);
  }, [lightTarget]);

  // --- geometry ------------------------------------------------------------
  const seg = q.tier === "high" ? 72 : q.tier === "medium" ? 48 : 28;
  const upperW = plinthWidth * 0.8;
  const upperBottom = LOWER_H + (accentColor ? BAND_H : 0);
  const upperH = PLINTH_TOP - upperBottom;
  const geo = useDisposable(() => {
    const lower = boxProjectUVs(new RoundedBoxGeometry(plinthWidth, LOWER_H, plinthWidth, 3, 0.008), {
      offset: [0.04, 0.1],
    });
    // Marble UVs are metres; scale so one tile ≈ 0.75 m (done in the
    // geometry, never via the shared texture's repeat).
    const luv = lower.getAttribute("uv");
    for (let i = 0; i < luv.count; i++) luv.setXY(i, luv.getX(i) * 1.35, luv.getY(i) * 1.35);
    const upper = boxProjectUVs(new RoundedBoxGeometry(upperW, upperH, upperW, 3, 0.007), {
      offset: [0.035, 0.27],
      topScaleU: 0.25,
    });
    const band = new RoundedBoxGeometry(upperW + 0.012, BAND_H, upperW + 0.012, 2, 0.004);
    const plate = new RoundedBoxGeometry(upperW * 0.62, upperH * 0.5, 0.005, 2, 0.002);
    const groove = mitredFrameGeometry(upperW * 0.62 - 0.014, upperH * 0.5 - 0.014, [
      [0, 0.0004],
      [0.0016, 0.0004],
    ]);
    return {
      cup: buildCupGeometry(seg),
      base: buildDisplayBase(displayRadius, seg),
      lower,
      upper,
      band,
      plate,
      groove,
    };
  }, [seg, plinthWidth, upperW, upperH, displayRadius]);

  // Ring geometry kept separate (it scales on hover).
  const ringGeo = useDisposable(
    () =>
      arcLathe(
        [
          [displayRadius - 0.034, 0],
          [displayRadius - 0.034, 0.002],
          [displayRadius - 0.031, 0.0035],
          [displayRadius - 0.019, 0.0035],
          [displayRadius - 0.016, 0.002],
          [displayRadius - 0.016, 0],
        ],
        seg,
      ),
    [displayRadius, seg],
  );

  // --- materials -----------------------------------------------------------
  const marble = useDecorTextures("marble", q.textureSize, q.anisotropy);
  const walnut = useDecorTextures("walnut", q.textureSize, q.anisotropy);
  const mats = useDisposable(() => {
    const physical = q.config.physicalMaterials;
    const gold = finish === "gold";
    const cup = createWornMetal(
      {
        color: metalColor,
        roughness,
        metalness,
        bareColor: gold ? "#b08a46" : "#a9aeb4",
        bareRoughness: roughness + 0.08,
        bareMetalness: 1,
        wear: gold ? 0.04 : 0,
        rust: 0,
        rustHeight: -10,
        // light hairlines only: the bowl's curvature must carry the reflection
        scratches: gold ? 0.18 : 0.22,
        scratchRoughness: 0.07,
        noiseScale: 2.5,
        bump: 0.25,
        space: "object",
        clearcoat: gold ? 0.55 : 0.35,
        clearcoatRoughness: 0.05,
        envMapIntensity: gold ? 1.0 : 1.05,
        seed: gold ? 3 : 7,
      },
      q.config,
    );

    const darkGloss = (color: string, rough: number): Material =>
      physical
        ? new MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1 })
        : new MeshStandardMaterial({ color, roughness: rough + 0.04, metalness: 0, envMapIntensity: 1 });

    const stone =
      plinth === "walnutMarble"
        ? physical
          ? new MeshPhysicalMaterial({
              map: marble.map,
              roughnessMap: marble.roughnessMap,
              roughness: 1,
              clearcoat: 0.6,
              clearcoatRoughness: 0.05,
              envMapIntensity: 1,
            })
          : new MeshStandardMaterial({ map: marble.map, roughnessMap: marble.roughnessMap, roughness: 1, envMapIntensity: 1 })
        : darkGloss("#0b0b0d", 0.07);
    const upper =
      plinth === "walnutMarble"
        ? createWalnut(q, walnut, { clearcoat: 0.35 })
        : darkGloss("#0b0b0d", 0.07);

    const plateMat = createBrushedSteel(q, {
      widthM: 0.3,
      heightM: 0.06,
      color: gold ? "#d6b77a" : "#d4d7db",
      roughness: 0.26,
    });
    const grooveMat = new MeshStandardMaterial({
      color: gold ? "#5d4a28" : "#55585c",
      metalness: 1,
      roughness: 0.6,
    });
    const ringBase = new Color(ringColor);
    const ringMetal = new MeshStandardMaterial({
      color: gold ? "#c9a25a" : ringBase.clone().lerp(new Color("#8fa3c4"), 0.35),
      metalness: 1,
      roughness: gold ? 0.22 : 0.32,
      emissive: ringBase,
      emissiveIntensity: 0,
      envMapIntensity: 1.1,
    });
    const band = accentColor
      ? new MeshStandardMaterial({
          color: new Color(accentColor).lerp(new Color("#7f95b8"), 0.3),
          metalness: 1,
          roughness: 0.34,
          envMapIntensity: 1.1,
        })
      : null;
    const base = plinth === "walnutMarble" ? stone : darkGloss("#0d0d0f", 0.09);
    return { cup, stone, upper, plateMat, grooveMat, ringMetal, band, base };
  }, [q, finish, plinth, metalColor, roughness, metalness, ringColor, accentColor, marble, walnut]);

  // Polished cup mirrors a local "showroom" env (crisp highlight bands + dark
  // gaps) instead of the room's very soft panels, so it reads as metal.
  const studioEnv = useTrophyStudioEnv();
  useEffect(() => {
    mats.cup.envMap = studioEnv;
    mats.cup.needsUpdate = true;
  }, [mats.cup, studioEnv]);

  // --- animation -------------------------------------------------------------
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1);
    const ring = mats.ringMetal;
    if (reducedMotion) {
      if (bobRef.current) bobRef.current.position.y = (BASE_H + LEVITATE_MIN + LEVITATE_AMP) * bodyScale;
      ring.emissiveIntensity = 0.05 + hoverMix.current * 0.25;
    } else {
      // Ease the bob speed (1.2 idle → 2.4 hovered) and integrate the phase
      // so changing speed never makes the trophy jump.
      const target = hovered ? 2.4 : 1.2;
      speed.current += (target - speed.current) * (1 - Math.exp(-4 * d));
      phase.current += speed.current * d;
      if (bobRef.current) {
        const lift = LEVITATE_MIN + (Math.sin(phase.current - Math.PI / 2) + 1) * LEVITATE_AMP;
        bobRef.current.position.y = (BASE_H + lift) * bodyScale;
      }
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.getElapsedTime() * 1.5);
      ring.emissiveIntensity = 0.02 + pulse * 0.05 + hoverMix.current * 0.25;
    }
    applyHoverEmissive([mats.cup], hoverMix.current, metalEmissive, 0.1);
    applyHoverEmissive([mats.upper, mats.plateMat], hoverMix.current, metalEmissive, 0.05);
  });

  const castSpotShadow = tier === "desktop" && q.tier === "high";
  const s = bodyScale;

  return (
    <group position={position}>
      {/* Spotlight + invisible target object (siblings of the bob group). */}
      <primitive object={lightTarget} />
      <spotLight
        position={[0, 3.5, 0]}
        target={lightTarget}
        angle={0.45}
        penumbra={0.75}
        intensity={spotIntensity}
        color={spotColor}
        distance={spotDistance}
        castShadow={castSpotShadow}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0004}
        shadow-normalBias={0.01}
      />

      <group position={[0, surfaceY, bodyOffsetZ]}>
        {/* Display base (static) + inlaid ring (pulses, grows on hover). */}
        <group scale={s}>
          <mesh geometry={geo.base} material={mats.base} receiveShadow castShadow={false} />
          <animated.mesh
            geometry={ringGeo}
            material={mats.ringMetal}
            position={[0, BASE_H, 0]}
            scale-x={ringScale}
            scale-z={ringScale}
          />
        </group>

        {/* Levitating trophy: bobs as one unit. */}
        <group ref={bobRef} position={[0, (BASE_H + LEVITATE_MIN + LEVITATE_AMP) * s, 0]}>
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

            <group scale={s}>
              {/* Lower plinth tier (marble / piano black) */}
              <mesh geometry={geo.lower} material={mats.stone} position={[0, LOWER_H / 2, 0]} castShadow receiveShadow />
              {/* Anodised accent band */}
              {accentColor && mats.band && (
                <mesh geometry={geo.band} material={mats.band} position={[0, LOWER_H + BAND_H / 2, 0]} />
              )}
              {/* Upper plinth tier (walnut / piano black) */}
              <mesh
                geometry={geo.upper}
                material={mats.upper}
                position={[0, upperBottom + upperH / 2, 0]}
                castShadow
                receiveShadow
              />
              {/* Blank engraved plate (no text) */}
              <group position={[0, upperBottom + upperH / 2, upperW / 2 + 0.0025]}>
                <mesh geometry={geo.plate} material={mats.plateMat} />
                <mesh geometry={geo.groove} material={mats.grooveMat} position={[0, 0, 0.0025]} />
              </group>
              {/* Cup: lathe body + handles, one draw call */}
              <mesh geometry={geo.cup} material={mats.cup} castShadow receiveShadow />
            </group>
          </animated.group>
        </group>
      </group>

      {/* Hover tooltip — desktop only */}
      {hovered && tooltip && tier === "desktop" && (
        <Html position={[0, 1.35, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
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

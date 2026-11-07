import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { NeutralToneMapping, PCFSoftShadowMap, SRGBColorSpace, Vector3, type Vector3Tuple } from "three";
import { Lighting } from "./Lighting";
import { Room } from "./Room";
import { CameraRig } from "./CameraRig";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { useSceneStore } from "../../store/useSceneStore";
import { QUALITY_CONFIGS, RoomQualityProvider, deviceTierToQuality } from "./quality";
import { texturesSettled } from "./materials/textures";

// Dev-only swatch board (?materialPreview). The import is behind a DEV check
// so it is dropped from production bundles.
const MaterialPreview = import.meta.env.DEV
  ? lazy(() => import("./materials/MaterialPreview").then((m) => ({ default: m.MaterialPreview })))
  : null;
const showMaterialPreview =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("materialPreview");

/** Max time the loading screen waits for procedural textures after the
 *  first frame (they normally land in ~100–300 ms). */
const TEXTURE_WAIT_CAP_MS = 2500;

/** Max time the first render waits for parallel shader compilation. */
const COMPILE_WAIT_CAP_MS = 6000;

/** While mounted, takes over the render loop (priority > 0) and draws
 *  nothing: the loading screen covers the canvas, and the first real render
 *  then doesn't block the main thread linking every shader program. Other
 *  frame subscribers (environment / contact-shadow passes) still run. */
function HoldRender() {
  useFrame(() => {}, 1);
  return null;
}

/**
 * Signals "ready" to the app shell once the scene has really rendered: it
 * lives inside the <Suspense> boundary (so it only mounts after everything
 * above resolves), first compiles every material with
 * `renderer.compileAsync` (KHR_parallel_shader_compile, so linking happens
 * off the main thread; capped), then waits for two rendered frames, then for
 * the procedural textures (capped) so the placeholder→texture swap happens
 * behind the loading screen.
 */
function SceneReady() {
  const setSceneStatus = useSceneStore((s) => s.setSceneStatus);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const [compiled, setCompiled] = useState(false);
  const frames = useRef(0);
  const done = useRef(false);

  // Passive effect: runs after every sibling's effects (e.g. env maps that
  // are assigned in useEffect), so the compiled programs match the first
  // real render.
  useEffect(() => {
    let alive = true;
    const t0 = performance.now();
    const cap = new Promise<void>((r) => setTimeout(r, COMPILE_WAIT_CAP_MS));
    let compiling: Promise<unknown>;
    try {
      compiling = gl.compileAsync(scene, camera);
    } catch {
      compiling = Promise.resolve();
    }
    void Promise.race([compiling.catch(() => undefined), cap]).then(() => {
      if (!alive) return;
      if (import.meta.env.DEV) {
        console.info(`[room] shaders compiled in ${Math.round(performance.now() - t0)} ms`);
      }
      setCompiled(true);
    });
    return () => {
      alive = false;
    };
  }, [gl, scene, camera]);

  useFrame(() => {
    if (!compiled || done.current) return;
    frames.current++;
    if (frames.current < 2) return;
    done.current = true;
    const firstFrameAt = performance.now();
    const cap = new Promise<void>((r) => setTimeout(r, TEXTURE_WAIT_CAP_MS));
    void Promise.race([texturesSettled(), cap]).then(() => {
      if (import.meta.env.DEV) {
        console.info(
          `[room] first frame at ${Math.round(firstFrameAt)} ms, ready at ${Math.round(performance.now())} ms after navigation start`,
        );
      }
      setSceneStatus("ready");
    });
  });
  return compiled ? null : <HoldRender />;
}

declare global {
  interface Window {
    /** Dev-only: pin the camera (overrides CameraRig while set). Pass null
     *  to release it back to CameraRig. */
    __setRoomCamera?: (pos: Vector3Tuple | null, target?: Vector3Tuple, fov?: number) => void;
  }
}

/**
 * Dev-only camera override for automated screenshots. Its useFrame is
 * registered after CameraRig's (same priority, later mount), so it wins every
 * frame while set; CameraRig resumes damping from wherever it was left.
 */
function DevCameraOverride() {
  const camera = useThree((s) => s.camera);
  const pose = useRef<{ pos: Vector3; target: Vector3; fov?: number } | null>(null);
  useEffect(() => {
    window.__setRoomCamera = (pos, target = [0, 1.4, 0], fov) => {
      pose.current = pos ? { pos: new Vector3(...pos), target: new Vector3(...target), fov } : null;
    };
    return () => {
      delete window.__setRoomCamera;
    };
  }, []);
  useFrame(() => {
    const p = pose.current;
    if (!p) return;
    camera.position.copy(p.pos);
    camera.lookAt(p.target);
    if (p.fov !== undefined && "fov" in camera && camera.fov !== p.fov) {
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

/**
 * Keeps `clock.elapsedTime` monotonic. R3F restarts the clock at 0 whenever
 * the frameloop mode changes (we pause it while a mobile panel covers the
 * canvas); time-based animations (typewriter timestamps, sine phases) would
 * otherwise stall or jump. Runs before every other frame subscriber
 * (negative priority does not take over rendering).
 */
function MonotonicClock() {
  const last = useRef(0);
  useFrame(({ clock }) => {
    if (clock.elapsedTime < last.current) clock.elapsedTime = last.current;
    last.current = clock.elapsedTime;
  }, -1);
  return null;
}

export function Scene() {
  const tier = useDeviceTier();
  // On mobile an open panel is a full-screen sheet and RoomApp hides the
  // canvas; stop rendering it entirely (once the scene is ready, so the
  // entry/ready handshake is never starved). CameraRig re-flies on return.
  const paused = useSceneStore(
    (s) => tier === "mobile" && s.activeHotspot !== "default" && s.sceneStatus === "ready",
  );
  // Initial DPR from the device tier; RoomQualityProvider refines it (renderer
  // probe, runtime downgrades) through onDprChange. The Canvas prop must own
  // DPR because R3F re-applies it on every Canvas re-render.
  const [dpr, setDpr] = useState<[number, number]>(() => {
    const d = QUALITY_CONFIGS[deviceTierToQuality(tier)].dpr;
    return [d[0], d[1]];
  });
  const handleDpr = useCallback((d: [number, number]) => {
    setDpr((prev) => (prev[0] === d[0] && prev[1] === d[1] ? prev : d));
  }, []);

  return (
    <Canvas
      // PCF soft: stable, no light-bleeding with overlapping casters (VSM
      // bleeds where rack bars overlap the bench/plates) and no blur tuning.
      shadows={{ type: PCFSoftShadowMap }}
      dpr={dpr}
      frameloop={paused ? "never" : "always"}
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
        // Khronos PBR Neutral: keeps base-color hue/saturation faithful (ACES
        // pushes reds/oranges and desaturates highlights unevenly; AgX is
        // flatter/greyer at this exposure). Right call for material fidelity.
        toneMapping: NeutralToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: SRGBColorSpace,
      }}
      style={{ background: "#0b1018" }}
      // With alpha:false three.js clears with alpha 1, and drei's
      // ContactShadows renders into its own target using that clear — which
      // turns the whole shadow texture opaque and dims the entire floor ~42%.
      // Clearing with alpha 0 keeps the shadow texture transparent where
      // nothing is occluded; the main canvas has no alpha channel, so it is
      // visually unaffected.
      onCreated={({ gl }) => gl.setClearAlpha(0)}
    >
      <RoomQualityProvider onDprChange={handleDpr}>
        <MonotonicClock />
        <Suspense fallback={null}>
          <Lighting />
          <Room />
          <CameraRig />
          {import.meta.env.DEV && <DevCameraOverride />}
          {MaterialPreview && showMaterialPreview && <MaterialPreview />}
          <SceneReady />
        </Suspense>
      </RoomQualityProvider>
    </Canvas>
  );
}

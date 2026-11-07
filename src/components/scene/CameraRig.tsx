import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Spherical, Vector3 } from "three";
import { useSceneStore } from "../../store/useSceneStore";
import { CAMERA_VIEWS_BY_TIER, type CameraView, type HotspotKey } from "../../config/cameraPositions";
import { useDeviceTier, type DeviceTier } from "../../hooks/useDeviceTier";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { setSceneBaseCursor, setSceneDragging } from "../../hooks/useHotspotHover";
import {
  clamp,
  clampToRoom,
  cubicBezierEase,
  damped,
  dampFactor,
  easeInOutSine,
  quadBezier,
  shapeArc,
  smoothDamp,
  smoothDampVec,
  viewAngle,
} from "./cameraRigMath";
import { attachOrbitInput, createOrbitInput } from "./cameraRigInput";

/**
 * Third-person "exploration" camera.
 *
 *  entry   — cinematic spherical sweep into the default framing with an FOV
 *            settle (skipped under prefers-reduced-motion).
 *  flight  — hotspot transitions follow an obstacle-aware quadratic arc that
 *            never leaves the room volume (no back/left wall or floor
 *            crossing). Position, look target and FOV have independent
 *            easing curves; a critically-damped follower on top keeps
 *            velocity continuous when a flight is interrupted.
 *  settled — at the default view the user may orbit (drag) and zoom
 *            (wheel / pinch) inside a limited cone, with inertia; after a
 *            long idle the camera eases back to the authored framing and the
 *            slow idle drift fades back in. At a hotspot the pose is locked.
 *
 * Everything is frame-rate independent and allocation-free per frame.
 */

// --- Entry ------------------------------------------------------------------
const ENTRY_DURATION = 2.4;
/** Hold on the opening frame while the loading screen fades out. The sweep
 *  only starts once the scene reports "ready" (that's when the app shell
 *  begins dismissing the loader), so the move is never wasted behind it. */
const ENTRY_HOLD = 0.35;
/** Safety net matching the app shell's 8 s loader cap. */
const ENTRY_START_CAP_MS = 8200;
const ENTRY_RADIUS_MUL = 1.6;
const ENTRY_THETA_OFFSET = 0.78; // rad, starts swung round toward +x
const ENTRY_PHI_OFFSET = -0.36; // rad, starts higher (more top-down)
const ENTRY_TARGET_LIFT = 0.9;
const ENTRY_FOV_OFFSET = 9;
/** Slow-in, long soft landing (like a crane settling). */
const entryEase = cubicBezierEase(0.42, 0, 0.12, 1);
/** FOV settles a touch later than the move so the "lens" relaxes last. */
const entryFovEase = cubicBezierEase(0.3, 0, 0.2, 1);

// --- Flights ----------------------------------------------------------------
const flightEase = cubicBezierEase(0.55, 0, 0.18, 1);
/** Look target leads position slightly (eyes before body). */
const lookEase = cubicBezierEase(0.4, 0, 0.12, 1);
const LOOK_LEAD = 1.12;
const FLIGHT_FOV_BREATHE_MAX = 1.6; // deg of extra FOV mid-flight on long moves

// --- Follower smoothing (seconds) -------------------------------------------
const FOLLOW_POS_FLIGHT = 0.09;
const FOLLOW_LOOK_FLIGHT = 0.11;
const FOLLOW_FOV_FLIGHT = 0.1;
const FOLLOW_POS_SETTLED = 0.06;
const FOLLOW_LOOK_SETTLED = 0.14;
const FOLLOW_FOV_SETTLED = 0.22;

// --- Orbit (default view only) ------------------------------------------------
/** Azimuth window around the preset (rad). The preset looks in from the open
 *  +x/+z corner at 45°; ±24° keeps both cut-away walls in front of the lens. */
const ORBIT_THETA_LIMIT = 0.42;
/** Polar window relative to the preset: up toward top-down / down toward the
 *  floor. */
const ORBIT_PHI_MIN = -0.34;
const ORBIT_PHI_MAX = 0.16;
const ZOOM_MIN = 0.62;
const ZOOM_MAX = 1.16;
/** Radians per vertical-viewport of drag. */
const ROTATE_SPEED = Math.PI * 0.42;
const ORBIT_SMOOTH = 0.11;
const ZOOM_SMOOTH = 0.16;
/** Inertia decay (1/s) once the pointer is released. */
const INERTIA_DECAY = 4.2;
/** After this long without input the view eases home (seconds). Long enough
 *  that someone studying the room isn't yanked away, short enough that the
 *  authored hero framing (and idle drift) comes back for the next glance. */
const RETURN_AFTER = 9;
const RETURN_SMOOTH = 1.6;

// --- Idle drift (desktop default view) -------------------------------------
const DRIFT_X_AMP = 0.15;
const DRIFT_Y_AMP = 0.08;
const DRIFT_X_PERIOD = 20.0;
const DRIFT_Y_PERIOD = 14.0;

type Mode = "entry" | "flight" | "settled";

interface DevCameraOverride {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

declare global {
  interface Window {
    /** Dev-only camera rig handle (see CameraRig.tsx). */
    __cameraRig?: {
      /** Pin the camera to an arbitrary pose (for close-up screenshots). */
      override: (o: DevCameraOverride) => void;
      /** Release the pin; the rig flies back to the active preset. */
      clear: () => void;
      /** Live state snapshot (allocates; dev only). */
      state: () => Record<string, unknown>;
    };
  }
}

function presetFor(tier: DeviceTier, key: HotspotKey): CameraView {
  return CAMERA_VIEWS_BY_TIER[tier][key];
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const active = useSceneStore((s) => s.activeHotspot);
  const tier = useDeviceTier();
  const reducedMotion = usePrefersReducedMotion();

  // Latest props for the frame loop / listeners without re-subscribing.
  const live = useRef({ active, tier, reducedMotion });
  live.current.active = active;
  live.current.tier = tier;
  live.current.reducedMotion = reducedMotion;

  // ---- Persistent rig state (allocated once) ----
  const s = useMemo(
    () => ({
      mode: "entry" as Mode,
      time: 0, // accumulated (hitch-clamped) seconds
      // Entry
      entryT: 0,
      mountedAt: 0,
      // Flight
      flightT: 0,
      flightDur: 1,
      flightP0: new Vector3(),
      flightC: new Vector3(),
      flightP1: new Vector3(),
      lookFrom: new Vector3(),
      lookTo: new Vector3(),
      fovFrom: 30,
      fovTo: 30,
      breathe: 0,
      // Desired (pre-follower) pose
      desPos: new Vector3(),
      desLook: new Vector3(),
      desFov: 30,
      // Followed pose
      look: new Vector3(),
      posVel: new Vector3(),
      lookVel: new Vector3(),
      fov: damped(30),
      // Orbit offsets (goal + smoothed)
      thetaGoal: 0,
      phiGoal: 0,
      zoomGoal: 1,
      thetaVel: 0, // inertia (rad/s)
      phiVel: 0,
      theta: damped(0),
      phi: damped(0),
      zoom: damped(1),
      driftW: damped(0),
      // Scratch
      sph: new Spherical(),
      tmp: new Vector3(),
      tmp2: new Vector3(),
      presetPos: new Vector3(),
      presetLook: new Vector3(),
      // Dev override
      override: null as DevCameraOverride | null,
      lastKey: "" as string,
    }),
    [],
  );

  const input = useMemo(createOrbitInput, []);

  const applyFov = (fov: number) => {
    if (Math.abs(camera.fov - fov) > 1e-4) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  };

  /** Start a flight from the CURRENT camera pose to `view`. */
  const startFlight = (view: CameraView) => {
    s.flightP0.copy(camera.position);
    clampToRoom(s.flightP0);
    s.flightP1.set(view.position[0], view.position[1], view.position[2]);
    s.lookFrom.copy(s.look);
    s.lookTo.set(view.target[0], view.target[1], view.target[2]);
    s.fovFrom = s.fov.value;
    s.fovTo = view.fov;
    shapeArc(s.flightP0, s.flightP1, s.flightC);

    const dist = s.flightP0.distanceTo(s.flightP1);
    const turn = viewAngle(s.flightP0, s.lookFrom, s.flightP1, s.lookTo);
    s.flightDur = clamp(0.85 + dist * 0.07 + turn * 0.22, 0.9, 2.1);
    s.breathe = clamp(dist * 0.12, 0, FLIGHT_FOV_BREATHE_MAX);
    s.flightT = 0;
    s.mode = "flight";
  };

  /** Jump straight to `view` (reduced motion / instant). */
  const snapTo = (view: CameraView) => {
    camera.position.set(view.position[0], view.position[1], view.position[2]);
    s.look.set(view.target[0], view.target[1], view.target[2]);
    s.posVel.set(0, 0, 0);
    s.lookVel.set(0, 0, 0);
    s.fov.value = view.fov;
    s.fov.vel = 0;
    camera.lookAt(s.look);
    applyFov(view.fov);
    s.mode = "settled";
  };

  const resetOrbit = () => {
    s.thetaGoal = 0;
    s.phiGoal = 0;
    s.zoomGoal = 1;
    s.thetaVel = 0;
    s.phiVel = 0;
    s.theta.value = 0;
    s.theta.vel = 0;
    s.phi.value = 0;
    s.phi.vel = 0;
    s.zoom.value = 1;
    s.zoom.vel = 0;
  };

  // ---- Mount: place the camera at the start of the entry sweep ----
  useEffect(() => {
    const v = presetFor(live.current.tier, "default");
    s.lastKey = `${live.current.tier}:${live.current.active}`;
    if (live.current.reducedMotion) {
      snapTo(presetFor(live.current.tier, live.current.active));
    } else {
      s.mode = "entry";
      s.entryT = 0;
      s.mountedAt = performance.now();
      s.look.set(v.target[0], v.target[1] + ENTRY_TARGET_LIFT, v.target[2]);
      // Exact start pose so the very first frame is already on the path.
      s.tmp.set(v.position[0], v.position[1], v.position[2]).sub(s.presetLook.set(...v.target));
      s.sph.setFromVector3(s.tmp);
      s.sph.radius *= ENTRY_RADIUS_MUL;
      s.sph.theta += ENTRY_THETA_OFFSET;
      s.sph.phi += ENTRY_PHI_OFFSET;
      camera.position.setFromSpherical(s.sph).add(s.presetLook);
      s.fov.value = v.fov + ENTRY_FOV_OFFSET;
      camera.lookAt(s.look);
      applyFov(s.fov.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Hotspot / tier changes → new flight from wherever we are ----
  useEffect(() => {
    const key = `${tier}:${active}`;
    if (reducedMotion && s.mode !== "settled" && !s.override) {
      // Preference flipped mid-entry / mid-flight: cut straight to the pose.
      s.lastKey = key;
      resetOrbit();
      snapTo(presetFor(tier, active));
      return;
    }
    if (key === s.lastKey) return;
    s.lastKey = key;
    if (s.override) return;
    const view = presetFor(tier, active);
    if (reducedMotion) {
      resetOrbit();
      snapTo(view);
      return;
    }
    // Leaving the default view (or returning to it) discards orbit offsets:
    // the flight starts from the actual orbited camera position and lands on
    // the authored preset.
    resetOrbit();
    s.driftW.value = 0;
    s.driftW.vel = 0;
    startFlight(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tier, reducedMotion]);

  // ---- DOM input (orbit / zoom / click-vs-drag) ----
  useEffect(() => {
    const dispose = attachOrbitInput(gl.domElement, input, setSceneDragging);
    return () => {
      dispose();
      setSceneDragging(false);
      setSceneBaseCursor("");
    };
  }, [gl, input]);

  // ---- Dev handle ----
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Expose the store for automated testing if nobody else has.
    const w = window as unknown as Record<string, unknown>;
    if (!w.__sceneStore) w.__sceneStore = useSceneStore;
    window.__cameraRig = {
      override: (o) => {
        s.override = o;
      },
      clear: () => {
        s.override = null;
        startFlight(presetFor(live.current.tier, live.current.active));
      },
      state: () => ({
        mode: s.mode,
        position: camera.position.toArray(),
        look: s.look.toArray(),
        fov: camera.fov,
        orbit: { theta: s.theta.value, phi: s.phi.value, zoom: s.zoom.value },
        dragging: input.dragging,
        orbitEnabled: input.enabled,
      }),
    };
    return () => {
      delete window.__cameraRig;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    s.time += dt;
    const { active: act, tier: tr, reducedMotion: rm } = live.current;
    const views = CAMERA_VIEWS_BY_TIER[tr];

    // ---------------- Dev override ----------------
    if (s.override) {
      const o = s.override;
      s.desPos.set(o.position[0], o.position[1], o.position[2]);
      s.desLook.set(o.target[0], o.target[1], o.target[2]);
      camera.position.copy(s.desPos);
      s.look.copy(s.desLook);
      camera.lookAt(s.look);
      s.fov.value = o.fov ?? camera.fov;
      applyFov(s.fov.value);
      input.enabled = false;
      setSceneBaseCursor("");
      return;
    }

    let posSmooth = FOLLOW_POS_SETTLED;
    let lookSmooth = FOLLOW_LOOK_SETTLED;
    let fovSmooth = FOLLOW_FOV_SETTLED;

    // ---------------- Entry sweep ----------------
    if (s.mode === "entry") {
      const v = views.default;
      const ready =
        useSceneStore.getState().sceneStatus !== "loading" ||
        performance.now() - s.mountedAt > ENTRY_START_CAP_MS;
      if (ready) s.entryT += dt;
      const u = clamp((s.entryT - ENTRY_HOLD) / ENTRY_DURATION, 0, 1);
      const k = entryEase(u);
      const kf = entryFovEase(u);
      s.presetLook.set(v.target[0], v.target[1], v.target[2]);
      s.tmp.set(v.position[0], v.position[1], v.position[2]).sub(s.presetLook);
      s.sph.setFromVector3(s.tmp);
      // Spherical interpolation around the target = a true orbital arc.
      s.sph.radius *= 1 + (ENTRY_RADIUS_MUL - 1) * (1 - k);
      s.sph.theta += ENTRY_THETA_OFFSET * (1 - k);
      s.sph.phi += ENTRY_PHI_OFFSET * (1 - k);
      s.desPos.setFromSpherical(s.sph).add(s.presetLook);
      s.desLook.copy(s.presetLook);
      s.desLook.y += ENTRY_TARGET_LIFT * (1 - k);
      s.desFov = v.fov + ENTRY_FOV_OFFSET * (1 - kf);
      // Path is already smooth: follow it tightly.
      camera.position.copy(s.desPos);
      s.look.copy(s.desLook);
      s.fov.value = s.desFov;
      s.posVel.set(0, 0, 0);
      s.lookVel.set(0, 0, 0);
      s.fov.vel = 0;
      camera.lookAt(s.look);
      applyFov(s.fov.value);
      input.enabled = false;

      if (u >= 1) {
        s.lastKey = `${tr}:${act}`;
        if (act !== "default") startFlight(views[act]);
        else s.mode = "settled";
      }
      return;
    }

    // ---------------- Flight ----------------
    if (s.mode === "flight") {
      s.flightT += dt;
      const u = clamp(s.flightT / s.flightDur, 0, 1);
      quadBezier(s.desPos, s.flightP0, s.flightC, s.flightP1, flightEase(u));
      clampToRoom(s.desPos);
      s.desLook.copy(s.lookFrom).lerp(s.lookTo, lookEase(Math.min(1, u * LOOK_LEAD)));
      s.desFov =
        s.fovFrom +
        (s.fovTo - s.fovFrom) * easeInOutSine(u) +
        s.breathe * Math.sin(Math.PI * u);
      posSmooth = FOLLOW_POS_FLIGHT;
      lookSmooth = FOLLOW_LOOK_FLIGHT;
      fovSmooth = FOLLOW_FOV_FLIGHT;
      if (u >= 1) s.mode = "settled";
    }

    // ---------------- Settled ----------------
    const orbitAllowed = s.mode === "settled" && act === "default";
    input.enabled = orbitAllowed;
    setSceneBaseCursor(orbitAllowed ? "grab" : "");

    if (s.mode === "settled") {
      const v = views[act];
      s.presetLook.set(v.target[0], v.target[1], v.target[2]);
      s.presetPos.set(v.position[0], v.position[1], v.position[2]);
      s.desLook.copy(s.presetLook);
      s.desFov = v.fov;

      if (orbitAllowed) {
        const nowMs = performance.now();
        // Consume drag input.
        if (input.dragDX !== 0 || input.dragDY !== 0) {
          const k = ROTATE_SPEED / Math.max(200, input.viewHeight);
          const dTheta = -input.dragDX * k;
          const dPhi = -input.dragDY * k;
          s.thetaGoal += dTheta;
          s.phiGoal += dPhi;
          // Instantaneous angular velocity, low-passed for a stable fling.
          const a = dampFactor(18, dt);
          s.thetaVel += (dTheta / Math.max(dt, 1e-3) - s.thetaVel) * a;
          s.phiVel += (dPhi / Math.max(dt, 1e-3) - s.phiVel) * a;
          input.dragDX = 0;
          input.dragDY = 0;
        } else if (input.dragging) {
          // Holding still: kill the fling.
          const a = dampFactor(14, dt);
          s.thetaVel -= s.thetaVel * a;
          s.phiVel -= s.phiVel * a;
        } else if (rm) {
          // Reduced motion: no coasting after release — the view stops
          // exactly where the user let go.
          s.thetaVel = 0;
          s.phiVel = 0;
        } else {
          // Released: coast with inertia (a fling keeps going, a placed view
          // has already had its velocity bled off above).
          s.thetaGoal += s.thetaVel * dt;
          s.phiGoal += s.phiVel * dt;
          const decay = Math.exp(-INERTIA_DECAY * dt);
          s.thetaVel *= decay;
          s.phiVel *= decay;
        }
        if (input.zoomMul !== 1) {
          s.zoomGoal *= input.zoomMul;
          input.zoomMul = 1;
        }

        // Hard limits on the goal (smoothing makes the stop soft).
        if (s.thetaGoal < -ORBIT_THETA_LIMIT || s.thetaGoal > ORBIT_THETA_LIMIT) {
          s.thetaGoal = clamp(s.thetaGoal, -ORBIT_THETA_LIMIT, ORBIT_THETA_LIMIT);
          s.thetaVel = 0;
        }
        if (s.phiGoal < ORBIT_PHI_MIN || s.phiGoal > ORBIT_PHI_MAX) {
          s.phiGoal = clamp(s.phiGoal, ORBIT_PHI_MIN, ORBIT_PHI_MAX);
          s.phiVel = 0;
        }
        s.zoomGoal = clamp(s.zoomGoal, ZOOM_MIN, ZOOM_MAX);

        // Long idle → ease home. Skipped under reduced motion: no camera
        // movement the user didn't start (the view simply stays put; any
        // hotspot / Back / Escape still resets it via a cut).
        const idle = (nowMs - input.lastInputAt) / 1000;
        if (!rm && !input.pressed && idle > RETURN_AFTER) {
          const a = dampFactor(1 / RETURN_SMOOTH, dt);
          s.thetaGoal -= s.thetaGoal * a;
          s.phiGoal -= s.phiGoal * a;
          s.zoomGoal += (1 - s.zoomGoal) * a;
          s.thetaVel = 0;
          s.phiVel = 0;
        }

        smoothDamp(s.theta, s.thetaGoal, ORBIT_SMOOTH, dt);
        smoothDamp(s.phi, s.phiGoal, ORBIT_SMOOTH, dt);
        smoothDamp(s.zoom, s.zoomGoal, ZOOM_SMOOTH, dt);

        // Orbit about the preset target.
        s.tmp.copy(s.presetPos).sub(s.presetLook);
        s.sph.setFromVector3(s.tmp);
        s.sph.radius *= s.zoom.value;
        s.sph.theta += s.theta.value;
        s.sph.phi = clamp(s.sph.phi + s.phi.value, 0.35, 1.45);
        s.desPos.setFromSpherical(s.sph).add(s.presetLook);

        // Idle drift (desktop + tablet, motion allowed) fades out while interacting
        // and back in once the user lets go.
        const interacting = input.pressed || idle < 1.5;
        const driftOn = tr !== "mobile" && !rm;
        smoothDamp(s.driftW, driftOn && !interacting ? 1 : 0, interacting ? 0.25 : 1.4, dt);
        if (s.driftW.value > 1e-4) {
          const w = s.driftW.value;
          s.desPos.x += Math.sin((s.time / DRIFT_X_PERIOD) * Math.PI * 2) * DRIFT_X_AMP * w;
          s.desPos.y += Math.sin((s.time / DRIFT_Y_PERIOD) * Math.PI * 2) * DRIFT_Y_AMP * w;
        }
      } else {
        s.desPos.copy(s.presetPos);
        input.dragDX = 0;
        input.dragDY = 0;
        input.zoomMul = 1;
      }
      clampToRoom(s.desPos);
    }

    // ---------------- Follower (critically damped) ----------------
    smoothDampVec(camera.position, s.desPos, s.posVel, posSmooth, dt);
    smoothDampVec(s.look, s.desLook, s.lookVel, lookSmooth, dt);
    clampToRoom(camera.position);
    camera.lookAt(s.look);
    applyFov(smoothDamp(s.fov, s.desFov, fovSmooth, dt));
  });

  return null;
}

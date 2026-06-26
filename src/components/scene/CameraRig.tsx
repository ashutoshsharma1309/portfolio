import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useSceneStore } from "../../store/useSceneStore";
import { CAMERA_VIEWS_BY_TIER } from "../../config/cameraPositions";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

function dampVec(current: Vector3, target: Vector3, lambda: number, dt: number) {
  const t = 1 - Math.exp(-lambda * dt);
  current.lerp(target, t);
}

function dampNum(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

const POS_LAMBDA = 7.5;
const LOOK_LAMBDA = 9.0;
const FOV_LAMBDA = 8.0;

const ENTRY_DURATION = 1.8;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

const DRIFT_X_AMP = 0.15;
const DRIFT_Y_AMP = 0.08;
const DRIFT_X_PERIOD = 20.0;
const DRIFT_Y_PERIOD = 14.0;

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const active = useSceneStore((s) => s.activeHotspot);
  const tier = useDeviceTier();
  const reducedMotion = usePrefersReducedMotion();

  const desiredPos = useMemo(() => new Vector3(), []);
  const desiredTarget = useMemo(() => new Vector3(), []);
  const currentTarget = useMemo(() => new Vector3(), []);
  const desiredFov = useRef(30);

  const entryStartPos = useMemo(() => new Vector3(), []);
  const entryEndPos = useMemo(() => new Vector3(), []);
  const entryStartTime = useRef<number | null>(null);
  const entryDone = useRef(false);

  // Initial mount: kick off the entry animation from the current tier's
  // default preset.
  useEffect(() => {
    const v = CAMERA_VIEWS_BY_TIER[tier].default;
    const start = new Vector3(
      v.position[0] + 6,
      v.position[1] + 3,
      v.position[2] + 6,
    );
    entryStartPos.copy(start);
    entryEndPos.set(...v.position);

    desiredPos.copy(start);
    desiredTarget.set(...v.target);
    currentTarget.copy(desiredTarget);
    desiredFov.current = v.fov + 6;

    camera.position.copy(start);
    camera.lookAt(currentTarget);
    if ("fov" in camera) {
      const cam = camera as unknown as {
        fov: number;
        updateProjectionMatrix: () => void;
      };
      cam.fov = v.fov + 6;
      cam.updateProjectionMatrix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the active hotspot OR device tier changes, recompute desired
  // pose. Tier-change springs to the new preset (no snap).
  useEffect(() => {
    if (!entryDone.current) return;
    const v = CAMERA_VIEWS_BY_TIER[tier][active];
    desiredPos.set(...v.position);
    desiredTarget.set(...v.target);
    desiredFov.current = v.fov;
  }, [active, tier, desiredPos, desiredTarget]);

  useFrame((state, dt) => {
    const clampedDt = Math.min(dt, 0.05);
    const elapsed = state.clock.getElapsedTime();
    const tierViews = CAMERA_VIEWS_BY_TIER[tier];

    // --- Entry tween ---
    if (!entryDone.current) {
      if (entryStartTime.current === null) entryStartTime.current = elapsed;
      const u = Math.min(
        1,
        (elapsed - entryStartTime.current) / ENTRY_DURATION,
      );
      const k = easeOutCubic(u);
      // Re-resolve the end position on each frame in case tier flipped
      // mid-entry.
      const endPos = tierViews.default.position;
      entryEndPos.set(...endPos);
      desiredPos.copy(entryStartPos).lerp(entryEndPos, k);
      const baseFov = tierViews.default.fov;
      desiredFov.current = baseFov + 6 * (1 - k);

      if (u >= 1) {
        entryDone.current = true;
        const v = tierViews[active];
        desiredPos.set(...v.position);
        desiredTarget.set(...v.target);
        desiredFov.current = v.fov;
      }
    }

    // --- Idle drift: only after entry, only at default, NOT on mobile, and
    // never when the user has asked to reduce motion. ---
    if (
      entryDone.current &&
      active === "default" &&
      tier !== "mobile" &&
      !reducedMotion
    ) {
      const base = tierViews.default;
      const dx =
        Math.sin((elapsed / DRIFT_X_PERIOD) * Math.PI * 2) * DRIFT_X_AMP;
      const dy =
        Math.sin((elapsed / DRIFT_Y_PERIOD) * Math.PI * 2) * DRIFT_Y_AMP;
      desiredPos.set(
        base.position[0] + dx,
        base.position[1] + dy,
        base.position[2],
      );
    }

    dampVec(camera.position, desiredPos, POS_LAMBDA, clampedDt);
    dampVec(currentTarget, desiredTarget, LOOK_LAMBDA, clampedDt);
    camera.lookAt(currentTarget);

    if ("fov" in camera) {
      const cam = camera as unknown as {
        fov: number;
        updateProjectionMatrix: () => void;
      };
      const next = dampNum(cam.fov, desiredFov.current, FOV_LAMBDA, clampedDt);
      if (Math.abs(next - cam.fov) > 0.001) {
        cam.fov = next;
        cam.updateProjectionMatrix();
      }
    }
  });

  return null;
}

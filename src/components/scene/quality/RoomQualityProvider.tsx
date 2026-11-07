import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useDeviceTier } from "../../../hooks/useDeviceTier";
import { useSceneStore } from "../../../store/useSceneStore";
import {
  QUALITY_CONFIGS,
  QUALITY_ORDER,
  initialQuality,
  probeRenderer,
  readQualityOverride,
  stepDown,
  type RoomQuality,
} from "./config";
import { RoomQualityContext, type RoomQualityState } from "./context";

declare global {
  interface Window {
    /** Dev-only: current room quality state (read-only snapshot). */
    __roomQuality?: RoomQualityState & { readonly dpr: readonly [number, number] };
  }
}

/** Don't judge performance while shaders compile, textures swap in and the
 *  camera does its entry fly-in: the monitor is armed this long after the
 *  scene reports "ready" (entry hold 0.35 s + sweep 2.4 s + margin). */
const ARM_AFTER_READY_MS = 4000;
/** After every quality change the monitor is remounted (fresh samples) and
 *  re-armed after this delay, so the change's own recompile/realloc hitch is
 *  never counted against the new level. */
const REARM_AFTER_CHANGE_MS = 2000;
/** Total quality changes (declines + recoveries) before monitoring stops for
 *  good. Caps flapping. */
const MAX_CHANGES = 4;
/** Deepest decline: high→medium→low uses two; the rest shave DPR at 'low'. */
const MAX_DECLINES = 4;
const DPR_STEP = 0.15;
const DPR_FLOOR = 0.75;
/** Desktop (start tier 'high') never renders below native resolution; only
 *  the tier (shadows / materials) drops there. */
const DPR_FLOOR_DESKTOP = 1;

interface Props {
  children: ReactNode;
  /** Called whenever the DPR range should change. Scene.tsx owns the Canvas
   *  `dpr` prop (R3F resets any internal setDpr on Canvas re-render). */
  onDprChange?: (dpr: [number, number]) => void;
}

/**
 * Mount INSIDE <Canvas>. Picks the starting tier ONCE at mount from the device
 * tier and the WebGL renderer (a later resize / rotation never changes it, so
 * it never triggers a material rebuild or shader recompile), then lets drei's
 * PerformanceMonitor step it DOWN on sustained low FPS and back UP (never
 * above the start tier) when a drop turns out to have been transient. The
 * monitor only runs once the scene is ready and the entry move is over, is
 * remounted after every change, and stops after MAX_CHANGES changes.
 */
export function RoomQualityProvider({ children, onDprChange }: Props) {
  const gl = useThree((s) => s.gl);
  const deviceTier = useDeviceTier();
  const [probe] = useState(() => probeRenderer(gl));
  const [override] = useState(readQualityOverride);
  // Pinned at mount: device tier is width-based and must not drive runtime
  // quality (see above). Textures are pinned to it too (see context docs).
  const [startTier] = useState<RoomQuality>(() => override ?? initialQuality(deviceTier, probe));
  const sceneReady = useSceneStore((s) => s.sceneStatus === "ready");

  const [declines, setDeclines] = useState(0);
  const [changes, setChanges] = useState(0);
  const [monitorArmed, setMonitorArmed] = useState(false);

  useEffect(() => {
    if (override || !sceneReady || changes >= MAX_CHANGES) return;
    setMonitorArmed(false);
    const delay = changes === 0 ? ARM_AFTER_READY_MS : REARM_AFTER_CHANGE_MS;
    const id = window.setTimeout(() => setMonitorArmed(true), delay);
    return () => window.clearTimeout(id);
  }, [override, sceneReady, changes]);

  const tierSteps = Math.min(declines, QUALITY_ORDER.indexOf(startTier));
  const tier = stepDown(startTier, tierSteps);
  const dprSteps = declines - tierSteps;
  const config = QUALITY_CONFIGS[tier];
  const dprFloor = startTier === "high" ? DPR_FLOOR_DESKTOP : DPR_FLOOR;
  const dprMax = Math.max(dprFloor, config.dpr[1] - dprSteps * DPR_STEP);
  const dprMin = Math.min(config.dpr[0], dprMax);

  const startConfig = QUALITY_CONFIGS[startTier];
  const anisotropy = Math.max(1, Math.min(startConfig.maxAnisotropy, probe.gpuMaxAnisotropy));

  // DPR is deliberately NOT part of the context value: ~15 components rebuild
  // their materials when this object changes, and a DPR-only step must not
  // re-upload textures or recompile shaders. Scene receives DPR through
  // onDprChange instead.
  const value = useMemo<RoomQualityState>(
    () => ({
      tier,
      config,
      startTier,
      textureSize: startConfig.textureSize,
      anisotropy,
      pinned: override !== null,
      probe,
    }),
    [tier, config, startTier, startConfig, anisotropy, override, probe],
  );

  const onDprChangeRef = useRef(onDprChange);
  onDprChangeRef.current = onDprChange;
  useEffect(() => {
    onDprChangeRef.current?.([dprMin, dprMax]);
  }, [dprMin, dprMax]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__roomQuality = { ...value, dpr: [dprMin, dprMax] };
    console.info(
      `[room-quality] tier=${value.tier} start=${value.startTier} dpr=[${dprMin}, ${dprMax}]` +
        ` pinned=${value.pinned} renderer="${probe.renderer}" software=${probe.software} cores=${probe.cores}`,
    );
  }, [value, probe, dprMin, dprMax]);

  // Live value for the monitor callbacks (they fire from a frame loop).
  const declinesRef = useRef(declines);
  declinesRef.current = declines;
  const maxDeclines = QUALITY_ORDER.indexOf(startTier) + MAX_DECLINES - 2;

  const handleDecline = useCallback(() => {
    if (declinesRef.current >= maxDeclines) return;
    setDeclines((d) => Math.min(d + 1, maxDeclines));
    setChanges((c) => c + 1);
  }, [maxDeclines]);
  const handleIncline = useCallback(() => {
    // Recover one step, never above the start tier — and only ONCE per
    // session: a recovery ends monitoring for good. Every tier change
    // rebuilds ~15 components' materials (a visible hitch), so letting the
    // monitor keep sampling after a recovery made it oscillate
    // high→medium→high→medium during normal use.
    if (declinesRef.current <= 0) return;
    setDeclines((d) => Math.max(0, d - 1));
    setChanges(MAX_CHANGES);
  }, []);
  const bounds = useCallback(
    (refreshrate: number): [number, number] => (refreshrate > 100 ? [50, 110] : [40, 56]),
    [],
  );

  return (
    <RoomQualityContext.Provider value={value}>
      {monitorArmed && changes < MAX_CHANGES && (
        <PerformanceMonitor
          key={changes}
          ms={250}
          iterations={10}
          threshold={0.75}
          bounds={bounds}
          onDecline={handleDecline}
          onIncline={handleIncline}
        />
      )}
      {children}
    </RoomQualityContext.Provider>
  );
}

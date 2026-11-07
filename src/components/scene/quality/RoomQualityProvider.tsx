import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useDeviceTier } from "../../../hooks/useDeviceTier";
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
    __roomQuality?: RoomQualityState;
  }
}

/** Don't judge performance while shaders compile, textures generate and the
 *  camera does its entry fly-in. */
const MONITOR_WARMUP_MS = 3500;
/** Total downgrade steps PerformanceMonitor may take before it gives up
 *  (fallback). high→medium→low uses two; the rest shave DPR at 'low'. */
const MAX_DECLINES = 3;
const DPR_STEP = 0.15;
const DPR_FLOOR = 0.75;

interface Props {
  children: ReactNode;
  /** Called whenever the DPR range should change. Scene.tsx owns the Canvas
   *  `dpr` prop (R3F resets any internal setDpr on Canvas re-render). */
  onDprChange?: (dpr: [number, number]) => void;
}

/**
 * Mount INSIDE <Canvas>. Picks the starting tier from the device tier and the
 * WebGL renderer, then lets drei's PerformanceMonitor step it DOWN on sustained
 * low FPS. Inclines are disabled (upper bound = Infinity) so the tier can never
 * flap up and down; `flipflops` therefore counts declines only and, once
 * exceeded, onFallback pins the lowest settings and monitoring stops.
 */
export function RoomQualityProvider({ children, onDprChange }: Props) {
  const gl = useThree((s) => s.gl);
  const deviceTier = useDeviceTier();
  const [probe] = useState(() => probeRenderer(gl));
  const [override] = useState(readQualityOverride);
  const baseTier: RoomQuality = override ?? initialQuality(deviceTier, probe);
  // Textures are pinned to the tier chosen at mount (see context docs).
  const [startTier] = useState<RoomQuality>(baseTier);

  const [declines, setDeclines] = useState(0);
  const [monitorArmed, setMonitorArmed] = useState(false);

  useEffect(() => {
    if (override) return;
    const id = window.setTimeout(() => setMonitorArmed(true), MONITOR_WARMUP_MS);
    return () => window.clearTimeout(id);
  }, [override]);

  const tierSteps = Math.min(declines, QUALITY_ORDER.indexOf(baseTier));
  const tier = stepDown(baseTier, tierSteps);
  const dprSteps = declines - tierSteps;
  const config = QUALITY_CONFIGS[tier];
  const dprMax = Math.max(DPR_FLOOR, config.dpr[1] - dprSteps * DPR_STEP);
  const dprMin = Math.min(config.dpr[0], dprMax);

  const startConfig = QUALITY_CONFIGS[startTier];
  const anisotropy = Math.max(1, Math.min(startConfig.maxAnisotropy, probe.gpuMaxAnisotropy));

  const value = useMemo<RoomQualityState>(
    () => ({
      tier,
      config,
      startTier,
      textureSize: startConfig.textureSize,
      anisotropy,
      pinned: override !== null,
      probe,
      dpr: [dprMin, dprMax],
    }),
    [tier, config, startTier, startConfig, anisotropy, override, probe, dprMin, dprMax],
  );

  const onDprChangeRef = useRef(onDprChange);
  onDprChangeRef.current = onDprChange;
  useEffect(() => {
    onDprChangeRef.current?.([dprMin, dprMax]);
  }, [dprMin, dprMax]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__roomQuality = value;
    console.info(
      `[room-quality] tier=${value.tier} start=${value.startTier} dpr=[${value.dpr.join(", ")}]` +
        ` pinned=${value.pinned} renderer="${probe.renderer}" software=${probe.software} cores=${probe.cores}`,
    );
  }, [value, probe]);

  const handleDecline = useCallback(() => {
    setDeclines((d) => Math.min(d + 1, MAX_DECLINES + 2));
  }, []);
  const handleFallback = useCallback(() => {
    // Settle at the floor: lowest tier and the minimum DPR. Monitoring stops.
    setDeclines(MAX_DECLINES + 2);
  }, []);
  const bounds = useCallback(
    (refreshrate: number): [number, number] => [refreshrate > 100 ? 50 : 40, Infinity],
    [],
  );

  return (
    <RoomQualityContext.Provider value={value}>
      {monitorArmed && (
        <PerformanceMonitor
          ms={250}
          iterations={10}
          threshold={0.75}
          bounds={bounds}
          flipflops={MAX_DECLINES}
          onDecline={handleDecline}
          onFallback={handleFallback}
        />
      )}
      {children}
    </RoomQualityContext.Provider>
  );
}

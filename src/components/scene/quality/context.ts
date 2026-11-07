import { createContext } from "react";
import { QUALITY_CONFIGS, type RendererProbe, type RoomQuality, type RoomQualityConfig } from "./config";

export interface RoomQualityState {
  /** Current tier. Moves down on sustained low FPS (PerformanceMonitor) and
   *  may recover, but never rises above `startTier`. */
  readonly tier: RoomQuality;
  /** Knobs for the current tier. */
  readonly config: RoomQualityConfig;
  /** Tier chosen at startup. Texture size + anisotropy are pinned to it so a
   *  runtime downgrade never triggers a texture regeneration hitch while the
   *  device is already struggling. */
  readonly startTier: RoomQuality;
  /** Texture edge length to request from the texture generator (pinned). */
  readonly textureSize: number;
  /** Anisotropy to apply to generated textures (pinned, clamped to the GPU). */
  readonly anisotropy: number;
  /** True when `?quality=` pinned the tier (runtime downgrades disabled). */
  readonly pinned: boolean;
  /** Renderer probe result (null outside the Canvas). */
  readonly probe: RendererProbe | null;
  // DPR is intentionally not in the context (a DPR-only step must not give
  // this object a new identity: materials are memoized on it).
}

const FALLBACK = QUALITY_CONFIGS.medium;

export const RoomQualityContext = createContext<RoomQualityState>({
  tier: FALLBACK.tier,
  config: FALLBACK,
  startTier: FALLBACK.tier,
  textureSize: FALLBACK.textureSize,
  anisotropy: FALLBACK.maxAnisotropy,
  pinned: false,
  probe: null,
});

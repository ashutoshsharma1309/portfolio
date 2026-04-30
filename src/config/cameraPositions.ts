import type { Vector3Tuple } from "three";
import type { DeviceTier } from "../hooks/useDeviceTier";

export type HotspotKey =
  | "default"
  | "aboutFrames"
  | "projectsDesk"
  | "rack"
  | "whiteboard";

export interface CameraView {
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
}

export type CameraPositions = Record<DeviceTier, Record<HotspotKey, CameraView>>;

// Per-device-tier camera presets. Mobile pulls back further and uses a wider
// FOV so the whole isometric room fits in a tall portrait viewport. Tablet
// sits between desktop and mobile.
export const CAMERA_VIEWS_BY_TIER: CameraPositions = {
  desktop: {
    default: { position: [10, 9, 10], target: [0, 1.4, 0], fov: 30 },
    aboutFrames: {
      position: [-1.5, 3, 4.5],
      target: [-3, 3, -4.9],
      fov: 32,
    },
    projectsDesk: {
      position: [3.5, 3.2, 4],
      target: [2, 1.6, -4.5],
      fov: 32,
    },
    rack: {
      position: [1.5, 3.5, 4.5],
      target: [3.5, 1.6, -1.5],
      fov: 36,
    },
    whiteboard: {
      position: [3.5, 3.2, 3],
      target: [-4.9, 2.6, -1],
      fov: 34,
    },
  },
  tablet: {
    default: { position: [12, 10, 12], target: [0, 1.4, 0], fov: 38 },
    aboutFrames: {
      position: [-1.0, 3, 5.5],
      target: [-3, 3, -4.9],
      fov: 40,
    },
    projectsDesk: {
      position: [3.5, 3.4, 5.5],
      target: [2, 1.6, -4.5],
      fov: 40,
    },
    rack: {
      position: [1.5, 3.8, 6.0],
      target: [3.5, 1.6, -1.5],
      fov: 42,
    },
    whiteboard: {
      position: [3.5, 3.6, 5.0],
      target: [-4.9, 2.6, -1],
      fov: 42,
    },
  },
  mobile: {
    // Pull WAY back + much wider FOV so a 375-wide portrait phone can still
    // see the whole room. Hotspot zooms frame slightly tighter on mobile so
    // the subject fills the screen.
    default: { position: [13, 11, 13], target: [0, 1.4, 0], fov: 52 },
    aboutFrames: {
      position: [-0.3, 3, 5.0],
      target: [-3, 3, -4.9],
      fov: 50,
    },
    projectsDesk: {
      position: [3.6, 3.6, 5.0],
      target: [2, 1.6, -4.5],
      fov: 50,
    },
    rack: {
      position: [0.5, 4.0, 6.0],
      target: [3.5, 1.6, -1.5],
      fov: 54,
    },
    whiteboard: {
      position: [3.5, 4.0, 5.0],
      target: [-4.9, 2.6, -1],
      fov: 54,
    },
  },
};

// Backwards-compatible default export — desktop preset used by anything that
// doesn't yet plumb the tier through.
export const CAMERA_VIEWS = CAMERA_VIEWS_BY_TIER.desktop;

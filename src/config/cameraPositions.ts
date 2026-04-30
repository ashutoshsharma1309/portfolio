import type { Vector3Tuple } from "three";

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

// Room is centered around origin. Floor at y=0, walls along -x and -z.
export const CAMERA_VIEWS: Record<HotspotKey, CameraView> = {
  default: {
    position: [10, 9, 10],
    target: [0, 1.4, 0],
    fov: 30,
  },
  aboutFrames: {
    // Photo frames are on the back (-z) wall, left side
    position: [-1.5, 3, 4.5],
    target: [-3, 3, -4.9],
    fov: 32,
  },
  projectsDesk: {
    // Desk against the back (-z) wall, right of frames
    position: [3.5, 3.2, 4],
    target: [2, 1.6, -4.5],
    fov: 32,
  },
  rack: {
    // Powerlifting rack in the front-right open area
    position: [7.5, 4, 6.5],
    target: [3.4, 1.4, 2.2],
    fov: 32,
  },
  whiteboard: {
    // Whiteboard on the left (-x) wall
    position: [3.5, 3.2, 3],
    target: [-4.9, 2.6, -1],
    fov: 34,
  },
};

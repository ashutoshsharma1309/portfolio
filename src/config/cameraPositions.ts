import type { Vector3Tuple } from "three";
import type { DeviceTier } from "../hooks/useDeviceTier";

export type HotspotKey =
  | "default"
  | "aboutFrames"
  | "experience"
  | "projectsDesk"
  | "skills"
  | "rack"
  | "whiteboard"
  | "sportsTrophy"
  | "hackathonTrophy";

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
    // fov 34 + lower target: the whole room (trophy + platform at the front,
    // frames at the top) fits below the 64 px nav with margin.
    default: { position: [10, 9, 10], target: [0, 1.15, 0], fov: 34 },
    // Nav-only panels (no dedicated 3D object) hold the room-overview framing
    // so the camera doesn't fly somewhere arbitrary while the panel opens.
    experience: { position: [10, 9, 10], target: [0, 1.15, 0], fov: 34 },
    skills: { position: [10, 9, 10], target: [0, 1.15, 0], fov: 34 },
    aboutFrames: {
      // Social frames: 2x2 grid centred at world ~(-1.6, 2.8, -4.85). The
      // About panel covers the right 480px, so aim right of the grid to seat
      // it in the centre of the visible left strip; pulled in so the wall top
      // stays out of frame (no void band).
      position: [0.3, 2.9, 2.65],
      target: [-0.45, 2.7, -4.9],
      fov: 32,
    },
    projectsDesk: {
      // Left of the power rack (frame spans x ≈ 2.9–3.9 at z ≈ 1.2–3.2) so
      // the view to the desk is unobstructed; aimed right of the desk so
      // both monitors sit left of the 480 px Projects panel.
      position: [2.0, 3.1, 2.8],
      target: [3.6, 1.6, -4.5],
      fov: 34,
    },
    rack: {
      position: [7.6, 3.6, 7.2],
      target: [3.4, 1.2, 2.3],
      fov: 34,
    },
    whiteboard: {
      position: [3.5, 3.2, 3],
      target: [-4.9, 2.6, -1],
      fov: 34,
    },
    sportsTrophy: {
      // Pulled back + wider fov so the whole gold cup (base→rim, ~1.1u tall)
      // fits with breathing room instead of being cropped.
      position: [4.8, 2.6, 7.0],
      target: [2.6, 0.7, 3.5],
      fov: 30,
    },
    hackathonTrophy: {
      // Frame the silver cup on the bookshelf at [1.5, 3.03, -4.78] (cup rim
      // ~y=4), NOT the social photo frames on the left of the back wall.
      position: [2.05, 3.7, -1.6],
      target: [1.5, 3.45, -4.78],
      fov: 30,
    },
  },
  tablet: {
    default: { position: [12, 10, 12], target: [0, 1.4, 0], fov: 38 },
    experience: { position: [12, 10, 12], target: [0, 1.4, 0], fov: 38 },
    skills: { position: [12, 10, 12], target: [0, 1.4, 0], fov: 38 },
    aboutFrames: {
      // 60vw panel on the right: aim right of the frame grid (~x -1.6) so it
      // sits in the visible left ~40%; slightly narrower FOV keeps the wall
      // top (y=5) at the edge of frame.
      position: [1.2, 2.9, 3.6],
      target: [0.65, 2.55, -4.9],
      fov: 36,
    },
    projectsDesk: {
      // Left of the power rack so it never blocks the desk (see desktop);
      // aimed right so the desk sits in the strip left of the 60vw panel.
      position: [1.9, 3.4, 4.2],
      target: [4.0, 1.6, -4.5],
      fov: 40,
    },
    rack: {
      // Tablet shows a 60vw side panel, so the rack must sit in the visible
      // left ~40%. Bias the target right/front of the rack to push it left.
      position: [8.0, 4.2, 8.6],
      target: [6.2, 1.5, 4.4],
      fov: 46,
    },
    whiteboard: {
      position: [3.5, 3.6, 5.0],
      target: [-4.9, 2.6, -1],
      fov: 42,
    },
    sportsTrophy: {
      // Pull back for full visibility; look slightly right of the trophy so it
      // sits in the visible left ~40% beside the 60vw panel.
      position: [5.2, 2.7, 7.2],
      target: [3.6, 0.7, 3.5],
      fov: 38,
    },
    hackathonTrophy: {
      // 60vw side panel — look slightly to the RIGHT of the trophy so the cup
      // sits ~1/3 from the left, inside the visible strip (not under the panel).
      position: [2.55, 3.8, -1.3],
      target: [2.35, 3.4, -4.78],
      fov: 42,
    },
  },
  mobile: {
    // Pull WAY back + much wider FOV so a 375-wide portrait phone can still
    // see the whole room. Hotspot zooms frame slightly tighter on mobile so
    // the subject fills the screen.
    // A portrait phone's horizontal FOV is only ~25° at fov 52, so the camera
    // sits far enough back (~34 m, a little margin) for the room's 7.1 m half-diagonal to fit.
    default: { position: [21.5, 17.7, 21.5], target: [0, 1.2, 0], fov: 52 },
    experience: { position: [21.5, 17.7, 21.5], target: [0, 1.2, 0], fov: 52 },
    skills: { position: [21.5, 17.7, 21.5], target: [0, 1.2, 0], fov: 52 },
    aboutFrames: {
      // Full-screen panel hides the canvas on mobile; just centre the grid.
      position: [-1.2, 3, 4.0],
      target: [-1.6, 2.8, -4.9],
      fov: 50,
    },
    projectsDesk: {
      position: [3.6, 3.6, 5.0],
      target: [2, 1.6, -4.5],
      fov: 50,
    },
    rack: {
      position: [8.6, 4.4, 8.4],
      target: [3.4, 1.3, 2.3],
      fov: 48,
    },
    whiteboard: {
      position: [3.5, 4.0, 5.0],
      target: [-4.9, 2.6, -1],
      fov: 54,
    },
    sportsTrophy: {
      position: [4.6, 2.6, 7.2],
      target: [2.6, 0.7, 3.5],
      fov: 44,
    },
    hackathonTrophy: {
      position: [2.05, 3.7, -1.5],
      target: [1.5, 3.45, -4.78],
      fov: 40,
    },
  },
};


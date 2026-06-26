import { create } from "zustand";
import type { HotspotKey } from "../config/cameraPositions";

/** Lifecycle of the 3D scene, surfaced to the app shell so the loading screen
 *  can wait for a real first frame (not just a timer) and so we can degrade
 *  gracefully when WebGL is unavailable. */
export type SceneStatus = "loading" | "ready" | "error";

interface SceneState {
  activeHotspot: HotspotKey;
  hovered: string | null;
  sceneStatus: SceneStatus;
  setHotspot: (h: HotspotKey) => void;
  setHovered: (id: string | null) => void;
  resetToDefault: () => void;
  setSceneStatus: (s: SceneStatus) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  activeHotspot: "default",
  hovered: null,
  sceneStatus: "loading",
  setHotspot: (h) => set({ activeHotspot: h }),
  setHovered: (id) => set({ hovered: id }),
  resetToDefault: () => set({ activeHotspot: "default" }),
  setSceneStatus: (s) => set({ sceneStatus: s }),
}));

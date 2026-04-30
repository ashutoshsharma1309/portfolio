import { create } from "zustand";
import type { HotspotKey } from "../config/cameraPositions";

interface SceneState {
  activeHotspot: HotspotKey;
  hovered: string | null;
  setHotspot: (h: HotspotKey) => void;
  setHovered: (id: string | null) => void;
  resetToDefault: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  activeHotspot: "default",
  hovered: null,
  setHotspot: (h) => set({ activeHotspot: h }),
  setHovered: (id) => set({ hovered: id }),
  resetToDefault: () => set({ activeHotspot: "default" }),
}));

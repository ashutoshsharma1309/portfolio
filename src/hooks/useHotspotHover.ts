import { useCallback } from "react";
import { useSceneStore } from "../store/useSceneStore";

export function useHotspotHover(id: string) {
  const setHovered = useSceneStore((s) => s.setHovered);
  const hovered = useSceneStore((s) => s.hovered === id);

  const onPointerOver = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
      setHovered(id);
    },
    [id, setHovered],
  );

  const onPointerOut = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      document.body.style.cursor = "auto";
      setHovered(null);
    },
    [setHovered],
  );

  return { hovered, onPointerOver, onPointerOut };
}

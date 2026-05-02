import { useCallback } from "react";
import { useSceneStore } from "../store/useSceneStore";

// The R3F canvas doesn't always inherit `body { cursor }`, so we set the
// cursor on both <body> AND the live <canvas> element to make sure the
// pointer indicator actually shows over the WebGL viewport.
function setSceneCursor(value: string) {
  if (typeof document === "undefined") return;
  document.body.style.cursor = value;
  const canvas = document.querySelector("canvas");
  if (canvas) (canvas as HTMLCanvasElement).style.cursor = value;
}

export function useHotspotHover(id: string) {
  const setHovered = useSceneStore((s) => s.setHovered);
  const hovered = useSceneStore((s) => s.hovered === id);

  const onPointerOver = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setSceneCursor("pointer");
      setHovered(id);
    },
    [id, setHovered],
  );

  const onPointerOut = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setSceneCursor("");
      setHovered(null);
    },
    [setHovered],
  );

  return { hovered, onPointerOver, onPointerOut };
}

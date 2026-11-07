import { useCallback } from "react";
import { useSceneStore } from "../store/useSceneStore";

// ---------------------------------------------------------------------------
// Scene cursor arbitration.
//
// The R3F canvas doesn't always inherit `body { cursor }`, so the hover
// cursor is set on both <body> AND the live <canvas>. Three sources compete:
//   1. drag   — the camera rig is orbiting ("grabbing"), highest priority
//   2. hover  — a hotspot is under the pointer ("pointer")
//   3. base   — what empty canvas shows ("grab" when orbit is available)
// Only the hover cursor is mirrored to <body> (original behaviour); the base /
// drag cursors stay on the canvas so panels and nav never show a grab hand.
// ---------------------------------------------------------------------------
let baseCursor = "";
let hoverActive = false;
let dragActive = false;

function canvasEl(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector<HTMLCanvasElement>(".canvas-wrapper canvas") ??
    document.querySelector<HTMLCanvasElement>("canvas")
  );
}

function applySceneCursor() {
  if (typeof document === "undefined") return;
  const canvasValue = dragActive ? "grabbing" : hoverActive ? "pointer" : baseCursor;
  document.body.style.cursor = hoverActive && !dragActive ? "pointer" : "";
  const canvas = canvasEl();
  if (canvas) canvas.style.cursor = canvasValue;
}

/** Camera rig: cursor shown over empty canvas (e.g. "grab" when orbit is on). */
export function setSceneBaseCursor(value: string) {
  if (baseCursor === value) return;
  baseCursor = value;
  applySceneCursor();
}

/** Camera rig: an orbit drag is in progress. */
export function setSceneDragging(value: boolean) {
  if (dragActive === value) return;
  dragActive = value;
  applySceneCursor();
}

export function useHotspotHover(id: string) {
  const setHovered = useSceneStore((s) => s.setHovered);
  const hovered = useSceneStore((s) => s.hovered === id);

  const onPointerOver = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      hoverActive = true;
      applySceneCursor();
      setHovered(id);
    },
    [id, setHovered],
  );

  const onPointerOut = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      hoverActive = false;
      applySceneCursor();
      // Only clear if we're still the hovered hotspot: when the pointer moves
      // directly from one hotspot to an adjacent one, R3F may deliver the new
      // `over` before the old `out`, and we must not wipe the newcomer.
      if (useSceneStore.getState().hovered === id) setHovered(null);
      else if (useSceneStore.getState().hovered !== null) {
        hoverActive = true;
        applySceneCursor();
      }
    },
    [id, setHovered],
  );

  return { hovered, onPointerOver, onPointerOut };
}

// Mutable, render-free channel between the DOM hero and the WebGL scene.
// The hero writes pointer + scroll here on events; the scene reads it inside
// useFrame. Avoids React re-renders on every pointer move.
export const heroSignal = {
  /** 0 at the top of the page → 1 once the hero has scrolled out. */
  scroll: 0,
  /** Pointer in normalized device coords relative to the hero (-1..1). */
  px: 0,
  py: 0,
  /** Whether a precise pointer is currently over the hero. */
  pointerActive: false,
};

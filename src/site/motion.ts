// Motion tokens — the single source of timing/easing for the site. Mirrors the
// CSS custom properties in index.css so CSS and JS motion feel identical.

type Bezier = [number, number, number, number];

export const EASE_OUT: Bezier = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT: Bezier = [0.65, 0, 0.35, 1];

export const DUR = {
  fast: 0.18,
  base: 0.32,
  slow: 0.7,
  slower: 1.1,
} as const;

/** Stagger step between sibling reveals. */
export const STAGGER = 0.07;

/** Spring used by magnetic / tilt interactions. */
export const SPRING_SOFT = { stiffness: 180, damping: 20, mass: 0.6 };

// Shared between Walls.tsx (cuts the opening in the back wall) and
// Window.tsx (builds the unit inside it). Coordinates are LOCAL to the
// BackWall group (world center 0, 2.5, -5); the wall's front face is at
// local z = +0.075, its back face at -0.075.

/** Window group origin (unchanged from the original placement). */
export const WINDOW_POS = [3.2, 0.1, 0.08] as const;

/** Rough opening cut through the wall, centred on the window group. */
export const WINDOW_OPENING = { w: 2.3, h: 2.1 } as const;

/** Wall thickness (m). */
export const WALL_THICKNESS = 0.15;

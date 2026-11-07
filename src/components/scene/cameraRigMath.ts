import { Vector3 } from "three";

/**
 * Camera-rig math helpers. Everything here is allocation-free when called per
 * frame (callers pass preallocated outputs / velocity holders).
 */

// ---------------------------------------------------------------------------
// Critically-damped spring (Unity-style SmoothDamp). Frame-rate independent:
// the integration is exact for a critically damped system, so 30 fps and
// 144 fps converge along the same curve.
// ---------------------------------------------------------------------------

/** Mutable scalar + velocity pair driven by smoothDamp. */
export interface Damped {
  value: number;
  vel: number;
}

export function damped(value = 0): Damped {
  return { value, vel: 0 };
}

/** Advance `d` toward `target`. Returns the new value (also stored in d). */
export function smoothDamp(d: Damped, target: number, smoothTime: number, dt: number): number {
  if (dt <= 0) return d.value;
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = d.value - target;
  const temp = (d.vel + omega * change) * dt;
  d.vel = (d.vel - omega * temp) * exp;
  let out = target + (change + temp) * exp;
  // Overshoot guard.
  if (target - d.value > 0 === out > target) {
    out = target;
    d.vel = (out - target) / dt;
  }
  d.value = out;
  return out;
}

/** Vector variant: moves `current` toward `target`, velocity kept in `vel`. */
export function smoothDampVec(
  current: Vector3,
  target: Vector3,
  vel: Vector3,
  smoothTime: number,
  dt: number,
): void {
  if (dt <= 0) return;
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  const cx = current.x - target.x;
  const cy = current.y - target.y;
  const cz = current.z - target.z;
  const tx = (vel.x + omega * cx) * dt;
  const ty = (vel.y + omega * cy) * dt;
  const tz = (vel.z + omega * cz) * dt;
  vel.x = (vel.x - omega * tx) * exp;
  vel.y = (vel.y - omega * ty) * exp;
  vel.z = (vel.z - omega * tz) * exp;
  let ox = target.x + (cx + tx) * exp;
  let oy = target.y + (cy + ty) * exp;
  let oz = target.z + (cz + tz) * exp;

  // Overshoot guard (per whole vector, like Unity's Vector3.SmoothDamp).
  const origX = target.x - current.x;
  const origY = target.y - current.y;
  const origZ = target.z - current.z;
  if (origX * (ox - target.x) + origY * (oy - target.y) + origZ * (oz - target.z) > 0) {
    ox = target.x;
    oy = target.y;
    oz = target.z;
    vel.set(0, 0, 0);
  }
  current.set(ox, oy, oz);
}

/** Exponential approach factor for `lambda` (1/s) over dt. */
export function dampFactor(lambda: number, dt: number): number {
  return 1 - Math.exp(-lambda * dt);
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// ---------------------------------------------------------------------------
// CSS-style cubic-bezier easing (x1,y1,x2,y2), solved with Newton + bisection.
// Built once at module level; evaluation allocates nothing.
// ---------------------------------------------------------------------------
export function cubicBezierEase(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-5) return sampleY(t);
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (x > v) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

export const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// ---------------------------------------------------------------------------
// Room collision volume. The room is a cut-away box: back wall at z=-5, left
// wall at x=-5 (0.15 thick), floor at y=0. The open +x/+z sides have no walls,
// so the camera is free there.
// ---------------------------------------------------------------------------
export const ROOM_MIN_X = -4.35;
export const ROOM_MIN_Z = -4.35;
export const ROOM_MIN_Y = 0.45;

export function clampToRoom(v: Vector3): Vector3 {
  if (v.x < ROOM_MIN_X) v.x = ROOM_MIN_X;
  if (v.z < ROOM_MIN_Z) v.z = ROOM_MIN_Z;
  if (v.y < ROOM_MIN_Y) v.y = ROOM_MIN_Y;
  return v;
}

/** Loose world-space AABBs of furniture the camera should arc over/around
 *  during flights (min xyz, max xyz). Kept deliberately generous. */
const OBSTACLES: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  // Powerlifting rack (rotated 45°, posts ~2.8 tall)
  [1.9, 0, 0.7, 4.9, 3.1, 3.7],
  // Desk + monitors
  [-0.4, 0, -5, 3.7, 2.0, -3.3],
  // Office chair
  [2.0, 0, -3.2, 3.2, 1.4, -2.0],
  // Drawer unit
  [-1.0, 0, -5, 0.2, 1.3, -3.6],
  // Wall shelf + hackathon cup
  [0.5, 2.7, -5, 3.6, 4.3, -4.2],
  // Beanbag + side table
  [-4.2, 0, 0.5, -1.5, 1.3, 3.0],
  // Sports trophy plinth + cup
  [2.0, 0, 2.9, 3.2, 1.7, 4.1],
  // Plants
  [-4.8, 0, -4.4, -3.6, 1.4, -3.2],
  [-1.5, 0, 1.5, -0.5, 1.2, 2.5],
];
const OBSTACLE_MARGIN = 0.45;

const tmpA = new Vector3();
const tmpB = new Vector3();

/** Quadratic Bézier: out = (1-t)²·p0 + 2t(1-t)·c + t²·p1. */
export function quadBezier(out: Vector3, p0: Vector3, c: Vector3, p1: Vector3, t: number): Vector3 {
  const it = 1 - t;
  const a = it * it;
  const b = 2 * it * t;
  const d = t * t;
  out.set(
    a * p0.x + b * c.x + d * p1.x,
    a * p0.y + b * c.y + d * p1.y,
    a * p0.z + b * c.z + d * p1.z,
  );
  return out;
}

function insideObstacle(p: Vector3, skipA = -1, skipB = -1): number {
  for (let i = 0; i < OBSTACLES.length; i++) {
    if (i === skipA || i === skipB) continue;
    const o = OBSTACLES[i];
    if (
      p.x > o[0] - OBSTACLE_MARGIN &&
      p.x < o[3] + OBSTACLE_MARGIN &&
      p.y > o[1] - OBSTACLE_MARGIN &&
      p.y < o[4] + OBSTACLE_MARGIN &&
      p.z > o[2] - OBSTACLE_MARGIN &&
      p.z < o[5] + OBSTACLE_MARGIN
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Build the control point of a flight arc from p0 to p1.
 *  - Lifts the midpoint proportional to distance (a gentle crane move).
 *  - Pulls slightly toward the open (+x,+z) quadrant for in-room moves so the
 *    camera "steps back" rather than cutting across furniture.
 *  - Iteratively raises the arc if any sample intersects a furniture AABB.
 *  - Clamps the control point to the room volume. Since p0, p1 and c are all
 *    inside the (convex) allowed half-space, the whole quadratic curve stays
 *    inside it too: the path can never cross the back wall, left wall or
 *    floor.
 * Runs once per flight (not per frame).
 */
export function shapeArc(p0: Vector3, p1: Vector3, outC: Vector3): void {
  const d = p0.distanceTo(p1);
  outC.copy(p0).add(p1).multiplyScalar(0.5);
  outC.y += clamp(d * 0.16, 0.12, 2.4);

  const bothInside = p0.x < 5 && p0.z < 5 && p1.x < 5 && p1.z < 5;
  if (bothInside) {
    const pull = clamp(d * 0.12, 0, 1.2);
    outC.x += pull * 0.7071;
    outC.z += pull * 0.7071;
  }

  // A preset may legitimately sit inside a (generous) obstacle box, e.g. the
  // desk/whiteboard close-ups hover just above the rack's bounds. Ignore any
  // box that contains an endpoint so the arc doesn't balloon trying to
  // escape a volume it must start or end in.
  const skipA = insideObstacle(p0);
  const skipB = insideObstacle(p1);

  for (let iter = 0; iter < 8; iter++) {
    let worst = 0;
    for (let s = 1; s < 16; s++) {
      quadBezier(tmpA, p0, outC, p1, s / 16);
      const hit = insideObstacle(tmpA, skipA, skipB);
      if (hit >= 0) {
        const need = OBSTACLES[hit][4] + OBSTACLE_MARGIN + 0.05 - tmpA.y;
        // A control-point raise of Δ lifts sample t by 2t(1-t)Δ.
        const t = s / 16;
        const w = Math.max(0.2, 2 * t * (1 - t));
        worst = Math.max(worst, need / w);
      }
    }
    if (worst <= 0) break;
    outC.y += Math.min(worst, 3);
  }

  clampToRoom(outC);
}

/** Angle (rad) between view directions (target - position) of two poses. */
export function viewAngle(posA: Vector3, tgtA: Vector3, posB: Vector3, tgtB: Vector3): number {
  tmpA.copy(tgtA).sub(posA).normalize();
  tmpB.copy(tgtB).sub(posB).normalize();
  return Math.acos(clamp(tmpA.dot(tmpB), -1, 1));
}

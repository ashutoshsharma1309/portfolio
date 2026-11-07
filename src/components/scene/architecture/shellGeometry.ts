// Geometry builders for the room shell: wall slabs (with an optional window
// opening), profiled skirting boards and the rug's rolled edge.

import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Path,
  Shape,
  ShapeUtils,
  Vector2,
} from "three";

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * A wall slab in its own XY plane: X from x0 to x1, Y from -height/2 to
 * +height/2, Z from -thickness/2 (back) to +thickness/2 (front). Group 0 =
 * front/back faces (UV: u = (x - uOrigin) / uSpan, v = (y + h/2) / h, so
 * v = 0 is the floor edge), group 1 = cut faces (top, ends, opening reveal;
 * UV in meters / 5).
 */
export function buildWallSlab(opts: {
  x0: number;
  x1: number;
  height: number;
  thickness: number;
  uOrigin: number;
  uSpan: number;
  hole?: Rect;
}): BufferGeometry {
  const { x0, x1, height, thickness, uOrigin, uSpan, hole } = opts;
  const hh = height / 2;
  const shape = new Shape();
  shape.moveTo(x0, -hh);
  shape.lineTo(x1, -hh);
  shape.lineTo(x1, hh);
  shape.lineTo(x0, hh);
  shape.lineTo(x0, -hh);
  if (hole) {
    const p = new Path();
    const l = hole.x - hole.w / 2;
    const r = hole.x + hole.w / 2;
    const b = hole.y - hole.h / 2;
    const t = hole.y + hole.h / 2;
    p.moveTo(l, b);
    p.lineTo(l, t);
    p.lineTo(r, t);
    p.lineTo(r, b);
    p.lineTo(l, b);
    shape.holes.push(p);
  }
  const geo = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geo.translate(0, 0, -thickness / 2);

  const pos = geo.getAttribute("position");
  const nrm = geo.getAttribute("normal");
  const uv = geo.getAttribute("uv");
  const capGroup = geo.groups.find((g) => g.materialIndex === 0);
  const capStart = capGroup?.start ?? 0;
  const capEnd = capGroup ? capGroup.start + capGroup.count : 0;
  const index = geo.getIndex();
  // ExtrudeGeometry is non-indexed; group ranges are vertex ranges.
  for (let i = 0; i < pos.count; i++) {
    const vi = index ? index.getX(i) : i;
    const x = pos.getX(vi);
    const y = pos.getY(vi);
    const z = pos.getZ(vi);
    if (i >= capStart && i < capEnd) {
      uv.setXY(vi, (x - uOrigin) / uSpan, (y + hh) / height);
    } else {
      // Cut faces: planar mapping on the dominant axis, meters / 5.
      const ax = Math.abs(nrm.getX(vi));
      const ay = Math.abs(nrm.getY(vi));
      if (ay > ax) uv.setXY(vi, x / 5, z / 5 + 0.5);
      else if (ax > 0.5) uv.setXY(vi, z / 5 + 0.5, (y + hh) / 5);
      else uv.setXY(vi, x / 5, (y + hh) / 5);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Sweep a 2D profile (d = distance out from the wall, h = height) along +X
 * from x0 to x1, with end caps. Joints sharper than `creaseDeg` get hard
 * normals, gentler ones are smoothed. UV: u = x (m), v = profile length (m).
 */
export function buildProfileSweep(
  profile: readonly (readonly [number, number])[],
  x0: number,
  x1: number,
  creaseDeg = 40,
): BufferGeometry {
  const n = profile.length;
  const segN: [number, number][] = [];
  const segLen: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dd = profile[i + 1][0] - profile[i][0];
    const dh = profile[i + 1][1] - profile[i][1];
    const l = Math.hypot(dd, dh) || 1;
    segN.push([dh / l, -dd / l]);
    segLen.push(l);
  }
  const cosCrease = Math.cos((creaseDeg * Math.PI) / 180);
  const pointNormal = (seg: number, end: 0 | 1): [number, number] => {
    const own = segN[seg];
    const other = end === 0 ? segN[seg - 1] : segN[seg + 1];
    if (!other) return own;
    if (own[0] * other[0] + own[1] * other[1] < cosCrease) return own;
    const x = own[0] + other[0];
    const y = own[1] + other[1];
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  let v = 0;
  for (let i = 0; i < n - 1; i++) {
    const [d0, h0] = profile[i];
    const [d1, h1] = profile[i + 1];
    const n0 = pointNormal(i, 0);
    const n1 = pointNormal(i, 1);
    const v1 = v + segLen[i];
    // A0, A1, B1, A0, B1, B0 (A = point i, B = point i+1; 0/1 = x0/x1).
    const A0 = [x0, h0, d0];
    const A1 = [x1, h0, d0];
    const B0 = [x0, h1, d1];
    const B1 = [x1, h1, d1];
    const quad: [number[], [number, number], number, number][] = [
      [A0, n0, x0, v],
      [A1, n0, x1, v],
      [B1, n1, x1, v1],
      [A0, n0, x0, v],
      [B1, n1, x1, v1],
      [B0, n1, x0, v1],
    ];
    for (const [p, nn, u, vv] of quad) {
      positions.push(p[0], p[1], p[2]);
      normals.push(0, nn[1], nn[0]);
      uvs.push(u, vv);
    }
    v = v1;
  }

  // End caps: the profile closed back along the wall line.
  const contour = profile.map(([d, h]) => new Vector2(d, h));
  const tris = ShapeUtils.triangulateShape(contour, []);
  for (const [x, nx] of [
    [x0, -1],
    [x1, 1],
  ] as const) {
    for (const t of tris) {
      const p = t.map((k) => contour[k]);
      // Cap lies in the (z = d, y = h) plane; normal must be +-X. The
      // determinant sign of (z, y) decides whether to flip the winding.
      const cross = (p[1].x - p[0].x) * (p[2].y - p[0].y) - (p[1].y - p[0].y) * (p[2].x - p[0].x);
      // Looking down +X at the (z, y) plane, CCW in (z, y) gives normal -X.
      const order = (cross > 0) === (nx < 0) ? [0, 1, 2] : [0, 2, 1];
      for (const k of order) {
        positions.push(x, p[k].y, p[k].x);
        normals.push(nx, 0, 0);
        uvs.push(p[k].x, p[k].y);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geo.computeBoundingSphere();
  return geo;
}

/** Skirting board profile (d, h in m): flat face with a rounded foot, a
 *  rounded shoulder stepping back into a small cove, a slim upper fillet and
 *  a half-round top bead. ~16 cm tall, 22 mm proud of the wall. */
export function skirtingProfile(): [number, number][] {
  const pts: [number, number][] = [
    [0, 0],
    [0.019, 0],
    [0.0213, 0.0012],
    [0.022, 0.004],
    [0.022, 0.118],
  ];
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, steps: number) => {
    for (let i = 1; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  // Convex shoulder (R 12 mm) from the face onto a flat step at h = 0.130.
  arc(0.010, 0.118, 0.012, 0, Math.PI / 2, 7);
  // Concave cove (R 4 mm) up into the slim upper section (d = 6 mm).
  arc(0.010, 0.134, 0.004, -Math.PI / 2, -Math.PI, 5);
  pts.push([0.006, 0.150]);
  // Half-round top bead back to the wall.
  arc(0, 0.150, 0.006, 0, Math.PI / 2, 6);
  return pts;
}

/** Height of skirtingProfile(). */
export const SKIRTING_HEIGHT = 0.156;

/** Rolled/bound rug edge as a lathe around Y: half-ellipse from bottom to
 *  top at radius `r` (bulging out by `out`), thickness `t`, centred on yMid. */
export function buildRugEdge(r: number, out: number, yBottom: number, yTop: number, segments: number) {
  const pts: Vector2[] = [];
  const steps = 10;
  const mid = (yBottom + yTop) / 2;
  const half = (yTop - yBottom) / 2;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * Math.PI;
    pts.push(new Vector2(r + out * Math.cos(a), mid + half * Math.sin(a)));
  }
  return new LatheGeometry(pts, segments);
}

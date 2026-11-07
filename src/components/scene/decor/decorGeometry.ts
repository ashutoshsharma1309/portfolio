// Decor geometry helpers: mitred frame sweeps, arc-length lathes, leaf blades.
// All return plain indexed BufferGeometries with position/normal/uv so they
// can be merged with mergeGeometries().

import { BufferAttribute, BufferGeometry, LatheGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Profile point: [w = inset from the outer edge (m), d = height off the back
 *  plane (+z, m)]. */
export type ProfilePt = readonly [number, number];

/**
 * Sweep a 2D cross-section around a W×H rectangle with true 45° mitres
 * (picture frames, whiteboard extrusions, mat-board bevels). The rectangle
 * lies in the XY plane, centred on the origin, back plane at z = 0.
 *
 * UVs are in METRES: u = distance along the profile + a per-side offset,
 * v = distance along the side. Set material repeat to 1/tileSize. Wood grain
 * (which runs along V in the foundation's woodPlanks) therefore follows each
 * mitred piece, changing direction at the corners like real moulding.
 *
 * `hard` lists profile indices whose normal is split (crisp edge).
 */
export function mitredFrameGeometry(
  width: number,
  height: number,
  profile: readonly ProfilePt[],
  opts: { hard?: readonly number[]; uOffsets?: readonly number[] } = {},
): BufferGeometry {
  const hard = new Set(opts.hard ?? []);
  const W = width / 2;
  const H = height / 2;
  // [Ax, Ay, tx, ty, nx, ny, length]
  const sides: [number, number, number, number, number, number, number][] = [
    [-W, -H, 1, 0, 0, 1, width],
    [W, -H, 0, 1, -1, 0, height],
    [W, H, -1, 0, 0, -1, width],
    [-W, H, 0, -1, 1, 0, height],
  ];
  // arc length along the profile
  const arc: number[] = [0];
  for (let i = 1; i < profile.length; i++) {
    arc.push(arc[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]));
  }
  // 2D segment normals (w, d): (-dd, dw)
  const segN: [number, number][] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const dw = profile[i + 1][0] - profile[i][0];
    const dd = profile[i + 1][1] - profile[i][1];
    const l = Math.hypot(dw, dd) || 1;
    segN.push([-dd / l, dw / l]);
  }
  const ptNormal = (i: number, seg: number): [number, number] => {
    if (hard.has(i)) return segN[seg];
    const a = segN[i - 1] ?? segN[i];
    const b = segN[i] ?? segN[i - 1];
    const x = a[0] + b[0];
    const y = a[1] + b[1];
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  sides.forEach(([ax, ay, tx, ty, nx, ny, len], s) => {
    const uOff = opts.uOffsets?.[s] ?? 0;
    for (let j = 0; j < profile.length - 1; j++) {
      const base = pos.length / 3;
      for (const i of [j, j + 1]) {
        const [w, d] = profile[i];
        const [n2w, n2d] = ptNormal(i, j);
        const n3 = [n2w * nx, n2w * ny, n2d];
        // start (corner A) and end (corner B), mitred
        const sx = ax + w * nx + w * tx;
        const sy = ay + w * ny + w * ty;
        const ex = ax + tx * len + w * nx - w * tx;
        const ey = ay + ty * len + w * ny - w * ty;
        pos.push(sx, sy, d, ex, ey, d);
        nor.push(...n3, ...n3);
        uv.push(uOff + arc[i], w, uOff + arc[i], len - w);
      }
      // a = S(j), b = E(j), c = E(j+1), d = S(j+1)
      idx.push(base, base + 1, base + 3, base, base + 3, base + 2);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  return g;
}

/**
 * LatheGeometry whose V coordinate is the normalised ARC LENGTH of the
 * profile (three's default is point index), optionally scaled to metres.
 * `uScale` multiplies U (e.g. circumference / tile for physical scale).
 */
export function arcLathe(
  points: readonly (readonly [number, number])[],
  segments: number,
  opts: { uScale?: number; vScale?: number } = {},
): LatheGeometry {
  const pts = points.map(([r, y]) => new Vector2(Math.max(0, r), y));
  const g = new LatheGeometry(pts, segments);
  const arc: number[] = [0];
  for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = arc[arc.length - 1] || 1;
  const uvA = g.getAttribute("uv") as BufferAttribute;
  const P = pts.length;
  const us = opts.uScale ?? 1;
  const vs = opts.vScale ?? 1;
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j < P; j++) {
      const k = i * P + j;
      uvA.setXY(k, (i / segments) * us, (arc[j] / total) * vs);
    }
  }
  uvA.needsUpdate = true;
  return g;
}

/** Profile resample: inserts points so no segment is longer than `maxSeg`. */
export function densify(points: readonly (readonly [number, number])[], maxSeg: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      const [r0, y0] = points[i - 1];
      const [r1, y1] = points[i];
      const n = Math.ceil(Math.hypot(r1 - r0, y1 - y0) / maxSeg);
      for (let k = 1; k < n; k++) out.push([r0 + ((r1 - r0) * k) / n, y0 + ((y1 - y0) * k) / n]);
    }
    out.push([points[i][0], points[i][1]]);
  }
  return out;
}

export interface LeafShape {
  /** Width / length ratio at the widest point. */
  aspect: number;
  /** V-fold along the midrib (edge lift as a fraction of half width). */
  fold: number;
  /** Tip droop as a fraction of length (curls toward -Z). */
  arch: number;
  /** Position of the widest point (0..1). */
  widest?: number;
  /** Edge ripple amplitude (fraction of half width). */
  ripple?: number;
}

/**
 * Unit-length leaf blade: base at the origin, extends along +Y, width along
 * X, upper surface facing +Z. UV: u across (midrib at 0.5), v base→tip.
 */
export function leafGeometry(shape: LeafShape, segL = 8, segW = 4): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const widest = shape.widest ?? 0.4;
  const pw = Math.log(0.5) / Math.log(widest);
  const ripple = shape.ripple ?? 0.04;
  // Midrib centreline in (y, z): its angle below horizontal grows with t, so
  // the blade arches and droops toward the tip like a real leaf.
  let cy = 0;
  let cz = 0;
  for (let i = 0; i <= segL; i++) {
    const t = i / segL;
    const theta = shape.arch * t * t * 1.6;
    if (i > 0) {
      const dt = 1 / segL;
      const thPrev = shape.arch * ((i - 0.5) / segL) ** 2 * 1.6;
      cy += Math.cos(thPrev) * dt;
      cz -= Math.sin(thPrev) * dt;
    }
    // local surface normal of the bent centreline
    const ny = Math.sin(theta);
    const nz = Math.cos(theta);
    const prof = Math.pow(Math.sin(Math.PI * Math.pow(Math.min(t, 0.999), pw)), 0.85);
    const halfW = 0.5 * shape.aspect * Math.max(prof, t === 0 ? 0.04 : 0.01);
    for (let j = 0; j <= segW; j++) {
      const s = (j / segW) * 2 - 1;
      const x = s * halfW;
      let lift = Math.abs(s) * halfW * shape.fold;
      lift += Math.sin(t * 17 + s * 2.3) * ripple * halfW * Math.abs(s);
      pos.push(x, cy + ny * lift, cz + nz * lift);
      uv.push((s + 1) / 2, t);
    }
  }
  const row = segW + 1;
  for (let i = 0; i < segL; i++) {
    for (let j = 0; j < segW; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Re-project a box-like geometry's UVs from its positions, in METRES, by the
 * dominant normal axis (so texture scale is physical on every face instead of
 * each face stretching 0..1). Vertical faces put V along the horizontal axis,
 * so wood grain (along V) runs horizontally like a real plinth.
 */
export function boxProjectUVs(
  g: BufferGeometry,
  opts: { offset?: readonly [number, number]; topScaleU?: number } = {},
): BufferGeometry {
  const p = g.getAttribute("position") as BufferAttribute;
  const n = g.getAttribute("normal") as BufferAttribute;
  const uv = g.getAttribute("uv") as BufferAttribute;
  const [ou, ov] = opts.offset ?? [0, 0];
  const ts = opts.topScaleU ?? 1;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, ou + z * ts, ov + x);
    else if (az >= ax) uv.setXY(i, ou + y, ov + x);
    else uv.setXY(i, ou + y, ov + z);
  }
  uv.needsUpdate = true;
  return g;
}

/**
 * Merge geometries robustly: converts every input to non-indexed and keeps
 * only position / normal / uv, so mixed indexed/non-indexed inputs (e.g.
 * RoundedBoxGeometry + LatheGeometry) never fail. Disposes the inputs.
 */
export function mergeSafe(geoms: BufferGeometry[]): BufferGeometry {
  const prepared = geoms.map((g) => {
    const ni = g.index ? g.toNonIndexed() : g.clone();
    const out = new BufferGeometry();
    for (const name of ["position", "normal", "uv"]) {
      const a = ni.getAttribute(name);
      if (a) out.setAttribute(name, a);
    }
    if (!out.getAttribute("normal")) out.computeVertexNormals();
    ni.dispose();
    return out;
  });
  const merged = mergeGeometries(prepared, false);
  geoms.forEach((g) => g.dispose());
  prepared.forEach((g) => g.dispose());
  if (!merged) throw new Error("mergeSafe: merge failed");
  return merged;
}

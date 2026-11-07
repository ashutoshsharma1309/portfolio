// Workspace geometry helpers: build each object as a few merged meshes (one
// per material) out of transformed primitives, so a detailed desk or chair
// still costs only a handful of draw calls.

import {
  BufferGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Top surface of the floor boards (Walls.tsx planks are 0.04 thick). Ground
 *  contact points (feet, casters, plinths) sit here, not at y = 0. */
export const FLOOR_Y = 0.04;

export type Vec3 = readonly [number, number, number];

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();

/** Transform a geometry in place (position, Euler rotation XYZ, scale). */
export function place(
  geo: BufferGeometry,
  position: Vec3 = [0, 0, 0],
  rotation: Vec3 = [0, 0, 0],
  scale: Vec3 = [1, 1, 1],
): BufferGeometry {
  _e.set(rotation[0], rotation[1], rotation[2]);
  _q.setFromEuler(_e);
  _m.compose(_p.set(position[0], position[1], position[2]), _q, _s.set(scale[0], scale[1], scale[2]));
  geo.applyMatrix4(_m);
  return geo;
}

/** Merge parts into one non-indexed geometry with position/normal/uv only.
 *  Consumes (disposes) the inputs. */
export function mergeParts(parts: BufferGeometry[]): BufferGeometry {
  const prepared = parts.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(ng.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") ng.deleteAttribute(name);
    }
    if (!ng.attributes.uv) {
      const count = ng.attributes.position.count;
      ng.setAttribute("uv", new Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    ng.morphAttributes = {};
    ng.clearGroups();
    return ng;
  });
  const merged = mergeGeometries(prepared, false) ?? new BufferGeometry();
  for (const g of parts) g.dispose();
  for (const g of prepared) g.dispose();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/** Rounded box (bevelled edges) — reads far better than a sharp box under
 *  the environment light and gives edge highlights. */
export function rbox(w: number, h: number, d: number, r: number, segments = 3): BufferGeometry {
  const rr = Math.max(0.0005, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  return new RoundedBoxGeometry(w, h, d, segments, rr);
}

export function cyl(rTop: number, rBottom: number, h: number, radial = 20, open = false): BufferGeometry {
  return new CylinderGeometry(rTop, rBottom, h, radial, 1, open);
}

/** Rounded-rectangle 2D shape centred on the origin. */
export function roundedRectShape(w: number, h: number, r: number): Shape {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return s;
}

/** Polygon with rounded corners (points CCW in the shape plane). */
export function roundedPolygonShape(points: readonly (readonly [number, number])[], radius: number | readonly number[]): Shape {
  const s = new Shape();
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = new Vector2(points[i][0], points[i][1]);
    const prev = new Vector2(points[(i - 1 + n) % n][0], points[(i - 1 + n) % n][1]);
    const next = new Vector2(points[(i + 1) % n][0], points[(i + 1) % n][1]);
    const r = typeof radius === "number" ? radius : radius[i];
    const a = p.clone().add(prev.clone().sub(p).normalize().multiplyScalar(r));
    const b = p.clone().add(next.clone().sub(p).normalize().multiplyScalar(r));
    if (i === 0) s.moveTo(a.x, a.y);
    else s.lineTo(a.x, a.y);
    s.quadraticCurveTo(p.x, p.y, b.x, b.y);
  }
  s.closePath();
  return s;
}

/**
 * Extrude a shape drawn in the XZ plane (shape x → +x, shape y → −z) into a
 * horizontal slab whose underside is at y = 0 and top at y = thickness, with
 * a real bevel on the top and bottom edges. UVs are in metres (world UV
 * generator), so textures get physical scale with repeat = 1 / tileMeters.
 */
export function slab(shape: Shape, thickness: number, bevel: number, curveSegments = 6, bevelSegments = 3): BufferGeometry {
  const depth = Math.max(0.001, thickness - bevel * 2);
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments,
    curveSegments,
  });
  // Shape plane XY, extrusion +Z  →  rotate so the extrusion points up (+Y).
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  // Smooth across the bevel steps, keep the flat faces crisp.
  const smooth = toCreasedNormals(g, Math.PI / 5);
  g.dispose();
  return smooth;
}

/** Lathe around +Y from a (radius, y) profile. */
export function lathe(profile: readonly (readonly [number, number])[], segments = 32): BufferGeometry {
  return new LatheGeometry(
    profile.map(([r, y]) => new Vector2(Math.max(r, 0.00001), y)),
    segments,
  );
}

/** Displace every vertex with `fn(v)` (mutates v), then recompute normals. */
export function deform(geo: BufferGeometry, fn: (v: Vector3) => void): BufferGeometry {
  const pos = geo.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    fn(v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Deterministic pseudo-random in [0, 1). */
export function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Give a plain record of geometries a dispose() so useDisposable (which only
 *  disposes top-level values) releases every geometry in a nested group. */
export function geometryGroup<T extends { [K in keyof T]: BufferGeometry }>(group: T): T & { dispose(): void } {
  const parts: BufferGeometry[] = Object.values(group);
  return Object.assign(group, { dispose: () => parts.forEach((g) => g.dispose()) });
}

/** Rescale a box's per-face 0..1 UVs to physical size (1 UV = `unitM` metres),
 *  choosing each vertex's face by its dominant normal axis. Use when small
 *  boxes share a material with true-scale parts, so the texture doesn't get
 *  squeezed (and mip-averaged flat) on them. */
export function metricBoxUVs(geo: BufferGeometry, w: number, h: number, d: number, unitM: number): BufferGeometry {
  const uv = geo.attributes.uv;
  const n = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    const [su, sv] = ax >= ay && ax >= az ? [d, h] : ay >= az ? [w, d] : [w, h];
    uv.setXY(i, (uv.getX(i) * su) / unitM, (uv.getY(i) * sv) / unitM);
  }
  uv.needsUpdate = true;
  return geo;
}

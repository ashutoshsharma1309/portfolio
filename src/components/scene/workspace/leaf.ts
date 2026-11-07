// Leaf geometry + instance layout helpers for the potted plants in the
// workspace (shelf plant). A leaf is a small subdivided grid shaped into a
// pointed heart (pothos-like), folded along the midrib and curled back, so it
// catches light like a real leaf instead of a flat card.

import { BufferGeometry, Matrix4, PlaneGeometry, Quaternion, Vector3 } from "three";

/** Unit leaf: base at the origin, tip at +Y (length 1), face normal ≈ +Z. */
export function createLeafGeometry(segW = 4, segH = 7): BufferGeometry {
  const g = new PlaneGeometry(1, 1, segW, segH);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i); // -0.5..0.5 across
    const v = pos.getY(i) + 0.5; // 0..1 along
    // Pointed heart: widest around 30% of the length, lobed base, sharp tip.
    const width = 0.62 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.72)), 0.85) * (1 - 0.25 * v) + 0.05 * (1 - v);
    const x = u * width;
    const fold = Math.abs(x) * 0.32; // V-fold along the midrib
    const curl = -0.22 * v * v; // tip curls back
    pos.setXYZ(i, x, v, fold + curl);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

const _up = new Vector3(0, 1, 0);
const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();
const _basis = new Matrix4();
const _q = new Quaternion();
const _s = new Vector3();

/**
 * Matrix for a leaf whose base sits at `base`, pointing along `dir`, with its
 * face turned as close to `facing` as possible, scaled by `length`.
 */
export function leafMatrix(out: Matrix4, base: Vector3, dir: Vector3, facing: Vector3, length: number, width = 1): Matrix4 {
  _y.copy(dir).normalize();
  _z.copy(facing).addScaledVector(_y, -facing.dot(_y));
  if (_z.lengthSq() < 1e-6) _z.copy(_up).addScaledVector(_y, -_up.dot(_y));
  _z.normalize();
  _x.crossVectors(_y, _z).normalize();
  _basis.makeBasis(_x, _y, _z);
  _q.setFromRotationMatrix(_basis);
  return out.compose(base, _q, _s.set(length * width, length, length));
}

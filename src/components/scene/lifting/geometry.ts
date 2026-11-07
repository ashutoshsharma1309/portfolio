// Geometry builders for the lifting corner. Everything is built once per
// quality tier (useDisposable in the components) and shared between meshes /
// instances. Profiles are real-world meters.

import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Quaternion,
  RingGeometry,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
  type Vector3Tuple,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  BAR_COLLAR_X,
  BAR_END_X,
  BAR_R,
  JHOOK_CUP_FLOOR,
  JHOOK_CUP_S0,
  JHOOK_CUP_S1,
  JHOOK_W,
  LOCK_COLLAR_W,
  SLEEVE_R,
  UHMW_T,
} from "./constants";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function rbox(w: number, h: number, d: number, r: number, seg = 2): BufferGeometry {
  const rr = Math.min(r, Math.min(w, h, d) / 2 - 1e-4);
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}

function nonIndexed(g: BufferGeometry): BufferGeometry {
  return g.index ? g.toNonIndexed() : g;
}

/** Merge geometries (each converted to non-indexed, uv kept). */
export function merge(parts: BufferGeometry[]): BufferGeometry {
  const ni = parts.map((p) => {
    const n = nonIndexed(p);
    if (!n.getAttribute("uv")) {
      n.setAttribute("uv", new Float32BufferAttribute(new Float32Array((n.getAttribute("position").count) * 2), 2));
    }
    // Keep only the attributes every part has.
    for (const name of Object.keys(n.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") n.deleteAttribute(name);
    }
    return n;
  });
  const out = mergeGeometries(ni, false);
  ni.forEach((g, i) => {
    if (g !== parts[i]) g.dispose();
    parts[i].dispose();
  });
  if (!out) throw new Error("lifting: mergeGeometries failed");
  return out;
}

/** Scale a geometry's UVs so a material tiled "per 1 unit" lands in meters. */
export function scaleUV(g: BufferGeometry, su: number, sv: number): BufferGeometry {
  const uv = g.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return g;
}

type ProfilePoint = readonly [number, number] | readonly [number, number, "sharp"];

/** Build a lathe profile; "sharp" points are duplicated so the lathe gets a
 *  crisp normal break there (three's LatheGeometry averages neighbours). */
function profile(pts: readonly ProfilePoint[]): Vector2[] {
  const out: Vector2[] = [];
  for (const p of pts) {
    const v = new Vector2(Math.max(0, p[0]), p[1]);
    out.push(v);
    if (p.length === 3) out.push(v.clone());
  }
  return out;
}

/** Quarter/partial arc of profile points (excluding none). Angles in rad. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): ProfilePoint[] {
  const pts: ProfilePoint[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Lathe revolved around the X axis (profile y -> world x). */
function latheX(pts: Vector2[], segments: number): BufferGeometry {
  const g = new LatheGeometry(pts, segments);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Lathe around Y (for floor-level rings). */
function latheY(pts: Vector2[], segments: number): BufferGeometry {
  return new LatheGeometry(pts, segments);
}

// ---------------------------------------------------------------------------
// Instancing helpers
// ---------------------------------------------------------------------------

const UP = new Vector3(0, 1, 0);

export function placeAlong(position: Vector3Tuple, normal: Vector3Tuple, spin = 0, scale = 1): Matrix4 {
  const n = new Vector3(...normal).normalize();
  const q = new Quaternion().setFromUnitVectors(UP, n);
  if (spin) q.multiply(new Quaternion().setFromAxisAngle(UP, spin));
  return new Matrix4().compose(new Vector3(...position), q, new Vector3(scale, scale, scale));
}

export function placeEuler(position: Vector3Tuple, rx = 0, ry = 0, rz = 0, s: Vector3Tuple = [1, 1, 1]): Matrix4 {
  const q = new Quaternion().setFromEuler(new Euler(rx, ry, rz));
  return new Matrix4().compose(new Vector3(...position), q, new Vector3(...s));
}

// ---------------------------------------------------------------------------
// Rack parts
// ---------------------------------------------------------------------------

/** J-hook: formed steel plate profile in (s = forward from the upright face,
 *  y), extruded across x. Origin = upright front face, hook height. */
export function jHookGeometry(): BufferGeometry {
  const S0 = JHOOK_CUP_S0;
  const S1 = JHOOK_CUP_S1;
  const F = JHOOK_CUP_FLOOR;
  const t = 0.0165; // arm thickness
  const shape = new Shape();
  shape.moveTo(0, -0.06);
  shape.lineTo(S0, -0.06);
  shape.lineTo(S0, -0.02);
  // underside gusset sweep into the arm
  shape.quadraticCurveTo(S0 + 0.004, F - t, S0 + 0.04, F - t);
  shape.lineTo(S1 - 0.002, F - t);
  shape.lineTo(S1 + 0.012, F - t + 0.012);
  shape.lineTo(S1 + 0.012, 0.072);
  shape.quadraticCurveTo(S1 + 0.012, 0.078, S1 + 0.006, 0.078);
  shape.quadraticCurveTo(S1, 0.078, S1, 0.072);
  shape.lineTo(S1, F);
  shape.lineTo(S0, F);
  shape.lineTo(S0, 0.1);
  shape.lineTo(0, 0.1);
  shape.lineTo(0, -0.06);
  const bevel = 0.0015;
  const depth = JHOOK_W - bevel * 2;
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.rotateY(-Math.PI / 2);
  g.translate(depth / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

/** UHMW liner: floor strip + back strip inside the J-hook cup. */
export function uhmwGeometry(): BufferGeometry {
  const len = JHOOK_CUP_S1 - JHOOK_CUP_S0 - 0.002;
  const floor = rbox(JHOOK_W - 0.006, UHMW_T, len, 0.0018, 2);
  floor.translate(0, JHOOK_CUP_FLOOR + UHMW_T / 2, (JHOOK_CUP_S0 + JHOOK_CUP_S1) / 2);
  const back = rbox(JHOOK_W - 0.006, 0.034, 0.004, 0.0012, 1);
  back.translate(0, JHOOK_CUP_FLOOR + UHMW_T + 0.017, JHOOK_CUP_S0 + 0.002);
  return merge([floor, back]);
}

/** Right-angle gusset plate (legs a, thickness t), lying in XY, centred in z. */
export function gussetGeometry(a: number, t: number): BufferGeometry {
  const c = 0.008;
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(a, 0);
  shape.lineTo(a, c * 0.6);
  shape.lineTo(c * 0.6, a);
  shape.lineTo(0, a);
  shape.lineTo(0, 0);
  const b = 0.001;
  const g = new ExtrudeGeometry(shape, { depth: t - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1 });
  g.translate(0, 0, -(t - 2 * b) / 2);
  g.computeVertexNormals();
  return g;
}

/** Hex bolt head + flat washer, axis +Y, base at y = 0. Flat-shaded head. */
export function boltGeometry(lowTier: boolean): BufferGeometry {
  const washer = new CylinderGeometry(0.0145, 0.0145, 0.0022, lowTier ? 10 : 16, 1);
  washer.translate(0, 0.0011, 0);
  const headIdx = new CylinderGeometry(0.0098, 0.0098, 0.0066, 6, 1);
  headIdx.translate(0, 0.0022 + 0.0033, 0);
  const head = headIdx.toNonIndexed();
  headIdx.dispose();
  head.computeVertexNormals();
  // Thread stub / chamfered dome on top of the head.
  const dome = new CylinderGeometry(0.0062, 0.0075, 0.0014, lowTier ? 8 : 12, 1);
  dome.translate(0, 0.0022 + 0.0066 + 0.0007, 0);
  return merge([washer, head, dome]);
}

/** Drilled hole: dark disc + bare-steel edge ring (two geometries). */
export function holeGeometries(r: number, lowTier: boolean) {
  const seg = lowTier ? 10 : 16;
  const inner = new CircleGeometry(r, seg);
  const ring = new RingGeometry(r, r + 0.0016, seg, 1);
  return { inner, ring };
}

// ---------------------------------------------------------------------------
// Barbell
// ---------------------------------------------------------------------------

/** Inner collar + bronze-bushing step + sleeve + end cap, one side (+x). */
export function sleeveGeometry(segments: number): BufferGeometry {
  const x0 = BAR_COLLAR_X;
  const pts = profile([
    [BAR_R - 0.0005, x0, "sharp"],
    [0.029, x0],
    ...arc(0.029, x0 + 0.004, 0.004, -Math.PI / 2, 0, 3),
    [0.033, x0 + 0.021],
    ...arc(0.029, x0 + 0.021, 0.004, 0, Math.PI / 2, 3),
    [0.0275, x0 + 0.025, "sharp"],
    [0.0262, x0 + 0.025, "sharp"],
    [0.0262, x0 + 0.029, "sharp"],
    [SLEEVE_R, x0 + 0.029, "sharp"],
    [SLEEVE_R, BAR_END_X - 0.005],
    [SLEEVE_R - 0.0012, BAR_END_X, "sharp"],
    [0.018, BAR_END_X, "sharp"],
    [0.018, BAR_END_X - 0.002, "sharp"],
    [0.0001, BAR_END_X - 0.002],
  ]);
  return latheX(pts, segments);
}

/** Thin bronze bushing ring visible between collar and sleeve. */
export function bushingGeometry(segments: number): BufferGeometry {
  const x0 = BAR_COLLAR_X + 0.0252;
  const pts = profile([
    [0.0262, x0 + 0.0036, "sharp"],
    [0.0276, x0 + 0.0036],
    [0.0278, x0 + 0.0018],
    [0.0276, x0, "sharp"],
    [0.0262, x0],
  ]);
  return latheX(pts, segments);
}

/**
 * Bumper plate body (rubber), centred at x = 0, axis X. Raised outer lip,
 * recessed face, soft rounded rim, sits around a steel hub insert.
 */
export function plateBodyGeometry(R: number, T: number, segments: number): BufferGeometry {
  const h = T / 2;
  const hFace = h - 0.0042; // recessed face
  const hHub = h - 0.0045; // recess around the hub
  const rIn = 0.049;
  const lipW = R > 0.2 ? 0.026 : 0.02;
  const rr = 0.008;
  const pts = profile([
    [rIn, hHub, "sharp"],
    [rIn, -hHub, "sharp"],
    [0.06, -hHub],
    [0.068, -hFace, "sharp"],
    [R * 0.55 - 0.004, -hFace, "sharp"],
    [R * 0.55, -hFace - 0.0012],
    [R * 0.55 + 0.006, -hFace - 0.0012],
    [R * 0.55 + 0.01, -hFace, "sharp"],
    [R - lipW - 0.01, -hFace, "sharp"],
    [R - lipW, -h + 0.0004, "sharp"],
    [R - rr - 0.002, -h],
    ...arc(R - rr, -h + rr, rr, -Math.PI / 2, 0, 4),
    ...arc(R - rr, h - rr, rr, 0, Math.PI / 2, 4),
    [R - lipW, h - 0.0004, "sharp"],
    [R - lipW - 0.01, hFace, "sharp"],
    [R * 0.55 + 0.01, hFace, "sharp"],
    [R * 0.55 + 0.006, hFace + 0.0012],
    [R * 0.55, hFace + 0.0012],
    [R * 0.55 - 0.004, hFace, "sharp"],
    [0.068, hFace, "sharp"],
    [0.06, hHub],
    [rIn, hHub],
  ]);
  return latheX(pts, segments);
}

/** Steel hub insert ring (proud of the rubber by 1 mm), axis X. */
export function plateHubGeometry(T: number, segments: number): BufferGeometry {
  const hh = T / 2 + 0.001;
  const rH = 0.0254;
  const rO = 0.052;
  const c = 0.0018;
  const pts = profile([
    [rH, hh - c],
    [rH, -hh + c],
    [rH + c, -hh],
    [rO - c, -hh],
    [rO, -hh + c],
    [rO, hh - c],
    [rO - c, hh],
    [rH + c, hh],
    [rH, hh - c],
  ]);
  return latheX(pts, segments);
}

/** Competition-style lock collar ring, axis X, centred at x = 0. */
export function lockCollarRingGeometry(segments: number): BufferGeometry {
  const w = LOCK_COLLAR_W / 2;
  const R = 0.042;
  const rI = 0.0253;
  const pts = profile([
    [rI, w - 0.001, "sharp"],
    [rI, -w + 0.001, "sharp"],
    [rI + 0.002, -w],
    [R - 0.006, -w],
    ...arc(R - 0.004, -w + 0.004, 0.004, -Math.PI / 2, 0, 3),
    [R, -w * 0.25, "sharp"],
    [R - 0.0015, -w * 0.25 + 0.0015, "sharp"],
    [R - 0.0015, w * 0.25 - 0.0015, "sharp"],
    [R, w * 0.25, "sharp"],
    ...arc(R - 0.004, w - 0.004, 0.004, 0, Math.PI / 2, 3),
    [rI + 0.002, w],
    [rI, w - 0.001],
  ]);
  return latheX(pts, segments);
}

/** Clamp thumbscrew + knob on top of the lock collar (+Y). */
export function collarKnobGeometry(lowTier: boolean): BufferGeometry {
  const seg = lowTier ? 10 : 16;
  const boss = new CylinderGeometry(0.009, 0.0105, 0.008, seg, 1);
  boss.translate(0, 0.0435, 0);
  const screw = new CylinderGeometry(0.004, 0.004, 0.012, 8, 1);
  screw.translate(0, 0.0535, 0);
  const knob = rbox(0.028, 0.012, 0.012, 0.004, 2);
  knob.translate(0, 0.0635, 0);
  return merge([boss, screw, knob]);
}

// ---------------------------------------------------------------------------
// Bench
// ---------------------------------------------------------------------------

export interface CushionSpec {
  len: number;
  th: number;
  wHead: number;
  wFoot: number;
  r: number;
  crown: number;
}

function remapAxis(u: number, S: number, half: number, r: number, k: number) {
  const i = Math.round((u + 0.5) * S);
  if (i <= k) return -half + r * (i / k);
  if (i >= S - k) return half - r * ((S - i) / k);
  return -half + r + ((i - k) / (S - 2 * k)) * (2 * half - 2 * r);
}

function cushionWarp(v: Vector3, c: CushionSpec) {
  const hx = c.len / 2;
  const t = (v.x + hx) / c.len; // 0 = foot, 1 = head
  const f = c.wFoot / c.wHead + (1 - c.wFoot / c.wHead) * t;
  v.z *= f;
  const hz = (c.wHead * f) / 2;
  const yN = Math.min(1, Math.max(0, (v.y + c.th / 2) / c.th));
  const cx = v.x / hx;
  const cz = v.z / hz;
  const bump = Math.max(0, 1 - cx ** 4) * Math.max(0, 1 - cz * cz);
  v.y += c.crown * bump * yN ** 1.5;
}

/** Upholstered pad: rounded on every edge, tapered in plan, crowned on top.
 *  Length along X (head at +X), thickness Y, width Z; centred. */
export function cushionGeometry(c: CushionSpec, lowTier: boolean): BufferGeometry {
  const k = lowTier ? 2 : 4;
  const sx = lowTier ? 14 : 30;
  const sy = 2 * k + 1;
  const sz = lowTier ? 8 : 14;
  const g = new BoxGeometry(1, 1, 1, sx, sy, sz);
  const pos = g.getAttribute("position");
  const half = new Vector3(c.len / 2, c.th / 2, c.wHead / 2);
  const p = new Vector3();
  const inner = new Vector3();
  const d = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.set(
      remapAxis(pos.getX(i), sx, half.x, c.r, k),
      remapAxis(pos.getY(i), sy, half.y, c.r, k),
      remapAxis(pos.getZ(i), sz, half.z, c.r, k),
    );
    inner.set(
      Math.max(-(half.x - c.r), Math.min(half.x - c.r, p.x)),
      Math.max(-(half.y - c.r), Math.min(half.y - c.r, p.y)),
      Math.max(-(half.z - c.r), Math.min(half.z - c.r, p.z)),
    );
    d.subVectors(p, inner);
    const len = d.length();
    if (len > 1e-9) p.copy(inner).addScaledVector(d, c.r / len);
    cushionWarp(p, c);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  // Smooth normals across the box-face seams: merge by position only.
  const tmp = new BufferGeometry();
  tmp.setAttribute("position", pos.clone());
  if (g.index) tmp.setIndex(g.index.clone());
  const welded = mergeVertices(tmp, 1e-5);
  welded.computeVertexNormals();
  const wp = welded.getAttribute("position");
  const wn = welded.getAttribute("normal");
  const key = (x: number, y: number, z: number) => `${Math.round(x * 1e4)}|${Math.round(y * 1e4)}|${Math.round(z * 1e4)}`;
  const map = new Map<string, number>();
  for (let i = 0; i < wp.count; i++) map.set(key(wp.getX(i), wp.getY(i), wp.getZ(i)), i);
  const nrm = g.getAttribute("normal");
  for (let i = 0; i < pos.count; i++) {
    const j = map.get(key(pos.getX(i), pos.getY(i), pos.getZ(i)));
    if (j !== undefined) nrm.setXYZ(i, wn.getX(j), wn.getY(j), wn.getZ(j));
  }
  nrm.needsUpdate = true;
  tmp.dispose();
  welded.dispose();
  g.computeBoundingSphere();
  return g;
}

/** Welt piping along the top seam of the cushion. */
export function pipingGeometry(c: CushionSpec, lowTier: boolean): BufferGeometry {
  const hx1 = c.len / 2 - c.r;
  const hz1 = c.wHead / 2 - c.r;
  const rr = c.r * Math.SQRT1_2 + 0.0018;
  const y = c.th / 2 - c.r + c.r * Math.SQRT1_2 + 0.0012;
  const corners: [number, number, number][] = [
    [hx1, hz1, 0],
    [-hx1, hz1, Math.PI / 2],
    [-hx1, -hz1, Math.PI],
    [hx1, -hz1, (3 * Math.PI) / 2],
  ];
  const pts: Vector3[] = [];
  for (let ci = 0; ci < 4; ci++) {
    const [cx, cz, a0] = corners[ci];
    for (let a = 0; a <= 4; a++) {
      const ang = a0 + (a / 4) * (Math.PI / 2);
      pts.push(new Vector3(cx + Math.cos(ang) * rr, y, cz + Math.sin(ang) * rr));
    }
    const [nx, nz, na] = corners[(ci + 1) % 4];
    const s = new Vector3(cx + Math.cos(a0 + Math.PI / 2) * rr, y, cz + Math.sin(a0 + Math.PI / 2) * rr);
    const e = new Vector3(nx + Math.cos(na) * rr, y, nz + Math.sin(na) * rr);
    const n = ci % 2 === 0 ? 3 : 14;
    for (let j = 1; j < n; j++) pts.push(s.clone().lerp(e, j / n));
  }
  pts.forEach((p) => cushionWarp(p, c));
  const curve = new CatmullRomCurve3(pts, true, "centripetal");
  return new TubeGeometry(curve, lowTier ? 90 : 220, 0.0032, lowTier ? 4 : 6, true);
}

// ---------------------------------------------------------------------------
// Dumbbells
// ---------------------------------------------------------------------------

export const DB = {
  hexR: 0.1, // circumradius of the hex shape (before bevel)
  bevel: 0.006,
  headDepth: 0.08,
  gripHalf: 0.065,
  collarW: 0.012,
  handleR: 0.017,
} as const;
/** Inner face of each head (x). */
export const DB_HEAD_X0 = DB.gripHalf + DB.collarW;
export const DB_HEAD_T = DB.headDepth + DB.bevel * 2;
export const DB_HEAD_CX = DB_HEAD_X0 + DB_HEAD_T / 2;
/** Centre height above the surface it rests on (apothem + bevel). */
export const DB_REST_H = DB.hexR * Math.cos(Math.PI / 6) + DB.bevel;

/** Rubber hex head, axis X, centred. Rests on a flat face. */
export function hexHeadGeometry(): BufferGeometry {
  const shape = new Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * DB.hexR;
    const y = Math.sin(a) * DB.hexR;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new ExtrudeGeometry(shape, {
    depth: DB.headDepth,
    bevelEnabled: true,
    bevelThickness: DB.bevel,
    bevelSize: DB.bevel,
    bevelSegments: 3,
  });
  g.translate(0, 0, -DB.headDepth / 2);
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Chrome inner collars + outer end caps for one dumbbell (merged). */
export function dumbbellChromeGeometry(segments: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (const side of [1, -1]) {
    const collar = latheX(
      profile([
        [DB.handleR - 0.001, DB.gripHalf, "sharp"],
        [0.022, DB.gripHalf],
        [0.0245, DB.gripHalf + 0.002],
        [0.0245, DB.gripHalf + DB.collarW, "sharp"],
        [DB.handleR, DB.gripHalf + DB.collarW + 0.0005],
      ]),
      segments,
    );
    const capX = DB_HEAD_X0 + DB_HEAD_T;
    const cap = latheX(
      profile([
        [0.03, capX - 0.0005, "sharp"],
        [0.034, capX + 0.0005],
        [0.034, capX + 0.003],
        [0.031, capX + 0.0045, "sharp"],
        [0.012, capX + 0.0045, "sharp"],
        [0.012, capX + 0.0035, "sharp"],
        [0.0001, capX + 0.0035],
      ]),
      segments,
    );
    if (side < 0) {
      collar.rotateY(Math.PI);
      cap.rotateY(Math.PI);
    }
    parts.push(collar, cap);
  }
  return merge(parts);
}

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

/** Brushed-steel edge band, axis Y. */
export function platformBandGeometry(rIn: number, R: number, top: number, bottom: number, segments: number) {
  const pts = profile([
    [R, bottom, "sharp"],
    [R, top - 0.004],
    ...arc(R - 0.004, top - 0.004, 0.004, 0, Math.PI / 2, 3),
    [rIn + 0.002, top],
    [rIn, top - 0.002, "sharp"],
    [rIn, top - 0.007],
  ]);
  return latheY(pts, segments);
}

/** Molded red rubber inlay bead, axis Y (sits on the rubber top). */
export function rimBeadGeometry(rIn: number, rOut: number, base: number, height: number, segments: number) {
  const mid = (rIn + rOut) / 2;
  const hw = (rOut - rIn) / 2;
  const pts = profile([
    [rOut, base - 0.001, "sharp"],
    [rOut, base + height * 0.35],
    ...arc(mid, base + height * 0.35, hw, 0, Math.PI, 8).map(
      (p) => [p[0], base + height * 0.35 + (p[1] - (base + height * 0.35)) * ((height * 0.65) / hw)] as const,
    ),
    [rIn, base - 0.001],
  ]);
  return latheY(pts, segments);
}

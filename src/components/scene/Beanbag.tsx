// Navy beanbag lounger with mustard cushion + small round side table with a
// mug and a book. (No Rubik's, no chess.)
//
// Beanbag: one high-res sphere deformed on the CPU into a believable slumped
// bag — flat floor contact with a bulging skirt, a raised backrest, a seat
// depression where someone sat (the old "dimple"), eight gore seams pinched
// in, and ridged-noise creases concentrated around the seat rim and the floor
// skirt. Baked vertex AO darkens the folds and the dip; the woven-fabric PBR
// set (with sheen on the high tier) gives the cloth its weave.
// Cushion: a superellipsoid pillow with thin "ears" and soft wrinkles,
// leaning into the backrest.
// Side table: walnut top, powder-coated steel pole on a tripod with glides,
// a glazed ceramic mug (lathe + handle, coffee inside) and a cloth-bound book.

import { BufferAttribute, CylinderGeometry, MeshStandardMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import type { BufferGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useRoomQuality } from "./quality";
import { createCeramic, createFabric, createPowderCoat, useDisposable } from "./materials";
import { arcLathe, boxProjectUVs, mergeSafe } from "./decor/decorGeometry";
import { useDecorTextures } from "./decor/decorTextures";
import { createWalnut } from "./decor/decorMaterials";

const FLOOR_LOCAL = 0.04 - 0.5; // floor-board top in the beanbag group's space

// --- tiny 3D value noise (hash lattice, smooth interpolation) ---------------
function hash3(x: number, y: number, z: number, s: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise3(x: number, y: number, z: number, s: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const f = (t: number) => t * t * (3 - 2 * t);
  const tx = f(x - xi);
  const ty = f(y - yi);
  const tz = f(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, s);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), tx), l(c(0, 1, 0), c(1, 1, 0), tx), ty),
    l(l(c(0, 0, 1), c(1, 0, 1), tx), l(c(0, 1, 1), c(1, 1, 1), tx), ty),
    tz,
  );
}
const ridged = (v: number) => 1 - Math.abs(v * 2 - 1);
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Average normals across the sphere's UV seam and at the poles so the
 *  deformed bag shows no shading seam. */
function weldSphereNormals(g: BufferGeometry, wSeg: number, hSeg: number) {
  const n = g.getAttribute("normal") as BufferAttribute;
  const row = wSeg + 1;
  const v = new Vector3();
  for (let iy = 0; iy <= hSeg; iy++) {
    const a = iy * row;
    const b = iy * row + wSeg;
    if (iy === 0 || iy === hSeg) {
      v.set(0, 0, 0);
      for (let ix = 0; ix <= wSeg; ix++) v.add(new Vector3(n.getX(a + ix), n.getY(a + ix), n.getZ(a + ix)));
      v.normalize();
      for (let ix = 0; ix <= wSeg; ix++) n.setXYZ(a + ix, v.x, v.y, v.z);
    } else {
      v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
      n.setXYZ(a, v.x, v.y, v.z);
      n.setXYZ(b, v.x, v.y, v.z);
    }
  }
  n.needsUpdate = true;
}

const BACK = new Vector3(-0.9, 0, -0.45).normalize(); // backrest side (toward the left wall)
const FRONT = BACK.clone().negate();
const CUSHION_BACK = 0.24;
const CUSHION_Y = 0.36;
const CUSHION_YAW = Math.atan2(FRONT.x, FRONT.z) + 0.2;
const CUSHION_TILT = 1.0; // from flat → leaning back ~33° off vertical

function buildBeanbag(wSeg: number, hSeg: number): BufferGeometry {
  const g = new SphereGeometry(1, wSeg, hSeg);
  const pos = g.getAttribute("position") as BufferAttribute;
  const ao = new Float32Array(pos.count * 3);
  const R = 0.95;
  const seatX = FRONT.x * 0.16;
  const seatZ = FRONT.z * 0.16;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const h = Math.hypot(x, z);
    const hx = h > 1e-6 ? x / h : 0;
    const hz = h > 1e-6 ? z / h : 0;
    const dBack = hx * BACK.x + hz * BACK.z; // -1 (front) .. 1 (back)
    const back = sstep(-0.35, 0.85, dBack); // broad, rounded backrest
    const front = Math.max(0, -dBack);
    let radial: number;
    let Y: number;
    if (y < 0) {
      // slumped lower half: flat contact patch + bulging skirt
      radial = R * Math.pow(h, 0.55) * (1 + 0.06 * front);
      Y = FLOOR_LOCAL * Math.pow(-y, 0.3);
    } else {
      radial = R * h * (1 - 0.1 * back * y) * (1 + 0.05 * front * (1 - y));
      Y = 0.36 * Math.pow(y, 0.8) + 0.2 * back * sstep(0.0, 0.85, y);
    }
    let px = radial * hx;
    let pz = radial * hz;
    // seat depression
    const sd = Math.hypot(px - seatX, pz - seatZ);
    const dip = y > 0 ? 0.2 * Math.exp(-((sd / 0.5) ** 2)) * sstep(0.05, 0.5, y) : 0;
    Y -= dip;
    // gore seams (8 panels) on the sides + top panel ring
    const phi = Math.atan2(z, x);
    const gore = (Math.PI * 2) / 8;
    const k = phi / gore - Math.round(phi / gore);
    const seamArc = Math.abs(k) * gore * radial;
    let pinch = 0.012 * Math.exp(-((seamArc / 0.012) ** 2)) * sstep(0.95, 0.4, Math.abs(y));
    pinch += 0.008 * Math.exp(-(((y - 0.62) / 0.025) ** 2));
    // creases: ridged noise, strongest around the seat rim and the skirt
    const rimMask = sstep(0.02, 0.1, dip) * (1 - sstep(0.12, 0.2, dip));
    const skirtMask = sstep(-0.05, -0.35, y) * (1 - sstep(-0.8, -0.95, y));
    const backMask = back * sstep(0.2, 0.6, y) * 0.6;
    const mask = Math.min(1, rimMask * 1.2 + skirtMask + backMask + 0.18);
    const w1 = ridged(noise3(px * 7, Y * 3, pz * 7, 3));
    const w2 = ridged(noise3(px * 15 + 3, Y * 8, pz * 15, 5));
    const wr = Math.pow(w1, 5) * 0.75 + Math.pow(w2, 6) * 0.35;
    const disp = -0.022 * wr * mask - pinch;
    // displace along the original sphere direction (≈ outward normal)
    px += x * disp;
    pz += z * disp;
    Y += y * disp * 0.7;
    Y = Math.max(Y, FLOOR_LOCAL);
    pos.setXYZ(i, px, Y, pz);
    // baked AO
    const floorDark = sstep(FLOOR_LOCAL + 0.18, FLOOR_LOCAL, Y) * 0.4;
    const a = Math.max(0.42, 1 - dip * 1.4 - wr * mask * 0.35 - pinch * 10 - floorDark);
    ao[i * 3] = ao[i * 3 + 1] = ao[i * 3 + 2] = a;
  }
  g.setAttribute("color", new BufferAttribute(ao, 3));
  g.computeVertexNormals();
  weldSphereNormals(g, wSeg, hSeg);
  return g;
}

function buildCushion(wSeg: number, hSeg: number): BufferGeometry {
  const g = new SphereGeometry(1, wSeg, hSeg);
  const pos = g.getAttribute("position") as BufferAttribute;
  const ao = new Float32Array(pos.count * 3);
  const sp = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
  const A = 0.33;
  const C = 0.26;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const px = sp(x, 0.28) * A;
    const pz = sp(z, 0.28) * C;
    const edge = Math.max(Math.abs(px / A), Math.abs(pz / C));
    const thick = 0.09 * (1 - 0.72 * Math.pow(edge, 2.6));
    const wr = Math.pow(ridged(noise3(px * 14, y * 2, pz * 14, 11)), 6);
    const py = sp(y, 0.7) * thick * (1 - 0.12 * wr);
    pos.setXYZ(i, px, py, pz);
    const a = Math.max(0.55, 1 - wr * 0.25 - Math.pow(edge, 4) * 0.25);
    ao[i * 3] = ao[i * 3 + 1] = ao[i * 3 + 2] = a;
  }
  g.setAttribute("color", new BufferAttribute(ao, 3));
  g.computeVertexNormals();
  weldSphereNormals(g, wSeg, hSeg);
  return g;
}

function buildTableFrame(seg: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  parts.push(new CylinderGeometry(0.019, 0.019, 0.66, seg).translate(0, 0.12 + 0.33, 0)); // pole
  parts.push(new CylinderGeometry(0.06, 0.06, 0.012, seg).translate(0, 0.765, 0)); // top plate
  parts.push(new CylinderGeometry(0.034, 0.04, 0.05, seg).translate(0, 0.12, 0)); // hub
  const up = new Vector3(0, 1, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const foot = new Vector3(Math.cos(a) * 0.25, 0.015, Math.sin(a) * 0.25);
    const top = new Vector3(Math.cos(a) * 0.03, 0.13, Math.sin(a) * 0.03);
    const d = foot.clone().sub(top);
    const len = d.length();
    const leg = new CylinderGeometry(0.011, 0.014, len, Math.max(6, seg / 2));
    leg.applyQuaternion(new Quaternion().setFromUnitVectors(up, d.normalize()));
    leg.translate((foot.x + top.x) / 2, (foot.y + top.y) / 2, (foot.z + top.z) / 2);
    parts.push(leg);
    parts.push(new CylinderGeometry(0.016, 0.017, 0.012, Math.max(6, seg / 2)).translate(foot.x, 0.046, foot.z)); // glide
  }
  return mergeSafe(parts);
}

function buildMug(seg: number): BufferGeometry {
  const body = arcLathe(
    [
      [0, 0],
      [0.038, 0],
      [0.0435, 0.003],
      [0.0455, 0.012],
      [0.0465, 0.09],
      [0.0468, 0.099],
      [0.0458, 0.1015],
      [0.0438, 0.1012],
      [0.0428, 0.096],
      [0.0418, 0.014],
      [0.036, 0.008],
      [0, 0.0075],
    ],
    seg,
  );
  const handle = new TorusGeometry(0.029, 0.0068, 8, Math.max(12, seg / 2), Math.PI * 1.12);
  handle.rotateZ(-Math.PI * 0.56);
  handle.translate(0.0455, 0.054, 0);
  return mergeSafe([body, handle]);
}

export function Beanbag() {
  const q = useRoomQuality();
  const hi = q.tier === "high";
  const lo = q.tier === "low";
  const seg = hi ? 48 : lo ? 20 : 32;
  const walnut = useDecorTextures("walnut", q.textureSize, q.anisotropy);

  const geo = useDisposable(
    () => ({
      bag: hi ? buildBeanbag(128, 80) : lo ? buildBeanbag(56, 36) : buildBeanbag(96, 60),
      cushion: lo ? buildCushion(32, 20) : buildCushion(56, 36),
      // solid walnut veneer top: planar metre UVs on the face, wrapped edge band
      top: boxProjectUVs(new CylinderGeometry(0.32, 0.314, 0.03, seg * 2, 1), { offset: [0.11, 0.07] }),
      frame: buildTableFrame(seg),
      mug: buildMug(seg),
      coffee: new CylinderGeometry(0.0418, 0.0418, 0.001, seg),
      cover: new RoundedBoxGeometry(0.152, 0.026, 0.214, 2, 0.004),
      pages: new RoundedBoxGeometry(0.142, 0.02, 0.204, 1, 0.002),
    }),
    [hi, lo, seg],
  );

  const mats = useDisposable(() => {
    const bag = createFabric(q, { color: "#1b3253", roughness: 0.92, widthM: 6, heightM: 2.4, normalScale: 1.2, sheen: 0.6 });
    bag.vertexColors = true;
    const cushion = createFabric(q, { color: "#d0a245", roughness: 0.9, widthM: 1.2, heightM: 0.6, seed: 2 });
    cushion.vertexColors = true;
    return {
      bag,
      cushion,
      top: createWalnut(q, walnut, { color: "#e4d6ca", clearcoat: 0.3 }),
      frame: createPowderCoat(q, { color: "#1d1e21", roughness: 0.55, widthM: 0.12, heightM: 0.7 }),
      mug: createCeramic(q, { color: "#efebe4", widthM: 0.3, heightM: 0.1 }),
      coffee: new MeshStandardMaterial({ color: "#2b170c", roughness: 0.12, metalness: 0, envMapIntensity: 1.2 }),
      cover: createFabric(q, { color: "#36503f", roughness: 0.85, widthM: 0.25, heightM: 0.25, sheen: 0, seed: 4 }),
      pages: new MeshStandardMaterial({ color: "#eee4cf", roughness: 0.92, metalness: 0 }),
    };
  }, [q, walnut]);

  return (
    <group>
      {/* Beanbag */}
      <group position={[-2.6, 0.5, 1.6]}>
        <mesh geometry={geo.bag} material={mats.bag} castShadow receiveShadow />
        {/* Mustard cushion, leaning into the backrest (faces the seat) */}
        <group position={[BACK.x * CUSHION_BACK, CUSHION_Y, BACK.z * CUSHION_BACK]} rotation={[0, CUSHION_YAW, 0]}>
          <mesh geometry={geo.cushion} material={mats.cushion} rotation={[CUSHION_TILT, 0, 0.08]} castShadow receiveShadow />
        </group>
      </group>

      {/* Small round side table */}
      <group position={[-3.6, 0, 2.4]}>
        <mesh geometry={geo.frame} material={mats.frame} castShadow />
        <mesh geometry={geo.top} material={mats.top} position={[0, 0.785, 0]} castShadow receiveShadow />
        {/* A small mug on the table */}
        <group position={[0.1, 0.8, 0]} rotation={[0, -0.7, 0]}>
          <mesh geometry={geo.mug} material={mats.mug} />
          <mesh geometry={geo.coffee} material={mats.coffee} position={[0, 0.074, 0]} />
        </group>
        {/* A closed book */}
        <group position={[-0.1, 0.8, 0.05]} rotation={[0, 0.35, 0]}>
          <mesh geometry={geo.cover} material={mats.cover} position={[0, 0.013, 0]} />
          <mesh geometry={geo.pages} material={mats.pages} position={[0.006, 0.013, 0]} />
        </group>
      </group>
    </group>
  );
}

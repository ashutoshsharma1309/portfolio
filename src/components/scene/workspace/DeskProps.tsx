// Desk-top props at real scale: full-size keyboard (instanced keycaps over a
// soft blue backlight plate), sculpted mouse, glazed ceramic mug with coffee,
// and the cloth desk mat. Geometry builders are pure; the Desk owns the
// materials so hover tinting can reach them.

import { useLayoutEffect, useRef } from "react";
import { Color, type BufferGeometry, type InstancedMesh, type Material, Matrix4, PlaneGeometry, Quaternion, TorusGeometry, Vector3 } from "three";
import { cyl, deform, lathe, mergeParts, place, rbox, roundedRectShape, slab } from "./geometry";

// --- Keyboard ----------------------------------------------------------------

const U = 0.019; // key pitch
const KB_W = 0.445;
const KB_D = 0.142;
const KB_H = 0.024;
/** Typing angle: front edge lower (rises toward the back). */
const KB_SLOPE = 0.004 / (KB_D / 2);

interface Key {
  x: number; // centre, in units from the left edge of the key field
  z: number; // centre, in rows from the back
  w: number; // width in units
  d: number; // depth in rows
  kind: 0 | 1 | 2; // 0 alpha, 1 modifier, 2 accent (Esc)
}

function buildKeyLayout(): Key[] {
  const keys: Key[] = [];
  // Main block rows (15u). Negative numbers are gaps.
  const main: number[][] = [
    [1, -1, 1, 1, 1, 1, -0.5, 1, 1, 1, 1, -0.5, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
    [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
  ];
  const rowZ = [0, 1.25, 2.25, 3.25, 4.25, 5.25];
  main.forEach((row, r) => {
    let x = 0;
    row.forEach((w, i) => {
      if (w < 0) {
        x += -w;
        return;
      }
      const mod = r > 0 && (w > 1 || (r === 5 && w !== 6.25)) ? 1 : 0;
      keys.push({ x: x + w / 2, z: rowZ[r] + 0.5, w, d: 1, kind: r === 0 && i === 0 ? 2 : r === 0 ? 1 : (mod as 0 | 1) });
      x += w;
    });
  });
  // Navigation cluster (15.25 .. 18.25).
  const nav = 15.25;
  for (const r of [0, 1, 2]) for (let c = 0; c < 3; c++) keys.push({ x: nav + c + 0.5, z: rowZ[r] + 0.5, w: 1, d: 1, kind: 1 });
  keys.push({ x: nav + 1.5, z: rowZ[4] + 0.5, w: 1, d: 1, kind: 1 });
  for (let c = 0; c < 3; c++) keys.push({ x: nav + c + 0.5, z: rowZ[5] + 0.5, w: 1, d: 1, kind: 1 });
  // Numpad (18.5 .. 22.5).
  const np = 18.5;
  for (let c = 0; c < 4; c++) keys.push({ x: np + c + 0.5, z: rowZ[1] + 0.5, w: 1, d: 1, kind: 1 });
  for (const r of [2, 3, 4]) for (let c = 0; c < 3; c++) keys.push({ x: np + c + 0.5, z: rowZ[r] + 0.5, w: 1, d: 1, kind: 0 });
  keys.push({ x: np + 3.5, z: rowZ[2] + 1, w: 1, d: 2, kind: 1 }); // +
  keys.push({ x: np + 3.5, z: rowZ[4] + 1, w: 1, d: 2, kind: 1 }); // Enter
  keys.push({ x: np + 1, z: rowZ[5] + 0.5, w: 2, d: 1, kind: 0 }); // 0
  keys.push({ x: np + 2.5, z: rowZ[5] + 0.5, w: 1, d: 1, kind: 0 }); // .
  return keys;
}
export const KEY_LAYOUT = buildKeyLayout();
const FIELD_W = 22.5;
const FIELD_D = 6.25;

export function createKeyboardGeometry(low: boolean) {
  const seg = low ? 1 : 2;
  const slope = (v: Vector3) => {
    if (v.y > 0) v.y -= KB_SLOPE * v.z;
  };
  const caseGeo = place(deform(rbox(KB_W, KB_H, KB_D, 0.007, seg + 1), slope), [0, KB_H / 2, 0]);
  // Plate follows the typing slope (sheared) so caps and halos sit on it.
  const plate = place(deform(rbox(KB_W - 0.014, 0.002, KB_D - 0.014, 0.0008, 1), (v) => {
    v.y -= KB_SLOPE * v.z;
  }), [0, KB_H + 0.0005, 0]);
  // Keycap: rounded cube tapered toward a slightly dished top.
  const cap = deform(rbox(1, 1, 1, 0.22, seg), (v) => {
    const t = v.y + 0.5; // 0 bottom → 1 top
    const k = 1 - 0.16 * t;
    v.x *= k;
    v.z *= 1 - 0.2 * t;
  });
  // Backlight leak: a flat quad under each key, a little larger than the
  // cap's footprint, so light shows only as a thin halo around each key
  // instead of the whole plate glowing.
  const glow = new PlaneGeometry(1, 1);
  glow.rotateX(-Math.PI / 2);
  return { caseGeo, plate, cap, glow };
}

const CAP_COLORS = [new Color("#2b2c30"), new Color("#44464c"), new Color("#5f7896")];

export function Keyboard({
  geometry,
  caseMaterial,
  plateMaterial,
  capMaterial,
  glowMaterial,
}: {
  geometry: Omit<ReturnType<typeof createKeyboardGeometry>, "dispose">;
  caseMaterial: Material;
  plateMaterial: Material;
  capMaterial: Material;
  glowMaterial: Material;
}) {
  const ref = useRef<InstancedMesh>(null);
  const glowRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    const gm = glowRef.current;
    if (!m) return;
    const mat = new Matrix4();
    const qq = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.atan(KB_SLOPE));
    const p = new Vector3();
    const s = new Vector3();
    const capH = 0.0085;
    KEY_LAYOUT.forEach((k, i) => {
      const x = (k.x - FIELD_W / 2) * U;
      const z = (k.z - FIELD_D / 2) * U + 0.004;
      const y = KB_H + 0.0015 + capH / 2 - KB_SLOPE * z;
      p.set(x, y, z);
      s.set(k.w * U - 0.0036, capH, k.d * U - 0.0036);
      mat.compose(p, qq, s);
      m.setMatrixAt(i, mat);
      m.setColorAt(i, CAP_COLORS[k.kind]);
      if (gm) {
        p.set(x, KB_H + 0.0021 - KB_SLOPE * z, z);
        s.set(k.w * U - 0.0018, 1, k.d * U - 0.0018); // ≈0.9 mm halo per side
        mat.compose(p, qq, s);
        gm.setMatrixAt(i, mat);
      }
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    if (gm) {
      gm.instanceMatrix.needsUpdate = true;
      gm.computeBoundingSphere();
    }
    // capMaterial too: a quality-tier change rebuilds materials, which
    // re-creates the instanced mesh (new args) with identity matrices.
  }, [geometry, capMaterial, glowMaterial]);
  return (
    <group>
      <mesh geometry={geometry.caseGeo} material={caseMaterial} castShadow receiveShadow />
      <mesh geometry={geometry.plate} material={plateMaterial} />
      <instancedMesh ref={glowRef} args={[geometry.glow, glowMaterial, KEY_LAYOUT.length]} />
      <instancedMesh ref={ref} args={[geometry.cap, capMaterial, KEY_LAYOUT.length]} />
    </group>
  );
}

// --- Mouse -------------------------------------------------------------------

/** Right-handed mouse ~124 × 66 × 40 mm, hump toward the palm (−z). */
export function createMouseGeometry(low: boolean): { shell: BufferGeometry; wheel: BufferGeometry } {
  const s = deform(sphereTop(low ? 16 : 28, low ? 8 : 14), (v) => {
    const zn = v.z; // -1 back .. 1 front
    v.x *= 0.033 * (1 - 0.1 * zn);
    v.z *= 0.062;
    // Hump peaks behind centre; front slopes down to the buttons.
    const hump = 1 - 0.38 * Math.max(0, zn) - 0.15 * Math.max(0, -zn - 0.3);
    v.y *= 0.04 * hump;
    // Slight right-hand tilt of the shell.
    v.y += v.x * 0.08;
  });
  const skirt = place(cyl(1, 1, 0.003, low ? 16 : 28), [0, 0.0015, 0], [0, 0, 0], [0.033, 1, 0.062]);
  const wheel = place(cyl(0.0085, 0.0085, 0.006, low ? 10 : 16), [0, 0.034, 0.03], [0, 0, Math.PI / 2]);
  return { shell: mergeParts([s, skirt]), wheel };
}

function sphereTop(wSeg: number, hSeg: number): BufferGeometry {
  const pts: [number, number][] = [];
  for (let i = 0; i <= hSeg; i++) {
    const a = (i / hSeg) * (Math.PI / 2);
    pts.push([Math.sin(a), Math.cos(a)]);
  }
  // Profile runs rim → top so lathe normals face outward.
  return lathe(pts.reverse(), wSeg);
}

// --- Mug ---------------------------------------------------------------------

/** 350 ml mug: Ø84 mm × 97 mm, 3.5 mm wall, foot ring, rolled lip, C handle. */
export function createMugGeometry(low: boolean): { body: BufferGeometry; coffee: BufferGeometry } {
  const seg = low ? 18 : 36;
  const body = lathe(
    [
      [0.0, 0.0015],
      [0.034, 0.0015],
      [0.036, 0.0],
      [0.039, 0.0005],
      [0.041, 0.004],
      [0.042, 0.012],
      [0.042, 0.088],
      [0.0418, 0.0945],
      [0.0405, 0.097],
      [0.039, 0.0965],
      [0.0384, 0.093],
      [0.0384, 0.016],
      [0.036, 0.0125],
      [0.0, 0.012],
    ],
    seg,
  );
  const handle = new TorusGeometry(0.026, 0.0065, low ? 6 : 10, low ? 12 : 22, Math.PI);
  handle.rotateZ(-Math.PI / 2);
  handle.scale(1, 1.1, 1);
  handle.translate(0.04, 0.05, 0);
  const coffee = place(cyl(0.0383, 0.0383, 0.002, seg), [0, 0.078, 0]);
  return { body: mergeParts([body, handle]), coffee };
}

// --- Desk mat ----------------------------------------------------------------

export const DESK_MAT = { w: 1.4, d: 0.42, t: 0.003 };

export function createDeskMatGeometry(): BufferGeometry {
  return slab(roundedRectShape(DESK_MAT.w, DESK_MAT.d, 0.03), DESK_MAT.t, 0.0012, 6, 2);
}

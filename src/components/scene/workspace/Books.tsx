// Instanced hardcover books: every book is two cover boards + a spine
// (instanced cloth-bound boards, coloured per instance), a recessed page block
// with sheet-edge stripes, and optional foil bands on the spine. One draw call
// per layer no matter how many books, so shelves can stay dense.
//
// Book frame: x = thickness, y = height, z = depth, spine faces +z, origin at
// the centre of the book's bottom (so `position` is where it stands). Lay a
// book flat with rotation [0, yaw, ±π/2].

import { useLayoutEffect, useRef } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  Color,
  Euler,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { createFabric, useDisposable } from "../materials";
import { useRoomQuality } from "../quality";
import { createPageEdgeTexture } from "./screenTextures";
import type { Vec3 } from "./geometry";

export interface BookSpec {
  /** Bottom-centre of the book (parent space). */
  readonly position: Vec3;
  readonly rotation?: Vec3;
  /** [thickness, height, depth] in metres. */
  readonly size: Vec3;
  readonly color: string;
  /** Foil/print band colour on the spine; null for a plain spine. */
  readonly band?: string | null;
}

/**
 * A book lying flat with its spine facing +z: `center` is the centre of the
 * book's volume, `yaw` turns it about the vertical axis.
 */
export function flatBook(center: Vec3, yaw: number, size: Vec3, color: string, band: string | null = null): BookSpec {
  const h = size[1];
  // rotation z = +π/2 lays the book's height along −x from its origin; the
  // origin (bottom centre of the standing book) is then at the +x end.
  return {
    position: [center[0] + (h / 2) * Math.cos(yaw), center[1], center[2] - (h / 2) * Math.sin(yaw)],
    rotation: [0, yaw, Math.PI / 2],
    size,
    color,
    band,
  };
}

const BOARD = 0.0028;
const SPINE_BULGE = 0.004; // how far the rounded spine stands proud // cover board thickness
const OVERHANG = 0.0035; // boards overhang the page block (top/bottom/fore-edge)

interface BooksProps {
  readonly books: readonly BookSpec[];
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
}

const _m = new Matrix4();
const _local = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();
const _c = new Color();

export function Books({ books, castShadow = false, receiveShadow = true }: BooksProps) {
  const q = useRoomQuality();
  const coverRef = useRef<InstancedMesh>(null);
  const spineRef = useRef<InstancedMesh>(null);
  const pageRef = useRef<InstancedMesh>(null);
  const bandRef = useRef<InstancedMesh>(null);

  const res = useDisposable(() => {
    const pageTex = createPageEdgeTexture();
    return {
      box: new BoxGeometry(1, 1, 1),
      // Rounded spine: half-cylinder bulging toward +z (scaled per book).
      spine: new CylinderGeometry(0.5, 0.5, 1, q.tier === "low" ? 6 : 12, 1, false, -Math.PI / 2, Math.PI),
      cover: createFabric(q, { color: "#ffffff", repeat: [7, 7], roughness: 0.8, sheen: 0, envMapIntensity: 0.6, normalScale: 0.35, aoMapIntensity: 0.4 }),
      pages: new MeshStandardMaterial({ color: "#ffffff", map: pageTex, roughness: 0.92, envMapIntensity: 0.5 }),
      band: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.38, metalness: 0.75, envMapIntensity: 1 }),
      pageTex,
    };
  }, [q]);

  const bandCount = books.reduce((n, b) => n + (b.band ? 2 : 0), 0);

  useLayoutEffect(() => {
    const covers = coverRef.current;
    const spines = spineRef.current;
    const pages = pageRef.current;
    const bands = bandRef.current;
    if (!covers || !pages || !spines) return;
    let bi = 0;
    books.forEach((b, i) => {
      const [t, h, d] = b.size;
      const r = b.rotation ?? [0, 0, 0];
      // Book transform: bottom-centre origin.
      _e.set(r[0], r[1], r[2]);
      _q.setFromEuler(_e);
      const bookM = new Matrix4().compose(_p.set(b.position[0], b.position[1], b.position[2]), _q, _s.set(1, 1, 1));
      const put = (mesh: InstancedMesh, idx: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
        _local.compose(_p.set(x, y, z), _q.identity(), _s.set(sx, sy, sz));
        _m.multiplyMatrices(bookM, _local);
        mesh.setMatrixAt(idx, _m);
      };
      // Boards and spine.
      put(covers, i * 3, -t / 2 + BOARD / 2, h / 2, 0, BOARD, h, d);
      put(covers, i * 3 + 1, t / 2 - BOARD / 2, h / 2, 0, BOARD, h, d);
      // Spine: flat inner board + rounded outer shell.
      put(covers, i * 3 + 2, 0, h / 2, d / 2 - BOARD * 1.5, t - BOARD, h, BOARD);
      put(spines, i, 0, h / 2, d / 2 - BOARD, t, h, SPINE_BULGE * 2);
      _c.set(b.color);
      covers.setColorAt(i * 3, _c);
      covers.setColorAt(i * 3 + 1, _c);
      covers.setColorAt(i * 3 + 2, _c);
      // Spine slightly lighter where it's been handled.
      spines.setColorAt(i, _c.offsetHSL(0, -0.02, 0.025));
      // Page block: recessed at top, bottom and fore-edge.
      const pd = d - BOARD - OVERHANG;
      put(pages, i, 0, h / 2, -d / 2 + OVERHANG + pd / 2, t - BOARD * 2, h - OVERHANG * 2, pd);
      // Foil bands near the head and tail of the spine.
      if (bands && b.band) {
        _c.set(b.band);
        for (const fy of [0.88, 0.14]) {
          put(bands, bi, 0, h * fy, d / 2 - BOARD + SPINE_BULGE + 0.0002, t * 0.7, Math.min(0.009, h * 0.03), 0.0008);
          bands.setColorAt(bi, _c);
          bi++;
        }
      }
    });
    for (const mesh of [covers, spines, pages, bands]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    }
  }, [books, res]);

  return (
    <group>
      <instancedMesh
        ref={coverRef}
        args={[res.box, res.cover, books.length * 3]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      />
      <instancedMesh
        ref={spineRef}
        args={[res.spine, res.cover, books.length]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      />
      <instancedMesh ref={pageRef} args={[res.box, res.pages, books.length]} receiveShadow={receiveShadow} />
      {bandCount > 0 && <instancedMesh ref={bandRef} args={[res.box, res.band, bandCount]} />}
    </group>
  );
}

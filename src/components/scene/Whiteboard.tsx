// Whiteboard mounted on the left wall — rendered as a child of LeftWall
// (world center: -5, 2.5, 0). Coordinates are LOCAL to that wall.
//
// Real build: satin anodised-aluminium frame (mitred extrusion profile) with
// grey moulded corner caps, a glossy melamine writing surface with faint
// ghosting / eraser haze (procedural texture + roughness map, clearcoat on the
// high tier), an aluminium J-profile marker tray with end caps, three
// dry-erase markers (red/blue/green — the inks used on the board) and a felt
// eraser, plus a soft contact shadow on the plaster. The handwritten <Html>
// text is unchanged. Hover fades in a subtle warm highlight on the frame.

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  Color,
  ExtrudeGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useLayoutEffect, useRef } from "react";
import { useHotspotHover } from "../../hooks/useHotspotHover";
import { useSceneStore } from "../../store/useSceneStore";
import { useRoomQuality } from "./quality";
import {
  applyHoverEmissive,
  createBrushedSteel,
  createFabric,
  createPlastic,
  useDisposable,
  useHoverMix,
} from "./materials";
import { arcLathe, mergeSafe, mitredFrameGeometry, type ProfilePt } from "./decor/decorGeometry";
import { useDecorTextures } from "./decor/decorTextures";

const W = 2.6; // outer frame (unchanged footprint)
const H = 1.7;
const FRAME_W = 0.03;
const SURFACE_Z = 0.012;
const TRAY_Y = -0.885;
const TRAY_FLOOR = TRAY_Y - 0.025;
const TRAY_LEN = 2.4;

/** Aluminium frame extrusion: [inset, height off wall]. */
const FRAME_PROFILE: ProfilePt[] = [
  [0, 0],
  [0, 0.017],
  [0.0025, 0.0215],
  [0.007, 0.023],
  [0.022, 0.023],
  [0.027, 0.0205],
  [0.03, 0.016],
  [0.03, SURFACE_Z - 0.002],
];

/** Marker: tail plug, barrel, cap (lathe along +Y, length ≈ 13.7 cm). */
const MARKER_BODY: [number, number][] = [
  [0, 0],
  [0.0062, 0],
  [0.0085, 0.0025],
  [0.0094, 0.007],
  [0.0094, 0.094],
  [0.0088, 0.0955],
  [0, 0.0955],
];
const MARKER_CAP: [number, number][] = [
  [0, 0.093],
  [0.0101, 0.093],
  [0.0104, 0.096],
  [0.0104, 0.128],
  [0.0098, 0.134],
  [0.0075, 0.137],
  [0, 0.1375],
];
const MARKER_TAIL: [number, number][] = [
  [0.0063, -0.0004],
  [0.0087, 0.0024],
  [0.0096, 0.0068],
  [0.0096, 0.016],
  [0.0091, 0.0165],
];
/** [x along the tray, roll, ink colour] — red stays where it always was. */
const MARKERS: [number, number, string][] = [
  [-0.5, 0.3, "#c8221a"],
  [-0.34, 1.9, "#1a3a8a"],
  [0.7, 4.1, "#1f7a3a"],
];

function trayGeometry() {
  // J-profile in (out-of-wall, up), extruded along X.
  const s = new Shape();
  const pts: [number, number][] = [
    [0, 0.025],
    [0, -0.032],
    [0.088, -0.032],
    [0.1, -0.027],
    [0.106, -0.014],
    [0.106, 0.004],
    [0.1025, 0.0065],
    [0.0985, 0.004],
    [0.0985, -0.012],
    [0.093, -0.021],
    [0.084, -0.025],
    [0.004, -0.025],
    [0.004, 0.025],
  ];
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: TRAY_LEN, bevelEnabled: false, curveSegments: 4 });
  g.rotateY(-Math.PI / 2); // shape X → +z (out of wall), extrusion → -x
  g.translate(TRAY_LEN / 2, 0, 0);
  return g;
}

export function Whiteboard() {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover("whiteboard");
  const q = useRoomQuality();
  const mix = useHoverMix(hovered);
  const board = useDecorTextures("whiteboard", 1024, q.anisotropy);
  const soft = useDecorTextures("softShadow", 128, q.anisotropy);
  const seg = q.tier === "low" ? 12 : 20;

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHotspot("whiteboard");
  };

  const geo = useDisposable(() => {
    const cap = new RoundedBoxGeometry(0.05, 0.05, 0.03, 2, 0.008);
    const caps = mergeSafe(
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sy]) => cap.clone().translate(sx * (W / 2 - 0.019), sy * (H / 2 - 0.019), 0.014)),
    );
    cap.dispose();
    const endCap = new RoundedBoxGeometry(0.012, 0.064, 0.112, 2, 0.004);
    const endCaps = mergeSafe([
      endCap.clone().translate(-TRAY_LEN / 2 - 0.006, -0.0035, 0.054),
      endCap.clone().translate(TRAY_LEN / 2 + 0.006, -0.0035, 0.054),
    ]);
    endCap.dispose();
    const clip = new RoundedBoxGeometry(0.004, 0.03, 0.006, 1, 0.0015).translate(0, 0.118, 0.0118);
    const markerCap = mergeSafe([arcLathe(MARKER_CAP, seg), clip]);
    return {
      frame: mitredFrameGeometry(W, H, FRAME_PROFILE, { hard: [1, 6], uOffsets: [0, 0.05, 0.1, 0.15] }),
      surface: new PlaneGeometry(W - 2 * FRAME_W + 0.004, H - 2 * FRAME_W + 0.004),
      shadow: new PlaneGeometry(1, 1),
      caps,
      tray: trayGeometry(),
      endCaps,
      markerBody: arcLathe(MARKER_BODY, seg),
      markerCap,
      markerTail: arcLathe(MARKER_TAIL, seg),
      eraserTop: new RoundedBoxGeometry(0.13, 0.026, 0.05, 2, 0.009),
      eraserFelt: new RoundedBoxGeometry(0.128, 0.008, 0.048, 1, 0.002),
    };
  }, [seg]);

  const mats = useDisposable(() => {
    const physical = q.config.physicalMaterials;
    const surfParams = {
      color: new Color("#ffffff"),
      map: board.map ?? null,
      roughnessMap: board.roughnessMap ?? null,
      // Semi-gloss melamine, not a mirror: the map's base (~0.086) is scaled
      // to ~0.3 so a low-res env cube can never resolve into hard blocks.
      roughness: 3.4,
      metalness: 0,
      envMapIntensity: 0.4,
    };
    const surface = physical
      ? new MeshPhysicalMaterial({ ...surfParams, clearcoat: 0.3, clearcoatRoughness: 0.28 })
      : new MeshStandardMaterial(surfParams);
    // The board sits ~1 cm off the plaster: on low-precision depth buffers
    // (e.g. after the runtime quality step-down / software GL) that z-fights
    // with the wall at the default camera distance as blocky grey stripes.
    surface.polygonOffset = true;
    surface.polygonOffsetFactor = -4;
    surface.polygonOffsetUnits = -4;
    // Anodised aluminium has a diffuse component: keep it from mirroring the
    // dim room into a dark grey.
    const frame = createBrushedSteel(q, { color: "#d6d8db", roughness: 0.45, repeat: [4, 4], rotation: Math.PI / 2, envMapIntensity: 1.3 });
    frame.metalness = 0.6;
    return {
      surface,
      frame,
      // satin anodised aluminium (untextured: extrude UVs would streak)
      tray: new MeshStandardMaterial({ color: "#c9ccd0", metalness: 0.6, roughness: 0.42, envMapIntensity: 1.3 }),
      plasticGrey: createPlastic(q, { color: "#5b5e63", roughness: 0.5, widthM: 0.05, heightM: 0.05 }),
      markerWhite: createPlastic(q, { color: "#e9e7e2", roughness: 0.38, widthM: 0.06, heightM: 0.1 }),
      markerInk: createPlastic(q, { color: "#ffffff", roughness: 0.35, widthM: 0.06, heightM: 0.05 }),
      eraserTop: createPlastic(q, { color: "#3a3d42", roughness: 0.45, widthM: 0.13, heightM: 0.05 }),
      felt: createFabric(q, { color: "#2a2a2c", roughness: 0.97, widthM: 0.13, heightM: 0.05, sheen: 0 }),
      shadow: new MeshBasicMaterial({
        color: "#120c08",
        transparent: true,
        opacity: 0.4,
        alphaMap: soft.alphaMap ?? null,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    };
  }, [q, board, soft]);

  // Marker instances: body (white barrel) + coloured cap/tail per marker.
  const bodyRef = useRef<InstancedMesh>(null);
  const capRef = useRef<InstancedMesh>(null);
  const tailRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new Matrix4();
    const qa = new Quaternion();
    const qr = new Quaternion();
    const p = new Vector3();
    const one = new Vector3(1, 1, 1);
    const c = new Color();
    MARKERS.forEach(([x, roll, ink], i) => {
      // lathe axis +Y → lies along the tray (+X), rolled about its own axis
      qa.setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI / 2);
      qr.setFromAxisAngle(new Vector3(0, 1, 0), roll);
      qa.multiply(qr);
      p.set(x - 0.068, TRAY_FLOOR + 0.0101, 0.05 + (i - 1) * 0.012);
      m.compose(p, qa, one);
      for (const ref of [bodyRef, capRef, tailRef]) ref.current?.setMatrixAt(i, m);
      c.set(ink);
      capRef.current?.setColorAt(i, c);
      tailRef.current?.setColorAt(i, c);
    });
    for (const ref of [bodyRef, capRef, tailRef]) {
      if (!ref.current) continue;
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [geo, mats]);

  useFrame(() => {
    applyHoverEmissive([mats.frame, mats.tray], mix.current);
  });

  return (
    <group
      position={[0.08, 0.1, -1]}
      rotation={[0, Math.PI / 2, 0]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={handleClick}
    >
      {/* Invisible enlarged tap target — covers the entire whiteboard with a
          generous halo for finger taps. */}
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[2.9, 2.0, 0.2]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Soft contact shadow on the plaster (local +x = world -z). */}
      <mesh
        geometry={geo.shadow}
        material={mats.shadow}
        position={[0.03, -0.045, -0.0035]}
        scale={[W / 0.8, (H + 0.12) / 0.8, 1]}
      />

      {/* Frame: mitred aluminium extrusion + moulded corner caps */}
      <group position={[0, 0, -0.005]}>
        {/* No castShadow: the sun grazes this wall, so the 18 mm frame lip
            would throw a long, stair-stepped shadow-map streak across the
            board. The baked contact shadow on the plaster grounds it. */}
        <mesh geometry={geo.frame} material={mats.frame} />
        <mesh geometry={geo.caps} material={mats.plasticGrey} />
        {/* Melamine writing surface */}
        <mesh geometry={geo.surface} material={mats.surface} position={[0, 0, SURFACE_Z]} receiveShadow />
      </group>

      {/* Marker tray (aluminium J-profile) + end caps */}
      <group position={[0, TRAY_Y, -0.005]}>
        <mesh geometry={geo.tray} material={mats.tray} castShadow receiveShadow />
        <mesh geometry={geo.endCaps} material={mats.plasticGrey} />
      </group>

      {/* Markers (red is the original marker) */}
      <instancedMesh ref={bodyRef} args={[geo.markerBody, mats.markerWhite, MARKERS.length]} />
      <instancedMesh ref={capRef} args={[geo.markerCap, mats.markerInk, MARKERS.length]} />
      <instancedMesh ref={tailRef} args={[geo.markerTail, mats.markerInk, MARKERS.length]} />

      {/* Felt eraser */}
      <group position={[0.24, TRAY_FLOOR, 0.05]} rotation={[0, 0.06, 0]}>
        <mesh geometry={geo.eraserFelt} material={mats.felt} position={[0, 0.004, 0]} />
        <mesh geometry={geo.eraserTop} material={mats.eraserTop} position={[0, 0.008 + 0.013, 0]} />
      </group>

      {/* Handwritten text via HTML */}
      {/* pointerEvents="none" reaches drei's OUTER wrapper (style only reaches
          the inner div), so the text never blocks clicks/drags on the board. */}
      <Html
        pointerEvents="none"
        position={[0, 0.05, 0.012]}
        center
        transform
        distanceFactor={1.5}
        style={{
          pointerEvents: "none",
          width: "620px",
          textAlign: "left",
          fontFamily: "'Permanent Marker', 'Caveat', cursive",
        }}
      >
        <div style={{ pointerEvents: "none", padding: "0 28px" }}>
          <div
            style={{
              fontSize: 44,
              lineHeight: 1,
              marginBottom: 18,
              color: "#c8221a",
              textAlign: "center",
            }}
          >
            HELLO!
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 30, color: "#1a3a8a", lineHeight: 1 }}>
              Contact
            </div>
            <div
              style={{
                fontSize: 22,
                color: "#1f7a3a",
                marginTop: 4,
                wordBreak: "break-all",
              }}
            >
              ashutoshsharma1395@gmail.com
            </div>
          </div>

          <div>
            <div style={{ fontSize: 30, color: "#1a3a8a", lineHeight: 1 }}>
              Projects
            </div>
            <div
              style={{
                fontSize: 22,
                color: "#1f7a3a",
                marginTop: 4,
                wordBreak: "break-all",
              }}
            >
              github.com/ashutoshsharma1309
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

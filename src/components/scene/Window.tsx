// Window mounted on the back wall, right side.
// Coordinates are LOCAL to the BackWall group (world center: 0, 2.5, -5).
//
// A real opening is cut through the wall (Walls.tsx, architecture/windowSpec)
// and this builds the joinery inside it: painted casings around the opening,
// jamb liners on the reveals, a stool (interior sill) with horns and an apron,
// and a four-pane casement unit (frame, centre mullion, transom, four sashes
// with glazing) set back toward the outside face. The glass is a thin
// reflective layer (env reflections at full strength, ~88% transmission) in
// front of a daylight "view" panel that sits INSIDE the wall thickness and
// samples the exterior by view direction (a view at infinity), so the scene
// outside has correct parallax but nothing ever pokes out behind the wall.

import {
  AddEquation,
  BufferGeometry,
  Color,
  CustomBlending,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useRoomQuality } from "./quality";
import { createBrushedSteel, createPlastic, useDisposable } from "./materials";
import { WALL_THICKNESS, WINDOW_OPENING, WINDOW_POS } from "./architecture/windowSpec";
import { EXTERIOR_H, EXTERIOR_W, exteriorPlaceholder, loadExteriorPixels } from "./architecture/exteriorView";

const FRAME_COLOR = "#f1ebe0";

const OW = WINDOW_OPENING.w;
const OH = WINDOW_OPENING.h;
/** Wall front / back face, in this group's local z. */
const FACE = WALL_THICKNESS / 2 - WINDOW_POS[2];
const BACK = -WALL_THICKNESS / 2 - WINDOW_POS[2];
/** Casing (architrave) on the wall face. */
const CASING_W = 0.1;
const CASING_T = 0.02;
/** Jamb liner thickness on the reveals. */
const LINER_T = 0.016;
/** Stool (interior sill). */
const STOOL_T = 0.032;
const STOOL_TOP = -OH / 2 + 0.022;
const STOOL_NOSE = FACE + 0.07;
/** Window unit (frame + sashes), set back toward the outside face. */
const UNIT_FRONT = -0.1;
const UNIT_DEPTH = UNIT_FRONT - BACK;
const FRAME_W = 0.06;
const MULLION_W = 0.07;
const SASH_W = 0.048;
const SASH_DEPTH = 0.042;
const GLASS_Z = UNIT_FRONT - 0.026;
/** Exterior view panel: just inside the wall's back face, behind the glass. */
const VIEW_Z = BACK + 0.004;

type Part = readonly [w: number, h: number, d: number, x: number, y: number, z: number, r?: number];

function joineryParts(): Part[] {
  const parts: Part[] = [];
  const cz = FACE + CASING_T / 2;
  // Head casing (slightly deeper, with ears past the side casings).
  parts.push([OW + 2 * CASING_W + 0.03, 0.115, CASING_T + 0.006, 0, OH / 2 + 0.0575, cz + 0.003, 0.005]);
  // Side casings stand on the stool.
  const sideH = OH / 2 - STOOL_TOP;
  for (const s of [-1, 1]) {
    parts.push([CASING_W, sideH, CASING_T, s * (OW / 2 + CASING_W / 2), STOOL_TOP + sideH / 2, cz, 0.005]);
  }
  // Stool with horns, from the unit out past the casings.
  const stoolD = STOOL_NOSE - UNIT_FRONT;
  parts.push([OW + 2 * CASING_W + 0.06, STOOL_T, stoolD, 0, STOOL_TOP - STOOL_T / 2, UNIT_FRONT + stoolD / 2, 0.008]);
  // Apron under the stool.
  parts.push([OW + 2 * CASING_W - 0.02, 0.085, 0.018, 0, STOOL_TOP - STOOL_T - 0.0425, FACE + 0.009, 0.004]);
  // Jamb liners over the reveal (sides + head), from the unit to the face.
  const linerD = FACE - UNIT_FRONT + 0.002;
  const linerZ = UNIT_FRONT + linerD / 2;
  const linerH = OH / 2 - STOOL_TOP;
  for (const s of [-1, 1]) {
    parts.push([LINER_T, linerH, linerD, s * (OW / 2 - LINER_T / 2), STOOL_TOP + linerH / 2, linerZ, 0.003]);
  }
  parts.push([OW - 2 * LINER_T, LINER_T, linerD, 0, OH / 2 - LINER_T / 2, linerZ, 0.003]);

  // Window unit frame inside the liners.
  const L = -OW / 2 + LINER_T;
  const R = OW / 2 - LINER_T;
  const B = STOOL_TOP;
  const T = OH / 2 - LINER_T;
  const uz = UNIT_FRONT - UNIT_DEPTH / 2;
  const fw = R - L;
  const fh = T - B;
  parts.push([fw, FRAME_W, UNIT_DEPTH, 0, T - FRAME_W / 2, uz, 0.006]);
  parts.push([fw, FRAME_W + 0.01, UNIT_DEPTH, 0, B + (FRAME_W + 0.01) / 2, uz, 0.006]);
  for (const s of [-1, 1]) parts.push([FRAME_W, fh, UNIT_DEPTH, s * (fw / 2 - FRAME_W / 2), (B + T) / 2, uz, 0.006]);
  // Centre mullion and transom (the original window's cross).
  parts.push([MULLION_W, fh - 2 * FRAME_W, UNIT_DEPTH, 0, (B + T) / 2, uz, 0.006]);
  parts.push([fw - 2 * FRAME_W, MULLION_W, UNIT_DEPTH, 0, 0, uz, 0.006]);

  // Four sashes, one per pane opening, slightly proud of the frame.
  const sz = UNIT_FRONT - SASH_DEPTH / 2 + 0.012;
  for (const pane of paneRects()) {
    const { x, y, w, h } = pane;
    parts.push([w, SASH_W, SASH_DEPTH, x, y + h / 2 - SASH_W / 2, sz, 0.005]);
    parts.push([w, SASH_W + 0.012, SASH_DEPTH, x, y - h / 2 + (SASH_W + 0.012) / 2, sz, 0.005]);
    for (const s of [-1, 1]) parts.push([SASH_W, h - 2 * SASH_W, SASH_DEPTH, x + s * (w / 2 - SASH_W / 2), y, sz, 0.005]);
  }
  return parts;
}

/** Pane openings between frame members (local x, y centre + size). */
function paneRects() {
  const L = -OW / 2 + LINER_T + FRAME_W;
  const R = OW / 2 - LINER_T - FRAME_W;
  const B = STOOL_TOP + FRAME_W + 0.01;
  const T = OH / 2 - LINER_T - FRAME_W;
  const m = MULLION_W / 2;
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  for (const [x0, x1] of [
    [L, -m],
    [m, R],
  ]) {
    for (const [y0, y1] of [
      [B, -m],
      [m, T],
    ]) {
      rects.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 });
    }
  }
  return rects;
}

function buildParts(parts: readonly Part[], segments: number): BufferGeometry {
  const geos = parts.map(([w, h, d, x, y, z, r = 0.004]) => {
    const g = new RoundedBoxGeometry(w, h, d, segments, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
    g.translate(x, y, z);
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged ?? new BufferGeometry();
}

/** Two casement handles on the lower sashes, next to the mullion. */
function handleParts(): Part[] {
  const panes = paneRects();
  const parts: Part[] = [];
  const z = UNIT_FRONT + 0.012;
  for (const p of [panes[0], panes[2]]) {
    const side = p.x < 0 ? 1 : -1; // stile next to the mullion
    const x = p.x + side * (p.w / 2 - SASH_W / 2);
    const y = p.y + 0.05;
    parts.push([0.026, 0.07, 0.008, x, y, z + 0.004, 0.003]); // rose plate
    parts.push([0.014, 0.014, 0.03, x, y + 0.02, z + 0.022, 0.004]); // spindle
    parts.push([0.016, 0.11, 0.012, x, y - 0.025, z + 0.04, 0.005]); // lever
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Exterior: a soft daylight view (sky, hazy treeline) baked into a small
// texture (architecture/exteriorView.ts). Kept bright and low in contrast,
// like an exposed-for-interior photo, so the opening reads as the room's
// light source. The texture starts as a cheap sky-gradient placeholder; the
// real pixels are generated off the main thread and copied in when ready.

/** Set once the real pixels exist; later Window mounts start with them. */
let exteriorReady: Uint8Array<ArrayBuffer> | null = null;

function buildExteriorTexture(): DataTexture {
  const tex = new DataTexture(exteriorReady ?? exteriorPlaceholder(), EXTERIOR_W, EXTERIOR_H, RGBAFormat);
  tex.colorSpace = SRGBColorSpace;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  if (!exteriorReady) {
    let disposed = false;
    tex.addEventListener("dispose", () => {
      disposed = true;
    });
    void loadExteriorPixels().then((data) => {
      exteriorReady = data;
      if (disposed) return;
      tex.image.data = data;
      tex.needsUpdate = true;
    });
  }
  return tex;
}

/**
 * Sample the exterior texture by world view direction instead of UV: azimuth
 * (around the wall normal) -> u, elevation -> v with the horizon at v = 0.3.
 * The panel then behaves like a window onto a distant landscape.
 */
function patchExteriorView(mat: MeshBasicMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vViewW;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvViewW = (modelMatrix * vec4(transformed, 1.0)).xyz - cameraPosition;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vViewW;")
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
vec3 vd = normalize(vViewW);
float az = atan(vd.x, -vd.z);
float el = asin(clamp(vd.y, -1.0, 1.0));
vec2 viewUv = vec2(0.5 + az / 1.7, clamp(0.45 + el / 0.85, 0.0, 1.0));
diffuseColor *= texture2D(map, viewUv);
`,
      );
  };
  mat.customProgramCacheKey = () => "room-window-view-v1";
}

/** A very faint diagonal sheen on the panes (the room's soft reflection in
 *  real glass), so the glazing reads as a surface and not as a hole. */
function patchGlassSheen(mat: MeshStandardMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vGlassP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGlassP = position.xy;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vGlassP;")
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
{
  float diag = vGlassP.x * 0.62 + vGlassP.y;
  float band = smoothstep(0.0, 0.35, diag + 0.55) * (1.0 - smoothstep(0.35, 0.9, diag + 0.55));
  float band2 = smoothstep(0.0, 0.08, diag - 0.35) * (1.0 - smoothstep(0.08, 0.2, diag - 0.35));
  outgoingLight += vec3(0.95, 0.97, 1.0) * (band * 0.05 + band2 * 0.035);
}
#include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => "room-window-glass-v1";
}

export function Window() {
  const [x, y, z] = WINDOW_POS;
  const q = useRoomQuality();
  const low = q.tier === "low";

  const geos = useDisposable(() => {
    const seg = low ? 1 : 2;
    const glass = mergeGeometries(
      paneRects().map((p) => {
        const g = new PlaneGeometry(p.w - 2 * SASH_W + 0.012, p.h - 2 * SASH_W + 0.006);
        g.translate(p.x, p.y, GLASS_Z);
        return g;
      }),
      false,
    );
    return {
      joinery: buildParts(joineryParts(), seg),
      handles: buildParts(handleParts(), seg),
      glass: glass ?? new BufferGeometry(),
      backdrop: new PlaneGeometry(OW - 0.01, OH - 0.01),
    };
  }, [low]);

  // The exterior texture is owned here (not part of the shared cache).
  const exterior = useDisposable(() => buildExteriorTexture(), []);
  const mats = useDisposable(() => {
    const paint = createPlastic(q, { color: FRAME_COLOR, roughness: 0.32, repeat: [2, 2], envMapIntensity: 0.9 });
    const steel = createBrushedSteel(q, { color: "#c9c6c0", roughness: 0.3, repeat: [0.4, 0.4] });
    // Premultiplied glass: the diffuse term is ~black, so the output is just
    // the env reflection added over (1 - opacity) of what's behind.
    const glass = new MeshStandardMaterial({
      color: new Color("#0d1112"),
      roughness: 0.03,
      metalness: 0,
      envMapIntensity: 1.6,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
    });
    const sky = new MeshBasicMaterial({ map: exterior, color: new Color(1.25, 1.25, 1.25) });
    patchExteriorView(sky);
    patchGlassSheen(glass);
    return { paint, steel, glass, sky };
  }, [q, exterior]);

  return (
    <group position={[x, y, z]}>
      <mesh geometry={geos.backdrop} material={mats.sky} position={[0, 0, VIEW_Z]} />
      <mesh geometry={geos.joinery} material={mats.paint} castShadow receiveShadow />
      <mesh geometry={geos.handles} material={mats.steel} />
      <mesh geometry={geos.glass} material={mats.glass} renderOrder={2} />
    </group>
  );
}

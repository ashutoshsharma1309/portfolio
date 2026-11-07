// Shader patches for the room shell (floor, walls, rug). They are layered on
// top of the foundation's factory materials with onBeforeCompile, so the PBR
// textures, tone mapping and quality tiers stay exactly as the factories set
// them. Everything here is computed per fragment from world/object position:
// no extra textures, meshes or draw calls.
//
//   - Floor: long boards built from the 1.2 m wood tile (each 0.2 m world
//     board is split into 1.0-2.2 m runs that read joint-free stretches of a
//     random source column, so the tile never visibly repeats), hairline end
//     joints, per-plank tone, worn traffic lanes (duller, paler, less
//     clearcoat), dust along the skirting.
//   - Walls: low-frequency paint mottling across the whole wall.
//   - All shell surfaces: soft ambient occlusion where the walls meet each
//     other and the floor (applied mostly to indirect light, a little to
//     direct so it still reads in sunlit corners).
//   - Rug: the concentric-ring design is woven into the pile (not separate
//     geometry), with hand-made wobble and pile shading.

import { Color, ShaderChunk, type Material, type WebGLProgramParametersWithUniforms } from "three";
import { rng } from "../materials/textureGen";

/** Wall front faces and the floor's top (world space). Shared with Walls.tsx. */
export const SHELL = {
  backFaceZ: -4.925,
  leftFaceX: -4.925,
  floorTopY: 0.04,
} as const;

const GLSL_NOISE = /* glsl */ `
float rsHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float rsNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(rsHash(i), rsHash(i + vec2(1.0, 0.0)), u.x),
             mix(rsHash(i + vec2(0.0, 1.0)), rsHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float rsFbm(vec2 p) {
  return 0.5 * rsNoise(p) + 0.3 * rsNoise(p * 2.03 + 7.1) + 0.2 * rsNoise(p * 4.07 + 3.7);
}
float rsSegDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
`;

const GLSL_ROOM_AO = /* glsl */ `
// Soft occlusion from the two walls and the floor. Each surface skips its own
// plane (distance ~0 there) via the ROOM_SURF define.
float roomAO(vec3 p) {
  float dBack = max(p.z - (${SHELL.backFaceZ.toFixed(3)}), 0.0);
  float dLeft = max(p.x - (${SHELL.leftFaceX.toFixed(3)}), 0.0);
  float dFloor = max(p.y - ${SHELL.floorTopY.toFixed(3)}, 0.0);
  float ao = 1.0;
#if ROOM_SURF != 1
  ao *= 1.0 - 0.38 * exp(-dFloor / 0.32);
#endif
#if ROOM_SURF != 2
  ao *= 1.0 - 0.42 * exp(-dBack / 0.42);
#endif
#if ROOM_SURF != 3
  ao *= 1.0 - 0.42 * exp(-dLeft / 0.42);
#endif
  // Tight contact line right in the junction.
#if ROOM_SURF == 1
  ao *= 1.0 - 0.25 * exp(-min(dBack, dLeft) / 0.05);
#else
  ao *= 1.0 - 0.18 * exp(-dFloor / 0.05);
#endif
  return ao;
}
`;

const AO_APPLY = /* glsl */ `
#include <aomap_fragment>
{
  float rAO = roomAO(vRoomPos);
  reflectedLight.indirectDiffuse *= rAO;
  reflectedLight.indirectSpecular *= rAO;
  reflectedLight.directDiffuse *= mix(1.0, rAO, 0.45);
  reflectedLight.directSpecular *= mix(1.0, rAO, 0.6);
}
`;

function addWorldPosVarying(shader: WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vRoomPos;")
    .replace(
      "#include <project_vertex>",
      "#include <project_vertex>\nvRoomPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
}

function fragmentPrelude(surf: 1 | 2 | 3, extra = "") {
  return `#include <common>\n#define ROOM_SURF ${surf}\nvarying vec3 vRoomPos;\n${GLSL_NOISE}\n${GLSL_ROOM_AO}\n${extra}`;
}

// ---------------------------------------------------------------------------
// Floor

// The foundation's woodPlanks tile (1.2 m, isotropic) holds 6 boards of
// 0.2 m across U; each board column has two baked end joints, so its planks
// are only 0.4-0.8 m long. Real strip oak runs much longer, so the floor
// never samples across a baked end joint: each world board is split into
// runs of 1.0-2.2 m, and each run reads the longest joint-free stretch of a
// random source column, ping-ponged along the grain (mirroring along V is
// invisible for grain that runs along V). End joints then exist only at run
// boundaries, drawn as hairlines. The joint positions come from the same
// seeded rng the generator uses (materials/textureGen.ts, woodPlanks).
const WOOD_TILE_M = 1.2;
const WOOD_SEG_MARGIN = 0.02; // tile units kept clear of a baked joint (mip-safe)

function woodSegments(seed = 1) {
  const r = rng(seed);
  const start: number[] = [];
  const len: number[] = [];
  for (let b = 0; b < 6; b++) {
    // Mirrors woodPlanks(): j0, j1, then 2 x (tone, hue, ringOff, ringFreq).
    const j0 = r();
    const j1 = (j0 + 0.35 + r() * 0.3) % 1;
    for (let k = 0; k < 8; k++) r();
    const lo = Math.min(j0, j1);
    const hi = Math.max(j0, j1);
    const inner = hi - lo;
    const [s, l] = inner >= 0.5 ? [lo, inner] : [hi, 1 - inner];
    start.push(s + WOOD_SEG_MARGIN);
    len.push(l - 2 * WOOD_SEG_MARGIN);
  }
  const arr = (v: number[]) => `float[6](${v.map((x) => x.toFixed(5)).join(", ")})`;
  return { start: arr(start), len: arr(len) };
}
const WOOD_SEG = woodSegments();
/** Run length along a board (tile units): 1.6 m +- 0.6 m. */
const RUN_P = (1.6 / WOOD_TILE_M).toFixed(5);
const RUN_J = (0.3 / WOOD_TILE_M).toFixed(5);

const GLSL_FLOOR = /* glsl */ `
const float RS_SEG_A[6] = ${WOOD_SEG.start};
const float RS_SEG_L[6] = ${WOOD_SEG.len};
// Set once per fragment by roomBoardSetup().
vec2 rsBoardUv;
vec2 rsDx;
vec2 rsDy;
float rsBoard;
float rsRun;
float rsJointM;
float rsBound(float bi, float k) {
  return k * ${RUN_P} + (rsHash(vec2(bi + 0.37, k + 0.71)) - 0.5) * 2.0 * ${RUN_J};
}
void roomBoardSetup(vec2 uv) {
  float bu = uv.x * 6.0;
  float bi = floor(bu);
  float t = uv.y - rsHash(vec2(bi, 41.0)) * ${RUN_P};
  float k = floor(t / ${RUN_P});
  float b0 = rsBound(bi, k);
  float b1 = rsBound(bi, k + 1.0);
  if (t < b0) {
    k -= 1.0;
    b1 = b0;
    b0 = rsBound(bi, k);
  } else if (t >= b1) {
    k += 1.0;
    b0 = b1;
    b1 = rsBound(bi, k + 1.0);
  }
  float s = t - b0;
  rsJointM = min(s, b1 - t) * ${WOOD_TILE_M.toFixed(2)};
  vec2 rid = vec2(bi, k);
  int col = int(min(floor(rsHash(rid + vec2(17.0, 0.3)) * 6.0), 5.0));
  float a = RS_SEG_A[col];
  float L = RS_SEG_L[col];
  float x = mod(s + rsHash(rid + vec2(3.7, 9.1)) * 2.0 * L, 2.0 * L);
  rsBoardUv = vec2((float(col) + fract(bu)) / 6.0, a + L - abs(x - L));
  rsDx = dFdx(uv);
  rsDy = dFdy(uv);
  rsBoard = bi;
  rsRun = k;
}
vec4 roomFloorSample(sampler2D t, vec2 uv) {
  return textureGrad(t, rsBoardUv, rsDx, rsDy);
}
vec4 roomFloorBlur(sampler2D t) {
  return textureGrad(t, rsBoardUv, rsDx * 12.0, rsDy * 12.0);
}
// Worn lanes: open front -> desk chair, front -> rack, front -> beanbag.
float roomTraffic(vec2 p) {
  float d = rsSegDist(p, vec2(1.6, 5.4), vec2(2.2, 0.8));
  d = min(d, rsSegDist(p, vec2(2.2, 0.8), vec2(2.7, -2.3)));
  d = min(d, rsSegDist(p, vec2(2.2, 0.8), vec2(3.3, 1.9)));
  d = min(d, rsSegDist(p, vec2(0.4, 5.4), vec2(-1.8, 2.4)));
  float n = rsFbm(p * 1.7);
  float lane = 1.0 - smoothstep(0.25, 0.95 + n * 0.35, d);
  return lane * (0.55 + 0.45 * rsFbm(p * 5.3 + 11.0));
}
`;

// The tile's growth-ring bands and fibres are high-contrast and evenly
// spaced, which reads as ribbed composite decking. Pull 40% of the colour
// toward a board-scale blur (one extra, much coarser mip read) so the grain
// stays visible but quiet, as on finished oak.
const FLOOR_GRAIN_SOFTEN = /* glsl */ `
sampledDiffuseColor.rgb = mix(roomFloorBlur(map).rgb, sampledDiffuseColor.rgb, 0.6);
diffuseColor *= sampledDiffuseColor;
`;

const FLOOR_TINT = /* glsl */ `
{
  // The shared woodPlanks albedo is tuned warm for furniture; on a 10 m floor
  // under daylight it read as saturated orange laminate. Pull it ~28% toward
  // its luminance so it reads as natural oak.
  diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, 0.72);
  vec2 rid = vec2(rsBoard, rsRun);
  float bt = rsHash(rid + vec2(91.0, 0.5)) - 0.5;
  float bh = rsHash(rid + vec2(53.0, 0.5)) - 0.5;
  diffuseColor.rgb *= vec3(1.0 + bt * 0.1 + bh * 0.03, 1.0 + bt * 0.1, 1.0 + bt * 0.1 - bh * 0.05);
  // The baked side gaps (~2 mm) are already softened by the grain blend
  // above; lift a little more so they read as tight joints, not drawn lines.
  float seamAo = roomFloorSample(roughnessMap, vRoughnessMapUv).r;
  diffuseColor.rgb *= mix(1.0, 1.0 / max(seamAo, 0.35), 0.12);
  // Butt end joint at run boundaries: a ~1 mm hairline with eased edges,
  // coverage-filtered so it fades out instead of aliasing with distance.
  float fw = max(fwidth(vMapUv.y) * ${WOOD_TILE_M.toFixed(2)}, 1e-5);
  float cov = min(1.0, 0.0012 / fw) * (1.0 - smoothstep(0.0, fw + 0.0012, rsJointM));
  float ease = 1.0 - smoothstep(0.0, 0.004 + fw, rsJointM);
  diffuseColor.rgb *= (1.0 - 0.45 * cov) * (1.0 - 0.06 * ease);
  roomJoint = cov;
  float wearM = roomTraffic(vRoomPos.xz);
  vec3 lum = vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));
  // Worn finish: the wood itself looks lighter and a touch drier, not grey.
  diffuseColor.rgb = mix(diffuseColor.rgb, mix(lum, diffuseColor.rgb, 0.9) * vec3(1.12, 1.1, 1.06), wearM * 0.8);
  float edge = exp(-min(max(vRoomPos.z - (${SHELL.backFaceZ.toFixed(3)}), 0.0), max(vRoomPos.x - (${SHELL.leftFaceX.toFixed(3)}), 0.0)) / 0.12);
  diffuseColor.rgb *= 1.0 - edge * 0.12;
  roomWear = wearM;
  roomDust = edge;
}
`;

const floorChunk = (name: keyof typeof ShaderChunk) =>
  (ShaderChunk[name] as string).replace(/texture2D\(/g, "roomFloorSample(");

export function patchFloorMaterial(mat: Material) {
  mat.onBeforeCompile = (shader) => {
    addWorldPosVarying(shader);
    let fs = shader.fragmentShader.replace("#include <common>", fragmentPrelude(1, GLSL_FLOOR));
    fs = fs
      .replace("void main() {", "void main() {\nroomBoardSetup(vMapUv);\nfloat roomWear = 0.0;\nfloat roomDust = 0.0;\nfloat roomJoint = 0.0;")
      .replace(
        "#include <map_fragment>",
        floorChunk("map_fragment").replace("diffuseColor *= sampledDiffuseColor;", FLOOR_GRAIN_SOFTEN) + FLOOR_TINT,
      )
      .replace("#include <normal_fragment_maps>", floorChunk("normal_fragment_maps"))
      .replace(
        "#include <roughnessmap_fragment>",
        floorChunk("roughnessmap_fragment").replace(
          "roughnessFactor *= texelRoughness.g;",
          "roughnessFactor *= mix(roomFloorBlur(roughnessMap).g, texelRoughness.g, 0.6);",
        ) +
          "\nroughnessFactor = clamp(roughnessFactor + roomWear * 0.25 + roomDust * 0.12 + roomJoint * 0.2, 0.0, 1.0);",
      )
      .replace("#include <metalnessmap_fragment>", floorChunk("metalnessmap_fragment"))
      .replace(
        "#include <lights_physical_fragment>",
        "#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= 1.0 - roomWear * 0.7 - roomDust * 0.4;\n#endif",
      )
      .replace("#include <aomap_fragment>", floorChunk("aomap_fragment") + AO_APPLY.replace("#include <aomap_fragment>", ""));
    shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => "room-floor-v3";
}

// ---------------------------------------------------------------------------
// Walls (back = 2, left = 3). Trim along a wall (skirting) uses the same
// surface id with `mottle: false` so it skips its own wall's occlusion.

const WALL_MOTTLE = /* glsl */ `
#include <map_fragment>
{
#if ROOM_SURF == 3
  vec2 wp = vRoomPos.zy;
#else
  vec2 wp = vRoomPos.xy;
#endif
  float m = rsFbm(wp * 0.55 + float(ROOM_SURF) * 13.0) - 0.5;
  float m2 = rsFbm(wp * 2.3 + 5.0) - 0.5;
  diffuseColor.rgb *= 1.0 + m * 0.07 + m2 * 0.025;
  // Faint grey film settling toward the floor above the skirting.
  float low = exp(-max(vRoomPos.y - 0.2, 0.0) / 0.5);
  diffuseColor.rgb *= 1.0 - low * 0.06 * (0.6 + 0.8 * rsFbm(wp * vec2(3.0, 9.0)));
}
`;

export function patchWallMaterial(mat: Material, surf: 2 | 3, mottle = true) {
  mat.onBeforeCompile = (shader) => {
    addWorldPosVarying(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", fragmentPrelude(surf))
      .replace("#include <map_fragment>", mottle ? WALL_MOTTLE : "#include <map_fragment>")
      .replace("#include <aomap_fragment>", AO_APPLY);
  };
  mat.customProgramCacheKey = () => `room-wall-v1-${surf}-${mottle ? 1 : 0}`;
}

// ---------------------------------------------------------------------------
// Rug

const RUG_ANGLE = 0.62;
const GLSL_RUG_SAMPLE = /* glsl */ `
const mat2 RUG_ROT = mat2(${Math.cos(RUG_ANGLE).toFixed(5)}, ${Math.sin(RUG_ANGLE).toFixed(5)}, ${(-Math.sin(RUG_ANGLE)).toFixed(5)}, ${Math.cos(RUG_ANGLE).toFixed(5)});
float rugW;
vec2 rugUv2(vec2 uv) {
  return RUG_ROT * (uv * 0.73) + vec2(0.31, 0.57);
}
vec4 rugSample(sampler2D t, vec2 uv) {
  return mix(texture2D(t, uv), texture2D(t, rugUv2(uv)), rugW);
}
vec4 rugSampleBlur(sampler2D t, vec2 uv) {
  return mix(texture(t, uv, 4.0), texture(t, rugUv2(uv), 4.0), rugW);
}
vec3 rugNormal(sampler2D t, vec2 uv) {
  vec3 a = texture2D(t, uv).xyz * 2.0 - 1.0;
  vec3 b = texture2D(t, rugUv2(uv)).xyz * 2.0 - 1.0;
  // The second read is rotated in UV; turn its slope back into this frame.
  b.xy = transpose(RUG_ROT) * b.xy;
  return mix(a, b, rugW);
}
`;

export interface RugDesign {
  /** Base pile colour (sRGB hex); the material's `color` should be this. */
  readonly base: string;
  /** Ring colour (sRGB hex). */
  readonly ring: string;
  /** [inner, outer] radius (m) of each ring band. */
  readonly rings: readonly (readonly [number, number])[];
  /** Outer radius (m). */
  readonly radius: number;
}

export function patchRugMaterial(mat: Material, design: RugDesign, edge: boolean) {
  const base = new Color(design.base);
  const ring = new Color(design.ring);
  const ratio = new Color(ring.r / base.r, ring.g / base.g, ring.b / base.b);
  const ringsGlsl = design.rings
    .map(([a, b]) => `m = max(m, smoothstep(${(a - 0.012).toFixed(3)}, ${(a + 0.008).toFixed(3)}, r) * (1.0 - smoothstep(${(b - 0.008).toFixed(3)}, ${(b + 0.012).toFixed(3)}, r)));`)
    .join("\n");
  // Break the weave's regular dot grid: every texture read blends the tile
  // with a second read at another scale and angle, weighted by low-frequency
  // noise, so the loops read as irregular tufted pile instead of a screen.
  const rugChunk = (name: keyof typeof ShaderChunk) => (ShaderChunk[name] as string).replace(/texture2D\(/g, "rugSample(");
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRugRingRatio = { value: ratio };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vRugP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRugP = position.xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec2 vRugP;\nuniform vec3 uRugRingRatio;\n${GLSL_NOISE}\n${GLSL_RUG_SAMPLE}`)
      .replace("void main() {", "void main() {\nrugW = 0.3 + 0.4 * rsFbm(vRugP * 2.2 + 1.7);")
      .replace("#include <roughnessmap_fragment>", rugChunk("roughnessmap_fragment"))
      .replace("#include <aomap_fragment>", rugChunk("aomap_fragment"))
      .replace(
        "#include <normal_fragment_maps>",
        (ShaderChunk.normal_fragment_maps as string).replace(
          "vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;",
          "vec3 mapN = rugNormal( normalMap, vNormalMapUv );",
        ),
      )
      .replace(
        "#include <map_fragment>",
        rugChunk("map_fragment").replace(
          "diffuseColor *= sampledDiffuseColor;",
          // Halve the weave's thread/gap contrast around its local mean (a
          // coarse mip read): tufted pile
          // hides the backing grid that a flat weave shows.
          "diffuseColor *= vec4(mix(rugSampleBlur(map, vMapUv).rgb, sampledDiffuseColor.rgb, 0.5), sampledDiffuseColor.a);",
        ) +
          /* glsl */ `
{
  float ang = atan(vRugP.y, vRugP.x);
  // Hand-made wobble: rings drift a few mm, as on a real tufted rug.
  float r = length(vRugP) + (rsNoise(vec2(ang * 6.0, 1.3)) - 0.5) * 0.012 + (rsNoise(vRugP * 9.0) - 0.5) * 0.004;
  float m = 0.0;
  ${ringsGlsl}
  diffuseColor.rgb *= mix(vec3(1.0), uRugRingRatio, m);
  // Pile shading: brushed patches read lighter/darker; slight dye variation.
  float shade = rsFbm(vRugP * 1.4 + 3.0) - 0.5;
  float dye = rsFbm(vRugP * 4.5 + 9.0) - 0.5;
  diffuseColor.rgb *= 1.0 + shade * 0.10 + dye * 0.04;
  // Bound edge: a slightly darker, denser cord around the rim.
  diffuseColor.rgb *= 1.0 - 0.12 * smoothstep(${(design.radius - 0.05).toFixed(3)}, ${(design.radius - 0.01).toFixed(3)}, length(vRugP));
}
`,
      );
  };
  mat.customProgramCacheKey = () => `room-rug-v3-${edge ? 1 : 0}-${design.rings.length}`;
}

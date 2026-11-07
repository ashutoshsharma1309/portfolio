// Social photo frames on the back wall (github / linkedin / leetcode /
// codeforces). Each is a real picture frame: a mitred walnut moulding swept
// around the opening (grain turns at the 45° corners), a bevel-cut mat board,
// the brand-colour print with its white icon (rendered from the SAME inline
// SVG markup into a texture so it's lit and sits under the glass), and a glass
// sheet that only adds reflections + a faint glare streak. A soft contact
// shadow on the wall grounds each frame. Hover: smooth tilt/scale + a subtle
// warm highlight; click opens the profile, exactly as before.

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useSpring, animated } from "@react-spring/three";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type BufferGeometry,
} from "three";
import { SOCIAL_LINKS, type SocialKey } from "../../config/links";
import { useHotspotHover } from "../../hooks/useHotspotHover";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useRoomQuality } from "./quality";
import { applyHoverEmissive, createPlastic, useDisposable, useHoverMix } from "./materials";
import { createWalnut } from "./decor/decorMaterials";
import { mitredFrameGeometry, type ProfilePt } from "./decor/decorGeometry";
import { useDecorTextures } from "./decor/decorTextures";

interface FrameDef {
  key: SocialKey;
  label: string;
  icon: string; // SVG markup
  bg: string;
}

// Inline SVG icons (white-on-color)
const FRAMES: FrameDef[] = [
  {
    key: "github",
    label: "GitHub",
    bg: "#1a1a1a",
    icon: `<svg viewBox="0 0 24 24" width="40" height="40" fill="white"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.16-.02-2.1-3.2.69-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    bg: "#0a66c2",
    icon: `<svg viewBox="0 0 24 24" width="40" height="40" fill="white"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>`,
  },
  {
    key: "leetcode",
    label: "LeetCode",
    bg: "#ffa116",
    icon: `<svg viewBox="0 0 24 24" width="40" height="40" fill="white"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>`,
  },
  {
    key: "codeforces",
    label: "Codeforces",
    bg: "#1f5fbf",
    icon: `<svg viewBox="0 0 24 24" width="40" height="40" fill="white"><path d="M4.5 7.5C5.328 7.5 6 8.172 6 9v10.5c0 .828-.672 1.5-1.5 1.5h-3C.672 21 0 20.328 0 19.5V9c0-.828.672-1.5 1.5-1.5h3zm9-4.5c.828 0 1.5.672 1.5 1.5v15c0 .828-.672 1.5-1.5 1.5h-3c-.828 0-1.5-.672-1.5-1.5v-15c0-.828.672-1.5 1.5-1.5h3zm9 7.5c.828 0 1.5.672 1.5 1.5v7.5c0 .828-.672 1.5-1.5 1.5h-3c-.828 0-1.5-.672-1.5-1.5V12c0-.828.672-1.5 1.5-1.5h3z"/></svg>`,
  },
];

// --- Physical build (metres) ------------------------------------------------
const OUTER = 0.85; // same footprint as before
const MOULD_W = 0.062;
const OPENING = OUTER - 2 * MOULD_W; // 0.726
const MAT_BORDER = 0.0835;
const WINDOW = OPENING - 2 * MAT_BORDER; // ≈ 0.559
const PRINT = WINDOW + 0.014;
/** Group origin sits 5 mm in front of the wall plaster. */
const BACK_Z = -0.005;

/** Walnut moulding cross-section: [inset from outer edge, height off wall]. */
const MOULDING: ProfilePt[] = [
  [0, 0],
  [0, 0.032],
  [0.003, 0.0395],
  [0.01, 0.0425],
  [0.03, 0.0425],
  [0.042, 0.039],
  [0.05, 0.032],
  [0.056, 0.03],
  [0.06, 0.03],
  [0.062, 0.027],
  [0.062, 0.018],
];
/** Mat board with a 45° bevel cut into the white core. */
const MAT: ProfilePt[] = [
  [0, 0.017],
  [MAT_BORDER - 0.0055, 0.017],
  [MAT_BORDER, 0.0128],
];
const GLASS_Z = 0.0205;
const PRINT_Z = 0.0125;

interface SharedDecor {
  moulding: BufferGeometry;
  mat: BufferGeometry;
  plane: PlaneGeometry;
  matMat: MeshStandardMaterial;
  glassMat: MeshStandardMaterial;
  shadowMat: MeshBasicMaterial;
}

// Rendered as a child of the BackWall group, so coordinates are LOCAL to the
// wall. Wall center is at world (0, WALL_HEIGHT/2, -ROOM_HALF). The wall is
// 0.15 thick, so its front face is at local z=+0.075. Frames sit just in
// front at local z=+0.08.
export function PhotoFrames() {
  const q = useRoomQuality();
  const glare = useDecorTextures("glare", 256, q.anisotropy);
  const soft = useDecorTextures("softShadow", 128, q.anisotropy);

  const geo = useDisposable(
    () => ({
      moulding: mitredFrameGeometry(OUTER, OUTER, MOULDING, {
        hard: [1, 9],
        uOffsets: [0.03, 0.17, 0.31, 0.43],
      }),
      mat: mitredFrameGeometry(OPENING, OPENING, MAT, { hard: [1] }),
      plane: new PlaneGeometry(1, 1),
    }),
    [],
  );
  const mats = useDisposable(
    () => ({
      matMat: createPlastic(q, { color: "#f1ece2", roughness: 0.85, widthM: OPENING, heightM: OPENING, normalScale: 0.3 }),
      glassMat: new MeshStandardMaterial({
        color: "#000000",
        roughness: 0.09,
        metalness: 0,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        emissive: new Color("#ffffff"),
        emissiveMap: glare.emissiveMap ?? null,
        emissiveIntensity: 0.035,
        envMapIntensity: 0.6,
      }),
      shadowMat: new MeshBasicMaterial({
        color: "#120c08",
        transparent: true,
        opacity: 0.42,
        alphaMap: soft.alphaMap ?? null,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    }),
    [q, glare, soft],
  );
  // Mat, print and glass sit 13–21 mm off the plaster: pull them forward in
  // depth so low-precision depth buffers can't z-fight them with the wall.
  for (const m of [mats.matMat, mats.glassMat]) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -3;
    m.polygonOffsetUnits = -3;
  }
  const shared: SharedDecor = { ...geo, ...mats };

  return (
    <group position={[-1.6, 0.3, 0.08]}>
      {FRAMES.map((f, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = -0.55 + col * 1.1;
        const y = 0.55 - row * 1.1;
        return <Frame key={f.key} def={f} position={[x, y, 0]} shared={shared} />;
      })}
    </group>
  );
}

/** Brand-colour print with the frame's own inline SVG icon drawn on it. */
function usePrintTexture(def: FrameDef) {
  const tex = useMemo(() => {
    const S = 512;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = def.bg;
      ctx.fillRect(0, 0, S, S);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearMipmapLinearFilter;
    t.magFilter = LinearFilter;
    t.anisotropy = 4;
    return t;
  }, [def]);

  useEffect(() => {
    let alive = true;
    const c = tex.image as HTMLCanvasElement;
    const ctx = c.getContext("2d");
    const img = new Image();
    // Same markup as before, just rasterised large for a crisp print.
    // (an <img> source needs the SVG namespace; the inline markup omits it)
    const svg = def.icon
      .replace('width="40" height="40"', 'width="512" height="512"')
      .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    img.onload = () => {
      if (!alive || !ctx) return;
      const S = c.width;
      const icon = S * 0.46;
      ctx.drawImage(img, (S - icon) / 2, (S - icon) / 2, icon, icon);
      // faint print vignette / paper falloff
      const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.12)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      tex.needsUpdate = true;
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return () => {
      alive = false;
      img.onload = null;
    };
  }, [tex, def]);

  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Frame({
  def,
  position,
  shared,
}: {
  def: FrameDef;
  position: [number, number, number];
  shared: SharedDecor;
}) {
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover(`frame-${def.key}`);
  const reducedMotion = usePrefersReducedMotion();
  const q = useRoomQuality();
  const mix = useHoverMix(hovered);
  const print = usePrintTexture(def);
  const walnut = useDecorTextures("walnut", q.textureSize, q.anisotropy);

  // Smooth (no wobble) scale + 5° tilt toward the camera on hover. The frame
  // hangs ~5 mm off the plaster, so it also lifts off the wall while tilting
  // (sin 5° × 0.425 m × 1.08 ≈ 40 mm swing-back at the right edge) — no clipping.
  const { scale, rotY, posZ } = useSpring({
    scale: hovered ? 1.08 : 1,
    rotY: hovered ? (Math.PI / 180) * 5 : 0,
    posZ: hovered ? 0.05 : 0,
    config: { tension: 200, friction: 24 },
    immediate: reducedMotion,
  });

  const mats = useDisposable(
    () => ({
      wood: createWalnut(q, walnut, { color: "#d8cfc8", clearcoat: 0.22 }),
      print: new MeshStandardMaterial({
        map: print,
        roughness: 0.42,
        metalness: 0,
        emissive: new Color("#ffffff"),
        emissiveMap: print,
        emissiveIntensity: 0.06,
        envMapIntensity: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
    }),
    [q, print, walnut],
  );

  useFrame(() => {
    const m = mix.current;
    applyHoverEmissive(mats.wood, m, undefined, 0.05);
    // the print brightens slightly on hover (old photoGlow 0.25 → 0.6)
    mats.print.emissiveIntensity = 0.06 + m * 0.2;
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    window.open(SOCIAL_LINKS[def.key], "_blank", "noopener,noreferrer");
  };

  return (
    <group position={position}>
      {/* Soft contact shadow on the plaster (sun is upper-right). Stays on the
          wall while the frame lifts on hover. */}
      <mesh
        geometry={shared.plane}
        material={shared.shadowMat}
        position={[-0.014, -0.022, BACK_Z + 0.0015]}
        scale={[OUTER / 0.8, OUTER / 0.8, 1]}
      />
    <animated.group position-z={posZ} scale={scale} rotation-y={rotY}>
      {/* Invisible enlarged tap target — sits in front of the visible frame
          and absorbs touch events with extra margin (1.4× geometry). */}
      <mesh position={[0, 0, 0.08]} onPointerOver={onPointerOver} onPointerOut={onPointerOut} onClick={handleClick}>
        <boxGeometry args={[1.2, 1.2, 0.18]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <group position={[0, 0, BACK_Z]}>
        {/* Mitred walnut moulding */}
        <mesh
          geometry={shared.moulding}
          material={mats.wood}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onClick={handleClick}
        />
        {/* Bevel-cut mat board */}
        <mesh geometry={shared.mat} material={shared.matMat} />
        {/* Print (brand colour + icon) */}
        <mesh geometry={shared.plane} material={mats.print} position={[0, 0, PRINT_Z]} scale={[PRINT, PRINT, 1]} />
        {/* Glass: reflections + faint glare only */}
        <mesh
          geometry={shared.plane}
          material={shared.glassMat}
          position={[0, 0, GLASS_Z]}
          scale={[OPENING, OPENING, 1]}
          renderOrder={2}
        />
      </group>
    </animated.group>
    </group>
  );
}

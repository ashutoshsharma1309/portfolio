import { Html } from "@react-three/drei";
import { useSpring, animated, config } from "@react-spring/three";
import { SOCIAL_LINKS, type SocialKey } from "../../config/links";
import { useHotspotHover } from "../../hooks/useHotspotHover";

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

// Rendered as a child of the BackWall group, so coordinates are LOCAL to the
// wall. Wall center is at world (0, WALL_HEIGHT/2, -ROOM_HALF). The wall is
// 0.15 thick, so its front face is at local z=+0.075. Frames sit just in
// front at local z=+0.08.
export function PhotoFrames() {
  return (
    <group position={[-1.6, 0.3, 0.08]}>
      {FRAMES.map((f, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = -0.55 + col * 1.1;
        const y = 0.55 - row * 1.1;
        return <Frame key={f.key} def={f} position={[x, y, 0]} />;
      })}
    </group>
  );
}

function Frame({
  def,
  position,
}: {
  def: FrameDef;
  position: [number, number, number];
}) {
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover(`frame-${def.key}`);

  // Spring-driven scale, Y-rotation tilt, and emissive glow on hover.
  const { scale, rotY, glow, photoGlow } = useSpring({
    scale: hovered ? 1.08 : 1,
    rotY: hovered ? (Math.PI / 180) * 5 : 0, // 5° tilt toward camera
    glow: hovered ? 0.6 : 0,
    photoGlow: hovered ? 0.6 : 0.25,
    config: config.wobbly,
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    window.open(SOCIAL_LINKS[def.key], "_blank", "noopener,noreferrer");
  };

  return (
    <animated.group
      position={position}
      scale={scale}
      rotation-y={rotY}
    >
      {/* Invisible enlarged tap target — sits in front of the visible frame
          and absorbs touch events with extra margin (1.4× geometry). */}
      <mesh
        position={[0, 0, 0.08]}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[1.2, 1.2, 0.18]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Outer frame */}
      <mesh
        castShadow
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[0.85, 0.85, 0.06]} />
        <animated.meshStandardMaterial
          color="#f4ead2"
          emissive="#f4b942"
          emissiveIntensity={glow}
          roughness={0.5}
        />
      </mesh>
      {/* Colored "photo" inset */}
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[0.7, 0.7]} />
        <animated.meshStandardMaterial
          color={def.bg}
          emissive={def.bg}
          emissiveIntensity={photoGlow}
        />
      </mesh>
      {/* Icon as Html overlay so it stays crisp */}
      <Html
        position={[0, 0, 0.041]}
        center
        transform
        distanceFactor={2.0}
        style={{ pointerEvents: "none" }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: def.icon }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "scale(2.5)",
            pointerEvents: "none",
          }}
        />
      </Html>
    </animated.group>
  );
}

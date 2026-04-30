import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, MeshStandardMaterial } from "three";
import { useSceneStore } from "../../store/useSceneStore";
import { useHotspotHover } from "../../hooks/useHotspotHover";

const POST = "#0e0e0e";
const ACCENT = "#c8221a";
const PLATE_RED = "#c8221a";
const PLATE_BLUE = "#1f5fbf";
const SILVER = "#c0c0c0";

export function PowerliftingRack() {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover("rack");
  const glow = hovered ? 0.55 : 0.0;

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHotspot("rack");
  };

  // Rack sits at +x side (right), against the back wall area.
  return (
    <group
      position={[3.4, 0, 2.2]}
      rotation={[0, Math.PI / 4, 0]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={handleClick}
    >
      {/* Invisible enlarged tap target wrapping the whole rack volume.
          Easier to land a finger on than the thin posts. */}
      <mesh position={[0, 1.4, 0.3]}>
        <boxGeometry args={[2.8, 2.8, 1.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Posts (left & right), tall thin boxes */}
      <Post x={-0.7} glow={glow} />
      <Post x={0.7} glow={glow} />

      {/* Top crossbar */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[1.55, 0.1, 0.12]} />
        <meshStandardMaterial color={POST} roughness={0.6} />
      </mesh>

      {/* Bottom safety bars */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[1.55, 0.08, 0.12]} />
        <meshStandardMaterial color={ACCENT} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.18, 0.7]} castShadow>
        <boxGeometry args={[1.55, 0.08, 0.12]} />
        <meshStandardMaterial color={ACCENT} roughness={0.6} />
      </mesh>

      {/* J-hooks at chest height (1.0 m) — bench height */}
      <JHook position={[-0.62, 1.0, 0]} side={-1} />
      <JHook position={[0.62, 1.0, 0]} side={1} />

      {/* J-hooks at squat height (1.55 m) — visible accent */}
      <JHook position={[-0.62, 1.55, 0]} side={-1} accent />
      <JHook position={[0.62, 1.55, 0]} side={1} accent />

      {/* Barbell on the squat-height hooks */}
      <Barbell y={1.6} />

      {/* Bench inside the rack */}
      <group position={[0, 0, 0]}>
        {/* Bench pad */}
        <mesh position={[0, 0.45, 0.05]} castShadow>
          <boxGeometry args={[1.4, 0.12, 0.34]} />
          <meshStandardMaterial color="#0e0e0e" roughness={0.7} />
        </mesh>
        {/* Bench legs */}
        <mesh position={[-0.55, 0.2, 0.05]}>
          <boxGeometry args={[0.06, 0.4, 0.32]} />
          <meshStandardMaterial color={ACCENT} />
        </mesh>
        <mesh position={[0.55, 0.2, 0.05]}>
          <boxGeometry args={[0.06, 0.4, 0.32]} />
          <meshStandardMaterial color={ACCENT} />
        </mesh>
      </group>

      {/* Two dumbbells next to the rack */}
      <Dumbbell position={[1.3, 0.18, 0.6]} />
      <Dumbbell position={[1.55, 0.18, 0.95]} />

      {/* Rotating display disc beneath the rack — only the disc spins,
          the rack/barbell/bench/dumbbells above stay static. */}
      <RotatingDisc />

      {/* Hover glow indicator */}
      {hovered && (
        <pointLight position={[0, 1.5, 0.4]} intensity={1.2} distance={2.5} color="#ffd766" />
      )}
    </group>
  );
}

// Flat dark disc with a thin glowing red rim. Rotates around its own Y-axis
// at 0.25 rad/sec. The rim's emissive intensity also pulses on a 4s sine.
function RotatingDisc() {
  const ref = useRef<Group>(null);
  const rimMatRef = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.y = t * 0.25;
    }
    if (rimMatRef.current) {
      // Pulse 0.6 -> 1.4 over a ~4s cycle.
      const k = 0.5 + 0.5 * Math.sin((t / 4) * Math.PI * 2);
      rimMatRef.current.emissiveIntensity = 0.6 + k * 0.8;
    }
  });

  return (
    <group ref={ref}>
      {/* Disc body (dark matte cylinder) */}
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <cylinderGeometry args={[1.35, 1.35, 0.05, 48]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Glowing red rim — torus on top of the disc */}
      <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.32, 0.025, 12, 64]} />
        <meshStandardMaterial
          ref={rimMatRef}
          color="#330505"
          emissive="#ff2a2a"
          emissiveIntensity={1.0}
          roughness={0.4}
        />
      </mesh>
      {/* A few asymmetric notches so the rotation is visible */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.1, 0.052, Math.sin(a) * 1.1]}
          >
            <boxGeometry args={[0.06, 0.012, 0.18]} />
            <meshStandardMaterial
              color="#1a1a1a"
              emissive="#ff2a2a"
              emissiveIntensity={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Post({ x, glow }: { x: number; glow: number }) {
  return (
    <group position={[x, 1.25, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.16, 2.5, 0.16]} />
        <meshStandardMaterial
          color={POST}
          emissive={"#f4b942"}
          emissiveIntensity={glow}
          roughness={0.6}
        />
      </mesh>
      {/* Red accent stripe */}
      <mesh position={[0, 0, 0.085]}>
        <boxGeometry args={[0.04, 2.3, 0.005]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function JHook({
  position,
  side,
  accent = false,
}: {
  position: [number, number, number];
  side: number;
  accent?: boolean;
}) {
  return (
    <group position={position}>
      <mesh position={[side * 0.06, 0, 0]}>
        <boxGeometry args={[0.18, 0.06, 0.1]} />
        <meshStandardMaterial color={accent ? ACCENT : POST} />
      </mesh>
      <mesh position={[side * 0.14, 0.04, 0]}>
        <boxGeometry args={[0.04, 0.14, 0.1]} />
        <meshStandardMaterial color={accent ? ACCENT : POST} />
      </mesh>
    </group>
  );
}

function Barbell({ y }: { y: number }) {
  return (
    <group position={[0, y, 0]}>
      {/* Bar */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 2.2, 16]} />
        <meshStandardMaterial color={SILVER} metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Plates left side */}
      <PlateStack x={-0.85} />
      {/* Plates right side */}
      <PlateStack x={0.85} flip />
    </group>
  );
}

function PlateStack({ x, flip = false }: { x: number; flip?: boolean }) {
  const dir = flip ? -1 : 1;
  return (
    <group position={[x, 0, 0]}>
      {/* 45 lb red */}
      <mesh
        position={[dir * 0.05, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.22, 0.22, 0.06, 24]} />
        <meshStandardMaterial color={PLATE_RED} roughness={0.55} />
      </mesh>
      {/* 25 lb blue */}
      <mesh
        position={[dir * 0.12, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.16, 0.16, 0.05, 24]} />
        <meshStandardMaterial color={PLATE_BLUE} roughness={0.55} />
      </mesh>
      {/* Collar */}
      <mesh
        position={[dir * 0.18, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
        <meshStandardMaterial color={SILVER} metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Dumbbell({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0.3, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.32, 12]} />
        <meshStandardMaterial color={SILVER} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.18, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
    </group>
  );
}

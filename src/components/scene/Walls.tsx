import { useMemo, type ReactNode } from "react";

const ROOM_HALF = 5;
const WALL_HEIGHT = 5;
const FLOOR_SIZE = ROOM_HALF * 2;
const BACK_WALL_Z = -ROOM_HALF;
// Front face of the back wall (the wall is a thin box centered at z=-ROOM_HALF
// with thickness 0.15 — its front face is at z=-ROOM_HALF + 0.075).
const BACK_WALL_FRONT_Z_OFFSET = 0.075;

function FloorPlanks() {
  const planks = useMemo(() => {
    const result: { x: number; z: number; w: number; d: number; tone: number }[] = [];
    const plankWidth = 0.55;
    const plankLength = FLOOR_SIZE;
    const count = Math.ceil(FLOOR_SIZE / plankWidth);
    for (let i = 0; i < count; i++) {
      const x = -FLOOR_SIZE / 2 + i * plankWidth + plankWidth / 2;
      result.push({
        x,
        z: 0,
        w: plankWidth - 0.02,
        d: plankLength,
        tone: 0.85 + ((i * 37) % 30) / 100,
      });
    }
    return result;
  }, []);

  return (
    <group>
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial color="#5c4530" roughness={0.95} />
      </mesh>
      {planks.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, 0.02, p.z]}
          receiveShadow
          castShadow={false}
        >
          <boxGeometry args={[p.w, 0.04, p.d]} />
          <meshStandardMaterial
            color={`rgb(${Math.floor(139 * p.tone)}, ${Math.floor(107 * p.tone)}, ${Math.floor(71 * p.tone)})`}
            roughness={0.78}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

// Back wall is a group so children (e.g. PhotoFrames) can be parented to it
// and use local coordinates. Center is at world (0, WALL_HEIGHT/2, -ROOM_HALF).
export function BackWall({ children }: { children?: ReactNode }) {
  return (
    <group position={[0, WALL_HEIGHT / 2, BACK_WALL_Z]}>
      <mesh receiveShadow>
        <boxGeometry args={[FLOOR_SIZE, WALL_HEIGHT, 0.15]} />
        <meshStandardMaterial color="#d4c5a9" roughness={0.95} />
      </mesh>
      {/* Baseboard trim on this wall */}
      <mesh position={[0, -WALL_HEIGHT / 2 + 0.12, 0.1]}>
        <boxGeometry args={[FLOOR_SIZE, 0.22, 0.04]} />
        <meshStandardMaterial color="#f4ead2" roughness={0.7} />
      </mesh>
      {children}
    </group>
  );
}

export function LeftWall({ children }: { children?: ReactNode }) {
  return (
    <group position={[-ROOM_HALF, WALL_HEIGHT / 2, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[0.15, WALL_HEIGHT, FLOOR_SIZE]} />
        <meshStandardMaterial color="#cdba9a" roughness={0.95} />
      </mesh>
      <mesh position={[0.1, -WALL_HEIGHT / 2 + 0.12, 0]}>
        <boxGeometry args={[0.04, 0.22, FLOOR_SIZE]} />
        <meshStandardMaterial color="#f4ead2" roughness={0.7} />
      </mesh>
      {children}
    </group>
  );
}

export function Walls() {
  return <FloorPlanks />;
}

export const ROOM_DIMS = {
  ROOM_HALF,
  WALL_HEIGHT,
  FLOOR_SIZE,
  BACK_WALL_FRONT_Z_OFFSET,
};

import { useMemo } from "react";

const ROOM_HALF = 5;
const WALL_HEIGHT = 5;
const FLOOR_SIZE = ROOM_HALF * 2;

// Procedural wood floor: a series of plank-shaped boxes lying flat.
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
      {/* Dark base under the planks (so plank gaps look dark) */}
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

export function Walls() {
  return (
    <group>
      <FloorPlanks />

      {/* Back wall (along -z) — open at the top */}
      <mesh
        position={[0, WALL_HEIGHT / 2, -ROOM_HALF]}
        receiveShadow
      >
        <boxGeometry args={[FLOOR_SIZE, WALL_HEIGHT, 0.15]} />
        <meshStandardMaterial color="#d4c5a9" roughness={0.95} />
      </mesh>

      {/* Left wall (along -x) */}
      <mesh
        position={[-ROOM_HALF, WALL_HEIGHT / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[0.15, WALL_HEIGHT, FLOOR_SIZE]} />
        <meshStandardMaterial color="#cdba9a" roughness={0.95} />
      </mesh>

      {/* Baseboard trim — back */}
      <mesh position={[0, 0.12, -ROOM_HALF + 0.1]}>
        <boxGeometry args={[FLOOR_SIZE, 0.22, 0.04]} />
        <meshStandardMaterial color="#f4ead2" roughness={0.7} />
      </mesh>
      {/* Baseboard trim — left */}
      <mesh position={[-ROOM_HALF + 0.1, 0.12, 0]}>
        <boxGeometry args={[0.04, 0.22, FLOOR_SIZE]} />
        <meshStandardMaterial color="#f4ead2" roughness={0.7} />
      </mesh>
    </group>
  );
}

export const ROOM_DIMS = { ROOM_HALF, WALL_HEIGHT, FLOOR_SIZE };

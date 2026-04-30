// 2-drawer cabinet next to the desk.

const BLACK = "#1a1a1a";

export function DrawerUnit() {
  return (
    <group position={[-0.4, 0, -4.3]}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 1.0, 0.7]} />
        <meshStandardMaterial color={BLACK} roughness={0.55} />
      </mesh>
      {/* Top */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[0.74, 0.04, 0.74]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} />
      </mesh>
      {/* Drawer 1 face */}
      <mesh position={[0, 0.7, 0.36]}>
        <boxGeometry args={[0.6, 0.32, 0.02]} />
        <meshStandardMaterial color="#262626" roughness={0.55} />
      </mesh>
      {/* Drawer 1 handle */}
      <mesh position={[0, 0.7, 0.38]}>
        <boxGeometry args={[0.18, 0.03, 0.02]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Drawer 2 face */}
      <mesh position={[0, 0.32, 0.36]}>
        <boxGeometry args={[0.6, 0.32, 0.02]} />
        <meshStandardMaterial color="#262626" roughness={0.55} />
      </mesh>
      {/* Drawer 2 handle */}
      <mesh position={[0, 0.32, 0.38]}>
        <boxGeometry args={[0.18, 0.03, 0.02]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Decorative item on top — small stack of books */}
      <mesh position={[0.1, 1.1, 0.05]} castShadow>
        <boxGeometry args={[0.32, 0.06, 0.22]} />
        <meshStandardMaterial color="#a23a2a" />
      </mesh>
      <mesh position={[0.05, 1.16, 0.07]} castShadow>
        <boxGeometry args={[0.32, 0.06, 0.22]} />
        <meshStandardMaterial color="#2d4a8a" />
      </mesh>
    </group>
  );
}

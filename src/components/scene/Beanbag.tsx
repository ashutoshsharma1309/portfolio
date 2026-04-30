// Navy beanbag with mustard cushion + small round side table. (No Rubik's, no chess.)

export function Beanbag() {
  return (
    <group>
      {/* Beanbag — squashed sphere */}
      <group position={[-2.6, 0.5, 1.6]}>
        <mesh castShadow receiveShadow scale={[1.15, 0.7, 1.15]}>
          <sphereGeometry args={[0.85, 24, 24]} />
          <meshStandardMaterial
            color="#1e3a5f"
            roughness={0.95}
            metalness={0}
          />
        </mesh>
        {/* Top dimple — slightly darker disc */}
        <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.45, 24]} />
          <meshStandardMaterial color="#152a47" roughness={0.95} />
        </mesh>
        {/* Mustard cushion */}
        <mesh position={[0.15, 0.55, 0.15]} castShadow>
          <boxGeometry args={[0.7, 0.18, 0.55]} />
          <meshStandardMaterial color="#d4a847" roughness={0.85} />
        </mesh>
      </group>

      {/* Small round side table */}
      <group position={[-3.6, 0, 2.4]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.78, 12]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.04, 24]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
        </mesh>
        {/* Tripod base */}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.18, 0.04, Math.sin(a) * 0.18]}
              rotation={[0, -a, 0]}
            >
              <boxGeometry args={[0.4, 0.04, 0.05]} />
              <meshStandardMaterial color="#2a2a2a" />
            </mesh>
          );
        })}
        {/* A small mug on the table */}
        <mesh position={[0.1, 0.86, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.12, 16]} />
          <meshStandardMaterial color="#fff" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// Round beige rug in the center.

export function Rug() {
  return (
    <group position={[0.5, 0.05, 0.4]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.0, 48]} />
        <meshStandardMaterial color="#e8d8b8" roughness={0.95} />
      </mesh>
      {/* Inner ring (slightly darker) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[1.5, 1.6, 48]} />
        <meshStandardMaterial color="#c9b48d" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
        <ringGeometry args={[1.0, 1.08, 48]} />
        <meshStandardMaterial color="#c9b48d" roughness={0.95} />
      </mesh>
    </group>
  );
}

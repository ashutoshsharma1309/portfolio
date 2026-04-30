// Window mounted on the back wall, right side.
// Coordinates are LOCAL to the BackWall group (world center: 0, 2.5, -5).

const FRAME_COLOR = "#f6f1e7";

export function Window() {
  const x = 3.2;     // local x relative to wall center
  const y = 0.1;     // ~world y 2.6 (wall center y is 2.5)
  const z = 0.08;    // just in front of wall front face
  const w = 2.4;
  const h = 2.2;
  const t = 0.06;

  return (
    <group position={[x, y, z]}>
      {/* Sky-blue gradient glass — emissive plane */}
      <mesh>
        <planeGeometry args={[w - 0.2, h - 0.2]} />
        <meshStandardMaterial
          color="#aedcff"
          emissive="#cfe9ff"
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      {/* Subtle clouds — small low-emissive plane on top */}
      <mesh position={[0, 0.4, 0.001]}>
        <planeGeometry args={[w - 0.4, 0.5]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.4}
          roughness={0.3}
          opacity={0.55}
          transparent
        />
      </mesh>

      {/* Frame — top */}
      <mesh position={[0, h / 2, 0.04]} castShadow>
        <boxGeometry args={[w, 0.18, t]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} />
      </mesh>
      {/* Frame — bottom */}
      <mesh position={[0, -h / 2, 0.04]} castShadow>
        <boxGeometry args={[w, 0.18, t]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} />
      </mesh>
      {/* Frame — left */}
      <mesh position={[-w / 2, 0, 0.04]} castShadow>
        <boxGeometry args={[0.18, h, t]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} />
      </mesh>
      {/* Frame — right */}
      <mesh position={[w / 2, 0, 0.04]} castShadow>
        <boxGeometry args={[0.18, h, t]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} />
      </mesh>
      {/* Frame — vertical mullion */}
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.08, h, t]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} />
      </mesh>
      {/* Frame — horizontal mullion */}
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[w, 0.08, t]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} />
      </mesh>

      {/* Sill */}
      <mesh position={[0, -h / 2 - 0.18, 0.18]} castShadow>
        <boxGeometry args={[w + 0.2, 0.1, 0.4]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} />
      </mesh>
    </group>
  );
}

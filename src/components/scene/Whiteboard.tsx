import { Html } from "@react-three/drei";
import { useHotspotHover } from "../../hooks/useHotspotHover";
import { useSceneStore } from "../../store/useSceneStore";

// Whiteboard mounted on the left wall — rendered as a child of LeftWall
// (world center: -5, 2.5, 0). Coordinates are LOCAL to that wall.
export function Whiteboard() {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover("whiteboard");
  const glow = hovered ? 0.5 : 0;

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHotspot("whiteboard");
  };

  return (
    <group
      position={[0.08, 0.1, -1]}
      rotation={[0, Math.PI / 2, 0]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={handleClick}
    >
      {/* Invisible enlarged tap target — covers the entire whiteboard with a
          generous halo for finger taps. */}
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[2.9, 2.0, 0.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[2.6, 1.7, 0.06]} />
        <meshStandardMaterial
          color="#cfcfcf"
          emissive="#f4b942"
          emissiveIntensity={glow}
          roughness={0.5}
        />
      </mesh>
      {/* Whiteboard surface */}
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[2.45, 1.55]} />
        <meshStandardMaterial color="#fafafa" roughness={0.4} />
      </mesh>
      {/* Marker tray */}
      <mesh position={[0, -0.9, 0.06]}>
        <boxGeometry args={[2.4, 0.06, 0.16]} />
        <meshStandardMaterial color="#9c9c9c" />
      </mesh>
      {/* Marker */}
      <mesh position={[-0.5, -0.86, 0.16]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.18, 12]} />
        <meshStandardMaterial color="#c8221a" />
      </mesh>

      {/* Handwritten text via HTML */}
      <Html
        position={[0, 0.05, 0.04]}
        center
        transform
        distanceFactor={1.5}
        style={{
          pointerEvents: "none",
          width: "620px",
          textAlign: "left",
          fontFamily: "'Permanent Marker', 'Caveat', cursive",
        }}
      >
        <div style={{ pointerEvents: "none", padding: "0 28px" }}>
          <div
            style={{
              fontSize: 44,
              lineHeight: 1,
              marginBottom: 18,
              color: "#c8221a",
              textAlign: "center",
            }}
          >
            HELLO!
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 30, color: "#1a3a8a", lineHeight: 1 }}>
              Contact
            </div>
            <div
              style={{
                fontSize: 22,
                color: "#1f7a3a",
                marginTop: 4,
                wordBreak: "break-all",
              }}
            >
              ashutoshsharma1395@gmail.com
            </div>
          </div>

          <div>
            <div style={{ fontSize: 30, color: "#1a3a8a", lineHeight: 1 }}>
              Projects
            </div>
            <div
              style={{
                fontSize: 22,
                color: "#1f7a3a",
                marginTop: 4,
                wordBreak: "break-all",
              }}
            >
              github.com/ashutoshsharma1309
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

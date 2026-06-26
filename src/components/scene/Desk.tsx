// L-shaped desk against the back wall, right of center.
// Two monitors on top, keyboard, mouse, mug, notebook stack.
// Clicking anywhere on the desk opens the About panel.

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import { useHotspotHover } from "../../hooks/useHotspotHover";
import { useSceneStore } from "../../store/useSceneStore";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const BLACK = "#1a1a1a";
const DARK = "#2a2a2a";
const TERMINAL_GREEN = "#7CFC00";

const TYPEWRITER_SNIPPETS = [
  "deploying to production...",
  "build successful ✓",
  "watching for changes...",
  "tests passed (42/42) ✓",
  "vite ready in 247 ms",
];

export function Desk() {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const { hovered, onPointerOver, onPointerOut } = useHotspotHover("desk");
  const tier = useDeviceTier();

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHotspot("aboutFrames");
  };

  return (
    <group
      position={[1.6, 0, -4.2]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={handleClick}>
      {/* Invisible enlarged tap target covering the desk surface + monitors.
          Sits low so it doesn't block other clickable items in front. */}
      <mesh position={[1.0, 1.0, 0.0]}>
        <boxGeometry args={[3.6, 1.4, 1.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Long arm of the L (running along -z wall) */}
      <mesh position={[1.2, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.06, 1.0]} />
        <meshStandardMaterial color={BLACK} roughness={0.55} />
      </mesh>
      {/* Short arm of the L (jutting forward toward +z) */}
      <mesh position={[-0.4, 0.78, 0.65]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.06, 1.5]} />
        <meshStandardMaterial color={BLACK} roughness={0.55} />
      </mesh>
      {/* Apron under top */}
      <mesh position={[1.2, 0.72, -0.3]}>
        <boxGeometry args={[3.1, 0.08, 0.06]} />
        <meshStandardMaterial color={DARK} />
      </mesh>

      {/* Legs (4) */}
      {[
        [-0.2, 0.39, -0.4] as const,
        [2.7, 0.39, -0.4] as const,
        [2.7, 0.39, 0.4] as const,
        [-0.8, 0.39, 1.3] as const,
        [0.0, 0.39, 1.3] as const,
      ].map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <boxGeometry args={[0.06, 0.78, 0.06]} />
          <meshStandardMaterial color={BLACK} />
        </mesh>
      ))}

      {/* Monitor 1 (left) — blue gradient */}
      <Monitor
        position={[0.4, 0.81, -0.15]}
        screen="blue"
        rotateY={0.18}
        hovered={hovered}
      />
      {/* Monitor 2 (right) — terminal */}
      <Monitor
        position={[2.0, 0.81, -0.2]}
        screen="terminal"
        rotateY={-0.18}
        hovered={hovered}
      />

      {/* Yellow rim glow when desk is hovered */}
      {hovered && (
        <pointLight
          position={[1.2, 1.4, 0.2]}
          intensity={1.6}
          distance={3.0}
          color="#f4b942"
        />
      )}

      {/* Keyboard */}
      <mesh position={[1.2, 0.83, 0.2]} castShadow>
        <boxGeometry args={[1.0, 0.04, 0.32]} />
        <meshStandardMaterial color="#101010" roughness={0.7} />
      </mesh>
      {/* Keys (subtle) */}
      <mesh position={[1.2, 0.86, 0.2]}>
        <boxGeometry args={[0.96, 0.005, 0.28]} />
        <meshStandardMaterial
          color="#222"
          emissive="#7eb6ff"
          emissiveIntensity={0.18}
          roughness={0.5}
        />
      </mesh>

      {/* Mouse */}
      <mesh position={[1.95, 0.83, 0.22]} castShadow>
        <boxGeometry args={[0.12, 0.04, 0.18]} />
        <meshStandardMaterial color="#101010" roughness={0.5} />
      </mesh>

      {/* Mug + steam (steam particles skipped on mobile for perf) */}
      <group position={[2.55, 0.81, -0.05]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.09, 0.07, 0.16, 24]} />
          <meshStandardMaterial color="#f4b942" roughness={0.5} />
        </mesh>
        <mesh position={[0.11, 0, 0]}>
          <torusGeometry args={[0.05, 0.018, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#f4b942" roughness={0.5} />
        </mesh>
        {tier !== "mobile" && <MugSteam />}
      </group>

      {/* Notebook stack */}
      <group position={[-0.4, 0.81, 0.95]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.04, 0.7]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
        <mesh position={[0.02, 0.045, -0.02]} castShadow>
          <boxGeometry args={[0.5, 0.04, 0.7]} />
          <meshStandardMaterial color="#7a2e1f" roughness={0.7} />
        </mesh>
        <mesh position={[-0.02, 0.09, 0.02]} castShadow>
          <boxGeometry args={[0.5, 0.04, 0.7]} />
          <meshStandardMaterial color="#2d2d2d" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

interface MonitorProps {
  position: [number, number, number];
  screen: "blue" | "terminal";
  rotateY: number;
  hovered?: boolean;
}

function Monitor({ position, screen, rotateY, hovered = false }: MonitorProps) {
  return (
    <group position={position} rotation={[0, rotateY, 0]}>
      {/* Stand base */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.04, 24]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.6} />
      </mesh>
      {/* Stand pole */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.06, 0.4, 0.06]} />
        <meshStandardMaterial color="#0d0d0d" />
      </mesh>
      {/* Bezel */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[1.1, 0.7, 0.06]} />
        <meshStandardMaterial
          color="#0a0a0a"
          emissive="#f4b942"
          emissiveIntensity={hovered ? 0.45 : 0}
          roughness={0.7}
        />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0.7, 0.032]}>
        <planeGeometry args={[1.04, 0.62]} />
        {screen === "blue" ? (
          <meshStandardMaterial
            color="#1f5fbf"
            emissive="#3a8efc"
            emissiveIntensity={0.95}
          />
        ) : (
          <meshStandardMaterial
            color="#031007"
            emissive="#0e2010"
            emissiveIntensity={0.7}
          />
        )}
      </mesh>
      {screen === "terminal" && <TerminalContent />}
    </group>
  );
}

// Animated terminal content: prompt with blinking cursor and a typewriter line
// that cycles through snippets.
function TerminalContent() {
  const cursorRef = useRef<Mesh>(null);
  const [typed, setTyped] = useState("");
  const reducedMotion = usePrefersReducedMotion();
  const stateRef = useRef({
    snippet: 0,
    charIdx: 0,
    lastCharAt: 0,
    pausingUntil: 0,
  });

  // Reduced motion: show a complete static line instead of the typewriter.
  useEffect(() => {
    if (reducedMotion) setTyped(TYPEWRITER_SNIPPETS[0]);
  }, [reducedMotion]);

  useFrame((state) => {
    if (reducedMotion) {
      if (cursorRef.current) cursorRef.current.visible = true;
      return;
    }
    const t = state.clock.getElapsedTime();

    // Cursor blink — toggle visibility every 0.5s.
    if (cursorRef.current) {
      cursorRef.current.visible = Math.floor(t * 2) % 2 === 0;
    }

    const s = stateRef.current;
    const target = TYPEWRITER_SNIPPETS[s.snippet];

    if (t < s.pausingUntil) return;

    if (s.charIdx < target.length) {
      // Type a char every 80ms.
      if (t - s.lastCharAt >= 0.08) {
        s.charIdx += 1;
        s.lastCharAt = t;
        setTyped(target.slice(0, s.charIdx));
      }
    } else if (s.pausingUntil === 0) {
      // Just finished — pause for 3s before clearing and moving to next snippet.
      s.pausingUntil = t + 3;
    } else {
      // Pause is over — reset for the next snippet.
      s.snippet = (s.snippet + 1) % TYPEWRITER_SNIPPETS.length;
      s.charIdx = 0;
      s.lastCharAt = t;
      s.pausingUntil = 0;
      setTyped("");
    }
  });

  return (
    <group position={[0, 0.7, 0.034]}>
      {/* Prompt line: "$ npm run dev" */}
      <Text
        position={[-0.46, 0.18, 0]}
        anchorX="left"
        anchorY="middle"
        fontSize={0.046}
        color={TERMINAL_GREEN}
      >
        $ npm run dev
      </Text>

      {/* Typewriter line */}
      <Text
        position={[-0.46, 0.08, 0]}
        anchorX="left"
        anchorY="middle"
        fontSize={0.04}
        color={TERMINAL_GREEN}
        maxWidth={0.95}
      >
        {typed}
      </Text>

      {/* Blinking cursor at the end of the prompt */}
      <mesh ref={cursorRef} position={[0.18, 0.18, 0]}>
        <planeGeometry args={[0.045, 0.052]} />
        <meshBasicMaterial color={TERMINAL_GREEN} />
      </mesh>
    </group>
  );
}

// 4 small white spheres rising from the mug rim, fading out, then resetting.
function MugSteam() {
  // Each particle has its own phase offset so the column is continuous.
  const particles = useMemo(
    () => [
      { phase: 0.0, wobble: 1.0 },
      { phase: 0.75, wobble: -0.8 },
      { phase: 1.5, wobble: 0.6 },
      { phase: 2.25, wobble: -1.1 },
    ],
    [],
  );
  return (
    <group position={[0, 0.08, 0]}>
      {particles.map((p, i) => (
        <SteamParticle key={i} phase={p.phase} wobble={p.wobble} />
      ))}
    </group>
  );
}

const STEAM_LIFETIME = 3.0;

function SteamParticle({ phase, wobble }: { phase: number; wobble: number }) {
  const ref = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial>(null);
  const reducedMotion = usePrefersReducedMotion();

  useFrame((state) => {
    if (!ref.current || !matRef.current) return;
    if (reducedMotion) {
      matRef.current.opacity = 0; // hide drifting steam for reduced motion
      return;
    }
    const t = state.clock.getElapsedTime() + phase;
    const tau = (t % STEAM_LIFETIME) / STEAM_LIFETIME; // 0 → 1 over lifetime
    // Vertical drift ~0.6 units total over lifetime (0.2 u/s × 3s).
    ref.current.position.y = tau * 0.6;
    // Horizontal sine wobble.
    ref.current.position.x = Math.sin(t * 1.4) * 0.025 * wobble;
    // Fade in then out, peak opacity 0.15.
    const fade = Math.sin(tau * Math.PI);
    matRef.current.opacity = 0.15 * fade;
    // Slightly grow as it rises.
    const s = 0.05 * (0.7 + tau * 0.6);
    ref.current.scale.setScalar(s);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        ref={matRef}
        color="#ffffff"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}


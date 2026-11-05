import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { heroSignal } from "./heroSignal";

export type Quality = "high" | "medium" | "low";

interface NeuralCoreProps {
  quality: Quality;
  reduced: boolean;
  /** False while the hero is off-screen — the render loop is paused. */
  active: boolean;
  onReady: () => void;
}

const NODE_COUNT: Record<Quality, number> = {
  high: 460,
  medium: 340,
  low: 200,
};
const RADIUS = 1.75;
const GOLD = new THREE.Color("#f4b942");
const HOT = new THREE.Color("#fff3d6");

// ───────────────────────────── Graph construction ─────────────────────────────
// Nodes on a jittered Fibonacci sphere; each links to its 3 nearest neighbours.
// Read: a distributed system / neural graph — the kind of structure the work
// on this site is built around.
function buildGraph(n: number) {
  const base = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const sizes = new Float32Array(n);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const jitter = RADIUS * (1 + (Math.random() - 0.5) * 0.14);
    base[i * 3] = Math.cos(theta) * r * jitter;
    base[i * 3 + 1] = y * jitter;
    base[i * 3 + 2] = Math.sin(theta) * r * jitter;
    seed[i] = Math.random();
    // Mostly small nodes with a few "hubs".
    sizes[i] = 0.7 + Math.pow(Math.random(), 4) * 2.2;
  }

  const seen = new Set<number>();
  const edges: number[] = [];
  for (let i = 0; i < n; i++) {
    const dists: { j: number; d: number }[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = base[i * 3] - base[j * 3];
      const dy = base[i * 3 + 1] - base[j * 3 + 1];
      const dz = base[i * 3 + 2] - base[j * 3 + 2];
      dists.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    dists.sort((a, b) => a.d - b.d);
    for (let k = 0; k < 3; k++) {
      const j = dists[k].j;
      const key = i < j ? i * n + j : j * n + i;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push(i, j);
      }
    }
  }
  return { base, seed, sizes, edges: new Uint32Array(edges) };
}

const pointVertex = /* glsl */ `
  attribute float aSize;
  attribute float aGlow;
  uniform float uPixelRatio;
  uniform float uScale;
  varying float vGlow;
  varying float vFade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (1.0 + aGlow * 1.8) * uPixelRatio * uScale / -mv.z;
    vGlow = aGlow;
    // Nodes on the far side of the sphere recede into the dark.
    vFade = clamp((mv.z + 8.2) / 3.6, 0.16, 1.0);
  }
`;

const pointFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHot;
  varying float vGlow;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.2, 0.0, d);
    vec3 col = mix(uColor, uHot, clamp(core * 0.55 + vGlow * 0.85, 0.0, 1.0));
    float a = (soft * 0.5 + core * 0.65) * vFade * (0.6 + vGlow * 1.1);
    gl_FragColor = vec4(col, a);
  }
`;

function makeHaloTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    g.addColorStop(0, "rgba(244,185,66,0.55)");
    g.addColorStop(0.35, "rgba(244,185,66,0.14)");
    g.addColorStop(1, "rgba(244,185,66,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ───────────────────────────── Scene ─────────────────────────────

function Lattice({ quality, reduced }: { quality: Quality; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.LineSegments>(null);
  const ring = useRef<THREE.Group>(null);
  const satellite = useRef<THREE.Mesh>(null);
  const setDpr = useThree((s) => s.setDpr);

  const graph = useMemo(() => buildGraph(NODE_COUNT[quality]), [quality]);
  const n = graph.base.length / 3;
  const edgeCount = graph.edges.length / 2;

  const { pointGeo, lineGeo, positions, glows, linePos, lineCol } =
    useMemo(() => {
      const positions = new Float32Array(graph.base);
      const glows = new Float32Array(n);
      const pointGeo = new THREE.BufferGeometry();
      pointGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      pointGeo.setAttribute("aSize", new THREE.BufferAttribute(graph.sizes, 1));
      pointGeo.setAttribute(
        "aGlow",
        new THREE.BufferAttribute(glows, 1).setUsage(THREE.DynamicDrawUsage),
      );

      const linePos = new Float32Array(edgeCount * 6);
      const lineCol = new Float32Array(edgeCount * 6);
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage),
      );
      lineGeo.setAttribute(
        "color",
        new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage),
      );
      return { pointGeo, lineGeo, positions, glows, linePos, lineCol };
    }, [graph, n, edgeCount]);

  const pointMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pointVertex,
        fragmentShader: pointFragment,
        uniforms: {
          uPixelRatio: { value: 1 },
          uScale: { value: 26 },
          uColor: { value: GOLD.clone() },
          uHot: { value: HOT.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const lineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const shellGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.86, 1)),
    [],
  );
  const halo = useMemo(() => makeHaloTexture(), []);

  useEffect(
    () => () => {
      pointGeo.dispose();
      lineGeo.dispose();
      pointMat.dispose();
      lineMat.dispose();
      shellGeo.dispose();
      halo.dispose();
    },
    [pointGeo, lineGeo, pointMat, lineMat, shellGeo, halo],
  );

  // Per-frame scratch state (never triggers React renders).
  const s = useRef({
    scroll: 0,
    px: 0,
    py: 0,
    drift: 0.6,
    strength: 0,
    hit: new THREE.Vector3(0, 0, RADIUS),
    perfAcc: 0,
    perfFrames: 0,
  });
  const tmp = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      ray: new THREE.Ray(),
      inv: new THREE.Matrix4(),
      sphere: new THREE.Sphere(new THREE.Vector3(), RADIUS),
      hit: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
    }),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const st = s.current;
    const dt = Math.min(delta, 0.05);
    const t = reduced ? 0 : state.clock.elapsedTime;

    // ── Adaptive quality: step DPR down if frames are consistently slow.
    st.perfAcc += delta;
    st.perfFrames += 1;
    if (st.perfFrames >= 90) {
      const avg = st.perfAcc / st.perfFrames;
      const dpr = state.viewport.dpr;
      if (avg > 1 / 40 && dpr > 1) setDpr(Math.max(1, dpr - 0.25));
      st.perfAcc = 0;
      st.perfFrames = 0;
    }
    pointMat.uniforms.uPixelRatio.value = state.viewport.dpr;

    // ── Smooth incoming signals.
    st.scroll += (heroSignal.scroll - st.scroll) * Math.min(1, dt * 6);
    st.px += (heroSignal.px - st.px) * Math.min(1, dt * 3.5);
    st.py += (heroSignal.py - st.py) * Math.min(1, dt * 3.5);
    if (!reduced) st.drift += dt * 0.05;

    // ── Composition: right of the headline on wide screens, above it on narrow.
    const wide = state.size.width >= 1024;
    const vp = state.viewport;
    // Narrow: a smaller accent tucked top-right so it never sits under the name.
    const baseScale = wide
      ? Math.min(1.08, vp.height / 5.4)
      : Math.min(0.62, vp.width / 6.2);
    g.position.set(
      wide ? vp.width * 0.2 : vp.width * 0.26,
      (wide ? 0 : vp.height * 0.27) + st.scroll * 1.5,
      0,
    );
    g.scale.setScalar(baseScale * (1 - st.scroll * 0.2));
    g.rotation.y = st.drift + st.px * 0.45 + st.scroll * 0.9;
    g.rotation.x = -st.py * 0.28 + st.scroll * 0.4;
    g.updateMatrixWorld();

    // ── Cursor proximity: cast the pointer onto the sphere in local space.
    let targetStrength = 0;
    if (heroSignal.pointerActive && !reduced) {
      tmp.ndc.set(heroSignal.px, heroSignal.py);
      tmp.raycaster.setFromCamera(tmp.ndc, state.camera);
      tmp.inv.copy(g.matrixWorld).invert();
      tmp.ray.copy(tmp.raycaster.ray).applyMatrix4(tmp.inv);
      if (tmp.ray.intersectSphere(tmp.sphere, tmp.hit)) {
        targetStrength = 1;
        st.hit.lerp(tmp.hit, Math.min(1, dt * 10));
      }
    }
    st.strength += (targetStrength - st.strength) * Math.min(1, dt * 4);

    // ── Update nodes.
    const { base, seed } = graph;
    const hx = st.hit.x;
    const hy = st.hit.y;
    const hz = st.hit.z;
    const strength = st.strength;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const bx = base[i3];
      const by = base[i3 + 1];
      const bz = base[i3 + 2];
      const breath = reduced
        ? 1
        : 1 + 0.022 * Math.sin(t * 0.9 + seed[i] * 6.283);
      let k = breath * (1 + st.scroll * (0.5 + seed[i] * 1.6));
      let glow = 0;
      if (strength > 0.01) {
        const dx = bx - hx;
        const dy = by - hy;
        const dz = bz - hz;
        const f = Math.max(
          0,
          1 - Math.sqrt(dx * dx + dy * dy + dz * dz) / 0.95,
        );
        glow = f * f * strength;
        k *= 1 + glow * 0.16;
      }
      positions[i3] = bx * k;
      positions[i3 + 1] = by * k;
      positions[i3 + 2] = bz * k;
      glows[i] = glow;
    }

    // ── Update edges (endpoints + brightness with depth falloff).
    const m = g.matrixWorld.elements;
    const edges = graph.edges;
    for (let e = 0; e < edgeCount; e++) {
      const a = edges[e * 2];
      const b = edges[e * 2 + 1];
      const a3 = a * 3;
      const b3 = b * 3;
      const o = e * 6;
      linePos[o] = positions[a3];
      linePos[o + 1] = positions[a3 + 1];
      linePos[o + 2] = positions[a3 + 2];
      linePos[o + 3] = positions[b3];
      linePos[o + 4] = positions[b3 + 1];
      linePos[o + 5] = positions[b3 + 2];
      const mx = (positions[a3] + positions[b3]) * 0.5;
      const my = (positions[a3 + 1] + positions[b3 + 1]) * 0.5;
      const mz = (positions[a3 + 2] + positions[b3 + 2]) * 0.5;
      const wz = (m[2] * mx + m[6] * my + m[10] * mz) / (RADIUS * g.scale.x);
      const depth = 0.12 + 0.88 * Math.min(1, Math.max(0, (wz + 1) * 0.5));
      const c = (0.13 + 0.85 * Math.max(glows[a], glows[b])) * depth;
      lineCol[o] = lineCol[o + 3] = GOLD.r * c;
      lineCol[o + 1] = lineCol[o + 4] = GOLD.g * c;
      lineCol[o + 2] = lineCol[o + 5] = GOLD.b * c;
    }

    pointGeo.attributes.position.needsUpdate = true;
    pointGeo.attributes.aGlow.needsUpdate = true;
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    // ── Core, shell, orbit.
    if (core.current) {
      if (!reduced) {
        core.current.rotation.y -= dt * 0.16;
        core.current.rotation.x += dt * 0.07;
      }
      core.current.scale.setScalar(1 + strength * 0.06);
    }
    if (shell.current && !reduced) {
      shell.current.rotation.y += dt * 0.1;
      shell.current.rotation.z += dt * 0.04;
    }
    if (ring.current && !reduced) ring.current.rotation.z += dt * 0.06;
    if (satellite.current) {
      const ang = reduced ? 0.8 : t * 0.4;
      satellite.current.position.set(
        Math.cos(ang) * 2.45,
        Math.sin(ang) * 2.45,
        0,
      );
    }
  });

  return (
    <group ref={group}>
      <sprite scale={[4.2, 4.2, 1]}>
        <spriteMaterial
          map={halo}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <mesh ref={core}>
        <icosahedronGeometry args={[0.78, 0]} />
        <meshStandardMaterial
          color="#141a2b"
          metalness={0.6}
          roughness={0.28}
          flatShading
          emissive="#f4b942"
          emissiveIntensity={0.02}
        />
      </mesh>
      <lineSegments ref={shell} geometry={shellGeo}>
        <lineBasicMaterial
          color="#f4b942"
          transparent
          opacity={0.26}
          depthWrite={false}
        />
      </lineSegments>

      <lineSegments
        geometry={lineGeo}
        material={lineMat}
        frustumCulled={false}
      />
      <points geometry={pointGeo} material={pointMat} frustumCulled={false} />

      {quality !== "low" && (
        <group rotation={[1.15, 0.3, 0]}>
          <group ref={ring}>
            <mesh>
              <torusGeometry args={[2.45, 0.0035, 6, 220]} />
              <meshBasicMaterial
                color="#f4b942"
                transparent
                opacity={0.22}
                depthWrite={false}
              />
            </mesh>
            <mesh ref={satellite}>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshBasicMaterial color="#fff3d6" />
            </mesh>
          </group>
        </group>
      )}
      {quality !== "low" && (
        <mesh rotation={[1.9, -0.55, 0.2]}>
          <torusGeometry args={[2.78, 0.003, 6, 220]} />
          <meshBasicMaterial
            color="#8ca8ff"
            transparent
            opacity={0.13}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Compiles every shader in the scene before the first real frame. Uses
 * KHR_parallel_shader_compile where available, so compilation happens off the
 * main thread instead of as one long blocking task on the first render.
 */
function ShaderWarmup({ onDone }: { onDone: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let cancelled = false;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        onDone();
        // Guarantees a first frame in "demand" mode (reduced motion).
        requestAnimationFrame(() => invalidate());
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, onDone, invalidate]);
  return null;
}

export default function NeuralCore({
  quality,
  reduced,
  active,
  onReady,
}: NeuralCoreProps) {
  const [compiled, setCompiled] = useState(false);
  const handleCompiled = useMemo(
    () => () => {
      setCompiled(true);
      // Reveal after the first compiled frame has been drawn.
      requestAnimationFrame(() => requestAnimationFrame(onReady));
    },
    [onReady],
  );

  return (
    <Canvas
      frameloop={!compiled || !active ? "never" : reduced ? "demand" : "always"}
      dpr={quality === "low" ? [1, 1.5] : [1, 1.75]}
      gl={{
        antialias: quality !== "low",
        alpha: true,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 6.2], fov: 38, near: 0.1, far: 40 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 5, 6]} color="#ffd79a" intensity={2.4} />
      <pointLight
        position={[-5, -2, -3]}
        color="#7f9cff"
        intensity={30}
        decay={2}
      />
      <pointLight
        position={[3, -4, 4]}
        color="#f4b942"
        intensity={8}
        decay={2}
      />
      <Lattice quality={quality} reduced={reduced} />
      <ShaderWarmup onDone={handleCompiled} />
    </Canvas>
  );
}

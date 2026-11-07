// Dust motes: tiny, soft, warm specks drifting only inside the shaft of
// daylight that falls from the back-wall window into the room. Each mote is a
// round soft sprite (not a hard square point) whose brightness fades toward
// the edges/ends of the shaft and slowly twinkles as it tumbles through the
// light. Slow Brownian-style wander, wraps within the shaft volume.
//
// One Points draw call, 64 vertices; desktop only and skipped under
// prefers-reduced-motion (Room.tsx decides whether to mount it).

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, Vector3 } from "three";
import { useDisposable } from "./materials";

const COUNT = 64;

// Light shaft from the window (back wall, world ≈ (3.2, 2.6, -4.92), 2.4 × 2.2)
// slanting down into the room.
const ORIGIN = new Vector3(3.2, 2.6, -4.82);
const AXIS = new Vector3(-0.3, -0.5, 1).normalize();
const SIDE = new Vector3().crossVectors(new Vector3(0, 1, 0), AXIS).normalize();
const UP = new Vector3().crossVectors(AXIS, SIDE).normalize();
const LENGTH = 3.6;
const HALF_W = 0.95; // half width at the window, grows along the shaft
const HALF_H = 0.85;
const SPREAD = 0.12; // widening per metre

const VERT = /* glsl */ `
attribute float aAlpha;
attribute float aSize;
uniform float uScale;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  vAlpha = aAlpha;
}`;
const FRAG = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float a = smoothstep(1.0, 0.0, r);
  a *= a;
  if (a * vAlpha < 0.002) discard;
  gl_FragColor = vec4(vec3(1.0, 0.95, 0.86) * a * vAlpha, 1.0);
}`;

export function DustMotes() {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const t0 = useRef(0);

  // Particle state in shaft coordinates: s along (0..LENGTH), u, v across (-1..1).
  const state = useMemo(() => {
    const s = new Float32Array(COUNT);
    const u = new Float32Array(COUNT);
    const v = new Float32Array(COUNT);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      s[i] = Math.random() * LENGTH;
      u[i] = Math.random() * 2 - 1;
      v[i] = Math.random() * 2 - 1;
      seed[i] = Math.random() * 100;
    }
    return { s, u, v, seed };
  }, []);

  const geo = useDisposable(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(COUNT * 3), 3));
    g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(COUNT), 1));
    const sizes = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) sizes[i] = 0.6 + Math.random() * 0.9;
    g.setAttribute("aSize", new BufferAttribute(sizes, 1));
    return g;
  }, []);

  const mat = useDisposable(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uScale: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  // ~2–4 mm specks: pixel size scales with viewport height and DPR.
  mat.uniforms.uScale.value = size.height * dpr * 0.0065;

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    t0.current += d;
    const t = t0.current;
    const pos = geo.getAttribute("position") as BufferAttribute;
    const alpha = geo.getAttribute("aAlpha") as BufferAttribute;
    const P = pos.array as Float32Array;
    const A = alpha.array as Float32Array;
    const { s, u, v, seed } = state;
    for (let i = 0; i < COUNT; i++) {
      const k = seed[i];
      // slow wander: mostly sinking, gently curling
      s[i] += (0.018 + 0.012 * Math.sin(t * 0.21 + k)) * d;
      u[i] += Math.sin(t * 0.17 + k * 1.7) * 0.03 * d;
      v[i] += (Math.cos(t * 0.13 + k * 2.3) * 0.03 - 0.008) * d;
      if (s[i] > LENGTH) s[i] -= LENGTH;
      if (u[i] > 1) u[i] -= 2;
      if (u[i] < -1) u[i] += 2;
      if (v[i] > 1) v[i] -= 2;
      if (v[i] < -1) v[i] += 2;
      const grow = 1 + s[i] * SPREAD;
      const x = ORIGIN.x + AXIS.x * s[i] + SIDE.x * u[i] * HALF_W * grow + UP.x * v[i] * HALF_H * grow;
      const y = ORIGIN.y + AXIS.y * s[i] + SIDE.y * u[i] * HALF_W * grow + UP.y * v[i] * HALF_H * grow;
      const z = ORIGIN.z + AXIS.z * s[i] + SIDE.z * u[i] * HALF_W * grow + UP.z * v[i] * HALF_H * grow;
      P[i * 3] = x;
      P[i * 3 + 1] = y;
      P[i * 3 + 2] = z;
      // brightness: inside the shaft only (soft edges + ends), slow glint
      const edge = (1 - Math.min(1, Math.abs(u[i]) ** 4)) * (1 - Math.min(1, Math.abs(v[i]) ** 4));
      const ends = Math.min(1, s[i] / 0.4) * Math.min(1, (LENGTH - s[i]) / 1.2);
      const glint = 0.45 + 0.55 * Math.max(0, Math.sin(t * (0.6 + (k % 1) * 0.8) + k)) ** 3;
      A[i] = edge * ends * glint * 0.7;
    }
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

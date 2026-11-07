// Ergonomic office chair in front of the desk. Real proportions: seat at
// ~0.48 m, back to ~1.1 m. Polished-aluminium 5-star base on twin-wheel
// casters (instanced), chrome gas lift, padded fabric seat with a waterfall
// front edge, curved mesh back with lumbar bulge on a plastic frame, T-arms
// with soft PU pads.
//
// It slowly rotates around its own Y axis at 0.15 rad/s — like someone just
// spun it and walked away. The spin eases in on mount and integrates frame
// delta (clamped) so a tab switch never makes it jump.

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, type Group, type InstancedMesh, Matrix4, Quaternion, TubeGeometry, Vector3 } from "three";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { createBrushedSteel, createFabric, createLeather, createPlastic, useDisposable } from "./materials";
import { useRoomQuality } from "./quality";
import { FLOOR_Y, cyl, deform, mergeParts, place, rbox } from "./workspace/geometry";

const INITIAL_Y = -0.4;
const SPIN_SPEED = 0.15;
const SPIN_EASE_IN = 2.5; // seconds to reach full speed

const CASTER_RADIUS = 0.335;
const SEAT_Y = 0.445; // seat cushion centre

export function Chair() {
  const groupRef = useRef<Group>(null);
  const reducedMotion = usePrefersReducedMotion();
  const q = useRoomQuality();
  const low = q.tier === "low";
  const spin = useRef({ angle: INITIAL_Y, age: 0 });

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g || reducedMotion) return;
    const dt = Math.min(delta, 0.1);
    const s = spin.current;
    s.age += dt;
    const ramp = Math.min(1, s.age / SPIN_EASE_IN);
    const speed = SPIN_SPEED * ramp * ramp * (3 - 2 * ramp);
    s.angle += speed * dt;
    g.rotation.y = s.angle;
  });

  const mats = useDisposable(
    () => ({
      seat: createFabric(q, { color: "#303237", widthM: 0.5, heightM: 0.5, roughness: 0.9, sheen: 0.8 }),
      mesh: createFabric(q, { color: "#2c2f34", repeat: [9, 11], roughness: 0.82, sheen: 0.6, normalScale: 1.8 }),
      pad: createLeather(q, { color: "#18191b", widthM: 0.24, heightM: 0.24, roughness: 0.62 }),
      plastic: createPlastic(q, { color: "#1a1b1d", roughness: 0.55, widthM: 0.5, heightM: 0.5 }),
      // Slightly cool tints + moderated reflections so the warm floor isn't
      // mirrored dominantly (it read bronze).
      alu: createBrushedSteel(q, { color: "#c6cbd3", roughness: 0.3, widthM: 0.35, heightM: 0.35, envMapIntensity: 0.75 }),
      chrome: createBrushedSteel(q, { color: "#dfe3ea", roughness: 0.28, widthM: 0.15, heightM: 0.3, envMapIntensity: 0.7 }),
    }),
    [q],
  );

  const geo = useDisposable(() => {
    const seg = low ? 2 : 4;
    const radial = low ? 12 : 24;

    // --- 5-star base (aluminium): hub + tapered, drooping legs.
    const alu = [place(cyl(0.05, 0.058, 0.07, radial), [0, 0.1, 0])];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leg = deform(rbox(0.3, 0.036, 0.05, 0.012, seg), (v) => {
        const t = (v.x + 0.15) / 0.3; // 0 at hub → 1 at tip
        v.y *= 1 - 0.38 * t;
        v.z *= 1 - 0.32 * t;
        v.y -= 0.024 * t * t;
      });
      // Leg runs along +x before rotation; rotate about Y to its angle.
      alu.push(place(leg, [Math.cos(a) * 0.19, 0.095, -Math.sin(a) * 0.19], [0, a, 0]));
      // Tip cap where the caster stem enters.
      alu.push(place(cyl(0.016, 0.018, 0.016, 12), [Math.cos(a) * CASTER_RADIUS, 0.068, -Math.sin(a) * CASTER_RADIUS]));
    }
    // Back spine: from the mechanism rear up to the backrest frame.
    const spine = new TubeGeometry(
      new CatmullRomCurve3([
        new Vector3(0, 0.405, -0.1),
        new Vector3(0, 0.395, -0.22),
        new Vector3(0, 0.45, -0.285),
        new Vector3(0, 0.62, -0.305),
      ]),
      low ? 10 : 20,
      0.017,
      low ? 6 : 10,
      false,
    );

    // --- Black plastic: seat shell, mechanism, back frame, arm uprights,
    // gas-lift shroud ring, tension knob.
    const plastic = [
      place(rbox(0.47, 0.022, 0.45, 0.01, seg), [0, SEAT_Y - 0.045, 0]),
      place(rbox(0.2, 0.045, 0.24, 0.01, seg), [0, 0.39, -0.02]),
      place(cyl(0.034, 0.034, 0.03, radial), [0, 0.36, 0]),
      place(cyl(0.008, 0.008, 0.12, 8), [0.14, 0.385, 0.05], [0, 0, Math.PI / 2]),
      place(cyl(0.016, 0.016, 0.024, 12), [0.205, 0.385, 0.05], [0, 0, Math.PI / 2]),
      // Back spine in moulded black nylon (as on most mesh task chairs).
      spine,
    ];
    for (const sx of [-1, 1]) {
      plastic.push(place(rbox(0.11, 0.02, 0.055, 0.008, 2), [sx * 0.215, SEAT_Y - 0.06, -0.04]));
      plastic.push(place(rbox(0.032, 0.21, 0.055, 0.012, seg), [sx * 0.265, SEAT_Y + 0.05, -0.04]));
    }

    // --- Seat cushion: dished top, waterfall front edge.
    const seat = deform(rbox(0.5, 0.085, 0.48, 0.04, low ? 3 : 5), (v) => {
      const top = v.y > 0;
      // Sides taper toward the shell; top dished with raised bolsters.
      if (!top) v.x *= 0.94;
      if (top) v.y += 0.016 * Math.pow(v.x / 0.25, 4) - 0.004 - 0.008 * Math.exp(-Math.pow(v.z / 0.12, 2));
      // Waterfall front edge.
      if (v.z > 0.1) v.y -= Math.pow(v.z - 0.1, 2) * (top ? 1.8 : 0.6);
      // Slight rise at the back.
      if (v.z < -0.16 && top) v.y += (-0.16 - v.z) * 0.15;
    });
    place(seat, [0, SEAT_Y, 0]);

    // --- Backrest: curved shell with lumbar bulge, wider at the shoulders.
    const backShape = (v: Vector3) => {
      const yn = v.y / 0.3; // -1 (bottom) .. 1 (top)
      v.x *= 1 + 0.06 * yn;
      v.z += 0.55 * v.x * v.x; // wrap around the sitter
      v.z += 0.028 * Math.exp(-Math.pow((v.y + 0.11) / 0.11, 2)); // lumbar
    };
    const backTilt: [number, number, number] = [-0.13, 0, 0];
    const backPos: [number, number, number] = [0, SEAT_Y + 0.4, -0.27];
    // Frame: a moulded tube running round the perimeter (follows the same
    // curvature), mesh stretched inside it, and a lumbar bar across the back.
    const ring: Vector3[] = [];
    const hw = 0.232;
    const hh = 0.292;
    const cr = 0.07;
    const corners: [number, number, number][] = [
      [hw - cr, hh - cr, 0],
      [-hw + cr, hh - cr, Math.PI / 2],
      [-hw + cr, -hh + cr, Math.PI],
      [hw - cr, -hh + cr, (3 * Math.PI) / 2],
    ];
    for (const [cx, cy, a0] of corners) {
      for (let k = 0; k <= 6; k++) {
        const a = a0 + (k / 6) * (Math.PI / 2);
        ring.push(new Vector3(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr, -0.004));
      }
    }
    // Densify straight runs so the frame bends with the mesh.
    const dense: Vector3[] = [];
    ring.forEach((p, i) => {
      const n = ring[(i + 1) % ring.length];
      const steps = Math.max(1, Math.round(p.distanceTo(n) / 0.04));
      for (let s = 0; s < steps; s++) dense.push(p.clone().lerp(n, s / steps));
    });
    dense.forEach(backShape);
    plastic.push(place(new TubeGeometry(new CatmullRomCurve3(dense, true), low ? 48 : 96, 0.013, low ? 6 : 8, true), backPos, backTilt));
    const lumbar = [-0.2, -0.1, 0, 0.1, 0.2].map((x) => {
      const v = new Vector3(x, -0.13, -0.022);
      backShape(v);
      v.z -= 0.022;
      return v;
    });
    plastic.push(place(new TubeGeometry(new CatmullRomCurve3(lumbar), 16, 0.011, 8, false), backPos, backTilt));
    const meshPanel = place(
      deform(rbox(0.45, 0.57, 0.006, 0.003, seg), (v) => {
        backShape(v);
      }),
      backPos,
      backTilt,
    );

    // --- Arm pads.
    const pads = mergeParts(
      [-1, 1].map((sx) =>
        place(
          deform(rbox(0.078, 0.028, 0.25, 0.012, seg), (v) => {
            if (v.y > 0) v.y -= 0.004 * Math.pow(v.z / 0.125, 2);
          }),
          [sx * 0.265, SEAT_Y + 0.168, -0.02],
        ),
      ),
    );

    // --- Chrome gas lift.
    const lift = mergeParts([place(cyl(0.024, 0.024, 0.24, radial), [0, 0.24, 0]), place(cyl(0.028, 0.028, 0.012, radial), [0, 0.135, 0])]);

    // --- Twin-wheel caster (one geometry, instanced ×5): hood + stem + wheels.
    const caster = mergeParts([
      place(rbox(0.05, 0.026, 0.06, 0.01, 2), [0, 0.04, -0.008]),
      place(cyl(0.006, 0.006, 0.03, 8), [0, 0.06, 0]),
      place(cyl(0.024, 0.024, 0.013, radial), [-0.017, 0.024, -0.012], [0, 0, Math.PI / 2]),
      place(cyl(0.024, 0.024, 0.013, radial), [0.017, 0.024, -0.012], [0, 0, Math.PI / 2]),
    ]);

    return {
      alu: mergeParts(alu),
      plastic: mergeParts(plastic),
      seat,
      meshPanel,
      pads,
      lift,
      caster,
    };
  }, [low]);

  const casterRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = casterRef.current;
    if (!m) return;
    const mat = new Matrix4();
    const qq = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const s = new Vector3(1, 1, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      // Casters trail at slightly different swivel angles, like a real chair.
      qq.setFromAxisAngle(up, a + 0.6 + i * 0.9);
      mat.compose(new Vector3(Math.cos(a) * CASTER_RADIUS, 0, -Math.sin(a) * CASTER_RADIUS), qq, s);
      m.setMatrixAt(i, mat);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    // mats too: a tier change rebuilds the materials, which re-creates the
    // instanced mesh (new args) with identity matrices.
  }, [geo, mats]);

  return (
    <group ref={groupRef} position={[2.6, 0, -2.6]} rotation={[0, INITIAL_Y, 0]}>
      {/* Floor boards' top surface is at y = 0.04. */}
      <group position={[0, FLOOR_Y, 0]}>
      <mesh geometry={geo.alu} material={mats.alu} castShadow receiveShadow />
      <instancedMesh ref={casterRef} args={[geo.caster, mats.plastic, 5]} />
      <mesh geometry={geo.lift} material={mats.chrome} />
      <mesh geometry={geo.plastic} material={mats.plastic} castShadow receiveShadow />
      <mesh geometry={geo.seat} material={mats.seat} castShadow receiveShadow />
      <mesh geometry={geo.meshPanel} material={mats.mesh} castShadow receiveShadow />
      <mesh geometry={geo.pads} material={mats.pad} />
      </group>
    </group>
  );
}

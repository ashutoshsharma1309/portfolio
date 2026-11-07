import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { BackSide, Box3, Color, OrthographicCamera, Vector3, type DirectionalLight } from "three";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { QUALITY_CONFIGS, useRoomQuality } from "./quality";

// ---------------------------------------------------------------------------
// Lighting rig for the cutaway room (floor + back wall at z=-5 + left wall at
// x=-5, open front/right). Everything is local: no HDR download.
//
//   - Environment: a once-rendered cube map of Lightformer panels (window on
//     the back wall's right side at world ≈ (3.2, 2.6, -4.92), a soft ceiling
//     bounce, warm floor bounce, plaster-wall bounce, dim open-side fill).
//     It supplies all ambient/diffuse fill and every metal reflection.
//   - Sun: one shadow-casting directional "daylight" from the window (+x)
//     side, high, so both walls read; shadow frustum fitted to the room.
//   - Fill: a weak warm directional (no shadow) from the open front so faces
//     toward the camera never go muddy on small/low-DPR screens.
//   - ContactShadows: rendered ONCE (frames=1) for soft grounding.
// ---------------------------------------------------------------------------

/** Direction TOWARD the sun (from the room center). +x = window side. */
// z raised from 0.31: at 0.31 the sun grazed the back wall (~18°), so shelf /
// vine shadows were thrown 2× their wall distance sideways and floated as
// detached smudges. 0.42 tucks them under the casters.
const SUN_DIR = new Vector3(0.55, 0.72, 0.42).normalize();
const SUN_DISTANCE = 18;
const SUN_INTENSITY = 2.6;
const SUN_COLOR = new Color("#fff1de");
const SUN_COOL = new Color("#f3f5ff");
/** Everything that casts or receives the sun's shadow (walls are 5 m tall,
 *  the rack's dumbbells poke ~0.4 m past x=5). */
const SHADOW_BOUNDS = new Box3(new Vector3(-5.1, -0.05, -5.1), new Vector3(5.5, 5.05, 5.4));

/** Sits just above the floor boards (top ≈ 0.04) and the rug (≈ 0.05) so
 *  those flat layers don't render as occluders into the contact shadow. */
const CONTACT_SHADOW_Y = 0.058;

const tmpColor = new Color();

/** Fit the directional shadow camera tightly around SHADOW_BOUNDS as seen
 *  from the light, and derive the normal bias from the resulting texel size. */
function fitShadowCamera(light: DirectionalLight, mapSize: number) {
  light.position.copy(SUN_DIR).multiplyScalar(SUN_DISTANCE);
  light.target.position.set(0, 0, 0);
  light.target.updateMatrixWorld();
  light.updateMatrixWorld();

  const view = new OrthographicCamera();
  view.position.copy(light.position);
  view.lookAt(0, 0, 0);
  view.updateMatrixWorld();
  const inv = view.matrixWorldInverse;

  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  const p = new Vector3();
  const b = SHADOW_BOUNDS;
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(inv);
    min.min(p);
    max.max(p);
  }
  const pad = 0.1;
  const cam = light.shadow.camera;
  cam.left = min.x - pad;
  cam.right = max.x + pad;
  cam.bottom = min.y - pad;
  cam.top = max.y + pad;
  cam.near = Math.max(0.1, -max.z - 1);
  cam.far = -min.z + 1;
  cam.updateProjectionMatrix();

  const texel = Math.max(cam.right - cam.left, cam.top - cam.bottom) / mapSize;
  // PCFSoft samples ±1.5 texels; ~1.5 texels along the normal removes acne on
  // gently sloped receivers, and a tiny constant bias handles grazing walls.
  // Small enough that thin objects (desk top, plates) stay grounded.
  light.shadow.normalBias = texel * 1.5;
  light.shadow.bias = -0.00015;
}

export function Lighting() {
  const sunRef = useRef<DirectionalLight>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { config, startTier } = useRoomQuality();
  const shadowMapSize = config.shadowMapSize;
  // Both passes render once (frames={1}), so lowering them at runtime saves
  // nothing per frame — and drei's ContactShadows never disposes the render
  // targets it re-creates on a resolution change. Pin them to the start tier.
  const { envResolution, contactShadowResolution } = QUALITY_CONFIGS[startTier];

  useLayoutEffect(() => {
    const light = sunRef.current;
    if (!light) return;
    if (light.shadow.mapSize.x !== shadowMapSize) {
      light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
      light.shadow.map?.dispose();
      // three re-allocates the shadow render target on the next frame.
      (light.shadow as { map: unknown }).map = null;
    }
    fitShadowCamera(light, shadowMapSize);
  }, [shadowMapSize]);

  // Very slow, very small daylight "breathing" (±2% intensity, slight
  // warm↔neutral shift over ~16 s). Static under reduced motion.
  useFrame((state) => {
    const light = sunRef.current;
    if (!light) return;
    if (reducedMotion) {
      if (light.intensity !== SUN_INTENSITY) {
        light.intensity = SUN_INTENSITY;
        light.color.copy(SUN_COLOR);
      }
      return;
    }
    const k = 0.5 + 0.5 * Math.sin((state.clock.getElapsedTime() / 16) * Math.PI * 2);
    light.intensity = SUN_INTENSITY * (0.98 + 0.04 * k);
    light.color.copy(tmpColor.copy(SUN_COLOR).lerp(SUN_COOL, k * 0.35));
  });

  const enclosureColor = useMemo(() => new Color("#5a524a").multiplyScalar(0.55), []);

  return (
    <>
      <directionalLight
        ref={sunRef}
        intensity={SUN_INTENSITY}
        color={SUN_COLOR}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
      />
      {/* Warm interior fill from the open front (no shadows). */}
      <directionalLight position={[-3, 5, 10]} intensity={0.35} color="#ffe6c7" />

      <Environment resolution={envResolution} frames={1} environmentIntensity={1}>
        {/* Enclosure: the rest of a dim warm interior. */}
        <mesh scale={40}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color={enclosureColor} side={BackSide} toneMapped={false} />
        </mesh>
        {/* Lightformers face the origin (their default `target`). */}
        {/* Window: bright cool daylight on the back wall, right of center. */}
        <Lightformer form="rect" position={[3.2, 2.6, -5]} scale={[2.2, 2.0, 1]} intensity={7} color="#eef4ff" />
        {/* Sky glow spilling around the window. */}
        <Lightformer form="rect" position={[3.2, 2.8, -5.6]} scale={[5, 4, 1]} intensity={1.2} color="#dfe9ff" />
        {/* Soft ceiling bounce. */}
        <Lightformer form="rect" position={[0, 6, 0]} scale={[9, 9, 1]} intensity={1.0} color="#fff4e6" />
        {/* Warm floor bounce (wood). */}
        <Lightformer form="rect" position={[0, -2, 0]} scale={[10, 10, 1]} intensity={0.35} color="#c79b72" />
        {/* Plaster left wall bounce. */}
        <Lightformer form="rect" position={[-5, 2, 0]} scale={[10, 5, 1]} intensity={0.3} color="#efe4d4" />
        {/* Open front/right: the rest of the apartment, dim and neutral. */}
        <Lightformer form="rect" position={[6, 2.5, 6]} scale={[8, 5, 1]} intensity={0.45} color="#fff6ec" />
      </Environment>

      <ContactShadows
        frames={1}
        position={[0, CONTACT_SHADOW_Y, 0]}
        scale={10.4}
        resolution={contactShadowResolution}
        far={1.6}
        blur={2.2}
        opacity={0.42}
        color="#1a120c"
      />
    </>
  );
}

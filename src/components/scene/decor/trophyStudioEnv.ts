// Trophy-only reflection environment.
//
// The room's Lightformer env is made of very large, soft panels, so a smooth
// convex polished cup mirrors an almost uniform colour and reads as paint. Real
// display cabinets give polished metal crisp highlight bands and dark gaps.
// This builds a tiny, dim "showroom" scene (warm floor, mid-grey walls, a window
// softbox where the room's window is, an overhead panel and two narrow strips),
// prefilters it once per renderer with PMREM and hands it to the cup material
// as a per-material envMap. Ref-counted; disposed when no trophy uses it.
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  BackSide,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";

const cache = new WeakMap<WebGLRenderer, { rt: WebGLRenderTarget; tex: Texture; users: number }>();

function buildStudio(): Scene {
  const scene = new Scene();
  // Gradient dome: near-neutral dark floor (a brown floor would turn silver to bronze) → mid horizon → soft bright ceiling.
  const dome = new SphereGeometry(10, 48, 24);
  const pos = dome.getAttribute("position");
  const cols: number[] = [];
  const floor = new Color("#26221f");
  const floorNear = new Color("#857d75");
  const horizon = new Color("#8d857b");
  const ceil = new Color("#d2ccc2");
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 10; // -1..1
    if (t < 0) {
      // lit floor near the horizon, darkening toward the nadir (under the cup)
      const k = Math.min(1, -t * 6);
      c.copy(horizon).lerp(floorNear, k).lerp(floor, Math.pow(Math.max(0, -t - 0.15) / 0.85, 0.8));
    }
    else c.copy(horizon).lerp(ceil, Math.pow(t, 1.6));
    cols.push(c.r, c.g, c.b);
  }
  dome.setAttribute("color", new Float32BufferAttribute(cols, 3));
  scene.add(new Mesh(dome, new MeshBasicMaterial({ side: BackSide, vertexColors: true })));

  const panel = (w: number, h: number, intensity: number, hex: string, x: number, y: number, z: number) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(intensity) }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  // window softbox (room window sits toward +x / -z)
  panel(3.2, 2.6, 3.2, "#eef3fb", 3.5, 2.2, -5.5);
  // overhead ceiling panel
  panel(3.5, 3.5, 1.4, "#fff3e2", 0, 6.5, 0);
  // two narrow vertical strips -> crisp edge highlights down the bowl
  panel(0.35, 4.5, 2.4, "#fff6ea", -5.5, 1.5, 2.5);
  panel(0.3, 4, 1.6, "#f1f4f8", 5.5, 1.2, 3.5);
  panel(0.5, 3.2, 1.3, "#fff4e4", -2.6, 0.8, 6);
  panel(0.4, 3.2, 1.0, "#f4f6fa", 6, 0.8, -1.5);
  // a few darker objects around the horizon (furniture) -> contrast bands
  const dark = (w: number, h: number, x: number, z: number, hex: string) => {
    const b = new Mesh(new BoxGeometry(w, h, w), new MeshBasicMaterial({ color: hex }));
    b.position.set(x, h / 2 - 1.2, z);
    scene.add(b);
  };
  dark(1.6, 2.2, -5.5, -4, "#2a221c");
  dark(1.2, 1.4, 5.5, 5, "#2e2620");
  dark(2.0, 1.0, -2, 6.5, "#3a2e24");
  // sunlit floor patch under the window
  const pool = new Mesh(new PlaneGeometry(3, 2), new MeshBasicMaterial({ color: new Color("#d9b48a").multiplyScalar(1.3) }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(2.5, -2.5, -2.5);
  scene.add(pool);
  return scene;
}

function disposeScene(scene: Scene) {
  scene.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as MeshBasicMaterial).dispose();
    }
  });
}

/** Returns the prefiltered studio env (null until built). */
export function useTrophyStudioEnv(): Texture | null {
  const gl = useThree((s) => s.gl);
  const [tex, setTex] = useState<Texture | null>(() => cache.get(gl)?.tex ?? null);
  useEffect(() => {
    let entry = cache.get(gl);
    if (!entry) {
      const pmrem = new PMREMGenerator(gl);
      const scene = buildStudio();
      const rt = pmrem.fromScene(scene, 0.02);
      disposeScene(scene);
      pmrem.dispose();
      entry = { rt, tex: rt.texture, users: 0 };
      cache.set(gl, entry);
    }
    entry.users++;
    setTex(entry.tex);
    return () => {
      const e = cache.get(gl);
      if (!e) return;
      e.users--;
      if (e.users <= 0) {
        e.rt.dispose();
        cache.delete(gl);
      }
    };
  }, [gl]);
  return tex;
}

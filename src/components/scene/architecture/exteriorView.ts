// Exterior daylight view for the window (sky, soft cloud bank, hazy tree
// ridge, nearer tree crowns), baked into a small RGBA8 texture.
//
// The pixel loop costs a few hundred ms on a cold JIT, so it never runs on
// the main thread during the scene's first render: Window.tsx shows a cheap
// sky-gradient placeholder at full size immediately, and the real pixels are
// generated in a small worker (architecture/exteriorWorker.ts), or from an
// idle callback when workers are unavailable, then copied into the same
// texture. The result is cached for the page's lifetime.

export const EXTERIOR_W = 384;
export const EXTERIOR_H = 224;
/** Rows map to view elevation: v = 0 is ~25 deg down, the horizon sits at
 *  v = 0.45, v = 1 is ~30 deg up (see patchExteriorView in Window.tsx). */
const HORIZON = 0.45;

// sRGB 0..1
const ZENITH = [0.55, 0.72, 0.9] as const;
const HAZE = [0.9, 0.93, 0.95] as const;
const CLOUD = [0.98, 0.98, 0.98] as const;
const RIDGE = [0.62, 0.68, 0.66] as const;
const CANOPY_LIT = [0.62, 0.7, 0.5] as const;
const CANOPY_SHADE = [0.33, 0.4, 0.31] as const;

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) {
  return 0.5 * vnoise(x, y) + 0.3 * vnoise(x * 2.1 + 5, y * 2.1) + 0.2 * vnoise(x * 4.3 + 9, y * 4.3 + 3);
}
function smooth(a: number, b: number, t: number) {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
}
const to8 = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255);

/** Cheap stand-in shown until the real view is ready: the same sky/haze
 *  gradient without clouds or trees (one pass, no noise). */
export function exteriorPlaceholder(): Uint8Array<ArrayBuffer> {
  const W = EXTERIOR_W;
  const H = EXTERIOR_H;
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    const v = j / (H - 1);
    const t = Math.pow(smooth(HORIZON - 0.02, 0.95, v), 0.7);
    const below = 1 - smooth(HORIZON - 0.04, HORIZON + 0.02, v);
    const r = to8(HAZE[0] + (ZENITH[0] - HAZE[0]) * t - below * 0.2);
    const g = to8(HAZE[1] + (ZENITH[1] - HAZE[1]) * t - below * 0.17);
    const b = to8(HAZE[2] + (ZENITH[2] - HAZE[2]) * t - below * 0.25);
    for (let i = 0; i < W; i++) {
      const k = (j * W + i) * 4;
      data[k] = r;
      data[k + 1] = g;
      data[k + 2] = b;
      data[k + 3] = 255;
    }
  }
  return data;
}

/** Full exterior view (RGBA8, sRGB). Pure; safe to run in a worker. */
export function generateExteriorPixels(): Uint8Array<ArrayBuffer> {
  const W = EXTERIOR_W;
  const H = EXTERIOR_H;
  const data = new Uint8Array(W * H * 4);
  // Per-column silhouettes (depend on u only).
  const ridgeAt = new Float32Array(W);
  const crownAt = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    const u = i / (W - 1);
    ridgeAt[i] = HORIZON + 0.03 + (fbm(u * 10, 1.3) - 0.5) * 0.07;
    // Nearer tree crowns: lumpy silhouettes (sum of round crowns).
    let top = HORIZON - 0.08;
    for (let t = 0; t < 9; t++) {
      const cx = hash(t, 3.1) * 1.1 - 0.05;
      const rw = 0.06 + hash(t, 7.7) * 0.07;
      const hgt = 0.07 + hash(t, 1.9) * 0.15;
      const dx = (u - cx) / rw;
      if (Math.abs(dx) < 1) top = Math.max(top, HORIZON - 0.12 + hgt * Math.sqrt(1 - dx * dx));
    }
    crownAt[i] = top + (fbm(u * 40, 3.3) - 0.5) * 0.03;
  }
  for (let j = 0; j < H; j++) {
    const v = j / (H - 1);
    const skyK = Math.pow(smooth(HORIZON - 0.02, 0.95, v), 0.7);
    const cloudBand = smooth(0.55, 0.75, v);
    const skyR = HAZE[0] + (ZENITH[0] - HAZE[0]) * skyK;
    const skyG = HAZE[1] + (ZENITH[1] - HAZE[1]) * skyK;
    const skyB = HAZE[2] + (ZENITH[2] - HAZE[2]) * skyK;
    for (let i = 0; i < W; i++) {
      const u = i / (W - 1);
      let r = skyR;
      let g = skyG;
      let b = skyB;
      if (cloudBand > 0) {
        const t = smooth(0.5, 0.78, fbm(u * 5, v * 7 + 2)) * cloudBand * 0.75;
        r += (CLOUD[0] - r) * t;
        g += (CLOUD[1] - g) * t;
        b += (CLOUD[2] - b) * t;
      }
      // Distant ridge of trees / roofs on the horizon, hazed out.
      const ridge = ridgeAt[i];
      const tRidge = 1 - smooth(ridge - 0.006, ridge + 0.006, v);
      if (tRidge > 0) {
        const h = 0.35 + 0.15 * fbm(u * 50, v * 40);
        r += (RIDGE[0] + (HAZE[0] - RIDGE[0]) * h - r) * tRidge;
        g += (RIDGE[1] + (HAZE[1] - RIDGE[1]) * h - g) * tRidge;
        b += (RIDGE[2] + (HAZE[2] - RIDGE[2]) * h - b) * tRidge;
      }
      // Crowns: sunlit clumps, shaded gaps, brighter toward the tops.
      const crownTop = crownAt[i];
      const tCanopy = 1 - smooth(crownTop - 0.006, crownTop + 0.006, v);
      if (tCanopy > 0) {
        const clumps = fbm(u * 22, v * 16 + 5);
        const fine = fbm(u * 80, v * 60);
        const lit = Math.min(1, smooth(0.3, 0.72, clumps) * (0.7 + 0.6 * fine) + smooth(crownTop - 0.12, crownTop, v) * 0.25);
        const cr = CANOPY_SHADE[0] + (CANOPY_LIT[0] - CANOPY_SHADE[0]) * lit;
        const cg = CANOPY_SHADE[1] + (CANOPY_LIT[1] - CANOPY_SHADE[1]) * lit;
        const cb = CANOPY_SHADE[2] + (CANOPY_LIT[2] - CANOPY_SHADE[2]) * lit;
        r += (cr + (HAZE[0] - cr) * 0.36 - r) * tCanopy;
        g += (cg + (HAZE[1] - cg) * 0.36 - g) * tCanopy;
        b += (cb + (HAZE[2] - cb) * 0.36 - b) * tCanopy;
      }
      const k = (j * W + i) * 4;
      data[k] = to8(r);
      data[k + 1] = to8(g);
      data[k + 2] = to8(b);
      data[k + 3] = 255;
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Off-main-thread generation, cached per page load.

let pending: Promise<Uint8Array<ArrayBuffer>> | null = null;

function onIdle(fn: () => void) {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback;
  if (ric) ric(fn, { timeout: 1500 });
  else setTimeout(fn, 50);
}

function generateOnIdle(): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve) => onIdle(() => resolve(generateExteriorPixels())));
}

/** Resolves with the exterior pixels; generation starts on first call. */
export function loadExteriorPixels(): Promise<Uint8Array<ArrayBuffer>> {
  if (pending) return pending;
  pending = new Promise((resolve) => {
    if (typeof Worker === "undefined") {
      void generateOnIdle().then(resolve);
      return;
    }
    let w: Worker;
    try {
      w = new Worker(new URL("./exteriorWorker.ts", import.meta.url), { type: "module" });
    } catch {
      void generateOnIdle().then(resolve);
      return;
    }
    const fallback = () => {
      w.terminate();
      void generateOnIdle().then(resolve);
    };
    w.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      w.terminate();
      resolve(new Uint8Array(e.data));
    };
    w.onerror = fallback;
    w.onmessageerror = fallback;
    w.postMessage("go");
  });
  return pending;
}

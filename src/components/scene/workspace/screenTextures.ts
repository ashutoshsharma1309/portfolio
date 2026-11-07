// Small procedural DataTextures for the workspace: monitor wallpapers (used as
// emissive maps, so the screens glow at believable LCD brightness instead of
// a flat neon fill) and the page-edge stripes on book blocks. Generated
// synchronously — each is tiny (≤ 256 × 160) and costs well under 1 ms.

import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";

type RGB = readonly [number, number, number];

const hex = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** Signed distance to a rounded rectangle centred at (cx, cy). */
function sdRoundRect(px: number, py: number, cx: number, cy: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function finish(data: Uint8Array<ArrayBuffer>, w: number, h: number, srgb = true, repeat = false): DataTexture {
  const t = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/**
 * Desktop wallpaper in the room's blue (the original "blue gradient" screen):
 * deep navy → cobalt diagonal gradient with soft light ribbons, a thin menu
 * bar and a dock of muted app tiles. Row 0 = bottom of the screen.
 */
export function createBlueDesktopTexture(w = 256, h = 144): DataTexture {
  const data = new Uint8Array(w * h * 4);
  const navy = hex("#0b2350");
  const cobalt = hex("#2f6fd6");
  const sky = hex("#7fb0ee");
  const icons = ["#e8eef7", "#5aa0f0", "#f0b450", "#62c48a", "#e06a5a", "#9a8cf0", "#cfd8e4"].map(hex);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const v = (y + 0.5) / h;
      // Diagonal gradient, brighter toward the top-right.
      const g = clamp01(0.15 + 0.55 * u * 0.6 + 0.6 * v * 0.7);
      let c = mix(navy, cobalt, g);
      // Two soft "aurora" ribbons.
      const r1 = v - (0.42 + 0.16 * Math.sin(u * 5.2 + 0.6));
      const r2 = v - (0.6 + 0.12 * Math.sin(u * 3.4 + 2.1));
      c = mix(c, sky, 0.32 * Math.exp(-(r1 * r1) / 0.004));
      c = mix(c, sky, 0.18 * Math.exp(-(r2 * r2) / 0.009));
      // Vignette.
      const vx = u - 0.5;
      const vy = v - 0.5;
      const vig = 1 - 0.35 * (vx * vx + vy * vy) * 2;
      c = [c[0] * vig, c[1] * vig, c[2] * vig];
      // Menu bar (top 3%).
      if (v > 0.968) c = mix(c, hex("#1a2a44"), 0.55);
      // Dock: rounded translucent bar near the bottom centre.
      const px = u * w;
      const py = v * h;
      const dock = sdRoundRect(px, py, w / 2, 9, 46, 6.5, 4);
      if (dock < 0) {
        c = mix(c, hex("#dfe8f5"), 0.22);
        for (let i = 0; i < icons.length; i++) {
          const ix = w / 2 - 36 + i * 12;
          const d = sdRoundRect(px, py, ix, 9, 4.2, 4.2, 1.6);
          if (d < 0.5) c = mix(c, icons[i], clamp01(0.5 - d) * 0.85);
        }
      }
      const o = (y * w + x) * 4;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = 255;
    }
  }
  return finish(data, w, h);
}

/**
 * Terminal window background: near-black green-tinted canvas with a title bar
 * (three muted window buttons) and a faint inner padding edge. The animated
 * text is drawn on top with drei <Text>.
 */
export function createTerminalTexture(w = 256, h = 144): DataTexture {
  const data = new Uint8Array(w * h * 4);
  const bg = hex("#0a120e");
  const bar = hex("#1b2420");
  const dots = ["#b5574b", "#b8994a", "#4f9a5a"].map(hex);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = (y + 0.5) / h;
      let c: RGB = bg;
      // Slight top-to-bottom falloff like a real panel's backlight.
      const k = 0.9 + 0.1 * v;
      c = [c[0] * k, c[1] * k, c[2] * k];
      if (y >= h - 10) {
        c = bar;
        for (let i = 0; i < 3; i++) {
          const d = Math.hypot(x + 0.5 - (8 + i * 9), y + 0.5 - (h - 5));
          c = mix(c, dots[i], smooth(3.2, 2.2, d));
        }
      } else if (y === h - 11) {
        c = mix(bar, bg, 0.5);
      }
      const o = (y * w + x) * 4;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = 255;
    }
  }
  return finish(data, w, h);
}

/** Page-block stripes (stacked sheet edges) varying along U. */
export function createPageEdgeTexture(w = 128, h = 4): DataTexture {
  const data = new Uint8Array(w * h * 4);
  const paper = hex("#efe8d6");
  const shade = hex("#cfc6b0");
  for (let x = 0; x < w; x++) {
    const n = Math.sin(x * 12.9898) * 43758.5453;
    const r = n - Math.floor(n);
    const t = r < 0.18 ? 0.55 : r < 0.4 ? 0.25 : 0.05;
    const c = mix(paper, shade, t);
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 4;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = 255;
    }
  }
  return finish(data, w, h, true, true);
}

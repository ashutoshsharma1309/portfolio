import { motion } from "framer-motion";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import type { Quality } from "./NeuralCore";

// three.js + R3F live in their own chunk, fetched after first paint so the
// headline (the LCP element) never waits on WebGL.
const NeuralCore = lazy(() => import("./NeuralCore"));

/**
 * True only for hardware-accelerated WebGL. Software rasterizers (SwiftShader,
 * llvmpipe — common in VMs, locked-down machines and headless browsers) can
 * render the scene but block the main thread for seconds compiling shaders,
 * so they get the static visual instead.
 */
function hasHardwareWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ||
      c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(
      gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
    );
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(
      renderer,
    );
  } catch {
    return false;
  }
}

function pickQuality(tier: ReturnType<typeof useDeviceTier>): Quality {
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const weak = cores <= 4 || memory <= 4;
  if (tier === "mobile") return "low";
  if (tier === "tablet" || weak) return "medium";
  return "high";
}

/** Static stand-in drawn in CSS: shown while the 3D chunk loads and kept as the
 *  final visual if WebGL is unavailable. Positioned to match the 3D framing. */
function StaticOrb({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-[76%] top-[23%] aspect-square w-[58vw] max-w-[360px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-1000 lg:left-[70%] lg:top-1/2 lg:w-[38vw] lg:max-w-[560px]"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="absolute inset-[18%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgb(var(--accent) / 0.35), rgb(var(--accent) / 0.06) 45%, transparent 70%)",
        }}
      />
      <div className="absolute inset-[6%] rounded-full border border-accent/20" />
      <div className="absolute inset-0 rotate-[24deg] scale-y-[0.38] rounded-full border border-accent/15" />
      <div className="absolute inset-[-6%] -rotate-[30deg] scale-y-[0.3] rounded-full border border-ice/10" />
      <div
        className="absolute inset-[6%] rounded-full opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(rgb(var(--accent) / 0.55) 1px, transparent 1.4px)",
          backgroundSize: "18px 18px",
          maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle, black 30%, transparent 70%)",
        }}
      />
    </div>
  );
}

export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useDeviceTier();
  const reduced = usePrefersReducedMotion();
  // Phones get the lightweight static visual; tablets and desktops get WebGL.
  const [webgl] = useState(() => tier !== "mobile" && hasHardwareWebGL());
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(true);
  const [quality] = useState<Quality>(() => pickQuality(tier));
  const handleReady = useCallback(() => setReady(true), []);

  // Defer the WebGL mount to idle time after first paint.
  useEffect(() => {
    if (!webgl) return;
    const w = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setMounted(true), {
        timeout: 1200,
      });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setMounted(true), 250);
    return () => window.clearTimeout(id);
  }, [webgl]);

  // Pause the render loop entirely once the hero scrolls away.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const showCanvas = webgl && mounted && !failed;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 opacity-70 lg:opacity-100"
    >
      <StaticOrb visible={!ready || failed} />
      {showCanvas && (
        <ErrorBoundary fallback={null} onError={() => setFailed(true)}>
          <Suspense fallback={null}>
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
              animate={ready ? { opacity: 1, scale: 1 } : undefined}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <NeuralCore
                quality={quality}
                reduced={reduced}
                active={inView}
                onReady={handleReady}
              />
            </motion.div>
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { usePointerFine } from "../hooks/usePointerFine";

/**
 * Fixed atmospheric layers behind every section: ambient light pools, film
 * grain, and (precise pointers only) a soft light that trails the cursor.
 * Everything is static CSS except the cursor light, which is a single
 * transformed element updated on rAF — no blur filters, no layout work.
 */
export function Backdrop() {
  const fine = usePointerFine();
  const reduced = usePrefersReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-ink-950" />
      {/* Ambient pools: warm key light top-left, cool fill bottom-right. */}
      <div
        className="absolute -left-[20vw] -top-[25vh] h-[80vh] w-[80vw] opacity-70"
        style={{
          background:
            "radial-gradient(closest-side, rgb(var(--accent) / 0.10), transparent)",
        }}
      />
      <div
        className="absolute -bottom-[30vh] -right-[20vw] h-[90vh] w-[80vw] opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, rgb(var(--ice) / 0.08), transparent)",
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgb(var(--ink-950) / 0.7) 100%)",
        }}
      />
      <div className="grain absolute inset-0" />
      {fine && !reduced && <CursorLight />}
    </div>
  );
}

function CursorLight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 3;
    let x = tx;
    let y = ty;
    let raf = 0;
    let running = false;

    const tick = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      if (ref.current)
        ref.current.style.transform = `translate3d(${x - 300}px, ${y - 300}px, 0)`;
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 h-[600px] w-[600px] will-change-transform"
      style={{
        background:
          "radial-gradient(closest-side, rgb(var(--accent) / 0.06), transparent)",
        transform: "translate3d(-600px,-600px,0)",
      }}
    />
  );
}

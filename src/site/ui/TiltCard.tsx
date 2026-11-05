import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { useRef, type ReactNode, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { usePointerFine } from "../hooks/usePointerFine";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees. */
  max?: number;
  /** Accent color for the cursor-following light. */
  glow?: string;
}

/**
 * Perspective tilt with a soft light that tracks the cursor across the
 * surface. Transforms only (GPU-friendly); disabled on touch + reduced motion.
 */
export function TiltCard({
  children,
  className,
  max = 5,
  glow = "244,185,66",
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = usePointerFine();
  const reduced = usePrefersReducedMotion();
  const enabled = fine && !reduced;

  const spring = { stiffness: 150, damping: 18, mass: 0.5 };
  const rx = useSpring(0, spring);
  const ry = useSpring(0, spring);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const lightOpacity = useSpring(0, { stiffness: 120, damping: 20 });

  const light = useMotionTemplate`radial-gradient(520px circle at ${mx}% ${my}%, rgba(${glow},0.13), transparent 55%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    mx.set(px * 100);
    my.set(py * 100);
    lightOpacity.set(1);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    lightOpacity.set(0);
  };

  return (
    <div className="h-full [perspective:1400px]">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={
          enabled
            ? { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }
            : undefined
        }
        className={`relative ${className ?? ""}`}
      >
        {children}
        {enabled && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ background: light, opacity: lightOpacity }}
          />
        )}
      </motion.div>
    </div>
  );
}

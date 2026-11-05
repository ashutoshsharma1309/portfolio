import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, type ReactNode, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { usePointerFine } from "../hooks/usePointerFine";
import { SPRING_SOFT } from "../motion";

interface MagneticProps {
  children: ReactNode;
  /** How far (as a fraction of the pointer offset) the child follows. */
  strength?: number;
  className?: string;
}

/**
 * Wraps an interactive element so it leans toward the cursor and springs back
 * on leave. Inert on touch devices and under reduced motion.
 */
export function Magnetic({
  children,
  strength = 0.28,
  className,
}: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const fine = usePointerFine();
  const reduced = usePrefersReducedMotion();
  const enabled = fine && !reduced;

  const x = useSpring(useMotionValue(0), SPRING_SOFT);
  const y = useSpring(useMotionValue(0), SPRING_SOFT);

  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      ref={ref}
      className={`inline-flex ${className ?? ""}`}
      style={enabled ? { x, y } : undefined}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.span>
  );
}

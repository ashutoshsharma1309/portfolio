import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface RevealProps {
  children: ReactNode;
  /** Stagger index — multiplies the entrance delay. */
  index?: number;
  className?: string;
  as?: "div" | "li" | "article" | "section";
}

/**
 * Scroll-reveal wrapper: fades + lifts content in as it enters the viewport,
 * once. Collapses to a no-op when the user prefers reduced motion. Used across
 * panels for a consistent, premium reveal without re-implementing variants.
 */
export function Reveal({
  children,
  index = 0,
  className,
  as = "div",
}: RevealProps) {
  const reduced = usePrefersReducedMotion();
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: reduced ? 0 : index * 0.06 }}
    >
      {children}
    </MotionTag>
  );
}

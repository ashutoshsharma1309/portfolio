import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  /** Animation duration in ms. */
  duration?: number;
  className?: string;
}

/**
 * Counts up from 0 to `value` once it scrolls into view. Honors reduced-motion
 * (renders the final value immediately) and exposes the real number to
 * assistive tech via the element text.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  duration = 1400,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let start: number | null = null;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(easeOut(progress) * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value, duration]);

  return (
    // tabular-nums keeps every digit the same width so the surrounding layout
    // doesn't reflow/jitter as the value counts up.
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

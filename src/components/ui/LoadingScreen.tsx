import { motion } from "framer-motion";
import { BIO } from "../../config/content";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

export function LoadingScreen() {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a1628]"
      role="status"
      aria-live="polite"
    >
      <div className="mb-8 text-center font-display text-3xl tracking-[0.25em] text-gold md:text-4xl">
        {BIO.name.toUpperCase()}
      </div>
      <div className="flex gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-gold"
            animate={
              reduced
                ? { opacity: 0.6 }
                : { opacity: [0.2, 1, 0.2], y: [0, -4, 0] }
            }
            transition={
              reduced
                ? { duration: 0 }
                : {
                    duration: 1.0,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </div>
      <div className="mt-6 text-xs uppercase tracking-widest text-gold/80">
        Loading the room…
      </div>
    </motion.div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { useSceneStore } from "../../store/useSceneStore";

export function BackButton() {
  const active = useSceneStore((s) => s.activeHotspot);
  const reset = useSceneStore((s) => s.resetToDefault);
  const visible = active !== "default";

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          onClick={reset}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed top-24 left-6 z-30 px-4 py-2 rounded-full bg-navy/90 border border-gold/40 text-gold font-display tracking-wider text-sm flex items-center gap-2 backdrop-blur-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          BACK
        </motion.button>
      )}
    </AnimatePresence>
  );
}

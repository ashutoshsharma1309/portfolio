import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { useSceneStore } from "../../store/useSceneStore";

interface PanelProps {
  title: string;
  children: ReactNode;
  /** Optional Tailwind class added to the inner scroll container (e.g. for
   *  panel-specific scrollbar theming). */
  scrollClassName?: string;
}

// Shared shell for all four side panels. Behavior changes per device tier:
//   desktop  — slide in from the right, ~480px wide
//   tablet   — slide in from the right, ~60vw wide
//   mobile   — slide up from the bottom, full-screen modal with drag handle
//              and a clear close (X) button. The 3D scene is hidden behind it
//              so we don't pay rendering cost for what no one can see.
export function Panel({ title, children, scrollClassName = "" }: PanelProps) {
  const tier = useDeviceTier();
  const reset = useSceneStore((s) => s.resetToDefault);

  if (tier === "mobile") {
    return (
      <motion.aside
        key="panel-mobile"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 240, damping: 30 }}
        className="fixed inset-0 z-30 bg-navy flex flex-col"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Drag handle (visual only) */}
        <div className="flex justify-center pt-2 pb-1">
          <span className="block h-1 w-10 rounded-full bg-gold/40" />
        </div>
        {/* Header row with close button */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-gold/10">
          <h2 className="text-gold font-display text-2xl tracking-wider">
            {title}
          </h2>
          <button
            onClick={reset}
            aria-label="Close"
            className="p-2 -mr-2 rounded-full text-gold hover:bg-white/5 active:bg-white/10"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div
          className={`flex-1 overflow-y-auto px-6 pt-4 pb-8 ${scrollClassName}`}
        >
          {children}
        </div>
      </motion.aside>
    );
  }

  // Desktop + tablet: side panel from the right.
  const widthClass = tier === "tablet" ? "w-[60vw]" : "w-[480px]";

  return (
    <motion.aside
      key="panel-side"
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 28 }}
      className={`fixed top-0 right-0 bottom-0 ${widthClass} max-w-full z-20 bg-navy/95 backdrop-blur-md border-l border-gold/20 flex flex-col`}
    >
      <div className="pt-24 px-8 pb-2 flex items-start justify-between">
        <h2 className="text-gold font-display text-3xl tracking-wider">
          {title}
        </h2>
      </div>
      <div
        className={`flex-1 overflow-y-auto px-8 pt-4 pb-8 ${scrollClassName}`}
      >
        {children}
      </div>
    </motion.aside>
  );
}

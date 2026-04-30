import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSceneStore } from "../../store/useSceneStore";
import type { HotspotKey } from "../../config/cameraPositions";

interface NavItem {
  key: HotspotKey;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "aboutFrames", label: "ABOUT ME" },
  { key: "projectsDesk", label: "PROJECTS" },
  { key: "rack", label: "POWERLIFTING" },
  { key: "whiteboard", label: "WHITEBOARD" },
];

export function TopNav() {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const active = useSceneStore((s) => s.activeHotspot);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (key: HotspotKey) => {
    setHotspot(key);
    setMobileOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-navy/95 backdrop-blur-sm border-b border-gold/20">
      <div className="max-w-[1400px] mx-auto px-5 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <motion.div
          className="text-gold font-display text-lg md:text-2xl tracking-wider select-none"
          whileHover={{ scale: 1.05 }}
        >
          PORTFOLIO
        </motion.div>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6 lg:gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <motion.button
                key={item.key}
                onClick={() => setHotspot(item.key)}
                className={`font-display tracking-widest text-sm lg:text-base relative ${
                  isActive ? "text-white" : "text-gold"
                }`}
                whileHover={{
                  scale: 1.05,
                  textShadow: "0 0 12px rgba(244,185,66,0.7)",
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Mobile hamburger / close */}
        <button
          className="md:hidden text-gold p-2 -mr-2 rounded-md active:bg-white/10"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            {mobileOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 top-[57px] bg-navy/98 backdrop-blur-md flex flex-col"
          >
            {NAV_ITEMS.map((item, i) => (
              <motion.button
                key={item.key}
                onClick={() => handleSelect(item.key)}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.04 * i }}
                className="px-6 text-left font-display tracking-widest text-gold border-b border-gold/10 active:bg-white/10 text-xl"
                style={{ minHeight: 64 }}
              >
                {item.label}
              </motion.button>
            ))}
            <div className="px-6 py-6 text-gold/60 text-xs uppercase tracking-widest">
              tap an item · camera will fly
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

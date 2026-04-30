import { motion } from "framer-motion";
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

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-navy/95 backdrop-blur-sm border-b border-gold/20">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        <motion.div
          className="text-gold font-display text-xl tracking-wider select-none"
          whileHover={{ scale: 1.05 }}
        >
          PORTFOLIO
        </motion.div>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <motion.button
                key={item.key}
                onClick={() => setHotspot(item.key)}
                className={`font-display tracking-widest text-sm md:text-base relative ${
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

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gold"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.nav
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="md:hidden bg-navy border-t border-gold/20"
        >
          <div className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setHotspot(item.key);
                  setMobileOpen(false);
                }}
                className="px-6 py-4 text-left font-display tracking-widest text-gold border-b border-gold/10 hover:bg-white/5"
              >
                {item.label}
              </button>
            ))}
          </div>
        </motion.nav>
      )}
    </header>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useSceneStore } from "../../store/useSceneStore";
import { BIO } from "../../config/content";
import { Icon, type IconName } from "../ui/Icon";
import type { HotspotKey } from "../../config/cameraPositions";

interface NavItem {
  key: HotspotKey;
  label: string;
  icon: IconName;
}

// Order matters: Sports sits right after Experience so it's prominent near the
// top of the nav rather than buried at the end. Each item carries an icon that
// communicates the section at a glance (barbell = Powerlifting, trophy =
// Achievements, etc.).
const NAV_ITEMS: NavItem[] = [
  { key: "aboutFrames", label: "ABOUT", icon: "user" },
  { key: "experience", label: "EXPERIENCE", icon: "briefcase" },
  { key: "sportsTrophy", label: "SPORTS", icon: "medal" },
  { key: "projectsDesk", label: "PROJECTS", icon: "layers" },
  { key: "skills", label: "SKILLS", icon: "code" },
  { key: "hackathonTrophy", label: "ACHIEVEMENTS", icon: "trophy" },
  { key: "rack", label: "POWERLIFTING", icon: "barbell" },
  { key: "whiteboard", label: "CONTACT", icon: "mail" },
];

export function TopNav() {
  const setHotspot = useSceneStore((s) => s.setHotspot);
  const reset = useSceneStore((s) => s.resetToDefault);
  const active = useSceneStore((s) => s.activeHotspot);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (key: HotspotKey) => {
    setHotspot(key);
    setMobileOpen(false);
  };

  // Close the mobile menu on Escape, mirroring the Panel dialog behavior.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-navy/95 backdrop-blur-sm border-b border-gold/20">
      <div className="max-w-[1400px] mx-auto px-5 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <motion.button
          onClick={() => {
            reset();
            setMobileOpen(false);
          }}
          aria-label={`${BIO.name} — back to room`}
          className="text-gold font-display text-lg md:text-2xl tracking-wider select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
        >
          {BIO.name.toUpperCase()}
        </motion.button>

        {/* Desktop nav (xl+). Below xl the hamburger menu is used so the 8
            icon + label items never crowd the bar. overflow-x-auto is a safety
            net. gap-5 keeps adjacent icons (e.g. trophy + barbell) well spaced
            so each is easy to click and hovers independently. */}
        <nav className="hidden xl:flex items-center gap-3 2xl:gap-5 overflow-x-auto whitespace-nowrap max-w-[82vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <motion.button
                key={item.key}
                onClick={() => setHotspot(item.key)}
                aria-current={isActive ? "true" : undefined}
                className={`group relative flex shrink-0 items-center gap-1.5 px-1 font-display text-sm tracking-wide ${
                  isActive ? "text-white" : "text-gold"
                }`}
                whileHover={{
                  scale: 1.05,
                  textShadow: "0 0 12px rgba(244,185,66,0.7)",
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Icon
                  name={item.icon}
                  size={16}
                  className={
                    isActive
                      ? "text-white"
                      : "text-gold/80 transition-colors group-hover:text-gold"
                  }
                />
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

        {/* Hamburger / close — shown below xl */}
        <button
          className="xl:hidden text-gold p-2 -mr-2 rounded-md active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
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
      </header>

      {/* Mobile full-screen menu — rendered OUTSIDE the header on purpose. The
          header's backdrop-blur makes it a containing block for fixed-position
          descendants, which would collapse this overlay to the header's height.
          As a sibling it positions relative to the viewport correctly. z-30
          keeps the header bar (z-40, with the close button) tappable on top. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="xl:hidden fixed inset-0 top-[57px] z-30 bg-navy/98 backdrop-blur-md flex flex-col overflow-y-auto pb-6"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            {NAV_ITEMS.map((item, i) => {
              const isActive = active === item.key;
              return (
                <motion.button
                  key={item.key}
                  onClick={() => handleSelect(item.key)}
                  aria-current={isActive ? "true" : undefined}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.04 * i }}
                  className={`flex items-center gap-3 px-6 text-left font-display tracking-widest border-b border-gold/10 active:bg-white/10 text-xl ${
                    isActive ? "text-white" : "text-gold"
                  }`}
                  style={{ minHeight: 64 }}
                >
                  <Icon name={item.icon} size={20} className="text-gold/80" />
                  {item.label}
                </motion.button>
              );
            })}
            <div className="px-6 py-6 text-gold/80 text-xs uppercase tracking-widest">
              tap an item · camera will fly
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}

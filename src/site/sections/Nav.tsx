import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { BIO } from "../../config/content";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "../../config/links";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useActiveSection } from "../hooks/useActiveSection";
import { scrollToSection, setScrollLocked } from "../lib/smoothScroll";
import { DUR, EASE_OUT } from "../motion";
import { ArrowUpRight, BrandIcon } from "../ui/BrandIcon";
import { Magnetic } from "../ui/Magnetic";

const NAV_ITEMS = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "achievements", label: "Achievements" },
] as const;

// Sections without their own nav entry light up their nearest parent item.
const SECTION_TO_NAV: Record<string, string> = {
  about: "about",
  projects: "projects",
  skills: "skills",
  experience: "experience",
  achievements: "achievements",
  profiles: "achievements",
  beyond: "achievements",
  contact: "contact",
};
const OBSERVED = Object.keys(SECTION_TO_NAV);

export function Nav() {
  const reduced = usePrefersReducedMotion();
  const activeSection = useActiveSection(OBSERVED);
  const active = activeSection ? SECTION_TO_NAV[activeSection] : null;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile menu: lock scroll, focus first link, Escape to close, focus return.
  useEffect(() => {
    if (!open) return;
    setScrollLocked(true);
    menuRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const toggle = toggleRef.current;
    return () => {
      setScrollLocked(false);
      document.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const close = () => mq.matches && setOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, []);

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    // Let the menu's scroll lock release before scrolling.
    requestAnimationFrame(() => scrollToSection(id));
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 h-[var(--nav-h)] transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled || open
            ? "border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-ink-950"
        >
          Skip to content
        </a>
        <nav
          aria-label="Primary"
          className="site-container flex h-full items-center justify-between gap-4"
        >
          <a
            href="#top"
            onClick={go("top")}
            className="group flex items-center gap-3"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] font-mono text-[13px] font-medium text-accent transition-colors duration-300 group-hover:border-accent/50"
            >
              AS
            </span>
            {/* Name is always in the accessible label; visible from sm up. */}
            <span className="sr-only sm:not-sr-only sm:text-sm sm:font-medium sm:tracking-tight sm:text-fg">
              {BIO.name}
            </span>
            <span className="sr-only"> — back to top</span>
          </a>

          <ul className="relative hidden items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 lg:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.id;
              return (
                <li key={item.id} className="relative">
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/[0.08]"
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 380, damping: 32 }
                      }
                    />
                  )}
                  <a
                    href={`#${item.id}`}
                    onClick={go(item.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={`relative block rounded-full px-4 py-2 text-[13px] transition-colors duration-300 ${
                      isActive ? "text-fg" : "text-muted hover:text-fg"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="/room"
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-accent md:inline-flex"
            >
              3D Room <ArrowUpRight size={12} />
            </a>
            <Magnetic strength={0.2}>
              <a
                href="#contact"
                onClick={go("contact")}
                aria-current={active === "contact" ? "location" : undefined}
                className="hidden h-10 items-center rounded-full bg-fg px-5 text-[13px] font-medium text-ink-950 transition-colors duration-300 hover:bg-accent sm:inline-flex"
              >
                Contact
              </a>
            </Magnetic>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 lg:hidden"
            >
              <span
                className={`absolute h-px w-4 bg-fg transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[3px]"}`}
              />
              <span
                className={`absolute h-px w-4 bg-fg transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[3px]"}`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Rendered outside <header>: the header's backdrop-filter would otherwise
          become the containing block for this fixed overlay. */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-40 flex flex-col overflow-y-auto bg-ink-950 lg:hidden"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
          >
            <ul className="site-container flex flex-1 flex-col justify-center gap-1 py-10">
              {[...NAV_ITEMS, { id: "contact", label: "Contact" } as const].map(
                (item, i) => (
                  <motion.li
                    key={item.id}
                    initial={reduced ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: DUR.slow,
                      ease: EASE_OUT,
                      delay: reduced ? 0 : 0.05 + i * 0.05,
                    }}
                  >
                    <a
                      href={`#${item.id}`}
                      onClick={go(item.id)}
                      className="flex items-baseline gap-4 py-2 text-[2.6rem] font-medium leading-tight tracking-tight text-fg"
                    >
                      <span className="font-mono text-xs text-accent">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item.label}
                    </a>
                  </motion.li>
                ),
              )}
            </ul>
            <div className="site-container flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] py-6">
              <a
                href="/room"
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.16em] text-accent"
              >
                Enter the 3D room <ArrowUpRight size={12} />
              </a>
              <div className="flex items-center gap-1">
                {(
                  ["github", "linkedin", "leetcode", "codeforces"] as const
                ).map((k) => (
                  <a
                    key={k}
                    href={SOCIAL_LINKS[k]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${k} (opens in new tab)`}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-fg"
                  >
                    <BrandIcon name={k} size={17} />
                  </a>
                ))}
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="w-full truncate text-sm text-muted"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import { motion } from "framer-motion";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useSceneStore } from "../../store/useSceneStore";

interface PanelProps {
  title: string;
  children: ReactNode;
  /** Optional Tailwind class added to the inner scroll container (e.g. for
   *  panel-specific scrollbar theming). */
  scrollClassName?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Shared shell for all side panels. It behaves as an accessible modal dialog:
//   • role="dialog" + aria-modal, labelled by the heading
//   • Escape closes it; focus is moved in on open and restored on close
//   • a focus trap keeps Tab within the panel while it's open
// Layout changes per device tier:
//   desktop  — slide in from the right, ~480px wide
//   tablet   — slide in from the right, ~60vw wide
//   mobile   — slide up from the bottom, full-screen modal with a clear close
export function Panel({ title, children, scrollClassName = "" }: PanelProps) {
  const tier = useDeviceTier();
  const reduced = usePrefersReducedMotion();
  const reset = useSceneStore((s) => s.resetToDefault);
  const headingId = useId();
  const panelRef = useRef<HTMLElement>(null);

  // Focus management: remember what was focused, move focus into the dialog,
  // and restore it when the dialog unmounts.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = panelRef.current;
    // Focus the first focusable element, falling back to the panel itself.
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  // Escape to close + focus trap.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        reset();
        return;
      }
      if (e.key !== "Tab") return;

      const node = panelRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey && activeEl === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && activeEl === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reset]);

  const dialogProps = {
    ref: panelRef,
    role: "dialog" as const,
    "aria-modal": true,
    "aria-labelledby": headingId,
    tabIndex: -1,
  };

  if (tier === "mobile") {
    return (
      <motion.aside
        key="panel-mobile"
        {...dialogProps}
        initial={reduced ? { opacity: 0 } : { y: "100%" }}
        animate={reduced ? { opacity: 1 } : { y: 0 }}
        exit={reduced ? { opacity: 0 } : { y: "100%" }}
        transition={
          reduced
            ? { duration: 0.2 }
            : { type: "spring", stiffness: 240, damping: 30 }
        }
        // z-50 so this full-screen modal sits ABOVE the top nav (z-40);
        // otherwise the nav would cover the panel's title + close button.
        className="fixed inset-0 z-50 flex flex-col bg-navy outline-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Drag handle (visual only) */}
        <div className="flex justify-center pt-2 pb-1">
          <span className="block h-1 w-10 rounded-full bg-gold/40" />
        </div>
        <div className="flex items-center justify-between border-b border-gold/10 px-6 pt-4 pb-2">
          <h2
            id={headingId}
            className="font-display text-2xl tracking-wider text-gold"
          >
            {title}
          </h2>
          <button
            onClick={reset}
            aria-label="Close panel"
            className="-mr-2 rounded-full p-2 text-gold hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
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
      {...dialogProps}
      initial={reduced ? { opacity: 0 } : { x: "100%", opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { x: 0, opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { x: "100%", opacity: 0 }}
      transition={
        reduced
          ? { duration: 0.2 }
          : { type: "spring", stiffness: 240, damping: 28 }
      }
      className={`fixed top-0 right-0 bottom-0 ${widthClass} z-20 flex max-w-full flex-col border-l border-gold/20 bg-navy/95 outline-none backdrop-blur-md`}
    >
      <div className="flex items-start justify-between px-8 pt-24 pb-2">
        <h2
          id={headingId}
          className="font-display text-3xl tracking-wider text-gold"
        >
          {title}
        </h2>
        <button
          onClick={reset}
          aria-label="Close panel"
          className="-mr-2 rounded-full p-2 text-gold/70 transition-colors hover:bg-white/5 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>
      <div className={`flex-1 overflow-y-auto px-8 pt-4 pb-8 ${scrollClassName}`}>
        {children}
      </div>
    </motion.aside>
  );
}

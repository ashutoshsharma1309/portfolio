import type Lenis from "lenis";

// Thin facade over Lenis so components can scroll / lock without caring
// whether smooth scrolling is active (it's disabled under reduced motion).
let lenis: Lenis | null = null;

export function registerLenis(instance: Lenis | null) {
  lenis = instance;
}

function navOffset() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--nav-h",
  );
  const rem = parseFloat(raw) || 4.5;
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

/** Smoothly scroll to a section by id and move focus there for keyboard and
 *  screen-reader users (without a second jump). */
export function scrollToSection(id: string) {
  const el = id === "top" ? null : document.getElementById(id);
  const offset = el ? -navOffset() + 8 : 0;

  if (lenis) {
    lenis.scrollTo(el ?? 0, { offset, duration: 1.15 });
  } else if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y });
  } else {
    window.scrollTo({ top: 0 });
  }

  if (el) {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
}

export function setScrollLocked(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

import Lenis from "lenis";
import { MotionConfig } from "framer-motion";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { registerLenis } from "./lib/smoothScroll";
import { About } from "./sections/About";
import { Achievements } from "./sections/Achievements";
import { Beyond } from "./sections/Beyond";
import { Contact, Footer } from "./sections/Contact";
import { Experience } from "./sections/Experience";
import { Hero } from "./sections/Hero";
import { Nav } from "./sections/Nav";
import { Profiles } from "./sections/Profiles";
import { Projects } from "./sections/Projects";
import { Skills } from "./sections/Skills";
import { Backdrop } from "./ui/Backdrop";

/** The scroll-driven portfolio. The original 3D room lives at /room. */
export function SiteApp() {
  const reduced = usePrefersReducedMotion();

  // Smooth, inertial scrolling — skipped entirely under reduced motion.
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    registerLenis(lenis);
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      registerLenis(null);
      lenis.destroy();
    };
  }, [reduced]);

  return (
    <MotionConfig reducedMotion="user">
      <Backdrop />
      <Nav />
      <main id="main" tabIndex={-1} className="relative outline-none">
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Experience />
        <Achievements />
        <Profiles />
        <Beyond />
        <Contact />
      </main>
      <Footer />
    </MotionConfig>
  );
}

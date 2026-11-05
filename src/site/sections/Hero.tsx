import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { BIO, stats } from "../../config/content";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "../../config/links";
import { AnimatedCounter } from "../../components/ui/AnimatedCounter";
import { Icon } from "../../components/ui/Icon";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { HeroVisual } from "../hero/HeroVisual";
import { heroSignal } from "../hero/heroSignal";
import { scrollToSection } from "../lib/smoothScroll";
import { DUR, EASE_OUT } from "../motion";
import {
  ArrowDown,
  ArrowUpRight,
  BrandIcon,
  type BrandName,
} from "../ui/BrandIcon";
import { Magnetic } from "../ui/Magnetic";
import { RevealText } from "../ui/RevealText";

const SOCIALS: { key: BrandName; label: string }[] = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "leetcode", label: "LeetCode" },
  { key: "codeforces", label: "Codeforces" },
];

// Mobile: 2×2 grid; desktop: 4 across. Explicit per-cell dividers.
const STAT_CELL = [
  "border-b md:border-b-0",
  "border-b border-l pl-5 md:border-b-0 md:pl-8",
  "md:border-l md:pl-8",
  "border-l pl-5 md:pl-8",
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  // "CS Undergraduate · AI & Backend Engineer" → eyebrow + headline.
  const [titleLead, titleRole] = BIO.title.split(" · ");
  const [firstName, ...rest] = BIO.name.split(" ");

  // Feed scroll + pointer into the WebGL scene without React renders.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine =
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ??
      false;

    const onScroll = () => {
      heroSignal.scroll = Math.min(
        1,
        Math.max(0, window.scrollY / Math.max(1, el.offsetHeight)),
      );
    };
    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      heroSignal.px = ((e.clientX - r.left) / r.width) * 2 - 1;
      heroSignal.py = -(((e.clientY - r.top) / r.height) * 2 - 1);
      heroSignal.pointerActive =
        fine && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    const onLeave = () => {
      heroSignal.pointerActive = false;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const fade = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: DUR.slower,
      ease: EASE_OUT,
      delay: reduced ? 0 : delay,
    },
  });

  return (
    <section
      id="top"
      ref={ref}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* Engineering grid, masked to fade at the edges. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 60% 45%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 60% 45%, black, transparent)",
        }}
      />
      <HeroVisual />
      {/* Legibility scrim for narrow screens where text overlaps the visual. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent lg:hidden"
      />

      <div className="site-container relative z-10 flex flex-1 flex-col justify-end pb-12 pt-[calc(var(--nav-h)+3rem)] lg:justify-center lg:pb-12">
        <motion.p
          {...fade(0.1)}
          className="eyebrow mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 md:mb-8"
        >
          <span className="relative flex h-2 w-2">
            {!reduced && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span>{titleLead}</span>
          <span className="text-white/20">/</span>
          <span>{BIO.education.school}</span>
        </motion.p>

        <h1 id="hero-title" className="text-display-1 font-semibold text-fg">
          <RevealText
            as="span"
            immediate
            delay={0.2}
            text={firstName}
            className="block"
          />
          <RevealText
            as="span"
            immediate
            delay={0.32}
            text={rest.join(" ")}
            className="block text-fg/90"
          />
        </h1>

        <motion.p
          {...fade(0.75)}
          className="mt-6 text-display-3 font-light text-fg/90 md:mt-8"
        >
          {titleRole?.split(" & ").map((part, i, arr) => (
            <span key={part}>
              {part}
              {i < arr.length - 1 && (
                <span className="font-serif italic text-accent-soft">
                  {" "}
                  &amp;{" "}
                </span>
              )}
            </span>
          ))}
        </motion.p>

        <motion.p
          {...fade(0.9)}
          className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg"
        >
          {BIO.summary}
        </motion.p>

        <motion.div
          {...fade(1.05)}
          className="mt-8 flex flex-wrap items-center gap-3 md:gap-4"
        >
          <Magnetic>
            <a
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("projects");
              }}
              className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-accent px-6 text-sm font-medium text-ink-950 transition-colors duration-300 hover:bg-accent-soft"
            >
              View projects
              <ArrowDown className="transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("contact");
              }}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-sm font-medium text-fg transition-colors duration-300 hover:border-white/40 hover:bg-white/[0.04]"
            >
              Get in touch
            </a>
          </Magnetic>
          <a
            href="/room"
            className="group inline-flex h-12 items-center gap-2 px-2 font-mono text-xs uppercase tracking-[0.16em] text-muted transition-colors hover:text-accent"
          >
            <span className="link-underline">Enter the 3D room</span>
            <ArrowUpRight className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <ul
            className="flex items-center gap-1 lg:ml-2 lg:border-l lg:border-white/10 lg:pl-4"
            aria-label="Profiles"
          >
            {SOCIALS.map((s) => (
              <li key={s.key}>
                <a
                  href={SOCIAL_LINKS[s.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} (opens in new tab)`}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors duration-300 hover:bg-white/[0.06] hover:text-fg"
                >
                  <BrandIcon name={s.key} size={17} />
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                aria-label={`Email ${CONTACT_EMAIL}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors duration-300 hover:bg-white/[0.06] hover:text-fg"
              >
                <Icon name="mail" size={18} />
              </a>
            </li>
          </ul>
        </motion.div>
      </div>

      {/* Headline stats */}
      <motion.div
        {...fade(1.3)}
        className="relative z-10 border-t border-white/[0.07] bg-ink-950/40"
      >
        <dl className="site-container grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.id}
              className={`flex flex-col gap-1 border-white/[0.07] py-5 md:py-7 ${STAT_CELL[i] ?? ""}`}
            >
              <dt className="eyebrow order-2">{s.label}</dt>
              <dd className="order-1 text-3xl font-medium tracking-tight text-fg md:text-4xl">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>

      {/* Scroll cue */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-36 right-6 z-10 hidden flex-col items-center gap-3 md:flex lg:right-10"
      >
        <span className="eyebrow [writing-mode:vertical-rl]">Scroll</span>
        <span className="relative h-14 w-px overflow-hidden bg-white/10">
          <span className="absolute inset-0 animate-scroll-cue bg-accent" />
        </span>
      </div>
    </section>
  );
}

import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { BIO, focusAreas } from "../../config/content";
import { Icon } from "../../components/ui/Icon";
import { Reveal } from "../../components/ui/Reveal";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { DUR, EASE_OUT } from "../motion";
import { SectionHeader } from "../ui/SectionHeader";

/** A paragraph whose words light up as it scrolls through the viewport. */
function ScrollLitParagraph({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.5"],
  });
  const words = text.split(" ");

  if (reduced) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Word
          key={i}
          progress={scrollYProgress}
          range={[i / words.length, (i + 1) / words.length]}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </Word>
      ))}
    </p>
  );
}

function Word({
  children,
  progress,
  range,
}: {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  // Floor of 0.4 keeps unlit words above WCAG large-text contrast.
  const opacity = useTransform(progress, range, [0.4, 1]);
  return <motion.span style={{ opacity }}>{children}</motion.span>;
}

export function About() {
  const [activeFocus, setActiveFocus] = useState(focusAreas[0].id);
  const current = focusAreas.find((f) => f.id === activeFocus) ?? focusAreas[0];
  const reduced = usePrefersReducedMotion();

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="relative scroll-mt-20 py-28 md:py-40"
    >
      <div className="site-container">
        <SectionHeader
          id="about-title"
          index="01"
          label="About"
          title="Clean, scalable, production-ready."
          accentWords={["production-ready."]}
        />

        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          {/* Education rail */}
          <aside className="md:col-span-4 lg:col-span-3">
            <Reveal className="md:sticky md:top-28">
              <div className="surface rounded-2xl p-6">
                <div className="eyebrow mb-5 flex items-center gap-2">
                  <Icon name="sparkles" size={14} className="text-accent" />
                  Education
                </div>
                <div className="text-lg font-medium leading-snug text-fg">
                  {BIO.education.degree}
                </div>
                <div className="mt-1 text-sm leading-relaxed text-muted">
                  {BIO.education.school}
                </div>
                <div className="mt-6 flex items-baseline gap-2 border-t border-white/[0.07] pt-5">
                  <span className="text-4xl font-medium tracking-tight text-fg">
                    {BIO.education.cgpa}
                  </span>
                  <span className="eyebrow">CGPA</span>
                </div>
              </div>
            </Reveal>
          </aside>

          {/* Biography */}
          <div className="md:col-span-8 lg:col-span-9">
            <ScrollLitParagraph
              text={BIO.about[0]}
              className="text-[1.6rem] font-light leading-[1.3] tracking-[-0.015em] text-fg md:text-[2.1rem] lg:text-[2.5rem]"
            />
            <div className="mt-12 gap-10 text-base leading-[1.8] text-muted md:columns-2 md:text-[1.05rem]">
              {BIO.about.slice(1).map((para, i) => (
                <Reveal key={i} index={i} className="mb-6 break-inside-avoid">
                  <p>{para}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {/* Focus areas — hover/focus a row to read its description */}
        <div className="mt-24 grid gap-10 md:mt-32 md:grid-cols-12">
          <div className="md:col-span-3">
            <div className="eyebrow">What I focus on</div>
          </div>
          <ul className="md:col-span-5" aria-label="Focus areas">
            {focusAreas.map((area, i) => {
              const isActive = area.id === activeFocus;
              return (
                <li key={area.id}>
                  <Reveal index={i}>
                    <div
                      tabIndex={0}
                      onMouseEnter={() => setActiveFocus(area.id)}
                      onFocus={() => setActiveFocus(area.id)}
                      className="group flex cursor-default items-start gap-5 border-b border-white/[0.07] py-5 outline-none md:items-center"
                    >
                      <span
                        className={`font-mono text-xs transition-colors duration-300 ${
                          isActive ? "text-accent" : "text-muted/60"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xl tracking-tight transition-all duration-500 ease-out md:text-2xl ${
                            isActive
                              ? "translate-x-1 text-fg"
                              : "text-fg/50 group-hover:text-fg/80"
                          }`}
                        >
                          {area.label}
                        </div>
                        {/* Inline description on small screens (no hover). */}
                        <p className="mt-1.5 text-sm leading-relaxed text-muted md:hidden">
                          {area.description}
                        </p>
                      </div>
                      <Icon
                        name={area.icon}
                        size={18}
                        className={`mt-1 shrink-0 transition-colors duration-300 md:mt-0 ${
                          isActive ? "text-accent" : "text-muted/40"
                        }`}
                      />
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ul>
          <div className="hidden md:col-span-4 md:block" aria-live="polite">
            <div className="sticky top-32">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: DUR.base, ease: EASE_OUT }}
                  className="surface rounded-2xl p-7"
                >
                  <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                    <Icon name={current.icon} size={22} />
                  </span>
                  <div className="text-2xl font-medium tracking-tight text-fg">
                    {current.label}
                  </div>
                  <p className="mt-3 leading-relaxed text-muted">
                    {current.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

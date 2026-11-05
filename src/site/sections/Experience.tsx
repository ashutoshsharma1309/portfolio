import { motion, useScroll, useSpring } from "framer-motion";
import { useRef } from "react";
import { experience } from "../../config/content";
import { Icon } from "../../components/ui/Icon";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { DUR, EASE_OUT } from "../motion";
import { SectionHeader } from "../ui/SectionHeader";

export function Experience() {
  const listRef = useRef<HTMLOListElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.7", "end 0.6"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      className="relative scroll-mt-20 py-28 md:py-40"
    >
      <div className="site-container">
        <SectionHeader
          id="experience-title"
          index="04"
          label="Experience"
          title="Built products, mentored peers, shipped under real constraints."
          accentWords={["real", "constraints."]}
          intro="Technical and leadership roles at BMSIT&M."
        />

        <div className="md:grid md:grid-cols-12 md:gap-10">
          <ol ref={listRef} className="relative md:col-span-9 md:col-start-4">
            {/* Timeline rail with scroll-driven fill */}
            <span
              aria-hidden="true"
              className="absolute bottom-2 left-[19px] top-2 w-px bg-white/[0.08]"
            />
            <motion.span
              aria-hidden="true"
              className="absolute bottom-2 left-[19px] top-2 w-px origin-top bg-gradient-to-b from-accent via-accent to-accent/0"
              style={{ scaleY: reduced ? 1 : progress }}
            />

            {experience.map((role, i) => (
              <li
                key={role.id}
                className="relative pb-14 pl-16 last:pb-0 md:pb-20"
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border bg-ink-950"
                  initial={
                    reduced
                      ? false
                      : {
                          borderColor: "rgba(255,255,255,0.12)",
                          color: "rgb(150,156,172)",
                        }
                  }
                  whileInView={{
                    borderColor: "rgba(244,185,66,0.7)",
                    color: "rgb(244,185,66)",
                  }}
                  viewport={{ amount: 1, margin: "0px 0px -35% 0px" }}
                  transition={{ duration: DUR.base }}
                >
                  <Icon name={role.icon} size={17} />
                </motion.span>

                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: DUR.slow, ease: EASE_OUT }}
                >
                  <div className="eyebrow mb-3 flex items-center gap-3">
                    <span className="text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{role.org}</span>
                  </div>
                  <h3 className="text-3xl font-medium tracking-[-0.03em] text-fg md:text-4xl">
                    {role.role}
                  </h3>

                  <ul className="mt-6 space-y-3">
                    {role.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex gap-4 leading-relaxed text-fg/75"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-[0.7rem] h-px w-4 shrink-0 bg-accent/60"
                        />
                        {b}
                      </li>
                    ))}
                  </ul>

                  {role.tags && role.tags.length > 0 && (
                    <ul
                      className="mt-6 flex flex-wrap gap-1.5"
                      aria-label="Tags"
                    >
                      {role.tags.map((t) => (
                        <li key={t} className="chip">
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

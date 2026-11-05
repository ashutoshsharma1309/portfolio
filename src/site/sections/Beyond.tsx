import { motion } from "framer-motion";
import { POWERLIFTING_PRS, powerlifting, trophies } from "../../config/content";
import { Icon } from "../../components/ui/Icon";
import { Reveal } from "../../components/ui/Reveal";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { DUR, EASE_OUT } from "../motion";
import { SectionHeader } from "../ui/SectionHeader";
import { prizeText } from "./Achievements";

export function Beyond() {
  const reduced = usePrefersReducedMotion();
  const { sports } = trophies;

  return (
    <section
      id="beyond"
      aria-labelledby="beyond-title"
      className="relative scroll-mt-20 py-28 md:py-40"
    >
      <div className="site-container">
        <SectionHeader
          id="beyond-title"
          index="07"
          label="Beyond the keyboard"
          title={sports.subtitle}
          accentWords={["standing."]}
        />

        <div className="grid gap-5 lg:grid-cols-12">
          {/* Powerlifting — typographic stat block */}
          <div className="surface flex flex-col rounded-[28px] p-6 sm:p-8 lg:col-span-7 lg:p-10">
            <div className="eyebrow mb-3 flex items-center gap-2">
              <Icon name="barbell" size={16} className="text-accent" />
              Powerlifting
            </div>
            <p className="max-w-lg leading-relaxed text-muted">
              Strength is a compounding investment — train hard, recover harder.
              The same discipline I bring to shipping software.
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/[0.07] pt-8 lg:mt-auto">
              {POWERLIFTING_PRS.map((pr, i) => (
                <motion.div
                  key={pr.lift}
                  initial={reduced ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{
                    duration: DUR.slow,
                    ease: EASE_OUT,
                    delay: reduced ? 0 : i * 0.1,
                  }}
                  className="flex flex-col"
                >
                  <dt className="eyebrow order-2 mt-2">{pr.lift}</dt>
                  <dd className="order-1 flex items-baseline gap-1">
                    <span className="text-[clamp(2.4rem,7vw,5rem)] font-semibold leading-none tracking-[-0.05em] text-fg">
                      {pr.weight}
                    </span>
                    <span className="font-mono text-sm text-accent">
                      {pr.unit}
                    </span>
                  </dd>
                </motion.div>
              ))}
            </dl>
            <div className="mt-8 flex items-center gap-3 border-t border-white/[0.07] pt-6">
              <span className="eyebrow">Bodyweight</span>
              <span className="text-lg font-medium text-fg">
                {powerlifting.bodyweight.value}
                <span className="ml-1 font-mono text-sm text-accent">
                  {powerlifting.bodyweight.unit}
                </span>
              </span>
            </div>
          </div>

          {/* Sports & athletics */}
          <div className="lg:col-span-5">
            <div className="eyebrow mb-4 flex items-center gap-2 px-1">
              <Icon name="medal" size={16} className="text-accent" />
              Sports &amp; athletics
            </div>
            <ol className="space-y-4">
              {sports.achievements.map((a, i) => (
                <li key={a.id}>
                  <Reveal index={i}>
                    <article className="surface group rounded-2xl p-6 transition-transform duration-500 ease-out hover:-translate-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-medium leading-snug tracking-tight text-fg">
                          {a.title}
                        </h3>
                        {a.prize && (
                          <span className="shrink-0 rounded-full border border-accent/30 bg-accent/[0.07] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
                            {prizeText(a.prize)}
                          </span>
                        )}
                      </div>
                      {a.organization && (
                        <p className="mt-1 text-sm text-muted">
                          {a.organization}
                        </p>
                      )}
                      {a.description && (
                        <p className="mt-3 text-sm leading-relaxed text-fg/70">
                          {a.description}
                        </p>
                      )}
                    </article>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

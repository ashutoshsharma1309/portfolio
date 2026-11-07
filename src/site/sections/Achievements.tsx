import { motion } from "framer-motion";
import { trophies, type Achievement } from "../../config/content";
import { Icon } from "../../components/ui/Icon";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { DUR, EASE_OUT } from "../motion";
import { SectionHeader } from "../ui/SectionHeader";

/** Prize strings carry a leading emoji ("🥇 Gold"); the design uses an icon
 *  instead, so strip it for display. The text itself is unchanged. */
export function prizeText(prize: string) {
  return prize.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, "");
}

/** Groups by year, newest first; undated results go last under "Also"
 *  rather than being assigned a guessed year. */
function groupByYear(items: Achievement[]) {
  const UNDATED = "Also";
  const groups = new Map<string, Achievement[]>();
  for (const a of items) {
    const y = a.date ?? UNDATED;
    groups.set(y, [...(groups.get(y) ?? []), a]);
  }
  const yearOf = (k: string) =>
    k === UNDATED ? -Infinity : parseInt(k, 10) || 0;
  return [...groups.entries()].sort(([a], [b]) => yearOf(b) - yearOf(a));
}

export function Achievements() {
  const reduced = usePrefersReducedMotion();
  const { hackathons } = trophies;
  const years = groupByYear(hackathons.achievements);

  return (
    <section
      id="achievements"
      aria-labelledby="achievements-title"
      className="relative scroll-mt-20 py-28 md:py-40"
    >
      <div className="site-container">
        <SectionHeader
          id="achievements-title"
          index="05"
          label="Hackathons & achievements"
          title={hackathons.subtitle}
          accentWords={["faster."]}
        />

        <div className="space-y-16 md:space-y-24">
          {years.map(([year, items]) => (
            <div key={year} className="grid gap-6 md:grid-cols-12 md:gap-10">
              <div className="md:col-span-3">
                <div className="md:sticky md:top-28">
                  <div
                    className={`font-semibold leading-none tracking-[-0.05em] text-transparent ${
                      year.length > 4
                        ? "text-[clamp(2.75rem,5.5vw,4.5rem)]"
                        : "text-[clamp(3.5rem,9vw,7.5rem)]"
                    }`}
                    style={{
                      WebkitTextStroke: "1px rgb(var(--accent) / 0.55)",
                    }}
                  >
                    {year}
                  </div>
                  <div className="eyebrow mt-3">
                    {items.length} {items.length === 1 ? "result" : "results"}
                  </div>
                </div>
              </div>
              <ol className="md:col-span-9">
                {items.map((a, i) => (
                  <motion.li
                    key={a.id}
                    initial={reduced ? false : { opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{
                      duration: DUR.slow,
                      ease: EASE_OUT,
                      delay: reduced ? 0 : i * 0.06,
                    }}
                    className="group relative grid grid-cols-[auto,1fr] items-center gap-x-5 gap-y-1 border-t border-white/[0.08] py-6 last:border-b md:grid-cols-[auto,1fr,auto] md:gap-x-8 md:py-8"
                  >
                    {/* Hover sweep */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-[-1px] h-px origin-left scale-x-0 bg-accent transition-transform duration-700 ease-out group-hover:scale-x-100"
                    />
                    <span className="row-span-2 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-accent transition-colors duration-300 group-hover:border-accent/50 group-hover:bg-accent/10 md:row-span-1">
                      <Icon name="trophy" size={18} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xl font-medium tracking-tight text-fg md:text-2xl">
                        {a.title}
                      </h3>
                      {a.organization && (
                        <p className="mt-1 text-sm text-muted md:text-base">
                          {a.organization}
                        </p>
                      )}
                    </div>
                    {a.prize && (
                      <span className="col-start-2 mt-2 w-fit rounded-full border border-accent/30 bg-accent/[0.07] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-accent md:col-start-3 md:mt-0">
                        {prizeText(a.prize)}
                      </span>
                    )}
                  </motion.li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

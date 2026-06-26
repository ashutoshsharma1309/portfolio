import { motion } from "framer-motion";
import type { Achievement, TrophyCategory } from "../../config/content";
import { LEETCODE } from "../../config/content";
import { SOCIAL_LINKS } from "../../config/links";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { AnimatedCounter } from "./AnimatedCounter";
import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { Panel } from "./Panel";

interface TrophyPanelProps {
  category: TrophyCategory;
}

/** Large gold trophy with a soft pulsing glow — draws the eye to the
 *  Achievements heading. Falls back to a static glow under reduced motion. */
function GlowTrophy({ icon }: { icon: "trophy" | "medal" }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.span
      className="relative flex h-10 w-10 items-center justify-center text-gold"
      animate={
        reduced
          ? undefined
          : {
              filter: [
                "drop-shadow(0 0 2px rgba(244,185,66,0.5))",
                "drop-shadow(0 0 12px rgba(244,185,66,0.9))",
                "drop-shadow(0 0 2px rgba(244,185,66,0.5))",
              ],
            }
      }
      transition={
        reduced
          ? undefined
          : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
      }
      style={
        reduced
          ? { filter: "drop-shadow(0 0 8px rgba(244,185,66,0.7))" }
          : undefined
      }
    >
      <Icon name={icon} size={34} strokeWidth={1.6} />
    </motion.span>
  );
}

export function TrophyPanel({ category }: TrophyPanelProps) {
  const isHackathons = category.id === "hackathons";

  return (
    <Panel
      title={category.title}
      headerIcon={<GlowTrophy icon={isHackathons ? "trophy" : "medal"} />}
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
      <div className="mb-6 text-sm italic text-white/70">{category.subtitle}</div>

      {/* LeetCode highlight with its own animated counter (hackathons only) */}
      {isHackathons && (
        <Reveal>
          <a
            href={SOCIAL_LINKS.leetcode}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 flex items-center gap-4 rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 transition-colors hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
              <Icon name="code" size={22} />
            </span>
            <div>
              <div className="flex items-baseline gap-1">
                <AnimatedCounter
                  value={LEETCODE.count}
                  suffix={LEETCODE.suffix}
                  className="font-display text-3xl leading-none text-gold"
                />
                <span className="text-sm text-white/60">solved</span>
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-gray-400">
                LeetCode Problems
              </div>
              <span className="sr-only"> (opens in new tab)</span>
            </div>
            <span className="ml-auto text-gold/80">
              <Icon name="target" size={20} />
            </span>
          </a>
        </Reveal>
      )}

      {category.achievements.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center text-sm tracking-wide text-gold/80">
            Coming soon — achievements being added.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {category.achievements.map((a, i) => (
            <Reveal key={a.id} index={i} as="div">
              <AchievementCard
                achievement={a}
                icon={isHackathons ? "trophy" : "medal"}
              />
            </Reveal>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AchievementCard({
  achievement,
  icon,
}: {
  achievement: Achievement;
  icon: "trophy" | "medal";
}) {
  const { title, organization, date, description, prize } = achievement;
  return (
    <article className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/30">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold transition-colors group-hover:bg-gold/20">
          <Icon name={icon} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg tracking-wide text-white">
            {title}
          </h3>

          {(organization || date) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {organization && (
                <span className="uppercase tracking-widest text-gold/80">
                  {organization}
                </span>
              )}
              {date && (
                <span className="whitespace-nowrap text-white/50">
                  {organization && <span className="mr-2">·</span>}
                  {date}
                </span>
              )}
            </div>
          )}

          {description && (
            <p className="mt-2 text-sm leading-relaxed text-gray-200">
              {description}
            </p>
          )}

          {prize && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs text-gold">
              <span className="truncate">{prize}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

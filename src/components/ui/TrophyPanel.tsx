import { motion } from "framer-motion";
import type { Achievement, TrophyCategory } from "../../config/content";
import { Panel } from "./Panel";

interface TrophyPanelProps {
  category: TrophyCategory;
}

export function TrophyPanel({ category }: TrophyPanelProps) {
  return (
    <Panel
      title={category.title}
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
      <div className="text-white/70 italic text-sm mb-6">
        {category.subtitle}
      </div>

      {category.achievements.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-gold/60 text-center text-sm tracking-wide">
            Coming soon — achievements being added.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {category.achievements.map((a, i) => (
            <AchievementCard key={a.id} achievement={a} index={i} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function AchievementCard({
  achievement,
  index,
}: {
  achievement: Achievement;
  index: number;
}) {
  const { title, organization, date, description, prize } = achievement;
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index }}
      className="rounded-lg border border-gold/20 p-5 bg-white/5"
    >
      <h3 className="text-white font-display tracking-wide text-xl mb-2">
        {title}
      </h3>

      {(organization || date) && (
        <div className="flex items-center justify-between gap-3 mb-3 text-xs">
          {organization && (
            <span className="text-gold/80 uppercase tracking-widest truncate">
              {organization}
            </span>
          )}
          {date && (
            <span className="text-white/50 whitespace-nowrap">
              {organization && <span className="mr-2">·</span>}
              {date}
            </span>
          )}
        </div>
      )}

      {description && (
        <p className="text-gray-200 text-sm leading-relaxed">{description}</p>
      )}

      {prize && (
        <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs">
          <TrophySvg />
          <span className="truncate">{prize}</span>
        </div>
      )}
    </motion.article>
  );
}

function TrophySvg() {
  // Simple inline trophy icon — avoids pulling in a new dep.
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M5 4h2v3a2 2 0 0 1-2 2H4V6a2 2 0 0 1 1-2Z" />
      <path d="M19 4h-2v3a2 2 0 0 0 2 2h1V6a2 2 0 0 0-1-2Z" />
    </svg>
  );
}

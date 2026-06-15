import { motion } from "framer-motion";
import { projects } from "../../config/content";
import { GITHUB_USERNAME, SOCIAL_LINKS } from "../../config/links";
import { useGithub, type GitHubRepo } from "../../hooks/useGithub";
import { Panel } from "./Panel";

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white/5 border border-gold/20 min-w-[80px]">
      <span className="text-gold font-display text-xl leading-none">
        {value}
      </span>
      <span className="text-gray-400 text-[10px] uppercase tracking-wide mt-1">
        {label}
      </span>
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function RepoCard({ repo, i }: { repo: GitHubRepo; i: number }) {
  return (
    <motion.a
      href={repo.html_url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * i }}
      className="block rounded-lg border border-gold/20 p-4 bg-white/5 hover:bg-white/10 hover:border-gold/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="text-white font-medium text-base truncate">
          {repo.name}
        </h4>
        <span className="text-gray-400 text-xs shrink-0 flex items-center gap-2">
          {repo.stargazers_count > 0 && <span>★ {repo.stargazers_count}</span>}
          <span>{timeAgo(repo.updated_at)}</span>
        </span>
      </div>
      {repo.description && (
        <p className="text-gray-300 text-sm leading-snug mb-2">
          {repo.description}
        </p>
      )}
      {repo.language && (
        <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold/90 border border-gold/20">
          {repo.language}
        </span>
      )}
    </motion.a>
  );
}

function LiveSection() {
  const state = useGithub();

  if (state.status === "loading") {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        Loading live GitHub data…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="text-sm text-gray-400 py-3">
        Couldn&apos;t load live GitHub data ({state.error}).{" "}
        <a
          href={SOCIAL_LINKS.github}
          target="_blank"
          rel="noreferrer"
          className="text-gold underline"
        >
          View profile →
        </a>
      </div>
    );
  }

  const { data } = state;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <a
          href={SOCIAL_LINKS.github}
          target="_blank"
          rel="noreferrer"
          className="text-gray-300 text-sm hover:text-gold"
        >
          Live from github.com/{GITHUB_USERNAME}
        </a>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <StatChip label="Repos" value={String(data.publicRepos)} />
        <StatChip label="Stars" value={String(data.totalStars)} />
        <StatChip label="Followers" value={String(data.followers)} />
        {data.contributionsLastYear !== null && (
          <StatChip
            label="Commits / yr"
            value={String(data.contributionsLastYear)}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        {data.repos.slice(0, 6).map((repo, i) => (
          <RepoCard key={repo.id} repo={repo} i={i} />
        ))}
      </div>
    </div>
  );
}

export function ProjectsPanel() {
  return (
    <Panel
      title="PROJECTS"
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
      <LiveSection />

      <h3 className="text-gold/80 font-display tracking-wider text-sm uppercase mb-4">
        Featured Work
      </h3>
      <div className="flex flex-col gap-4">
        {projects.map((p, i) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i }}
            className="rounded-lg border border-gold/20 p-5 bg-white/5"
          >
            <h3 className="text-white font-display tracking-wide text-xl mb-2">
              {p.title}
            </h3>
            <p className="text-gray-200 text-sm leading-relaxed mb-4">
              {p.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {p.techStack.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold/90 border border-gold/20"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </Panel>
  );
}

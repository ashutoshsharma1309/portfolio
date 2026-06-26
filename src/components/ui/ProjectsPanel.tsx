import { motion, AnimatePresence } from "framer-motion";
import { useState, useId } from "react";
import {
  projects,
  type Project,
  type ProjectStatus,
} from "../../config/content";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { Icon } from "./Icon";
import { Panel } from "./Panel";

const STATUS_META: Record<
  ProjectStatus,
  { label: string; dot: string; text: string }
> = {
  live: { label: "Live", dot: "bg-emerald-400", text: "text-emerald-300" },
  "in-progress": {
    label: "In progress",
    dot: "bg-amber-400",
    text: "text-amber-300",
  },
  archived: { label: "Archived", dot: "bg-slate-400", text: "text-slate-300" },
  concept: { label: "Concept", dot: "bg-sky-400", text: "text-sky-300" },
};

function StatusPill({ status }: { status: ProjectStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-medium ${meta.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

/** Generated gradient cover used in place of a real screenshot. Shows the
 *  project's initials and a subtle grid so cards never look empty. */
function ProjectCover({ project }: { project: Project }) {
  const [from, to] = project.accent;
  const initials = project.title
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (project.images?.[0]) {
    return (
      <img
        src={project.images[0]}
        alt={`${project.title} screenshot`}
        loading="lazy"
        className="h-28 w-full rounded-lg object-cover border border-white/10"
      />
    );
  }

  return (
    <div
      className="relative h-28 w-full overflow-hidden rounded-lg border border-white/10"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <span className="absolute bottom-2 right-3 font-display text-4xl tracking-wider text-white/85 drop-shadow">
        {initials}
      </span>
    </div>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-gold/30 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      {label}
      <span className="sr-only"> (opens in new tab)</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </a>
  );
}

function ProjectCard({
  project,
  index,
  reduced,
}: {
  project: Project;
  index: number;
  reduced: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const hasCaseStudy = Boolean(project.caseStudy);

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : 0.05 * index, duration: 0.4 }}
      className={`group relative overflow-hidden rounded-xl bg-white/[0.03] p-5 transition-colors ${
        project.flagship
          ? "border border-gold/40 hover:border-gold/60"
          : "border border-white/10 hover:border-gold/30"
      }`}
    >
      {/* Accent glow: always-on (low) for the flagship card, hover-only for the
          rest, so the single best project reads as distinct at a glance. */}
      <div
        className={`pointer-events-none absolute -inset-px transition-opacity duration-500 ${
          project.flagship ? "opacity-60 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{
          background: `radial-gradient(420px circle at 100% 0%, ${project.accent[0]}22, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      <ProjectCover project={project} />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-display text-xl tracking-wide text-white">
            {project.title}
          </h4>
          <p className="mt-0.5 text-sm text-gold/80">{project.tagline}</p>
        </div>
        {project.flagship ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
            <Icon name="sparkles" size={11} />
            Flagship
          </span>
        ) : (
          project.featured && (
            <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
              Featured
            </span>
          )
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill status={project.status} />
        {project.timeline && (
          <span className="text-xs text-white/55">{project.timeline}</span>
        )}
        {project.tags?.map((tag) => (
          <span key={tag} className="text-xs text-white/55">
            · {tag}
          </span>
        ))}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-300">
        {project.description}
      </p>

      {project.highlights && project.highlights.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {project.highlights.map((h) => (
            <li
              key={h}
              className="flex gap-2 text-sm leading-snug text-gray-300"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" />
              {h}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.techStack.map((t) => (
          <span
            key={t}
            className="rounded border border-gold/20 bg-gold/10 px-2 py-0.5 text-xs text-gold/90"
          >
            {t}
          </span>
        ))}
      </div>

      {/* Expandable case study */}
      {hasCaseStudy && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={detailId}
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3 border-l-2 border-gold/30 pl-4 text-sm leading-relaxed text-gray-300">
                {project.caseStudy?.problem && (
                  <p>
                    <span className="font-semibold text-gold/80">Problem. </span>
                    {project.caseStudy.problem}
                  </p>
                )}
                {project.caseStudy?.approach && (
                  <p>
                    <span className="font-semibold text-gold/80">
                      Approach.{" "}
                    </span>
                    {project.caseStudy.approach}
                  </p>
                )}
                {project.caseStudy?.impact && (
                  <p>
                    <span className="font-semibold text-gold/80">Impact. </span>
                    {project.caseStudy.impact}
                  </p>
                )}
                {project.caseStudy?.futureWork &&
                  project.caseStudy.futureWork.length > 0 && (
                    <div>
                      <span className="font-semibold text-gold/80">
                        What&apos;s next.
                      </span>
                      <ul className="mt-1 space-y-1">
                        {project.caseStudy.futureWork.map((f) => (
                          <li key={f} className="flex gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/50" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {project.liveUrl && (
          <ExternalLink href={project.liveUrl} label="Live demo" />
        )}
        {project.githubUrl && (
          <ExternalLink href={project.githubUrl} label="Source" />
        )}
        {hasCaseStudy && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={detailId}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            {open ? "Hide case study" : "Read case study"}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}
      </div>
    </motion.article>
  );
}

export function ProjectsPanel() {
  const reduced = usePrefersReducedMotion();
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <Panel
      title="PROJECTS"
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
      <p className="mb-6 text-sm leading-relaxed text-white/60">
        A curated selection of things I&apos;ve designed, built, and shipped —
        from an AI code-review platform to a full-stack placement system. Expand
        any card for the full case study.
      </p>

      {featured.length > 0 && (
        <>
          <h3 className="mb-4 font-display text-sm uppercase tracking-wider text-gold/80">
            Featured Work
          </h3>
          <div className="mb-8 flex flex-col gap-4">
            {featured.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                index={i}
                reduced={reduced}
              />
            ))}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <h3 className="mb-4 font-display text-sm uppercase tracking-wider text-gold/80">
            More Projects
          </h3>
          <div className="flex flex-col gap-4">
            {rest.map((p, i) => (
              <ProjectCard
                key={p.id}
                project={p}
                index={featured.length + i}
                reduced={reduced}
              />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

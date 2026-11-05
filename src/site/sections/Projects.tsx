import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";
import {
  projects,
  type Project,
  type ProjectStatus,
} from "../../config/content";
import { Icon } from "../../components/ui/Icon";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { DUR, EASE_OUT } from "../motion";
import { ArrowUpRight } from "../ui/BrandIcon";
import { ProjectCover, projectShortName } from "../ui/ProjectCover";
import { SectionHeader } from "../ui/SectionHeader";
import { TiltCard } from "../ui/TiltCard";

const STATUS: Record<ProjectStatus, { label: string; dot: string }> = {
  live: { label: "Live", dot: "bg-emerald-400" },
  "in-progress": { label: "In progress", dot: "bg-accent" },
  archived: { label: "Archived", dot: "bg-slate-400" },
  concept: { label: "Concept", dot: "bg-sky-400" },
};

function StatusPill({ status }: { status: ProjectStatus }) {
  const s = STATUS[status];
  return (
    <span className="chip gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group/link inline-flex h-10 items-center gap-1.5 rounded-full border border-white/15 px-4 text-sm text-fg transition-colors hover:border-accent/60 hover:text-accent"
    >
      {label}
      <span className="sr-only"> (opens in new tab)</span>
      <ArrowUpRight className="transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
    </a>
  );
}

function CaseStudy({
  project,
  id,
  wide,
}: {
  project: Project;
  id: string;
  wide: boolean;
}) {
  const cs = project.caseStudy;
  if (!cs) return null;
  const blocks = [
    { k: "Problem", v: cs.problem },
    { k: "Approach", v: cs.approach },
    { k: "Impact", v: cs.impact },
  ].filter((b): b is { k: string; v: string } => Boolean(b.v));

  return (
    <div
      id={id}
      className={`grid gap-6 border-t border-white/[0.07] pt-6 ${wide ? "md:grid-cols-2 lg:grid-cols-4" : ""}`}
    >
      {blocks.map((b) => (
        <div key={b.k}>
          <div className="eyebrow mb-2 text-accent/90">{b.k}</div>
          <p className="text-sm leading-relaxed text-fg/75">{b.v}</p>
        </div>
      ))}
      {cs.futureWork && cs.futureWork.length > 0 && (
        <div>
          <div className="eyebrow mb-2 text-accent/90">What&apos;s next</div>
          <ul className="space-y-1.5">
            {cs.futureWork.map((f) => (
              <li
                key={f}
                className="flex gap-2 text-sm leading-relaxed text-fg/75"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent/60" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  index,
  flagship,
}: {
  project: Project;
  index: number;
  flagship: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const name = projectShortName(project.title);
  const subtitle = project.title.includes(" — ")
    ? project.title.split(" — ")[1]
    : null;
  const glow = hexToRgb(project.accent[0]);

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {project.flagship ? (
          <span className="chip gap-1.5 border-accent/40 bg-accent/10 text-accent">
            <Icon name="sparkles" size={11} />
            Flagship
          </span>
        ) : (
          project.featured && (
            <span className="chip border-accent/30 text-accent/90">
              Featured
            </span>
          )
        )}
        <StatusPill status={project.status} />
        {project.tags?.map((t) => (
          <span
            key={t}
            className="font-mono text-[11px] tracking-wide text-muted"
          >
            {t}
          </span>
        ))}
      </div>

      <h3
        className={`mt-6 font-medium tracking-[-0.03em] text-fg ${flagship ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"}`}
      >
        {name}
        {subtitle && (
          <span className="mt-2 block text-base font-normal tracking-normal text-muted md:text-lg">
            {subtitle}
          </span>
        )}
      </h3>
      <p
        className={`mt-4 font-serif italic leading-snug text-accent-soft ${flagship ? "text-2xl" : "text-xl"}`}
      >
        {project.tagline}
      </p>
      <p className="mt-4 leading-relaxed text-fg/70">{project.description}</p>

      {project.highlights && project.highlights.length > 0 && (
        <ul
          className={`mt-6 grid gap-x-8 gap-y-2.5 ${flagship ? "sm:grid-cols-2" : ""}`}
        >
          {project.highlights.map((h) => (
            <li key={h} className="flex gap-3 text-sm leading-snug text-fg/75">
              <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-accent" />
              {h}
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Tech stack">
        {project.techStack.map((t) => (
          <li key={t} className="chip">
            {t}
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-wrap items-center gap-2">
        {project.liveUrl && (
          <ExternalLink href={project.liveUrl} label="Live demo" />
        )}
        {project.githubUrl && (
          <ExternalLink href={project.githubUrl} label="Source" />
        )}
        {project.caseStudy && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={detailId}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white/[0.05] px-4 text-sm text-fg transition-colors hover:bg-white/[0.1]"
          >
            {open ? "Hide case study" : "Read case study"}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
              className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}
      </div>
    </>
  );

  const caseStudy = (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: DUR.base + 0.1, ease: EASE_OUT }}
          className="overflow-hidden"
        >
          <div
            className={
              flagship
                ? "px-6 pb-8 pt-2 sm:px-8 lg:px-10"
                : "px-6 pb-8 pt-2 sm:px-8"
            }
          >
            <CaseStudy project={project} id={detailId} wide={flagship} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: DUR.slower, ease: EASE_OUT }}
      className="h-full"
    >
      <TiltCard
        max={flagship ? 2 : 3.5}
        glow={glow}
        className="h-full rounded-[28px]"
      >
        <article
          className="surface group flex h-full flex-col overflow-hidden rounded-[28px]"
          aria-label={name}
        >
          {flagship ? (
            <div className="grid lg:grid-cols-12">
              <ProjectCover
                project={project}
                index={index}
                shape="tall"
                className="min-h-[300px] rounded-none lg:col-span-7 lg:min-h-[560px]"
              />
              <div className="flex flex-col p-6 sm:p-8 lg:col-span-5 lg:p-10">
                {body}
              </div>
            </div>
          ) : (
            <>
              <ProjectCover
                project={project}
                index={index}
                className="aspect-[16/10] rounded-none"
              />
              <div className="flex flex-1 flex-col p-6 sm:p-8">{body}</div>
            </>
          )}
          {caseStudy}
        </article>
      </TiltCard>
    </motion.div>
  );
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// Asymmetric rhythm for the non-flagship grid (12-col spans).
const SPANS = [
  "lg:col-span-7",
  "lg:col-span-5",
  "lg:col-span-5",
  "lg:col-span-7",
];

export function Projects() {
  const flagship = projects.find((p) => p.flagship);
  const rest = projects.filter((p) => p !== flagship);

  return (
    <section
      id="projects"
      aria-labelledby="projects-title"
      className="relative scroll-mt-20 py-28 md:py-40"
    >
      <div className="site-container">
        <SectionHeader
          id="projects-title"
          index="02"
          label="Selected work"
          title="Things I've designed, built, and shipped."
          accentWords={["shipped."]}
          intro="A curated selection — from an AI code-review platform to a full-stack placement system. Expand any project for the full case study."
        />

        <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
          {flagship && (
            <div className="lg:col-span-12">
              <ProjectCard
                project={flagship}
                index={projects.indexOf(flagship)}
                flagship
              />
            </div>
          )}
          {rest.map((p, i) => (
            <div key={p.id} className={SPANS[i % SPANS.length]}>
              <ProjectCard
                project={p}
                index={projects.indexOf(p)}
                flagship={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

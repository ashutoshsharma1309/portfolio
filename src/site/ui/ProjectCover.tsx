import { motion, useScroll, useTransform } from "framer-motion";
import { useMemo, useRef } from "react";
import type { Project } from "../../config/content";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

/** Deterministic PRNG so each project's artwork is stable across renders. */
function seeded(seedText: string) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function projectShortName(title: string) {
  return title.split(" — ")[0];
}

interface ProjectCoverProps {
  project: Project;
  index: number;
  className?: string;
  /** Artwork proportions — "tall" for the flagship's side-by-side layout. */
  shape?: "wide" | "tall";
}

/**
 * Generative cover art — used because the repo has no real screenshots, and
 * fabricating UI mockups would misrepresent the work. Each cover is a seeded
 * node graph in the project's own accent colors (a nod to the systems behind
 * them), with scroll parallax on the artwork layer. If a project ever gains
 * `images`, the first screenshot is used instead.
 */
export function ProjectCover({
  project,
  index,
  className,
  shape = "wide",
}: ProjectCoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-28, 28]);

  const [from, to] = project.accent;
  const name = projectShortName(project.title);
  const gid = `pc-${project.id}`;
  const W = 800;
  const H = shape === "tall" ? 1000 : 500;

  const graph = useMemo(() => {
    const rand = seeded(project.id);
    const nodes = Array.from({ length: shape === "tall" ? 42 : 24 }, () => ({
      x: 40 + rand() * (W - 80),
      y: 40 + rand() * (H - 80),
      r: 1.6 + rand() * 3.2,
    }));
    const edges: [number, number][] = [];
    nodes.forEach((a, i) => {
      const nearest = nodes
        .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
        .filter((n) => n.j !== i)
        .sort((p, q) => p.d - q.d)
        .slice(0, 2);
      nearest.forEach(({ j }) => {
        if (i < j) edges.push([i, j]);
      });
    });
    return { nodes, edges };
  }, [project.id, shape, W, H]);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-[inherit] bg-ink-900 ${className ?? ""}`}
    >
      {project.images?.[0] ? (
        <motion.img
          src={project.images[0]}
          alt={`${name} screenshot`}
          loading="lazy"
          decoding="async"
          style={{ y }}
          className="absolute inset-0 h-[115%] w-full -translate-y-[7%] object-cover"
        />
      ) : (
        <motion.svg
          aria-hidden="true"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          style={{ y }}
          className="absolute inset-x-0 -top-[8%] h-[116%] w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        >
          <defs>
            <radialGradient id={`${gid}-glow`} cx="78%" cy="18%" r="75%">
              <stop offset="0%" stopColor={to} stopOpacity="0.55" />
              <stop offset="55%" stopColor={from} stopOpacity="0.18" />
              <stop offset="100%" stopColor="#05070c" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${gid}-edge`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
            <pattern
              id={`${gid}-grid`}
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M40 0H0V40"
                fill="none"
                stroke="white"
                strokeOpacity="0.05"
              />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="#090c14" />
          <rect width={W} height={H} fill={`url(#${gid}-grid)`} />
          <rect width={W} height={H} fill={`url(#${gid}-glow)`} />
          <g stroke={`url(#${gid}-edge)`} strokeOpacity="0.45" strokeWidth="1">
            {graph.edges.map(([a, b]) => (
              <line
                key={`${a}-${b}`}
                x1={graph.nodes[a].x}
                y1={graph.nodes[a].y}
                x2={graph.nodes[b].x}
                y2={graph.nodes[b].y}
              />
            ))}
          </g>
          <g>
            {graph.nodes.map((n, i) => (
              <circle
                key={i}
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={i % 3 === 0 ? to : "#f5efe2"}
                fillOpacity={0.85}
              />
            ))}
          </g>
        </motion.svg>
      )}

      {/* Typographic lockup */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 md:p-7">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
          <span>
            {String(index + 1).padStart(2, "0")} / {project.id}
          </span>
          {project.timeline && <span>{project.timeline}</span>}
        </div>
        <div
          className="font-sans font-semibold leading-[0.85] tracking-[-0.05em] text-white/95"
          style={{
            fontSize:
              shape === "tall"
                ? "clamp(2.75rem, 7vw, 6rem)"
                : "clamp(2.25rem, 4.4vw, 4.25rem)",
            textShadow: "0 10px 40px rgba(0,0,0,.45)",
          }}
        >
          {name}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
    </div>
  );
}

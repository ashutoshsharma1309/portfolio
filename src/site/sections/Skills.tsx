import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { projects, skillCategories } from "../../config/content";
import { Icon } from "../../components/ui/Icon";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { DUR, EASE_OUT } from "../motion";
import { projectShortName } from "../ui/ProjectCover";
import { SectionHeader } from "../ui/SectionHeader";

/** "React.js" ≡ "React", "Express.js" ≡ "Express.js", case-insensitive. */
function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/\.js$/, "")
    .replace(/[^a-z0-9+#]/g, "");
}

// Bento rhythm (12-col spans) — deliberately uneven.
const SPANS: Record<string, string> = {
  languages: "md:col-span-7",
  backend: "md:col-span-5",
  infra: "md:col-span-5",
  aiml: "md:col-span-7",
  blockchain: "md:col-span-4",
  tools: "md:col-span-8",
};

export function Skills() {
  const reduced = usePrefersReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  // Map each skill to the projects whose stack lists it — real relationships
  // derived from content.ts, not invented proficiency.
  const usage = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of projects) {
      for (const t of p.techStack) {
        const k = norm(t);
        map.set(k, [...(map.get(k) ?? []), projectShortName(p.title)]);
      }
    }
    return map;
  }, []);

  const total = skillCategories.reduce((n, c) => n + c.skills.length, 0);
  const hoveredKey = hovered ? norm(hovered) : null;

  return (
    <section
      id="skills"
      aria-labelledby="skills-title"
      className="relative scroll-mt-20 py-28 md:py-40"
    >
      <div className="site-container">
        <SectionHeader
          id="skills-title"
          index="03"
          label="Stack"
          title="The stack I reach for."
          accentWords={["reach"]}
          intro={`From low-level languages to AI tooling and production infrastructure — ${total} tools across ${skillCategories.length} domains. Hover or focus a tool to trace it to the projects that use it.`}
        />

        <div className="grid gap-4 md:grid-cols-12 md:gap-5">
          {skillCategories.map((cat, ci) => {
            const activeHere = hovered && cat.skills.includes(hovered);
            const used =
              activeHere && hoveredKey ? usage.get(hoveredKey) : undefined;
            return (
              <motion.div
                key={cat.id}
                initial={reduced ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{
                  duration: DUR.slow,
                  ease: EASE_OUT,
                  delay: reduced ? 0 : (ci % 2) * 0.08,
                }}
                className={`surface group relative flex flex-col overflow-hidden rounded-3xl p-6 md:p-8 ${SPANS[cat.id] ?? "md:col-span-6"}`}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(closest-side, rgb(var(--accent) / 0.12), transparent)",
                  }}
                />
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-accent transition-transform duration-500 ease-out group-hover:-rotate-6 group-hover:scale-110">
                      <Icon name={cat.icon} size={18} />
                    </span>
                    <h3 className="text-lg font-medium tracking-tight text-fg">
                      {cat.title}
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {String(cat.skills.length).padStart(2, "0")}
                  </span>
                </div>

                <ul className="flex flex-wrap gap-2">
                  {cat.skills.map((skill) => {
                    const isHovered = hovered === skill;
                    const isRelated =
                      !isHovered &&
                      hoveredKey !== null &&
                      norm(skill) === hoveredKey;
                    const hasUsage = usage.has(norm(skill));
                    return (
                      <li key={skill}>
                        <span
                          tabIndex={0}
                          onMouseEnter={() => setHovered(skill)}
                          onFocus={() => setHovered(skill)}
                          onBlur={() => setHovered(null)}
                          className={`inline-flex cursor-default items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm outline-none transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-accent/60 ${
                            isHovered || isRelated
                              ? "-translate-y-0.5 border-accent/60 bg-accent/10 text-fg"
                              : "border-white/10 bg-white/[0.02] text-fg/75 hover:text-fg"
                          }`}
                        >
                          {hasUsage && (
                            <span
                              aria-hidden="true"
                              className="h-1 w-1 rounded-full bg-accent/70"
                            />
                          )}
                          {skill}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-auto pt-6" aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={activeHere ? hovered : "idle"}
                      initial={reduced ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: DUR.fast }}
                      className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
                    >
                      {activeHere ? (
                        used && used.length > 0 ? (
                          <>
                            <span className="text-accent">{hovered}</span> →
                            used in {used.join(" · ")}
                          </>
                        ) : (
                          <>
                            <span className="text-accent">{hovered}</span> →
                            part of the toolkit
                          </>
                        )
                      ) : (
                        <span aria-hidden="true">&nbsp;</span>
                      )}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="eyebrow mt-6 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-1 w-1 rounded-full bg-accent/70"
          />
          Used in at least one project above
        </p>
      </div>
    </section>
  );
}

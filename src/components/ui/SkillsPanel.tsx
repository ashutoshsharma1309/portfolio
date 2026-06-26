import { skillCategories } from "../../config/content";
import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { Panel } from "./Panel";

export function SkillsPanel() {
  return (
    <Panel
      title="TECHNICAL SKILLS"
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
      <p className="mb-6 text-sm leading-relaxed text-white/60">
        The stack I reach for — from low-level languages to AI tooling and
        production infrastructure.
      </p>

      <div className="flex flex-col gap-4">
        {skillCategories.map((cat, i) => (
          <Reveal key={cat.id} index={i} as="div">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-gold/30">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
                  <Icon name={cat.icon} size={17} />
                </span>
                <h3 className="font-display text-sm uppercase tracking-wider text-white">
                  {cat.title}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill) => (
                  <span
                    key={skill}
                    className="cursor-default rounded-md border border-gold/20 bg-gold/[0.07] px-2.5 py-1 text-xs text-gold/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-gold/15 hover:text-gold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}

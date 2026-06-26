import { experience } from "../../config/content";
import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { Panel } from "./Panel";

export function ExperiencePanel() {
  return (
    <Panel
      title="EXPERIENCE"
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
      <p className="mb-6 text-sm leading-relaxed text-white/60">
        Technical and leadership roles where I&apos;ve built products, mentored
        peers, and shipped under real constraints.
      </p>

      {/* Vertical timeline */}
      <div className="relative border-l border-gold/20 pl-6">
        {experience.map((role, i) => (
          <Reveal key={role.id} index={i} as="div">
            <div className="relative mb-7 last:mb-0">
              {/* Timeline node */}
              <span className="absolute -left-[31px] flex h-7 w-7 items-center justify-center rounded-full border border-gold/40 bg-navy text-gold">
                <Icon name={role.icon} size={15} />
              </span>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-gold/30">
                <h3 className="font-display text-lg tracking-wide text-white">
                  {role.role}
                </h3>
                <div className="mt-0.5 text-sm text-gold/80">{role.org}</div>

                <ul className="mt-3 space-y-1.5">
                  {role.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex gap-2 text-sm leading-snug text-gray-300"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" />
                      {b}
                    </li>
                  ))}
                </ul>

                {role.tags && role.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {role.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-gold/20 bg-gold/10 px-2 py-0.5 text-xs text-gold/90"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}

import { BIO, focusAreas, stats } from "../../config/content";
import { SOCIAL_LINKS } from "../../config/links";
import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { AnimatedCounter } from "./AnimatedCounter";
import { Panel } from "./Panel";

export function AboutPanel() {
  return (
    <Panel
      title="ABOUT ME"
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
      <Reveal>
        <div className="font-display text-xl tracking-wide text-white/90">
          {BIO.name}
        </div>
        <div className="mt-1 text-sm uppercase tracking-widest text-gold/70">
          {BIO.title}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
          <Icon name="sparkles" size={14} className="text-gold/70" />
          {BIO.education.degree} · {BIO.education.school} · CGPA{" "}
          {BIO.education.cgpa}
        </div>
      </Reveal>

      {/* Headline stats with animated counters */}
      <Reveal index={1}>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-gold/20 bg-white/[0.03] px-4 py-3"
            >
              <AnimatedCounter
                value={s.value}
                suffix={s.suffix}
                className="font-display text-2xl leading-none text-gold"
              />
              <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Bio paragraphs */}
      <div className="mt-7 space-y-4">
        {BIO.about.map((para, i) => (
          <Reveal key={i} index={i} as="div">
            <p
              className={
                i === 0
                  ? "border-l-2 border-gold/40 pl-4 leading-relaxed text-white/85"
                  : "leading-relaxed text-white/75"
              }
            >
              {para}
            </p>
          </Reveal>
        ))}
      </div>

      {/* Focus areas */}
      <h3 className="mt-9 mb-4 font-display text-sm uppercase tracking-wider text-gold/80">
        What I Focus On
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {focusAreas.map((area, i) => (
          <Reveal key={area.id} index={i} as="div">
            <div className="group h-full rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-white/[0.06]">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold transition-colors group-hover:bg-gold/20">
                <Icon name={area.icon} size={18} />
              </div>
              <div className="font-medium text-white">{area.label}</div>
              <p className="mt-1 text-xs leading-snug text-gray-400">
                {area.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Socials */}
      <div className="mt-9 border-t border-gold/20 pt-6">
        <div className="mb-3 text-xs uppercase tracking-widest text-gold/70">
          Find me on
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(SOCIAL_LINKS).map(([k, v]) => (
            <a
              key={k}
              href={v}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center rounded-md border border-gold/40 px-3 py-2 text-sm capitalize text-gold transition hover:bg-gold/10 active:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              {k}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          ))}
        </div>
      </div>
    </Panel>
  );
}

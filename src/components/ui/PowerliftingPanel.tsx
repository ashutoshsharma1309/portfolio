import { POWERLIFTING_PRS, powerlifting } from "../../config/content";
import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { Panel } from "./Panel";

export function PowerliftingPanel() {
  return (
    <Panel
      title="POWERLIFTING"
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
      <p className="mb-6 text-sm leading-relaxed text-white/60">
        Strength is a compounding investment — train hard, recover harder. The
        same discipline I bring to shipping software.
      </p>

      {/* Bodyweight — the weight-class context for the lifts below */}
      <Reveal>
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
            <Icon name="target" size={18} />
          </span>
          <div>
            <div className="text-xs uppercase tracking-widest text-gold/80">
              Bodyweight
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl tracking-wider text-white">
                {powerlifting.bodyweight.value}
              </span>
              <span className="font-display text-base text-gold/80">
                {powerlifting.bodyweight.unit}
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Lift PRs */}
      <div className="flex flex-col gap-4">
        {POWERLIFTING_PRS.map((pr, i) => (
          <Reveal key={pr.lift} index={i + 1} as="div">
            <div className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/30">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold transition-colors group-hover:bg-gold/20">
                <Icon name="barbell" size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-widest text-gold/80">
                  {pr.lift}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl tracking-wider text-white">
                    {pr.weight}
                  </span>
                  <span className="font-display text-base text-gold/80">
                    {pr.unit}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}

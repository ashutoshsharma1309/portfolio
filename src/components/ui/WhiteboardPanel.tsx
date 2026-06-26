import { CONTACT_EMAIL, SOCIAL_LINKS } from "../../config/links";
import { Icon } from "./Icon";
import { Reveal } from "./Reveal";
import { Panel } from "./Panel";

const SOCIAL_META: Record<keyof typeof SOCIAL_LINKS, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  leetcode: "LeetCode",
  codeforces: "Codeforces",
};

export function WhiteboardPanel() {
  return (
    <Panel
      title="CONTACT"
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
      <p className="mb-6 text-sm leading-relaxed text-white/60">
        Open to AI &amp; Backend Engineer roles and interesting collaborations.
        The fastest way to reach me is email.
      </p>

      {/* Primary email CTA */}
      <Reveal>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="group mb-4 flex items-center gap-4 rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 transition-colors hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold transition-colors group-hover:bg-gold/20">
            <Icon name="mail" size={20} />
          </span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-gold/80">
              Email
            </div>
            <div className="truncate text-white">{CONTACT_EMAIL}</div>
          </div>
        </a>
      </Reveal>

      {/* Social links */}
      <h3 className="mb-3 mt-8 font-display text-sm uppercase tracking-wider text-gold/80">
        Find me online
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(SOCIAL_META) as (keyof typeof SOCIAL_LINKS)[]).map(
          (key, i) => (
            <Reveal key={key} index={i} as="div">
              <a
                href={SOCIAL_LINKS[key]}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-[44px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                <span className="text-gold/80 transition-colors group-hover:text-gold">
                  <Icon name="link" size={16} />
                </span>
                <span className="text-sm text-white/90">{SOCIAL_META[key]}</span>
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </Reveal>
          ),
        )}
      </div>
    </Panel>
  );
}

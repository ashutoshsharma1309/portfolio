import { BIO } from "../../config/content";
import { SOCIAL_LINKS } from "../../config/links";
import { Panel } from "./Panel";

export function AboutPanel() {
  return (
    <Panel title="ABOUT ME">
      <div className="text-white/90 text-lg font-display tracking-wide mb-1">
        {BIO.name}
      </div>
      <div className="text-gold/70 text-sm uppercase tracking-widest mb-6">
        {BIO.title}
      </div>
      <p className="text-white/80 leading-relaxed mb-4">{BIO.summary}</p>
      <p className="text-white/85 leading-relaxed mb-8 border-l-2 border-gold/40 pl-4">
        {BIO.pitch}
      </p>
      <div className="border-t border-gold/20 pt-6">
        <div className="text-gold/70 text-xs uppercase tracking-widest mb-3">
          Find me on
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(SOCIAL_LINKS).map(([k, v]) => (
            <a
              key={k}
              href={v}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-md border border-gold/40 text-gold text-sm hover:bg-gold/10 active:bg-gold/20 transition min-h-[44px] flex items-center"
            >
              {k}
            </a>
          ))}
        </div>
      </div>
    </Panel>
  );
}

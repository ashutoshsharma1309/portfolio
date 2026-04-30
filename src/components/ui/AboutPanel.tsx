import { motion } from "framer-motion";
import { BIO } from "../../config/content";
import { SOCIAL_LINKS } from "../../config/links";

export function AboutPanel() {
  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 28 }}
      className="fixed top-0 right-0 bottom-0 w-full md:w-[420px] z-20 bg-navy/95 backdrop-blur-md border-l border-gold/20 pt-24 px-8 pb-8 overflow-y-auto"
    >
      <h2 className="text-gold font-display text-3xl tracking-wider mb-2">
        ABOUT ME
      </h2>
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
              className="px-3 py-1.5 rounded-md border border-gold/40 text-gold text-sm hover:bg-gold/10 transition"
            >
              {k}
            </a>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}

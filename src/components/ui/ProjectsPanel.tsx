import { motion } from "framer-motion";
import { projects } from "../../config/content";

export function ProjectsPanel() {
  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 28 }}
      className="fixed top-0 right-0 bottom-0 w-full md:w-[460px] z-20 bg-navy/95 backdrop-blur-md border-l border-gold/20 flex flex-col"
    >
      <div className="pt-24 px-8 pb-2">
        <h2 className="text-gold font-display text-3xl tracking-wider">
          PROJECTS
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60">
        <div className="flex flex-col gap-4">
          {projects.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              className="rounded-lg border border-gold/20 p-5 bg-white/5"
            >
              <h3 className="text-white font-display tracking-wide text-xl mb-2">
                {p.title}
              </h3>
              <p className="text-gray-200 text-sm leading-relaxed mb-4">
                {p.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {p.techStack.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold/90 border border-gold/20"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}

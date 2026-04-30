import { motion } from "framer-motion";
import { projects } from "../../config/content";
import { Panel } from "./Panel";

export function ProjectsPanel() {
  return (
    <Panel
      title="PROJECTS"
      scrollClassName="scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-yellow-500/40 hover:scrollbar-thumb-yellow-500/60"
    >
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
    </Panel>
  );
}

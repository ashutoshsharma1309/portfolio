import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { DUR, EASE_OUT } from "../motion";
import { RevealText } from "./RevealText";

interface SectionHeaderProps {
  index: string;
  label: string;
  title: string;
  accentWords?: string[];
  intro?: string;
  id: string;
}

/** Shared editorial section opener: index rail + masked display heading. */
export function SectionHeader({
  index,
  label,
  title,
  accentWords,
  intro,
  id,
}: SectionHeaderProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <header className="mb-14 grid gap-6 md:mb-20 md:grid-cols-12 md:gap-10">
      <div className="md:col-span-3">
        <div className="eyebrow flex items-center gap-3">
          <span className="text-accent">{index}</span>
          <motion.span
            aria-hidden="true"
            className="h-px w-10 origin-left bg-white/20"
            initial={reduced ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: DUR.slow, ease: EASE_OUT }}
          />
          <span>{label}</span>
        </div>
      </div>
      <div className="md:col-span-9">
        <RevealText
          id={id}
          as="h2"
          text={title}
          accentWords={accentWords}
          className="text-display-2 font-medium text-fg"
        />
        {intro && (
          <motion.p
            className="mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: DUR.slow, ease: EASE_OUT, delay: 0.25 }}
          >
            {intro}
          </motion.p>
        )}
      </div>
    </header>
  );
}

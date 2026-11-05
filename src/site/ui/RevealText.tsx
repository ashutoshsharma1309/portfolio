import { motion, type Variants } from "framer-motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { DUR, EASE_OUT } from "../motion";

interface RevealTextProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  /** Words (exact match, punctuation included) rendered in the serif italic accent. */
  accentWords?: string[];
  /** Seconds before the first word starts. */
  delay?: number;
  /** Animate on mount instead of on scroll into view (used in the hero). */
  immediate?: boolean;
  id?: string;
}

const word: Variants = {
  hidden: { y: "105%" },
  show: (d: number) => ({
    y: "0%",
    transition: { duration: DUR.slower, ease: EASE_OUT, delay: d },
  }),
};

/**
 * Masked word-by-word rise. Each word slides up from behind its own clipping
 * line — a typographic reveal that reads as editorial rather than "fade in".
 *
 * The in-view trigger lives on the parent element: the words themselves start
 * fully clipped by their overflow-hidden masks, so an IntersectionObserver on
 * them would never fire. Text stays real DOM text (selectable, readable by
 * screen readers).
 */
export function RevealText({
  text,
  as = "h2",
  className,
  accentWords = [],
  delay = 0,
  immediate = false,
  id,
}: RevealTextProps) {
  const reduced = usePrefersReducedMotion();
  const Tag = motion[as];
  const words = text.split(" ");

  const trigger = immediate
    ? { animate: "show" }
    : { whileInView: "show", viewport: { once: true, amount: 0.4 } };

  return (
    <Tag
      className={className}
      id={id}
      initial={reduced ? false : "hidden"}
      {...trigger}
    >
      {words.map((w, i) => {
        const accent = accentWords.includes(w);
        return (
          <span key={`${w}-${i}`}>
            <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-top">
              <motion.span
                variants={word}
                custom={reduced ? 0 : delay + i * 0.045}
                className={`inline-block will-change-transform ${
                  accent
                    ? "font-serif font-normal italic tracking-normal text-accent-soft"
                    : ""
                }`}
              >
                {w}
              </motion.span>
            </span>
            {i < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </Tag>
  );
}

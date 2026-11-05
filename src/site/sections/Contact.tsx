import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { BIO } from "../../config/content";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "../../config/links";
import { Icon } from "../../components/ui/Icon";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { scrollToSection } from "../lib/smoothScroll";
import { DUR, EASE_OUT } from "../motion";
import { ArrowUpRight, BrandIcon, type BrandName } from "../ui/BrandIcon";
import { Magnetic } from "../ui/Magnetic";
import { RevealText } from "../ui/RevealText";

const SOCIALS: { key: BrandName; label: string }[] = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "leetcode", label: "LeetCode" },
  { key: "codeforces", label: "Codeforces" },
];

export function Contact() {
  const reduced = usePrefersReducedMotion();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${CONTACT_EMAIL}`;
    }
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="relative scroll-mt-20 overflow-hidden pb-16 pt-28 md:pt-40"
    >
      {/* Horizon glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 50% 100%, rgb(var(--accent) / 0.13), transparent 70%)",
        }}
      />
      <div className="site-container">
        <div className="eyebrow mb-8 flex items-center gap-3">
          <span className="text-accent">08</span>
          <span className="h-px w-10 bg-white/20" />
          <span>Contact</span>
        </div>

        <RevealText
          id="contact-title"
          as="h2"
          text="Say hello."
          accentWords={["hello."]}
          className="text-display-1 font-semibold text-fg"
        />
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: DUR.slow, ease: EASE_OUT, delay: 0.2 }}
          className="mt-8 max-w-xl text-lg leading-relaxed text-muted"
        >
          Open to AI &amp; Backend Engineer roles and interesting
          collaborations. The fastest way to reach me is email.
        </motion.p>

        <div className="mt-12 flex flex-col gap-4 border-y border-white/[0.08] py-8 md:flex-row md:items-center md:justify-between">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="group flex min-w-0 items-center gap-4 text-[clamp(1.25rem,3.6vw,2.75rem)] font-medium tracking-[-0.03em] text-fg"
          >
            <span className="truncate">
              <span className="link-underline">{CONTACT_EMAIL}</span>
            </span>
            <ArrowUpRight
              size={28}
              className="shrink-0 text-accent transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-1"
            />
          </a>
          <div className="flex shrink-0 items-center gap-3">
            <Magnetic>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-ink-950 transition-colors hover:bg-accent-soft"
              >
                <Icon name="mail" size={16} />
                Write an email
              </a>
            </Magnetic>
            <button
              type="button"
              onClick={copy}
              className="relative inline-flex h-12 min-w-[7.5rem] items-center justify-center rounded-full border border-white/15 px-5 text-sm text-fg transition-colors hover:border-white/40"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copied ? "copied" : "copy"}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: DUR.fast }}
                >
                  {copied ? "Copied ✓" : "Copy email"}
                </motion.span>
              </AnimatePresence>
              <span className="sr-only" aria-live="polite">
                {copied ? "Email address copied to clipboard" : ""}
              </span>
            </button>
          </div>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-4">
          {SOCIALS.map((s) => (
            <li key={s.key} className="bg-ink-950">
              <a
                href={SOCIAL_LINKS[s.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full items-center justify-between gap-3 p-5 transition-colors duration-300 hover:bg-white/[0.03] md:p-6"
              >
                <span className="flex items-center gap-3">
                  <BrandIcon
                    name={s.key}
                    size={18}
                    className="text-muted transition-colors group-hover:text-accent"
                  />
                  <span className="text-fg">{s.label}</span>
                </span>
                <ArrowUpRight className="text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="site-container flex flex-col gap-6 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {BIO.name}
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <a
            href="/room"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
          >
            Enter the 3D room <ArrowUpRight size={12} />
          </a>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("top");
            }}
            className="transition-colors hover:text-fg"
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}

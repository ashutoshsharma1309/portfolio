import { useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { LEETCODE } from "../../config/content";
import { SOCIAL_LINKS } from "../../config/links";
import { AnimatedCounter } from "../../components/ui/AnimatedCounter";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { usePointerFine } from "../hooks/usePointerFine";
import { ArrowUpRight, BrandIcon, type BrandName } from "../ui/BrandIcon";
import { SectionHeader } from "../ui/SectionHeader";
import { TiltCard } from "../ui/TiltCard";

function handleFrom(url: string) {
  return url.replace(/\/+$/, "").split("/").pop() ?? url;
}

/**
 * One dot per solved problem (LEETCODE.count dots). Drawn on a single canvas
 * so 1,400 marks cost one DOM node. Fills in a diagonal wave when it enters
 * the viewport; dots near the cursor brighten.
 */
function SolvedMatrix({ count }: { count: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(wrapRef, { once: true, amount: 0.35 });
  const reduced = usePrefersReducedMotion();
  const fine = usePointerFine();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Deterministic per-dot brightness for texture.
    const alpha = new Float32Array(count);
    let seed = 7;
    for (let i = 0; i < count; i++) {
      seed = (seed * 16807) % 2147483647;
      alpha[i] = 0.35 + ((seed % 1000) / 1000) * 0.65;
    }

    let cols = 50;
    let gap = 10;
    let w = 0;
    let h = 0;
    let progress = reduced ? 1 : 0;
    let mouse = { x: -9999, y: -9999 };
    let raf = 0;

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      cols = w < 480 ? 35 : w < 720 ? 50 : 70;
      gap = w / cols;
      const rows = Math.ceil(count / cols);
      h = rows * gap;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const rows = Math.ceil(count / cols);
      const r = Math.max(1.1, gap * 0.22);
      for (let i = 0; i < count; i++) {
        const c = i % cols;
        const row = Math.floor(i / cols);
        // Diagonal wave: each dot appears when progress passes its threshold.
        const threshold = (c / cols + row / rows) / 2;
        const appear = Math.min(
          1,
          Math.max(0, (progress - threshold * 0.85) / 0.15),
        );
        if (appear <= 0) continue;
        const x = c * gap + gap / 2;
        const y = row * gap + gap / 2;
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 70);
        const a = Math.min(1, alpha[i] * appear + near * 0.8);
        ctx.fillStyle =
          near > 0.05 ? `rgba(255,236,200,${a})` : `rgba(244,185,66,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, r * (1 + near * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    layout();
    draw();

    if (inView && !reduced) {
      const start = performance.now();
      const tick = (now: number) => {
        progress = Math.min(1, (now - start) / 1800);
        draw();
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else if (inView) {
      progress = 1;
      draw();
    }

    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(wrap);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (progress >= 1) draw();
    };
    const onLeave = () => {
      mouse = { x: -9999, y: -9999 };
      if (progress >= 1) draw();
    };
    if (fine && !reduced) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [count, inView, reduced, fine]);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Visualization: ${count.toLocaleString()} dots, one for each solved LeetCode problem.`}
        className="block w-full"
      />
    </div>
  );
}

const OTHER_PROFILES: { key: BrandName; label: string; note: string }[] = [
  { key: "codeforces", label: "Codeforces", note: "Competitive programming" },
  { key: "github", label: "GitHub", note: "Code & open source" },
];

export function Profiles() {
  return (
    <section
      id="profiles"
      aria-labelledby="profiles-title"
      className="relative scroll-mt-20 py-28 md:py-40"
    >
      <div className="site-container">
        <SectionHeader
          id="profiles-title"
          index="06"
          label="Coding profiles"
          title="Efficient, not just functional."
          accentWords={["functional."]}
        />

        <div className="grid gap-5 lg:grid-cols-12">
          {/* LeetCode — the headline stat */}
          <div className="surface relative overflow-hidden rounded-[28px] p-6 sm:p-8 lg:col-span-8 lg:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="eyebrow mb-4 flex items-center gap-2">
                  <BrandIcon
                    name="leetcode"
                    size={14}
                    className="text-accent"
                  />
                  LeetCode
                </div>
                <div className="text-[clamp(4rem,12vw,8.5rem)] font-semibold leading-[0.85] tracking-[-0.06em] text-fg">
                  <AnimatedCounter
                    value={LEETCODE.count}
                    suffix={LEETCODE.suffix}
                    duration={1800}
                  />
                </div>
                <div className="mt-4 text-lg text-muted">Problems solved</div>
              </div>
              <a
                href={SOCIAL_LINKS.leetcode}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm text-fg transition-colors hover:border-accent/60 hover:text-accent"
              >
                @{handleFrom(SOCIAL_LINKS.leetcode)}
                <span className="sr-only"> on LeetCode (opens in new tab)</span>
                <ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>
            <div className="mt-10 border-t border-white/[0.07] pt-8">
              <SolvedMatrix count={LEETCODE.count} />
              <p className="eyebrow mt-4">Each dot is one solved problem</p>
            </div>
          </div>

          {/* Other profiles */}
          <ul className="grid gap-5 lg:col-span-4">
            {OTHER_PROFILES.map((p) => (
              <li key={p.key}>
                <TiltCard className="h-full rounded-[28px]" max={4}>
                  <a
                    href={SOCIAL_LINKS[p.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="surface group flex h-full min-h-[200px] flex-col justify-between rounded-[28px] p-6 sm:p-8"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-fg transition-colors duration-300 group-hover:text-accent">
                        <BrandIcon name={p.key} size={22} />
                      </span>
                      <ArrowUpRight
                        size={18}
                        className="text-muted transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent"
                      />
                    </div>
                    <div>
                      <div className="eyebrow">{p.note}</div>
                      <div className="mt-2 text-2xl font-medium tracking-tight text-fg">
                        {p.label}
                      </div>
                      <div className="mt-1 font-mono text-sm text-muted">
                        @{handleFrom(SOCIAL_LINKS[p.key])}
                      </div>
                    </div>
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </TiltCard>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

import scrollbar from "tailwind-scrollbar";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── 3D room palette (used by /room) ─────────────────────────────
        navy: "#0a1628",
        gold: "#f4b942",
        walls: "#d4c5a9",
        floor: "#8b6b47",
        floorDark: "#5c4530",
        matteBlack: "#1a1a1a",
        beanNavy: "#1e3a5f",
        mustard: "#d4a847",

        // ── Site design tokens (see :root in index.css) ─────────────────
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
        },
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
          deep: "rgb(var(--accent-deep) / <alpha-value>)",
        },
        ice: "rgb(var(--ice) / <alpha-value>)",
      },
      fontFamily: {
        // Room fonts
        display: ["'Russo One'", "'Bebas Neue'", "sans-serif"],
        marker: ["'Permanent Marker'", "'Caveat'", "cursive"],
        // Site fonts
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
        serif: ["'Instrument Serif'", "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        // Fluid display scale
        "display-1": [
          "clamp(3.25rem, 10.5vw, 10rem)",
          { lineHeight: "0.9", letterSpacing: "-0.045em" },
        ],
        "display-2": [
          "clamp(2.4rem, 6vw, 5.25rem)",
          { lineHeight: "0.98", letterSpacing: "-0.035em" },
        ],
        "display-3": [
          "clamp(1.75rem, 3.2vw, 2.75rem)",
          { lineHeight: "1.05", letterSpacing: "-0.025em" },
        ],
        label: ["0.72rem", { lineHeight: "1rem", letterSpacing: "0.16em" }],
      },
      maxWidth: {
        site: "84rem",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out-strong": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      keyframes: {
        "scroll-cue": {
          "0%": { transform: "translateY(-100%)" },
          "60%, 100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "scroll-cue": "scroll-cue 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite",
      },
    },
  },
  plugins: [scrollbar({ nocompatible: true })],
};

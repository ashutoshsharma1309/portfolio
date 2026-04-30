import scrollbar from "tailwind-scrollbar";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0a1628",
        gold: "#f4b942",
        walls: "#d4c5a9",
        floor: "#8b6b47",
        floorDark: "#5c4530",
        matteBlack: "#1a1a1a",
        beanNavy: "#1e3a5f",
        mustard: "#d4a847",
      },
      fontFamily: {
        display: ["'Russo One'", "'Bebas Neue'", "sans-serif"],
        marker: ["'Permanent Marker'", "'Caveat'", "cursive"],
      },
    },
  },
  plugins: [scrollbar({ nocompatible: true })],
};

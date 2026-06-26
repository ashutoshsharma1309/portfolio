import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    // three.js + drei legitimately make the lazy Scene chunk large; raise the
    // warning ceiling so it doesn't cry wolf on an intentional, code-split chunk.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split rarely-changing vendor code into its own chunk so app edits
          // don't bust the cached React/animation bundle on every deploy.
          "react-vendor": ["react", "react-dom"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});

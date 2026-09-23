import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "src",
  publicDir: "../public",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@kai/ui": path.resolve(__dirname, "../packages/ui/src"),
    },
  },
  optimizeDeps: {
    exclude: ["@kai/ui"],
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
  },
});

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/features/pos-offline/tests/setup-indexeddb.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Usa el código fuente: el paquete publica `dist/`, que no existe sin compilar.
      "@kai/fiscal-ted": path.resolve(__dirname, "../packages/fiscal-ted/src/index.ts"),
    },
  },
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    globals: true,
    testTimeout: 15000,
    // Recursive globs so nested package node_modules (e.g. functions/node_modules)
    // and the separate Firebase Functions package are never crawled by the web
    // app's unit suite. `functions/` is a distinct package with its own tooling.
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "e2e/**", "functions/**", "**/.claude/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

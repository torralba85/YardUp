import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

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
    // Vitest defaults to `cores - 1` forks. On a workstation already running
    // other tooling that saturates the pool, and jsdom worker startup begins to
    // time out. A file whose worker never starts is dropped from both the
    // numerator and the denominator, so the run prints a clean "N passed (N)"
    // over a silently smaller suite and only the exit code gives it away.
    // Leave CI on the default: its runners are smaller and do not hit this.
    ...(process.env.CI ? {} : { maxWorkers: 4 }),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});

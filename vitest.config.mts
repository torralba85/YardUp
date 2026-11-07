import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("./public/", import.meta.url));

/**
 * Next resolves a static image import to `{ src, width, height }`; Vite would
 * hand back a bare URL string. Mirror Next's shape, with `src` as the file's
 * `public/` path, so components read `image.src` the same way in tests.
 */
function nextStaticImages(): Plugin {
  return {
    name: "next-static-images",
    enforce: "pre",
    load(id) {
      const file = id.split("?")[0];
      if (!/\.(avif|webp|png|jpe?g|gif)$/i.test(file)) return null;
      const relative = path.relative(publicDir, file).split(path.sep).join("/");
      const src = relative.startsWith("..") ? `/_next/static/media/${path.basename(file)}` : `/${relative}`;
      return `export default { src: ${JSON.stringify(src)}, width: 0, height: 0 };`;
    },
  };
}

export default defineConfig({
  plugins: [nextStaticImages(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    globals: true,
    testTimeout: 15000,
    // Recursive globs so nested package node_modules (e.g. functions/node_modules)
    // and the separate Firebase Functions package are never crawled by the web
    // app's unit suite. `functions/` is a distinct package with its own tooling.
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "e2e/**", "functions/**", "**/.claude/**", "**/.worktrees/**"],
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

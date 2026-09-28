import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

if (!process.env.TYPESAFE_API_KEY) {
  console.error("TYPESAFE_API_KEY is required. This opt-in evaluation makes ten metered Jev calls using synthetic data.");
  process.exit(1);
}

const require = createRequire(import.meta.url);
// Invoke Node directly: spawning npm.cmd without a shell fails on Windows.
const result = spawnSync(process.execPath, [
  join(dirname(require.resolve("vitest/package.json")), "vitest.mjs"), "run",
  "lib/server/project-brief-grounding.eval.test.ts", "--reporter=verbose", "--maxWorkers=1",
], {
  stdio: "inherit",
  env: { ...process.env, RUN_TYPESAFE_BRIEF_EVAL: "true" },
});
if (result.error) {
  console.error("Could not start the Jev brief evaluation runner.");
  process.exit(1);
}
process.exit(result.status ?? 1);

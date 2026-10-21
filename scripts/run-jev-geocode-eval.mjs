import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Runs one opt-in live eval file: the geocode picker's by default, or the file
// named as the first argument (npm run test:jev-zoning-eval).
const evalFile =
  process.argv[2] ?? "lib/server/geocode-candidate-picker.eval.test.ts";

if (!process.env.TYPESAFE_API_KEY) {
  console.error(
    "TYPESAFE_API_KEY is required for the live Jev eval. " +
      "Set it in your shell, then rerun the npm script.",
  );
  process.exit(1);
}

// Run vitest's entry point with this Node rather than through `npm exec`:
// Node refuses to spawn `npm.cmd` without a shell on Windows (EINVAL).
const require = createRequire(import.meta.url);
const vitestPackage = require.resolve("vitest/package.json");
const vitestEntry = join(dirname(vitestPackage), require(vitestPackage).bin.vitest);
const result = spawnSync(
  process.execPath,
  [
    vitestEntry,
    "run",
    evalFile,
    "--reporter=verbose",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      RUN_TYPESAFE_EVAL: "true",
    },
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

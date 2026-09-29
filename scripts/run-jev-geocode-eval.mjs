import { spawnSync } from "node:child_process";

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

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(
  npmCommand,
  [
    "exec",
    "--",
    "vitest",
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

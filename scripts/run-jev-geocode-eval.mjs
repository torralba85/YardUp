import { spawnSync } from "node:child_process";

if (!process.env.TYPESAFE_API_KEY) {
  console.error(
    "TYPESAFE_API_KEY is required for the live Jev geocode eval. " +
      "Set it in your shell, then rerun npm run test:jev-eval.",
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
    "lib/server/geocode-candidate-picker.eval.test.ts",
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

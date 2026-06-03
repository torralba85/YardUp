import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const easPath = resolve(root, "eas.json");
const platform = process.argv[2];

if (!["ios", "android"].includes(platform)) {
  console.error("Usage: node scripts/eas-submit-from-env.mjs ios|android");
  process.exit(1);
}

function value(name, fallbackName) {
  const resolved = process.env[name]?.trim() || process.env[fallbackName]?.trim();
  if (!resolved) {
    console.error(`Missing required environment value: ${name} or ${fallbackName}`);
    process.exit(1);
  }
  return resolved;
}

const original = readFileSync(easPath, "utf8");
const eas = JSON.parse(original);
eas.submit ??= {};
eas.submit.production ??= {};
eas.submit.production.ios ??= {};
eas.submit.production.android ??= {};

if (platform === "ios") {
  eas.submit.production.ios.appleId = value("EXPO_APPLE_ID", "YARDUP_APPLE_ID");
  eas.submit.production.ios.ascAppId = value("EXPO_ASC_APP_ID", "YARDUP_ASC_APP_ID");
  eas.submit.production.ios.appleTeamId = value("EXPO_APPLE_TEAM_ID", "YARDUP_APPLE_TEAM_ID");
}

if (platform === "android") {
  eas.submit.production.android.serviceAccountKeyPath = value(
    "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH",
    "YARDUP_GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH",
  );
  eas.submit.production.android.track = eas.submit.production.android.track || "internal";
}

writeFileSync(easPath, `${JSON.stringify(eas, null, 2)}\n`);

try {
  const result = spawnSync(
    "npx",
    ["eas-cli@latest", "submit", "--platform", platform, "--profile", "production", "--latest", "--non-interactive", "--wait"],
    {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  writeFileSync(easPath, original);
}

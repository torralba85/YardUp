import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const placeholderPattern = /^REPLACE_WITH_/;

const requiredMetadata = [
  "store/metadata/en-US/description.txt",
  "store/metadata/en-US/keywords.txt",
  "store/metadata/en-US/release_notes.txt",
  "store/metadata/en-US/review_notes.txt",
  "docs/legal/privacy-policy.md",
  "docs/legal/support.md",
  "docs/release/store-review-notes.md",
];

const envFallbacks = {
  appleId: ["EXPO_APPLE_ID", "YARDUP_APPLE_ID"],
  ascAppId: ["EXPO_ASC_APP_ID", "YARDUP_ASC_APP_ID"],
  appleTeamId: ["EXPO_APPLE_TEAM_ID", "YARDUP_APPLE_TEAM_ID"],
  serviceAccountKeyPath: ["GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH", "YARDUP_GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH"],
};

function fail(message) {
  console.error(`Store rollout check failed: ${message}`);
  process.exit(1);
}

function readJson(relativePath) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    fail(`${relativePath} is missing.`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

function configuredValue(value, fallbackNames) {
  if (typeof value === "string" && value.trim() && !placeholderPattern.test(value.trim())) {
    return value.trim();
  }

  for (const name of fallbackNames) {
    const envValue = process.env[name]?.trim();
    if (envValue) {
      return envValue;
    }
  }

  return "";
}

function requireValue(label, value, fallbackNames) {
  const resolved = configuredValue(value, fallbackNames);
  if (!resolved) {
    fail(`${label} is not configured. Set it in eas.json or provide one of: ${fallbackNames.join(", ")}.`);
  }
  return resolved;
}

const eas = readJson("eas.json");

if (eas.cli?.version !== ">= 16.0.0") {
  fail('eas.json must require EAS CLI ">= 16.0.0".');
}

const productionBuild = eas.build?.production;
if (!productionBuild) {
  fail("eas.json must define build.production.");
}
if (productionBuild.environment !== "production") {
  fail("build.production must use the production EAS environment.");
}
if (productionBuild.distribution !== "store") {
  fail('build.production must explicitly set distribution to "store".');
}
if (productionBuild.android?.buildType !== "app-bundle") {
  fail('build.production.android.buildType must be "app-bundle" for Google Play.');
}
if (productionBuild.autoIncrement !== true) {
  fail("build.production.autoIncrement must be true.");
}

const productionSubmit = eas.submit?.production;
if (!productionSubmit?.ios || !productionSubmit?.android) {
  fail("eas.json must define submit.production for both ios and android.");
}

requireValue("iOS Apple ID", productionSubmit.ios.appleId, envFallbacks.appleId);
requireValue("iOS App Store Connect app ID", productionSubmit.ios.ascAppId, envFallbacks.ascAppId);
requireValue("iOS Apple Developer Team ID", productionSubmit.ios.appleTeamId, envFallbacks.appleTeamId);

const googleKeyPath = requireValue(
  "Android Google Play service account key path",
  productionSubmit.android.serviceAccountKeyPath,
  envFallbacks.serviceAccountKeyPath,
);
if (!googleKeyPath.startsWith("@secret:") && !existsSync(resolve(root, googleKeyPath))) {
  fail(`Android Google Play service account key path does not exist: ${googleKeyPath}`);
}
if (productionSubmit.android.track !== "internal") {
  fail('submit.production.android.track must start at "internal" for first rollout.');
}

for (const relativePath of requiredMetadata) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    fail(`${relativePath} is missing.`);
  }
  const content = readFileSync(path, "utf8").trim();
  if (content.length < 40) {
    fail(`${relativePath} is too short for store review readiness.`);
  }
  if (placeholderPattern.test(content) || content.includes("REPLACE_WITH_")) {
    fail(`${relativePath} still contains a REPLACE_WITH placeholder.`);
  }
}

console.log("Store rollout configuration is ready for EAS production build and internal-track submission.");

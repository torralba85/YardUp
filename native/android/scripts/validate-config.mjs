import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const releaseMode = process.argv.includes("--release");
const errors = [];
const warnings = [];

const pathFromRoot = (path) => resolve(repoRoot, path);
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(pathFromRoot(path), "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Could not parse ${path} as JSON: ${message}`);
    return undefined;
  }
};
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};
const releaseExpect = (condition, message) => {
  if (condition) return;
  if (releaseMode) errors.push(message);
  else warnings.push(message);
};

const twa = readJson("native/android/twa-manifest.json") ?? {};
const webManifest = readJson("public/manifest.json") ?? {};
const assetLinks = readJson("public/.well-known/assetlinks.json");

expect(twa.packageId === "com.lotfoundry.app", "Package ID must be com.lotfoundry.app.");
expect(twa.name === "LotFoundry", "Android app name must be LotFoundry.");
expect(twa.launcherName === "LotFoundry", "Android launcher name must be LotFoundry.");
expect(twa.host === "yardup-2026.web.app", "TWA host must be yardup-2026.web.app.");
expect(twa.startUrl === "/studio", "TWA start URL must be /studio.");
expect(twa.display === "standalone", "TWA display mode must be standalone.");
expect(twa.minSdkVersion >= 24, "Minimum Android SDK must be API 24 or newer.");
expect(twa.appVersionCode >= 2, "Android version code must be at least 2.");
expect(twa.features?.playBilling?.enabled === true, "Play Billing must remain enabled.");
expect(twa.alphaDependencies?.enabled === true, "Bubblewrap alpha dependencies are required for Play Billing.");
expect(webManifest.scope === "/", "Web manifest scope must include /studio.");

expect(Array.isArray(assetLinks), "Digital Asset Links must be a JSON array.");
const assetLinkEntries = Array.isArray(assetLinks) ? assetLinks : [];
const statement = assetLinkEntries.find(
  (entry) =>
    entry?.target?.namespace === "android_app" &&
    entry?.target?.package_name === twa.packageId,
);
expect(Boolean(statement), "Digital Asset Links must include com.lotfoundry.app.");

const rawFingerprints = statement?.target?.sha256_cert_fingerprints;
const rawTwaFingerprints = twa.fingerprints;
expect(
  Array.isArray(rawFingerprints),
  "Digital Asset Links fingerprints must be an array.",
);
expect(
  Array.isArray(rawTwaFingerprints),
  "TWA manifest fingerprints must be an array.",
);
const fingerprints = Array.isArray(rawFingerprints) ? rawFingerprints : [];
const twaFingerprints = Array.isArray(rawTwaFingerprints)
  ? rawTwaFingerprints
  : [];
const sha256Pattern = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i;
const normalizeFingerprints = (values) =>
  values
    .filter((value) => typeof value === "string")
    .map((value) => value.toUpperCase());
const normalizedFingerprints = normalizeFingerprints(fingerprints);
const normalizedTwaFingerprints = normalizeFingerprints(twaFingerprints);

expect(
  fingerprints.length > 0 &&
    fingerprints.every(
      (value) => typeof value === "string" && sha256Pattern.test(value),
    ),
  "Digital Asset Links must contain valid colon-separated SHA-256 fingerprints.",
);
expect(
  normalizedTwaFingerprints.every((value) =>
    normalizedFingerprints.includes(value),
  ),
  "Every TWA upload-key fingerprint must also appear in Digital Asset Links.",
);
expect(
  normalizedFingerprints.every((value) =>
    normalizedTwaFingerprints.includes(value),
  ),
  "Every Digital Asset Links fingerprint must also appear in the TWA manifest.",
);
expect(
  !fingerprints.some(
    (value) => typeof value === "string" && value.includes("REPLACE_WITH"),
  ),
  "Digital Asset Links still contains a placeholder.",
);

const distinctFingerprints = new Set(normalizedFingerprints);
releaseExpect(
  distinctFingerprints.size >= 2,
  "Add a distinct Play App Signing SHA-256 alongside the upload-key fingerprint.",
);
releaseExpect(
  existsSync(pathFromRoot("native/android/gradlew")) &&
    existsSync(pathFromRoot("native/android/app/build.gradle")),
  "Generate and review the Bubblewrap Android project before a release build.",
);
releaseExpect(
  Array.isArray(webManifest.screenshots) && webManifest.screenshots.length >= 2,
  "Add final phone/tablet screenshots to public/manifest.json before release.",
);
releaseExpect(
  existsSync(
    pathFromRoot(
      "native/android/app/build/outputs/bundle/release/app-release.aab",
    ),
  ),
  "Build the signed Android App Bundle at native/android/app/build/outputs/bundle/release/app-release.aab before release.",
);

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
console.log(
  `Android TWA ${releaseMode ? "release " : ""}configuration is internally consistent.`,
);

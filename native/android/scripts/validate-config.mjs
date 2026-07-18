import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const releaseMode = process.argv.includes("--release");
const errors = [];
const warnings = [];

const pathFromRoot = (path) => resolve(repoRoot, path);
const readJson = (path) =>
  JSON.parse(readFileSync(pathFromRoot(path), "utf8"));
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};
const releaseExpect = (condition, message) => {
  if (condition) return;
  if (releaseMode) errors.push(message);
  else warnings.push(message);
};

const twa = readJson("native/android/twa-manifest.json");
const webManifest = readJson("public/manifest.json");
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

const statement = assetLinks.find(
  (entry) =>
    entry?.target?.namespace === "android_app" &&
    entry.target.package_name === twa.packageId,
);
expect(Boolean(statement), "Digital Asset Links must include com.lotfoundry.app.");

const fingerprints = statement?.target?.sha256_cert_fingerprints ?? [];
const twaFingerprints = twa.fingerprints ?? [];
const sha256Pattern = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i;

expect(
  fingerprints.length > 0 && fingerprints.every((value) => sha256Pattern.test(value)),
  "Digital Asset Links must contain valid colon-separated SHA-256 fingerprints.",
);
expect(
  twaFingerprints.every((value) => fingerprints.includes(value)),
  "Every TWA upload-key fingerprint must also appear in Digital Asset Links.",
);
expect(
  !fingerprints.some((value) => value.includes("REPLACE_WITH")),
  "Digital Asset Links still contains a placeholder.",
);

releaseExpect(
  fingerprints.length >= 2,
  "Add the Play App Signing SHA-256 as a second Digital Asset Links fingerprint.",
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

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

for (const warning of warnings) console.warn(`WARNING: ${warning}`);
console.log(
  `Android TWA ${releaseMode ? "release " : ""}configuration is internally consistent.`,
);

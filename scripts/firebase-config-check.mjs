import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expected = {
  projectId: "yardup-2026",
  projectNumber: "166268911022",
  nativeIdentifier: "com.aduadvisor.app",
  webAppId: "1:166268911022:web:08b5493550c6f176305c3f",
  iosAppId: "1:166268911022:ios:8468cae4173f4d8d305c3f",
  androidAppId: "1:166268911022:android:4b0f68fd6bf9e918305c3f",
};

function fail(message) {
  console.error(`Firebase configuration check failed: ${message}`);
  process.exit(1);
}

function check(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function readJson(path, label) {
  if (!existsSync(path)) {
    fail(`${label} is missing at ${path}. Provide the local file or the matching EAS File variable.`);
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function resolveNativeFile(path) {
  return isAbsolute(path) ? path : resolve(root, path);
}

function plistString(content, key) {
  const match = content.match(new RegExp(`<key>\\s*${key}\\s*</key>\\s*<string>\\s*([^<]+?)\\s*</string>`));
  return match?.[1];
}

const firebaseRc = readJson(resolve(root, ".firebaserc"), ".firebaserc");
check(firebaseRc.projects?.default === expected.projectId, `.firebaserc must target ${expected.projectId}.`);

const easConfig = readJson(resolve(root, "eas.json"), "eas.json");
for (const profile of ["development", "preview", "production"]) {
  check(
    easConfig.build?.[profile]?.environment === profile,
    `EAS ${profile} builds must select the ${profile} environment for Firebase File variables.`,
  );
}

const expoResult = spawnSync("npx", ["expo", "config", "--json"], {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (expoResult.status !== 0) {
  fail(`Expo config could not be resolved.\n${expoResult.stderr || expoResult.stdout}`);
}

const configStart = expoResult.stdout.indexOf("{");
const configEnd = expoResult.stdout.lastIndexOf("}");
check(configStart >= 0 && configEnd > configStart, "Expo config did not return JSON.");
const expoConfig = JSON.parse(expoResult.stdout.slice(configStart, configEnd + 1));

check(expoConfig.ios?.bundleIdentifier === expected.nativeIdentifier, "iOS bundle identifier changed.");
check(expoConfig.android?.package === expected.nativeIdentifier, "Android package identifier changed.");
check(expoConfig.extra?.firebase?.projectId === expected.projectId, "Expo Firebase project ID is not production.");
check(expoConfig.extra?.firebase?.appId === expected.webAppId, "Expo web Firebase app ID is not production.");
check(expoConfig.extra?.firebase?.iosAppId === expected.iosAppId, "Expo iOS Firebase app ID is not production.");
check(expoConfig.extra?.firebase?.androidAppId === expected.androidAppId, "Expo Android Firebase app ID is not production.");

const androidFile = expoConfig.android?.googleServicesFile;
check(typeof androidFile === "string" && androidFile.length > 0, "Android googleServicesFile is not configured.");
const androidConfig = readJson(resolveNativeFile(androidFile), "Android google-services.json");
check(androidConfig.project_info?.project_id === expected.projectId, "Android Firebase file targets another project.");
check(androidConfig.project_info?.project_number === expected.projectNumber, "Android Firebase file has another sender/project number.");
const androidClient = androidConfig.client?.find(
  (client) => client.client_info?.android_client_info?.package_name === expected.nativeIdentifier,
);
check(Boolean(androidClient), `Android Firebase file has no ${expected.nativeIdentifier} client.`);
check(androidClient?.client_info?.mobilesdk_app_id === expected.androidAppId, "Android Firebase app ID does not match YardUp.");

const iosFile = expoConfig.ios?.googleServicesFile;
check(typeof iosFile === "string" && iosFile.length > 0, "iOS googleServicesFile is not configured.");
const iosPath = resolveNativeFile(iosFile);
check(existsSync(iosPath), `iOS GoogleService-Info.plist is missing at ${iosPath}. Provide the local file or GOOGLE_SERVICE_INFO_PLIST EAS File variable.`);
const iosConfig = readFileSync(iosPath, "utf8");
check(plistString(iosConfig, "PROJECT_ID") === expected.projectId, "iOS Firebase file targets another project.");
check(plistString(iosConfig, "GCM_SENDER_ID") === expected.projectNumber, "iOS Firebase file has another sender/project number.");
check(plistString(iosConfig, "BUNDLE_ID") === expected.nativeIdentifier, "iOS Firebase file has another bundle identifier.");
check(plistString(iosConfig, "GOOGLE_APP_ID") === expected.iosAppId, "iOS Firebase app ID does not match YardUp.");

console.log(`Firebase configuration verified for ${expected.projectId} with native identifier ${expected.nativeIdentifier}.`);

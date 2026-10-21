// Receives `gcloud functions describe apiStore --gen2 --format=json` on stdin.
// Never print environment values or credential contents.
const { readFileSync } = require("node:fs");

try {
  const fn = JSON.parse(readFileSync(0, "utf8"));
  if (fn.state !== "ACTIVE") throw new Error("apiStore is not ACTIVE.");
  const config = fn.serviceConfig ?? {};
  const env = config.environmentVariables ?? {};
  const legacy = env.ENABLE_NATIVE_STORE_VERIFICATION === "true";
  if (!legacy && env.ENABLE_GOOGLE_PLAY_VERIFICATION !== "true") {
    throw new Error("Google Play verification is disabled in production.");
  }
  const required = ["GOOGLE_PLAY_PACKAGE_NAME", "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"];
  if (legacy || env.ENABLE_APPLE_STORE_VERIFICATION === "true") {
    required.push("APPLE_BUNDLE_ID", "APPLE_ROOT_CA_FINGERPRINT256");
  }
  const bindings = config.secretEnvironmentVariables ?? [];
  const missing = required.filter((key) => !bindings.some((binding) =>
    binding.key === key && binding.secret === key && binding.version));
  if (missing.length) {
    throw new Error(`apiStore is missing required secret bindings: ${missing.join(", ")}`);
  }
  console.log(`apiStore is ACTIVE with all ${required.length} required native-store secret bindings.`);
} catch (error) {
  console.error(error instanceof SyntaxError ? "Invalid function metadata JSON." : error.message);
  process.exitCode = 1;
}

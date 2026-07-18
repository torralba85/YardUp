import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  {
    encoding: "utf8",
    windowsHide: true,
  },
);
const deletedResult = spawnSync("git", ["ls-files", "-z", "--deleted"], {
  encoding: "utf8",
  windowsHide: true,
});

if (result.status !== 0 || deletedResult.status !== 0) {
  console.error("ERROR: Could not list repository files.");
  process.exit(1);
}

const deleted = new Set(deletedResult.stdout.split("\0").filter(Boolean));
const files = result.stdout.split("\0").filter((path) => path && !deleted.has(path));
const fileSet = new Set(files);
const errors = [];
const warnings = [];

const required = [
  ".env.example",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "docs/README.md",
  "docs/devpost-submission.md",
];

for (const path of required) {
  if (!fileSet.has(path)) errors.push(`Required public-repo file is missing: ${path}`);
}

const forbidden = [
  /^\.env(?:\.local)?$/,
  /^functions\/\.env$/,
  /^\.playwright-cli\//,
  /^\.grok\//,
  /^terminals\//,
  /^brand\/_plate_render\.png$/,
  /^public\/demo\/.*\.mp4$/i,
  /^docs\/superpowers\/discarded-.*\.patch$/i,
  /\.(?:pem|key|p12|jks|keystore|apk|aab|ipa)$/i,
];

for (const path of files) {
  if (forbidden.some((pattern) => pattern.test(path))) {
    errors.push(`Sensitive or generated file is tracked: ${path}`);
  }

  const size = statSync(path).size;
  if (size > 10 * 1024 * 1024) {
    warnings.push(`Large tracked file (${Math.round(size / 1024 / 1024)} MiB): ${path}`);
  }
}

const textExtensions = new Set([
  "",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const secretPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["OpenAI API key", /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{20,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["Stripe live secret", /(?:sk|rk)_live_[A-Za-z0-9]{12,}/],
];

for (const path of files) {
  if (path === "scripts/validate-public-repo.mjs") continue;
  if (!textExtensions.has(extname(path).toLowerCase())) continue;
  if (statSync(path).size > 5 * 1024 * 1024) continue;

  const content = readFileSync(path, "utf8");
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(content)) errors.push(`Possible ${label} in tracked file: ${path}`);
  }
}

if (warnings.length > 0) {
  for (const warning of warnings) console.warn(`WARNING: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log(
  `Public repository check passed (${files.length} repository files, no known secret or generated-file violations).`,
);

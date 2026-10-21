import { appendFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { deploymentEnvironment, deploymentMarker, githubApi } from "./github.mjs";

const rootDocs = new Set([
  "README.md", "AGENTS.md", "CLAUDE.md", "GEMINI.md", "CONTEXT.md",
  "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md", "LICENSE",
]);

export function isDocumentation(path) {
  return rootDocs.has(path) || /^docs\/.+\.md$/.test(path);
}

export function affectsProduction(path) {
  if (isDocumentation(path)) return false;
  // Only known test surfaces are excluded. Unknown files, locks, workflow
  // edits, shared code, rules, migrations and build scripts all deploy.
  return !(
    /^(e2e|test)\//.test(path) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(path) ||
    ["playwright.config.ts", "vitest.config.mts"].includes(path)
  );
}

export function gitDiff(base, head, threeDot = false, cwd = process.cwd()) {
  for (const sha of [base, head]) {
    if (!/^[a-f0-9]{40}$/i.test(sha ?? "") || /^0+$/.test(sha)) {
      throw new Error("Missing or invalid comparison SHA");
    }
  }
  return execFileSync("git", [
    "diff", "--name-only", "--no-renames", "-z",
    `${base}${threeDot ? "..." : ".."}${head}`, "--",
  ], { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
    .split("\0").filter(Boolean);
}

export function productionEvent(eventName, ref) {
  return ref === "refs/heads/master" && ["push", "workflow_dispatch"].includes(eventName);
}

export function deploymentDefinition(source) {
  const sections = source.replace(/\r\n/g, "\n").split(/^jobs:\s*\n/m);
  if (sections.length !== 2) throw new Error("Unrecognized workflow layout");
  const deploy = sections[1].match(/^  deploy:\n[\s\S]*?(?=^  [a-zA-Z_][\w-]*:|$(?![\s\S]))/m);
  if (!deploy) throw new Error("Missing deployment job");
  // Header includes workflow-level permissions/env/defaults/concurrency. Only
  // changes confined to other job bodies can be proven verification-only.
  return sections[0] + deploy[0];
}

export function productionChanged(files, base, head, read = (sha) =>
  execFileSync("git", ["show", `${sha}:.github/workflows/ci.yml`], { encoding: "utf8" })) {
  const inputs = files.filter(affectsProduction);
  if (inputs.some((path) => path !== ".github/workflows/ci.yml")) return true;
  if (!inputs.length) return false;
  return deploymentDefinition(read(base)) !== deploymentDefinition(read(head));
}

export async function getDeploymentBaseline(api) {
  // Read the latest attempt, not the latest success: falling back past a
  // partial/failed deployment could mistake a rollback for a no-op.
  const records = await api(`/deployments?environment=${deploymentEnvironment}&per_page=1`);
  const latest = records[0];
  if (!latest || latest.payload?.marker !== deploymentMarker) {
    throw new Error("No trusted production deployment record");
  }
  const statuses = await api(`/deployments/${latest.id}/statuses?per_page=1`);
  if (statuses[0]?.state !== "success") {
    throw new Error("Latest production deployment is incomplete or unsuccessful");
  }
  if (!/^[a-f0-9]{40}$/i.test(latest.sha ?? "")) throw new Error("Invalid deployment SHA");
  return latest.sha;
}

export async function determineScope({ eventName, ref, sha, event }, {
  diff = gitDiff,
  api = githubApi,
  changed = productionChanged,
} = {}) {
  const canDeploy = productionEvent(eventName, ref);
  const result = { full: true, deploy: canDeploy, reason: "Full validation by default" };
  const forced = event.inputs?.force_deploy === true || event.inputs?.force_deploy === "true";
  if (forced) return { ...result, reason: "Forced full validation; deployment is master-only" };

  try {
    let files;
    if (eventName === "pull_request") {
      files = diff(event.pull_request?.base?.sha, event.pull_request?.head?.sha, true);
    } else if (eventName === "push") {
      files = diff(event.before, sha);
    } else if (eventName === "workflow_dispatch" && !canDeploy && event.inputs?.validation_base) {
      // Diagnostic dispatch only. An override must never affect master or a PR.
      files = diff(event.inputs.validation_base, sha);
    } else if (eventName === "workflow_dispatch" && canDeploy) {
      files = []; // Manual master checks remain full; deployment still compares inputs.
    } else {
      return result;
    }
    result.full = files.length === 0 || !files.every(isDocumentation);
    result.reason = result.full ? "Code, configuration, tests or unknown paths changed" : "Documentation-only change";

    if (canDeploy) {
      const baseline = await getDeploymentBaseline(api);
      const productionFiles = diff(baseline, sha);
      result.deploy = changed(productionFiles, baseline, sha);
      // A docs push must not publish outstanding runtime changes without testing.
      if (result.deploy) result.full = true;
      result.reason += result.deploy ? "; production inputs changed" : "; production inputs unchanged";
    }
    return result;
  } catch (error) {
    return { full: true, deploy: canDeploy, reason: `Conservative fallback: ${error.message}` };
  }
}

export function verificationPassed(needs) {
  if (needs.scope?.result !== "success") return false;
  const full = needs.scope.outputs?.full;
  if (!["true", "false"].includes(full)) return false;
  const expected = full === "true" ? "success" : "skipped";
  return ["quality", "browser"].every((job) => needs[job]?.result === expected);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "verify") {
    if (!verificationPassed(JSON.parse(process.env.CI_NEEDS ?? "{}"))) {
      console.error("Required CI jobs failed, were canceled, or skipped unexpectedly.");
      process.exitCode = 1;
    } else {
      console.log("All required checks passed (documentation-only skips allowed).");
    }
  } else {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    const result = await determineScope({
      eventName: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF,
      sha: process.env.GITHUB_SHA,
      event,
    });
    console.log(JSON.stringify(result));
    appendFileSync(process.env.GITHUB_OUTPUT, `full=${result.full}\ndeploy=${result.deploy}\n`);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## CI scope\n\n- Full validation: ${result.full}\n- Deploy: ${result.deploy}\n- ${result.reason}\n`);
  }
}

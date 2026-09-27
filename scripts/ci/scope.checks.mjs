import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  affectsProduction, deploymentDefinition, determineScope, getDeploymentBaseline,
  gitDiff, isDocumentation, productionChanged, verificationPassed,
} from "./scope.mjs";
import { recordDeployment } from "./deployment.mjs";
import { deploymentMarker, githubApi } from "./github.mjs";

const base = "a".repeat(40);
const head = "b".repeat(40);
const master = { eventName: "push", ref: "refs/heads/master", sha: head, event: { before: base } };
const pr = {
  eventName: "pull_request", ref: "refs/pull/1/merge", sha: head,
  event: { pull_request: { base: { sha: base }, head: { sha: head } } },
};
const api = async (path) => path.includes("/statuses")
  ? [{ state: "success" }]
  : [{ id: 123, sha: base, payload: { marker: deploymentMarker } }];

test("only explicit documentation paths skip heavy verification", async () => {
  for (const path of ["README.md", "CONTEXT.md", "docs/nested/guide.md", "LICENSE"]) {
    assert.equal(isDocumentation(path), true);
    const result = await determineScope(pr, { diff: () => [path] });
    assert.equal(result.full, false);
    assert.equal(result.deploy, false);
  }
  for (const path of ["app/page.tsx", "lib/shared.ts", "package-lock.json", "functions/package-lock.json",
    "firestore.rules", "migrations/001.sql", ".github/workflows/ci.yml", "scripts/build.mjs",
    "content/article.md", "public/readme.md", "docs/example.ts", "unknown-file"]) {
    assert.equal((await determineScope(pr, { diff: () => ["README.md", path] })).full, true, path);
    assert.equal(affectsProduction(path), true, path);
  }
});

test("tests retain full verification but may skip deployment", async () => {
  for (const path of ["e2e/studio.spec.ts", "lib/foo.test.ts", "test/setup.ts", "playwright.config.ts"]) {
    const result = await determineScope(master, { diff: () => [path], api });
    assert.equal(result.full, true);
    assert.equal(result.deploy, false);
  }
});

test("PR comparison covers the whole PR, not only its last docs commit", async () => {
  const result = await determineScope(pr, {
    diff: (from, to, threeDot) => {
      assert.deepEqual([from, to, threeDot], [base, head, true]);
      return ["README.md", "lib/shared.ts"];
    },
    api: () => assert.fail("PRs must not query deployment history"),
  });
  assert.equal(result.full, true);
});

test("docs push includes outstanding runtime changes since deployed SHA", async () => {
  let calls = 0;
  const result = await determineScope(master, {
    diff: () => ++calls === 1 ? ["README.md"] : ["README.md", "lib/shared.ts"], api,
  });
  assert.equal(result.full, true);
  assert.equal(result.deploy, true);
});

test("docs-only push with known unchanged production skips both heavy jobs and deploy", async () => {
  const result = await determineScope(master, { diff: () => ["docs/guide.md"], api });
  assert.equal(result.full, false);
  assert.equal(result.deploy, false);
});

test("failed/canceled/pending releases force recovery even for a rollback to the old tree", async () => {
  for (const state of ["failure", "error", "pending", "in_progress", "queued", "inactive", undefined]) {
    const result = await determineScope(master, {
      diff: () => ["README.md"],
      api: async (path) => path.includes("/statuses") ? [{ state }] : api(path),
    });
    assert.equal(result.full, true, state);
    assert.equal(result.deploy, true, state);
  }
});

test("unknown records, API denial, missing git objects and empty diffs fail conservatively", async () => {
  for (const override of [
    { api: async () => [] },
    { api: async () => [{ id: 1, sha: base, payload: {} }] },
    { api: async () => { throw new Error("HTTP 403"); } },
    { diff: () => { throw new Error("missing object"); } },
  ]) {
    const result = await determineScope(master, { diff: () => ["README.md"], api, ...override });
    assert.equal(result.full, true);
    assert.equal(result.deploy, true);
  }
  assert.equal((await determineScope(pr, { diff: () => [] })).full, true);
  assert.equal((await determineScope(pr, { diff: () => { throw new Error("missing"); } })).deploy, false);
});

test("latest attempt is authoritative; an older success cannot mask a partial deployment", async () => {
  await assert.rejects(() => getDeploymentBaseline(async (path) => path.includes("statuses")
    ? [{ state: "in_progress" }, { state: "success" }]
    : [{ id: 1, sha: base, payload: { marker: deploymentMarker } }]), /incomplete/);
});

test("manual forced redeploy always validates; no branch other than master can deploy", async () => {
  for (const ref of ["refs/heads/master", "refs/heads/feature", "refs/tags/master"]) {
    const result = await determineScope({ ...master, ref, eventName: "workflow_dispatch",
      event: { inputs: { force_deploy: true, validation_base: base } } }, {
      diff: () => assert.fail("Force must bypass scope narrowing"),
    });
    assert.equal(result.full, true);
    assert.equal(result.deploy, ref === "refs/heads/master");
  }
});

test("diagnostic comparison is available only to dispatch on a non-master ref", async () => {
  const event = { inputs: { validation_base: base } };
  const branch = await determineScope({ ...master, eventName: "workflow_dispatch", ref: "refs/heads/feature", event }, {
    diff: () => ["docs/guide.md"],
    api: () => assert.fail("No deployment API on diagnostic branches"),
  });
  assert.equal(branch.full, false);
  assert.equal(branch.deploy, false);
  let calls = 0;
  const prod = await determineScope({ ...master, eventName: "workflow_dispatch", event }, {
    diff: () => { calls++; return []; }, api,
  });
  assert.equal(prod.full, true);
  assert.equal(prod.deploy, false);
  assert.equal(calls, 1); // Only the deployment baseline, never validation_base.
});

test("verification aggregate rejects failed, canceled, missing or unexpectedly skipped jobs", () => {
  for (const full of ["true", "false"]) {
    const expected = full === "true" ? "success" : "skipped";
    const needs = { scope: { result: "success", outputs: { full } },
      quality: { result: expected }, browser: { result: expected } };
    assert.equal(verificationPassed(needs), true);
    for (const result of ["failure", "cancelled", undefined, full === "true" ? "skipped" : "success"]) {
      assert.equal(verificationPassed({ ...needs, browser: { result } }), false);
    }
    assert.equal(verificationPassed({ ...needs, scope: { result: "failure" } }), false);
  }
  assert.equal(verificationPassed({}), false);
});

test("verification-only workflow edits do not hide deployment/header changes", () => {
  const workflow = "name: CI\npermissions:\n  contents: read\njobs:\n  quality:\n    steps: []\n  deploy:\n    steps:\n      - run: firebase deploy\n";
  const verifyEdit = workflow.replace("quality:\n    steps: []", "quality:\n    timeout-minutes: 15\n    steps: []");
  assert.equal(productionChanged([".github/workflows/ci.yml"], base, head, (sha) => sha === base ? workflow : verifyEdit), false);
  for (const source of [workflow.replace("firebase deploy", "firebase deploy --force"), workflow.replace("contents: read", "contents: write")]) {
    assert.equal(productionChanged([".github/workflows/ci.yml"], base, head, (sha) => sha === base ? workflow : source), true);
  }
  assert.throws(() => deploymentDefinition("jobs: {}"), /layout/);
  assert.throws(() => deploymentDefinition("jobs:\n  quality:\n    steps: []\n"), /Missing/);
  const actual = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.match(deploymentDefinition(actual), /Record production deployment outcome/);
});

test("git diff includes both sides of a rename and all paths beyond API file limits", () => {
  const tempRoot = realpathSync(tmpdir());
  const dir = mkdtempSync(join(tempRoot, "yardup-ci-scope-"));
  const git = (...args) => execFileSync("git", ["-c", "core.autocrlf=false", "-c", "user.name=CI tests", "-c", "user.email=ci@example.invalid", ...args], { cwd: dir, encoding: "utf8" }).trim();
  try {
    git("init", "--quiet");
    mkdirSync(join(dir, "lib"));
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "lib", "shared.ts"), "export const value = 1;\n");
    git("add", "."); git("commit", "--quiet", "-m", "base");
    const before = git("rev-parse", "HEAD");
    git("mv", "lib/shared.ts", "docs/shared.md");
    for (let i = 0; i < 305; i++) writeFileSync(join(dir, "docs", `guide-${i}.md`), "Guide\n");
    git("add", "."); git("commit", "--quiet", "-m", "rename");
    const files = gitDiff(before, git("rev-parse", "HEAD"), false, dir);
    assert.equal(files.length, 307);
    assert.ok(files.includes("lib/shared.ts"));
    assert.ok(files.includes("docs/shared.md"));
    assert.equal(files.every(isDocumentation), false);
  } finally {
    assert.equal(dirname(realpathSync(dir)), tempRoot);
    assert.match(basename(dir), /^yardup-ci-scope-/);
    rmSync(dir, { recursive: true, force: true });
  }
});

test("deployment record starts before writes, and only a successful Firebase step records success", async () => {
  const env = { GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/heads/master", GITHUB_SHA: head,
    GITHUB_REPOSITORY: "owner/repo", GITHUB_RUN_ID: "42", DEPLOYMENT_ID: "123" };
  const calls = [];
  const mock = async (path, options) => { calls.push({ path, ...options }); return { id: 123 }; };
  assert.equal(await recordDeployment("start", env, mock), 123);
  assert.equal(calls[0].body.auto_merge, false);
  assert.equal(calls[0].body.payload.marker, deploymentMarker);
  assert.equal(calls[1].body.state, "in_progress");
  for (const outcome of ["success", "failure", "cancelled", "skipped", undefined]) {
    await recordDeployment("finish", { ...env, DEPLOYMENT_OUTCOME: outcome }, mock);
    assert.equal(calls.at(-1).body.state, outcome === "success" ? "success" : "failure");
  }
  await assert.rejects(() => recordDeployment("start", { ...env, GITHUB_REF: "refs/heads/feature" }, mock), /master/);
});

test("API calls are bounded and failures do not echo response bodies or tokens", async () => {
  const env = { GITHUB_TOKEN: "test-only", GITHUB_REPOSITORY: "owner/repo" };
  await assert.rejects(() => githubApi("/deployments", {}, env, async (_url, options) => {
    assert.ok(options.signal);
    return { ok: false, status: 403, json: () => assert.fail("Never echo error bodies") };
  }), /^Error: GitHub API returned HTTP 403$/);
});

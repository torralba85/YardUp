import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertServingRevision, verifyServingRevisions } from "./serving-revision.mjs";

function current() {
  return {
    fn: { state: "ACTIVE", serviceConfig: { revision: "app-new", allTrafficOnLatestRevision: true } },
    service: {
      metadata: { generation: 319 },
      spec: { traffic: [{ latestRevision: true, percent: 100 }, { revisionName: "app-recovery", tag: "rollback" }] },
      status: { observedGeneration: 319, latestCreatedRevisionName: "app-new", latestReadyRevisionName: "app-new",
        conditions: [{ type: "Ready", status: "True" }, { type: "RoutesReady", status: "True" }],
        traffic: [{ latestRevision: true, revisionName: "app-new", percent: 100 }, { revisionName: "app-recovery", tag: "rollback" }] },
    },
  };
}

test("accepts latest routing with a zero-traffic rollback URL", () => {
  const { fn, service } = current();
  assert.equal(assertServingRevision(fn, service), "app-new");
});

test("rejects the incident: ACTIVE new function with all traffic pinned to recovery", () => {
  const { fn, service } = current();
  delete fn.serviceConfig.allTrafficOnLatestRevision;
  service.spec.traffic = [{ revisionName: "app-recovery", percent: 100 }];
  service.status.traffic = [{ revisionName: "app-recovery", percent: 100 }];
  assert.throws(() => assertServingRevision(fn, service), /not following the latest/);
});

for (const [name, change, message] of [
  ["pending function", (x) => { x.fn.state = "DEPLOYING"; }, /no active/],
  ["stale observed generation", (x) => { x.service.status.observedGeneration = 318; }, /not observed/],
  ["failed readiness", (x) => { x.service.status.conditions[0].status = "False"; }, /Ready is not true/],
  ["pending route", (x) => { x.service.status.conditions[1].status = "Unknown"; }, /RoutesReady/],
  ["old ready revision", (x) => { x.service.status.latestReadyRevisionName = "app-old"; }, /latest ready/],
  ["newer unverified deployment", (x) => { x.service.status.latestCreatedRevisionName = "app-newer"; }, /latest ready/],
  ["pin even to current revision", (x) => { x.service.spec.traffic = [{ revisionName: "app-new", percent: 100 }]; }, /must follow/],
  ["lagging traffic", (x) => { x.service.status.traffic[0].revisionName = "app-old"; }, /older revision/],
  ["split traffic", (x) => { x.service.status.traffic = [{ revisionName: "app-new", percent: 90 }, { revisionName: "app-old", percent: 10 }]; }, /older revision/],
  ["incomplete traffic", (x) => { x.service.status.traffic[0].percent = 99; }, /total 100/],
  ["malformed percentage", (x) => { x.service.status.traffic[0].percent = "100"; }, /invalid observed/],
  ["missing traffic", (x) => { delete x.service.status.traffic; }, /observed traffic is missing/],
]) {
  test(`rejects ${name}`, () => {
    const x = current(); change(x);
    assert.throws(() => assertServingRevision(x.fn, x.service), message);
  });
}

test("waits for propagation and checks each function independently", async () => {
  const seen = []; const waits = []; let calls = 0;
  await verifyServingRevisions(["app", "api"], {
    describe: (name) => {
      seen.push(name); const result = current();
      if (calls++ === 0) result.service.status.observedGeneration = 318;
      return result;
    }, wait: async (ms) => { waits.push(ms); }, log: () => {}, attempts: 2,
  });
  assert.deepEqual(seen, ["app", "app", "api"]);
  assert.deepEqual(waits, [15000]);
});

test("fails after a bounded number of reads without changing traffic", async () => {
  let reads = 0;
  await assert.rejects(verifyServingRevisions(["app"], {
    describe: () => { reads++; throw new Error("read failed"); }, wait: async () => {}, log: () => {}, attempts: 2,
  }), /app: read failed/);
  assert.equal(reads, 2);
});

test("CI checks serving traffic before recording deployment success", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.match(workflow, /node --test [^\n]*scripts\/ci\/serving-revision\.checks\.mjs/);
  const deploy = workflow.indexOf('deploy_target "functions:app,functions:api,functions:apiAi,functions:apiStripe"');
  const verify = workflow.indexOf("node scripts/ci/serving-revision.mjs");
  const record = workflow.indexOf("- name: Record production deployment outcome");
  assert.ok(deploy >= 0 && verify > deploy && record > verify);
});

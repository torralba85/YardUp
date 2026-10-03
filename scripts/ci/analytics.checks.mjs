import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { productionMeasurementId, verifyAnalyticsBundle } from "./verify-analytics.mjs";

test("production bundle rejects missing, stale, and duplicate stream configuration", () => {
  const directory = mkdtempSync(join(tmpdir(), "lotfoundry-analytics-"));
  try {
    mkdirSync(join(directory, "nested"));
    const chunk = join(directory, "nested", "app.js");
    writeFileSync(chunk, "no analytics configured");
    assert.throws(() => verifyAnalyticsBundle(directory), /no GA4 ID/);
    writeFileSync(chunk, 'const id = "G-GLVYZBZW5K";');
    assert.throws(() => verifyAnalyticsBundle(directory), /found: G-GLVYZBZW5K/);
    writeFileSync(chunk, `const id = "${productionMeasurementId}";`);
    assert.equal(verifyAnalyticsBundle(directory), productionMeasurementId);
    writeFileSync(join(directory, "stale.js"), 'const id = "G-GLVYZBZW5K";');
    assert.throws(() => verifyAnalyticsBundle(directory), /Production analytics must use/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

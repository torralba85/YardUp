import { describe, expect, it } from "vitest";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { renderScenarioEmail, scenarioHeadlineNumbers } from "./studio-scenario-email";
import { buildScenarioShareUrl } from "../scenario-share-url";

it("models the strict 750 sq ft boundary without promising all fees are waived", () => {
  for (const [width, length, expected] of [[20, 30, true], [25, 30, false], [30, 30, false]] as const) {
    const scenario = { ...EMAIL_SCENARIO, config: { ...EMAIL_SCENARIO.config, width, length, footprint: width * length } };
    expect(scenarioHeadlineNumbers(scenario).isUnder750SqftFeeWaiver).toBe(expected);
    const message = renderScenarioEmail(scenario, buildScenarioShareUrl(scenario), false);
    expect(message.text).toContain(expected ? "Other fees and local/program exceptions" : "750 sq ft or larger");
    expect(message.text).toContain("Rent basis:");
  }
});
it("does not apply the California exemption to another state", () => {
  const scenario = { ...EMAIL_SCENARIO, liveParcel: { ...EMAIL_SCENARIO.liveParcel!, state: "WA" } };
  expect(renderScenarioEmail(scenario, buildScenarioShareUrl(scenario), false).text).toContain("has not been applied");
});

describe("dispatchScenarioEmail", () => {
  it("returns queued when RESEND_API_KEY is not set", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      const { dispatchScenarioEmail } = await import("./studio-scenario-email");
      const result = await dispatchScenarioEmail("user@example.com", EMAIL_SCENARIO, buildScenarioShareUrl(EMAIL_SCENARIO), false);
      expect(result).toEqual({ delivery: "queued" });
    } finally {
      process.env.RESEND_API_KEY = originalKey;
    }
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildScenarioShareUrl, isAllowedScenarioUrl, validLayoutToken } from "./scenario-share-url";
import { parseEmailScenario } from "./scenario-email";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { mergeScenarioPartial, parseScenarioParams } from "./scenario-url";

afterEach(() => vi.unstubAllEnvs());
describe("canonical email scenario links", () => {
  it("uses canonical origin and existing design serialization without addresses or email", () => {
    const url = new URL(buildScenarioShareUrl(EMAIL_SCENARIO, "a".repeat(48)));
    expect(url.origin).toBe("https://lotfoundry.net");
    expect(url.pathname).toBe("/studio");
    expect(url.searchParams.get("utm_campaign")).toBe("saved_3d_link");
    expect(url.searchParams.get("layout")).toHaveLength(48);
    expect(decodeURIComponent(url.toString())).not.toContain(EMAIL_SCENARIO.liveParcel!.address);
    const restored = mergeScenarioPartial(parseScenarioParams(url.searchParams));
    expect(restored.config).toEqual(EMAIL_SCENARIO.config);
    expect(restored.pose).toEqual(EMAIL_SCENARIO.pose);
  });
  it.each(["https://yardup-2026.web.app/studio", "https://www.lotfoundry.net/studio", "https://lotfoundry.net.evil.test/studio", "https://lotfoundry.net@evil.test/studio", "https://lotfoundry.net/other", "javascript:alert(1)"])("rejects %s", (url) => expect(isAllowedScenarioUrl(url)).toBe(false));
  it("allows localhost only outside production and rejects malformed tokens", () => {
    expect(isAllowedScenarioUrl("http://localhost:3000/studio")).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isAllowedScenarioUrl("http://localhost:3000/studio")).toBe(false);
    expect(validLayoutToken("../bad")).toBe(false);
    expect(() => buildScenarioShareUrl(EMAIL_SCENARIO, "bad")).toThrow();
  });
  it("retains all financial assumptions while dropping private/paid metadata", () => {
    const assumptions = { ...EMAIL_SCENARIO.assumptions, softCostMultiplier: 1.4 };
    const snapshot = parseEmailScenario({ ...EMAIL_SCENARIO, assumptions, email: "private@example.com", projectBrief: { paid: true } });
    expect(snapshot?.assumptions).toEqual(assumptions);
    expect(snapshot?.liveParcel?.address).toBe(EMAIL_SCENARIO.liveParcel!.address);
    expect(snapshot).not.toHaveProperty("email");
    expect(snapshot).not.toHaveProperty("projectBrief");
    expect(parseEmailScenario({ ...EMAIL_SCENARIO, liveParcel: { ...EMAIL_SCENARIO.liveParcel, lat: 1000 } })).toBeNull();
  });
});

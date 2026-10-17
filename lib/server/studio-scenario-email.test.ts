import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { dispatchScenarioEmail, renderScenarioEmail, scenarioHeadlineNumbers } from "./studio-scenario-email";
import { buildScenarioShareUrl } from "../scenario-share-url";

const resendMocks = vi.hoisted(() => ({ construct: vi.fn(), send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendMocks.send };
    constructor(apiKey: string) {
      resendMocks.construct(apiKey);
    }
  },
}));

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
  const scenarioUrl = buildScenarioShareUrl(EMAIL_SCENARIO, "a".repeat(48));
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError.mockRestore();
    vi.unstubAllEnvs();
  });

  it("returns queued without contacting Resend when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await dispatchScenarioEmail("user@example.com", EMAIL_SCENARIO, scenarioUrl, false);
    expect(result).toEqual({ delivery: "queued" });
    expect(resendMocks.construct).not.toHaveBeenCalled();
    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("sends the rendered layout email from support@lotfoundry.net and reports the Resend id", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    resendMocks.send.mockResolvedValue({ data: { id: "re_msg_123" }, error: null });
    const result = await dispatchScenarioEmail("owner@example.com", EMAIL_SCENARIO, scenarioUrl, true, "token-123");
    expect(result).toEqual({ delivery: "sent", resendId: "re_msg_123" });
    expect(resendMocks.construct).toHaveBeenCalledWith("re_test_key");
    expect(resendMocks.send).toHaveBeenCalledTimes(1);
    const payload = resendMocks.send.mock.calls[0][0];
    const expected = renderScenarioEmail(EMAIL_SCENARIO, scenarioUrl, true);
    expect(payload).toEqual({
      from: "LotFoundry <support@lotfoundry.net>",
      to: ["owner@example.com"],
      replyTo: "support@lotfoundry.net",
      subject: expected.subject,
      text: expected.text,
      html: expected.html,
      headers: { "X-Entity-Ref-ID": "token-123" },
    });
    expect(payload.text).toContain(scenarioUrl);
    expect(payload.text).toContain("opted in");
  });

  it("omits the entity reference header when no idempotency token is given", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    resendMocks.send.mockResolvedValue({ data: { id: "re_msg_456" }, error: null });
    await dispatchScenarioEmail("owner@example.com", EMAIL_SCENARIO, scenarioUrl, false);
    expect(resendMocks.send.mock.calls[0][0].headers).toBeUndefined();
  });

  it("falls back to queued with the provider message when Resend returns an error", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    resendMocks.send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "The lotfoundry.net domain is not verified." } });
    const result = await dispatchScenarioEmail("owner@example.com", EMAIL_SCENARIO, scenarioUrl, false);
    expect(result).toEqual({ delivery: "queued", error: "The lotfoundry.net domain is not verified." });
    expect(consoleError).toHaveBeenCalled();
  });

  it("falls back to queued instead of throwing when the send request is rejected", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    resendMocks.send.mockRejectedValue(new Error("network down"));
    await expect(dispatchScenarioEmail("owner@example.com", EMAIL_SCENARIO, scenarioUrl, false)).resolves.toEqual({
      delivery: "queued",
      error: "network down",
    });
    resendMocks.send.mockRejectedValue("boom");
    await expect(dispatchScenarioEmail("owner@example.com", EMAIL_SCENARIO, scenarioUrl, false)).resolves.toEqual({
      delivery: "queued",
      error: "Unknown error",
    });
  });

  it("treats an accepted response with no message id as queued", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    resendMocks.send.mockResolvedValue({ data: null, error: null });
    expect(await dispatchScenarioEmail("owner@example.com", EMAIL_SCENARIO, scenarioUrl, false)).toEqual({ delivery: "queued" });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyZoning,
  clearZoningCache,
  isZoningShadowEnabled,
  jevResidential,
  residentialAgreement,
  shadowClassifyZoning,
  ZONING_CLASSES,
  ZONING_CONFIDENCE_THRESHOLD,
  ZONING_PROBABILITY_MARGIN_THRESHOLD,
  type ZoningClass,
} from "./zoning-classifier";

/** A full distribution putting `lead` more probability on `choice` than on the runner-up. */
function distribution(choice: ZoningClass, lead: number): Record<string, number> {
  const runnerUp = 0.05;
  const probabilities: Record<string, number> = {};
  for (const key of ZONING_CLASSES) probabilities[key] = 0.01;
  probabilities[choice] = runnerUp + lead;
  probabilities[choice === "unclear" ? "single_family" : "unclear"] = runnerUp;
  return probabilities;
}

function stubAnswer(answer: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ model: "jev-test", answers: { district: answer } }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(String(fetchMock.mock.calls[0][1].body));
}

function loggedEvent(spy: ReturnType<typeof vi.spyOn>) {
  return JSON.parse(String(spy.mock.calls[0][0]));
}

let info: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  clearZoningCache();
  vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isZoningShadowEnabled", () => {
  it("needs the exact flag and a key", () => {
    vi.stubEnv("TYPESAFE_ZONING_SHADOW", "true");
    expect(isZoningShadowEnabled()).toBe(true);

    vi.stubEnv("TYPESAFE_API_KEY", "");
    expect(isZoningShadowEnabled()).toBe(false);

    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    vi.stubEnv("TYPESAFE_ZONING_SHADOW", "1");
    expect(isZoningShadowEnabled()).toBe(false);
  });
});

describe("classifyZoning", () => {
  it("asks one Choice offering every class, with only the parcel fields it has", async () => {
    const fetchMock = stubAnswer({ type: "choice", choice: "single_family", confidence: 0.95 });

    await classifyZoning({ zoning: "NR3", state: "WA", county: "King", city: "Seattle" });

    const body = requestBody(fetchMock);
    expect(Object.keys(body.questions)).toEqual(["district"]);
    expect(body.questions.district.type).toBe("choice");
    expect(Object.keys(body.questions.district.criteria)).toEqual([...ZONING_CLASSES]);
    expect(body.questions.district.instructions).toContain("`parcel.zoningCode`");
    expect(body.state).toEqual({
      parcel: { state: "WA", county: "King", city: "Seattle", zoningCode: "NR3" },
    });
    expect(Object.keys(body.state.parcel)).toEqual(["state", "county", "city", "zoningCode"]);
  });

  it("omits the city from the parcel when it is absent", async () => {
    const fetchMock = stubAnswer({ type: "choice", choice: "single_family", confidence: 0.95 });

    await classifyZoning({ zoning: "NR3", state: "WA", county: "King" });

    const body = requestBody(fetchMock);
    expect(body.state).toEqual({ parcel: { state: "WA", county: "King", zoningCode: "NR3" } });
    expect(body.state.parcel).not.toHaveProperty("city");
  });

  it("names the city in the instructions only when a city is sent", async () => {
    const withCity = stubAnswer({ type: "choice", choice: "single_family", confidence: 0.95 });
    await classifyZoning({ zoning: "NR3", state: "WA", city: "Seattle" });
    const cityInstructions = requestBody(withCity).questions.district.instructions;

    const without = stubAnswer({ type: "choice", choice: "single_family", confidence: 0.95 });
    await classifyZoning({ zoning: "R1-6", state: "AZ" });
    const plainInstructions = requestBody(without).questions.district.instructions;

    expect(cityInstructions).toContain("the named city, county and state");
    expect(plainInstructions).toContain("the named state and county");
    expect(plainInstructions).not.toContain("city");
  });

  it("returns the class and marks a concentrated answer confident", async () => {
    stubAnswer({
      type: "choice",
      choice: "multifamily",
      confidence: 0.95,
      probabilities: distribution("multifamily", 0.8),
    });

    const result = await classifyZoning({ zoning: "LR2", state: "WA", county: "King" });

    expect(result.outcome).toBe("classified");
    expect(result.model).toBe("jev-test");
    expect(result.judgment?.zoningClass).toBe("multifamily");
    expect(result.judgment?.confident).toBe(true);
    expect(result.judgment?.probabilityMargin).toBeCloseTo(0.8, 5);
  });

  it("keeps the class but marks a low-confidence answer not confident", async () => {
    stubAnswer({ type: "choice", choice: "commercial", confidence: ZONING_CONFIDENCE_THRESHOLD - 0.01 });

    const result = await classifyZoning({ zoning: "C-2" });

    expect(result.judgment).toMatchObject({ zoningClass: "commercial", confident: false });
  });

  it("marks a narrow probability lead not confident even at high confidence", async () => {
    stubAnswer({
      type: "choice",
      choice: "industrial",
      confidence: 0.95,
      probabilities: distribution("industrial", ZONING_PROBABILITY_MARGIN_THRESHOLD - 0.05),
    });

    const result = await classifyZoning({ zoning: "A-1" });

    expect(result.judgment?.confident).toBe(false);
  });

  it("is confident exactly at the confidence band when no distribution is supplied", async () => {
    stubAnswer({ type: "choice", choice: "single_family", confidence: ZONING_CONFIDENCE_THRESHOLD });

    const result = await classifyZoning({ zoning: "R1-6" });

    expect(result.judgment).toMatchObject({ confident: true });
    expect(result.judgment?.probabilityMargin).toBeUndefined();
  });

  it("rejects a choice that is not one of the classes", async () => {
    stubAnswer({ type: "choice", choice: "constructor", confidence: 0.99 });

    const result = await classifyZoning({ zoning: "R1-6" });

    expect(result.outcome).toBe("fallback-invalid-response");
    expect(result.judgment).toBeUndefined();
  });

  it("rejects an answer whose confidence is not a number", async () => {
    stubAnswer({ type: "choice", choice: "single_family", confidence: "high" });

    const result = await classifyZoning({ zoning: "R1-6" });

    expect(result.outcome).toBe("fallback-invalid-response");
  });

  it("reports a provider error instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const result = await classifyZoning({ zoning: "R1-6" });

    expect(result).toMatchObject({
      outcome: "fallback-provider-error",
      errorName: "TypeSafeProviderError",
      cacheHit: false,
    });
  });

  it("reports a missing key instead of throwing", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "");

    const result = await classifyZoning({ zoning: "R1-6" });

    expect(result).toMatchObject({
      outcome: "fallback-provider-error",
      errorName: "TypeSafeConfigError",
    });
  });

  it("answers a repeated designation from cache, ignoring case and spacing", async () => {
    const fetchMock = stubAnswer({ type: "choice", choice: "commercial", confidence: 0.95 });

    const first = await classifyZoning({ zoning: "NC2-55", state: "WA", county: "King" });
    const second = await classifyZoning({ zoning: " nc2-55 ", state: "wa", county: "KING" });

    expect(first.cacheHit).toBe(false);
    expect(second).toMatchObject({ cacheHit: true, outcome: "classified" });
    expect(second.judgment).toEqual(first.judgment);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps different states apart in the cache", async () => {
    const fetchMock = stubAnswer({ type: "choice", choice: "industrial", confidence: 0.95 });

    await classifyZoning({ zoning: "A-1", state: "AZ" });
    await classifyZoning({ zoning: "A-1", state: "CO" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps different cities apart in the cache", async () => {
    const fetchMock = stubAnswer({ type: "choice", choice: "industrial", confidence: 0.95 });

    await classifyZoning({ zoning: "A-1", state: "AZ", county: "Maricopa", city: "Phoenix" });
    await classifyZoning({ zoning: "A-1", state: "AZ", county: "Maricopa", city: "Mesa" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ignores city case and spacing in the cache", async () => {
    const fetchMock = stubAnswer({ type: "choice", choice: "industrial", confidence: 0.95 });

    await classifyZoning({ zoning: "A-1", state: "AZ", county: "Maricopa", city: "Phoenix" });
    await classifyZoning({ zoning: "A-1", state: "AZ", county: "Maricopa", city: "  phoenix " });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await classifyZoning({ zoning: "R1-6" });

    const fetchMock = stubAnswer({ type: "choice", choice: "single_family", confidence: 0.95 });
    const retry = await classifyZoning({ zoning: "R1-6" });

    expect(retry).toMatchObject({ outcome: "classified", cacheHit: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("residentialAgreement", () => {
  it("compares a confident residential or commercial/industrial class with the regex", () => {
    expect(residentialAgreement("yes", "single_family", true)).toBe("agree");
    expect(residentialAgreement("no", "commercial", true)).toBe("agree");
    expect(residentialAgreement("no", "single_family", true)).toBe("regex-no-jev-yes");
    expect(residentialAgreement("no", "multifamily", true)).toBe("regex-no-jev-yes");
    expect(residentialAgreement("yes", "industrial", true)).toBe("regex-yes-jev-no");
  });

  it("does not compare unsure answers, unreadable regex results or ambiguous classes", () => {
    expect(residentialAgreement("no", "single_family", false)).toBe("not-compared");
    expect(residentialAgreement("unknown", "single_family", true)).toBe("not-compared");
    expect(residentialAgreement(undefined, "single_family", true)).toBe("not-compared");
    for (const zoningClass of ["mixed_use", "agricultural_rural", "planned_special", "unclear"] as const) {
      expect(jevResidential(zoningClass)).toBe("other");
      expect(residentialAgreement("no", zoningClass, true)).toBe("not-compared");
    }
  });
});

describe("shadowClassifyZoning", () => {
  beforeEach(() => {
    vi.stubEnv("TYPESAFE_ZONING_SHADOW", "true");
  });

  it("does nothing when the flag is off", async () => {
    vi.stubEnv("TYPESAFE_ZONING_SHADOW", "");
    const fetchMock = stubAnswer({ type: "choice", choice: "single_family", confidence: 0.95 });

    await shadowClassifyZoning({ zoning: "R1-6", state: "AZ" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it("skips a parcel with no zoning to read", async () => {
    const fetchMock = stubAnswer({ type: "choice", choice: "single_family", confidence: 0.95 });

    for (const zoning of [undefined, "", "  ", "Unknown", 42]) {
      await shadowClassifyZoning({ zoning, state: "AZ" });
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs Jev's class beside the regex verdicts for a California parcel", async () => {
    stubAnswer({
      type: "choice",
      choice: "single_family",
      confidence: 0.95,
      probabilities: distribution("single_family", 0.8),
    });

    await shadowClassifyZoning({
      zoning: "RE40-1",
      description: "Residential Estate",
      state: "ca",
      county: "Los Angeles",
      city: "Pasadena",
    });

    const line = String(info.mock.calls[0][0]);
    expect(loggedEvent(info)).toMatchObject({
      severity: "INFO",
      event: "jev_zoning_shadow",
      outcome: "classified",
      cacheHit: false,
      state: "CA",
      zoning: "RE40-1",
      zoningClass: "single_family",
      confident: true,
      regexResidential: "yes",
      regexCoveragePercent: 40,
      residentialAgreement: "agree",
    });
    // Public designation and state only; nothing that could identify a parcel or person.
    expect(line).not.toContain("Los Angeles");
    expect(line).not.toContain("Residential Estate");
    expect(line).not.toContain("Pasadena");
  });

  it("compares the residential screen only in California", async () => {
    stubAnswer({ type: "choice", choice: "single_family", confidence: 0.95 });

    await shadowClassifyZoning({ zoning: "NR3", state: "WA", county: "King" });

    const event = loggedEvent(info);
    expect(event.regexResidential).toBeUndefined();
    expect(event.residentialAgreement).toBe("not-compared");
    // The substring heuristic reads Seattle's single-family NR3 as R-3.
    expect(event.regexCoveragePercent).toBe(50);
  });

  it("warns, without throwing, when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(shadowClassifyZoning({ zoning: "R1-6", state: "AZ" })).resolves.toBeUndefined();

    expect(info).not.toHaveBeenCalled();
    expect(loggedEvent(warn)).toMatchObject({
      severity: "WARNING",
      outcome: "fallback-provider-error",
      errorName: "TypeSafeProviderError",
    });
  });

  it("never rejects, even if logging itself fails", async () => {
    stubAnswer({ type: "choice", choice: "single_family", confidence: 0.95 });
    info.mockImplementation(() => {
      throw new Error("log sink down");
    });

    await expect(shadowClassifyZoning({ zoning: "R1-6", state: "AZ" })).resolves.toBeUndefined();
  });

  it("caps a very long designation in the log", async () => {
    stubAnswer({ type: "choice", choice: "unclear", confidence: 0.95 });

    await shadowClassifyZoning({ zoning: "X".repeat(200), state: "AZ" });

    expect(loggedEvent(info).zoning).toHaveLength(40);
  });
});

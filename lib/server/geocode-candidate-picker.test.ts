import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isGeocodePickerEnabled,
  PICK_CONFIDENCE_THRESHOLD,
  PICK_PROBABILITY_MARGIN_THRESHOLD,
  pickGeocodeCandidate,
} from "./geocode-candidate-picker";

function stubAnswer(answer: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ model: "jev-test", answers: { pick: answer } }),
    }),
  );
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isGeocodePickerEnabled", () => {
  it("needs both the flag and a key", () => {
    vi.stubEnv("TYPESAFE_GEOCODE_PICKER", "true");
    vi.stubEnv("TYPESAFE_API_KEY", "");
    expect(isGeocodePickerEnabled()).toBe(false);

    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    expect(isGeocodePickerEnabled()).toBe(true);

    vi.stubEnv("TYPESAFE_GEOCODE_PICKER", "1");
    expect(isGeocodePickerEnabled()).toBe(false);
  });
});

describe("pickGeocodeCandidate", () => {
  it("acts on an answer exactly at the confidence threshold", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    stubAnswer({
      type: "choice",
      choice: "c1",
      confidence: PICK_CONFIDENCE_THRESHOLD,
    });

    expect(await pickGeocodeCandidate("q", ["a", "b"])).toBe(1);
  });

  it("uses a choice when its probability lead clears the margin", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    stubAnswer({
      type: "choice",
      choice: "c1",
      confidence: 0.95,
      probabilities: { c0: 0.08, c1: 0.82, none: 0.1 },
    });

    expect(await pickGeocodeCandidate("q", ["a", "b"])).toBe(1);
  });

  it("keeps the provider default when probabilities are too close", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    stubAnswer({
      type: "choice",
      choice: "c0",
      confidence: 0.95,
      probabilities: {
        c0: 0.5 + PICK_PROBABILITY_MARGIN_THRESHOLD / 4,
        c1: 0.5 - PICK_PROBABILITY_MARGIN_THRESHOLD / 4,
        none: 0,
      },
    });

    expect(await pickGeocodeCandidate("q", ["a", "b"])).toBeNull();
  });

  it("keeps the provider default when choice and probabilities disagree", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    stubAnswer({
      type: "choice",
      choice: "c0",
      confidence: 0.95,
      probabilities: { c0: 0.2, c1: 0.75, none: 0.05 },
    });

    expect(await pickGeocodeCandidate("q", ["a", "b"])).toBeNull();
  });

  it("preserves confidence-only behavior when probabilities are unavailable", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    stubAnswer({
      type: "choice",
      choice: "c1",
      confidence: 0.95,
      probabilities: {},
    });

    expect(await pickGeocodeCandidate("q", ["a", "b"])).toBe(1);
  });

  it("returns no answer for a choice outside the offered candidates", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    stubAnswer({ type: "choice", choice: "c7", confidence: 0.99 });

    expect(await pickGeocodeCandidate("q", ["a", "b"])).toBeNull();
  });

  it("emits privacy-safe telemetry without the query or candidate labels", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    stubAnswer({
      type: "choice",
      choice: "c0",
      confidence: 0.93,
      probabilities: { c0: 0.84, c1: 0.09, none: 0.07 },
    });
    const info = vi.mocked(console.info);

    await pickGeocodeCandidate(
      "1421 NE 88th St, Seattle, WA",
      ["1421 Northeast 88th Street, Seattle, WA", "Another candidate"],
    );

    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0][0]);
    const event = JSON.parse(line);

    expect(event).toMatchObject({
      event: "jev_geocode_picker",
      candidateCount: 2,
      outcome: "selected",
      model: "jev-test",
      confidence: 0.93,
      selectedProbability: 0.84,
      runnerUpProbability: 0.09,
      probabilityMargin: 0.75,
    });
    expect(line).not.toContain("1421 NE 88th St");
    expect(line).not.toContain("Northeast 88th Street");
    expect(line).not.toContain("Another candidate");
  });

  it("does not call the provider without candidates or without a key", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await pickGeocodeCandidate("q", [])).toBeNull();
    expect(await pickGeocodeCandidate("q", ["a"])).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

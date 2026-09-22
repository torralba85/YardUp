import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isGeocodePickerEnabled,
  PICK_CONFIDENCE_THRESHOLD,
  pickGeocodeCandidate,
} from "./geocode-candidate-picker";

function stubAnswer(answer: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ answers: { pick: answer } }),
    }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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
    stubAnswer({ type: "choice", choice: "c1", confidence: PICK_CONFIDENCE_THRESHOLD });

    expect(await pickGeocodeCandidate("q", ["a", "b"])).toBe(1);
  });

  it("returns no answer for a choice outside the offered candidates", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    stubAnswer({ type: "choice", choice: "c7", confidence: 0.99 });

    expect(await pickGeocodeCandidate("q", ["a", "b"])).toBeNull();
  });

  it("does not call the provider without candidates or without a key", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await pickGeocodeCandidate("q", [])).toBeNull();
    expect(await pickGeocodeCandidate("q", ["a"])).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

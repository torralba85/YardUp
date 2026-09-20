import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_SANITIZED_MESSAGE_LENGTH,
  PHOTOREAL_ERROR_EVENT,
  REDACTED,
  buildPhotorealErrorReport,
  categorizePhotorealError,
  reportPhotorealError,
  sanitizePhotorealErrorMessage,
  setPhotorealErrorReporter,
  type PhotorealErrorReport,
} from "./cesium-photoreal-diagnostics";

const FAKE_KEY = "AIzaFakeGoogleKey1234567890abcdef12";
const FAKE_TOKEN = "eyJmYWtlLXRva2VuLWZvci10ZXN0cy0xMjM0NTY3ODkw";

describe("categorizePhotorealError", () => {
  it("maps rejected credentials to auth", () => {
    expect(categorizePhotorealError("Request failed with status 403")).toBe("auth");
    expect(categorizePhotorealError("API key not valid")).toBe("auth");
    expect(categorizePhotorealError("ion token rejected")).toBe("auth");
  });

  it("maps quota and billing failures to quota", () => {
    expect(categorizePhotorealError("429 quota exceeded for Map Tiles API")).toBe("quota");
    expect(categorizePhotorealError("billing not enabled")).toBe("quota");
  });

  it("maps a disabled API to api-disabled", () => {
    expect(categorizePhotorealError("Map Tiles API has not been used before or is disabled")).toBe(
      "api-disabled",
    );
  });

  it("maps transport failures to network", () => {
    expect(categorizePhotorealError("TypeError: Failed to fetch")).toBe("network");
    expect(categorizePhotorealError("request timed out")).toBe("network");
  });

  it("maps our own pre-flight factory errors to sdk", () => {
    expect(
      categorizePhotorealError("This CesiumJS build has no createGooglePhotorealistic3DTileset helper"),
    ).toBe("sdk");
  });

  it("falls back to unknown for anything else", () => {
    expect(categorizePhotorealError("something entirely unexpected")).toBe("unknown");
    expect(categorizePhotorealError("")).toBe("unknown");
    expect(categorizePhotorealError(undefined)).toBe("unknown");
    expect(categorizePhotorealError(null)).toBe("unknown");
  });
});

describe("sanitizePhotorealErrorMessage", () => {
  it("redacts raw and URL-encoded credentials", () => {
    const encoded = encodeURIComponent(FAKE_KEY);
    const message = `create failed for key=${FAKE_KEY} (encoded ${encoded})`;
    const out = sanitizePhotorealErrorMessage(message, [FAKE_KEY, FAKE_TOKEN]);
    expect(out).not.toContain(FAKE_KEY);
    expect(out).not.toContain(encoded);
    expect(out).toContain(REDACTED);
  });

  it("strips raw request URLs that could carry keys in query strings", () => {
    const malicious =
      `GET https://tile.googleapis.com/v1/3dtiles/root.json?key=${FAKE_KEY} failed with 403`;
    const out = sanitizePhotorealErrorMessage(malicious, [FAKE_KEY, FAKE_TOKEN]);
    expect(out).not.toContain(FAKE_KEY);
    expect(out).not.toContain("tile.googleapis.com");
    expect(out).not.toContain("https://");
    expect(out).toContain("403");
  });

  it("truncates long messages after redaction", () => {
    const out = sanitizePhotorealErrorMessage("x".repeat(1000), []);
    expect(out).toHaveLength(MAX_SANITIZED_MESSAGE_LENGTH);
  });

  it("is safe on non-string input and blank secrets", () => {
    expect(sanitizePhotorealErrorMessage(undefined, [FAKE_KEY])).toBe("");
    expect(sanitizePhotorealErrorMessage(null, [FAKE_KEY])).toBe("");
    expect(sanitizePhotorealErrorMessage("plain failure", ["  ", 42, null])).toBe("plain failure");
  });
});

describe("buildPhotorealErrorReport", () => {
  it("pairs the route with an allowlisted category and a sanitized message", () => {
    const report = buildPhotorealErrorReport(
      "google-direct",
      new Error(`403 denied for ${FAKE_KEY}`),
      [FAKE_KEY, FAKE_TOKEN],
    );
    expect(report).toEqual({
      route: "google-direct",
      category: "auth",
      message: expect.not.stringContaining(FAKE_KEY),
    });
    expect(JSON.stringify(report)).not.toContain(FAKE_KEY);
  });
});

describe("reportPhotorealError", () => {
  afterEach(() => {
    setPhotorealErrorReporter(null);
    delete window.gtag;
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("dispatches the sanitized report to the override reporter", () => {
    const seen: PhotorealErrorReport[] = [];
    setPhotorealErrorReporter((report) => {
      seen.push(report);
    });

    reportPhotorealError("google-ion", new Error(`ion down for ${FAKE_TOKEN}`), [
      FAKE_KEY,
      FAKE_TOKEN,
    ]);

    expect(seen).toHaveLength(1);
    expect(seen[0].route).toBe("google-ion");
    expect(JSON.stringify(seen)).not.toContain(FAKE_TOKEN);
    expect(JSON.stringify(seen)).not.toContain(FAKE_KEY);
  });

  it("never throws when the reporter itself fails", () => {
    setPhotorealErrorReporter(() => {
      throw new Error("telemetry down");
    });
    expect(() => reportPhotorealError("google-direct", new Error("nope"), [])).not.toThrow();
  });

  it("warns on console in development without analytics consent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const gtag = vi.fn();
    window.gtag = gtag;

    reportPhotorealError("google-direct", new Error("403 denied"), [FAKE_KEY]);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("google-direct");
    expect(String(warn.mock.calls[0][0])).not.toContain(FAKE_KEY);
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends the consent-gated analytics event only after opt-in", () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    // No stored decision: silent.
    reportPhotorealError("google-direct", new Error("403 denied"), [FAKE_KEY]);
    expect(gtag).not.toHaveBeenCalled();

    window.localStorage.setItem(
      "lf-analytics-consent",
      JSON.stringify({ decision: "granted", version: 1, decidedAt: new Date().toISOString() }),
    );
    reportPhotorealError("google-direct", new Error(`403 denied for ${FAKE_KEY}`), [FAKE_KEY]);

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith(
      "event",
      PHOTOREAL_ERROR_EVENT,
      expect.objectContaining({ route: "google-direct", category: "auth" }),
    );
    expect(JSON.stringify(gtag.mock.calls)).not.toContain(FAKE_KEY);
  });

  it("stays silent to analytics after opt-out, and survives a throwing tag", () => {
    window.localStorage.setItem(
      "lf-analytics-consent",
      JSON.stringify({ decision: "denied", version: 1, decidedAt: new Date().toISOString() }),
    );
    window.gtag = () => {
      throw new Error("gtag down");
    };
    expect(() => reportPhotorealError("google-ion", new Error("ion down"), [])).not.toThrow();
  });
});

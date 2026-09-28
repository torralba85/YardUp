import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  askTypeSafe,
  askTypeSafeNoul,
  TypeSafeConfigError,
  TypeSafeProviderError,
} from "./typesafe";

/**
 * Mocked contract tests for the server-only Jev client. Every fetch is
 * stubbed, so these prove request shape, auth, timeout, and sanitized-error
 * behavior — never live provider responses, and they spend no metered quota.
 */

const API_URL = "https://api.typesafe.ai/v1/systemone";
const API_KEY = "ts-secret-key";

function okResponse(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

function errorResponse(status: number, payload: unknown = {}) {
  return { ok: false, status, json: vi.fn(async () => payload) };
}

/** A fetch that hangs until the client's timeout aborts it. */
function hangingFetch() {
  return vi.fn((...args: unknown[]) => {
    const init = args[1] as { signal?: AbortSignal } | undefined;
    return new Promise<never>((_, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  });
}

/** Headers arrive but the body stream stalls until the abort fires. */
function hangingBodyFetch() {
  return vi.fn((...args: unknown[]) => {
    const init = args[1] as { signal?: AbortSignal } | undefined;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        new Promise<never>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    });
  });
}

function sentRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [
    string,
    { method: string; headers: Record<string, string>; body: string },
  ];
  return { url, init, body: JSON.parse(init.body) as Record<string, unknown> };
}

beforeEach(() => {
  vi.stubEnv("TYPESAFE_API_KEY", API_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("askTypeSafe (choice)", () => {
  it("posts state, questions, and model with auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        answers: {
          pick: { type: "choice", choice: "c1", confidence: 0.9, probabilities: {} },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await askTypeSafe(
      {
        state: { query: "123 Oak St" },
        questions: {
          pick: {
            type: "choice",
            instructions: "Which candidate is the typed address?",
            criteria: { c1: "123 Oak Street", none: null },
          },
        },
      },
      1000,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init, body } = sentRequest(fetchMock);
    expect(url).toBe(API_URL);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${API_KEY}`);
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(body.model).toBe("jev-latest");
    expect(body.state).toEqual({ query: "123 Oak St" });
    expect(body.questions).toEqual({
      pick: {
        type: "choice",
        instructions: "Which candidate is the typed address?",
        criteria: { c1: "123 Oak Street", none: null },
      },
    });
  });

  it("passes through model, answers, and usage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          model: "jev-latest",
          answers: {
            pick: { type: "choice", choice: "c1", confidence: 0.9, probabilities: { c1: 0.9 } },
          },
          usage: { input_tokens: 120, output_tokens: 8 },
        }),
      ),
    );

    const response = await askTypeSafe(
      {
        state: {},
        questions: { pick: { type: "choice", instructions: "Pick.", criteria: { c1: "one" } } },
      },
      1000,
    );

    expect(response.model).toBe("jev-latest");
    expect(response.answers?.pick).toEqual({
      type: "choice",
      choice: "c1",
      confidence: 0.9,
      probabilities: { c1: 0.9 },
    });
    expect(response.usage).toEqual({ input_tokens: 120, output_tokens: 8 });
  });

  it("throws without a key and never calls fetch", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      askTypeSafe(
        {
          state: {},
          questions: { pick: { type: "choice", instructions: "Pick.", criteria: { c1: "one" } } },
        },
        1000,
      ),
    ).rejects.toThrow(TypeSafeConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws a sanitized error on non-2xx, without the body or key", async () => {
    const failure = errorResponse(529, { error: "provider-secret-detail" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failure));

    const error = await askTypeSafe(
      {
        state: {},
        questions: { pick: { type: "choice", instructions: "Pick.", criteria: { c1: "one" } } },
      },
      1000,
    ).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(TypeSafeProviderError);
    expect((error as Error).message).toBe("TypeSafe returned 529");
    expect((error as Error).message).not.toContain("provider-secret-detail");
    expect((error as Error).message).not.toContain(API_KEY);
    // The error body is never read, so provider content cannot leak anywhere.
    expect(failure.json).not.toHaveBeenCalled();
  });

  it("throws a sanitized error on malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("unexpected token < in json");
        },
      }),
    );

    const error = await askTypeSafe(
      {
        state: {},
        questions: { pick: { type: "choice", instructions: "Pick.", criteria: { c1: "one" } } },
      },
      1000,
    ).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(TypeSafeProviderError);
    expect(error).not.toBeInstanceOf(SyntaxError);
    expect((error as Error).message).toBe("TypeSafe returned an invalid response");
    expect((error as Error).message).not.toContain("unexpected token");
  });

  it("throws a sanitized error on a non-object top-level response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse("oops")));

    await expect(
      askTypeSafe(
        {
          state: {},
          questions: { pick: { type: "choice", instructions: "Pick.", criteria: { c1: "one" } } },
        },
        1000,
      ),
    ).rejects.toThrow("TypeSafe returned an invalid response");
  });

  it("aborts stalled headers within the timeout", async () => {
    vi.stubGlobal("fetch", hangingFetch());

    const error = await askTypeSafe(
      {
        state: {},
        questions: { pick: { type: "choice", instructions: "Pick.", criteria: { c1: "one" } } },
      },
      20,
    ).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
    expect(error).not.toBeInstanceOf(TypeSafeProviderError);
  });

  it("aborts a stalled body read within the timeout", async () => {
    vi.stubGlobal("fetch", hangingBodyFetch());

    const error = await askTypeSafe(
      {
        state: {},
        questions: { pick: { type: "choice", instructions: "Pick.", criteria: { c1: "one" } } },
      },
      20,
    ).catch((err: unknown) => err);

    // The timer stays armed through the body read, and the abort stays an
    // abort rather than being recast as a parse failure.
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
    expect(error).not.toBeInstanceOf(TypeSafeProviderError);
  });
});

describe("askTypeSafeNoul", () => {
  it("posts noul questions with criteria, model, and auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        answers: { summary: { type: "noul", noul: 0.82 } },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await askTypeSafeNoul(
      {
        state: { evidence: "lot is 5000 sqft" },
        questions: {
          summary: {
            type: "noul",
            instructions: "Is the summary supported by the evidence?",
            criteria: { true: "Supported.", false: "Unsupported." },
          },
        },
      },
      1500,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init, body } = sentRequest(fetchMock);
    expect(url).toBe(API_URL);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${API_KEY}`);
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(body.model).toBe("jev-latest");
    expect(body.state).toEqual({ evidence: "lot is 5000 sqft" });
    expect(body.questions).toEqual({
      summary: {
        type: "noul",
        instructions: "Is the summary supported by the evidence?",
        criteria: { true: "Supported.", false: "Unsupported." },
      },
    });
  });

  it("omits criteria when the question has none", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ answers: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await askTypeSafeNoul(
      {
        state: {},
        questions: { summary: { type: "noul", instructions: "Supported?" } },
      },
      1500,
    );

    const { body } = sentRequest(fetchMock);
    const questions = body.questions as Record<string, Record<string, unknown>>;
    expect(questions.summary.type).toBe("noul");
    expect("criteria" in questions.summary).toBe(false);
  });

  it("passes through noul answers, model, and usage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({
          model: "jev-latest",
          answers: { summary: { type: "noul", noul: 0.82 } },
          usage: { input_tokens: 900, output_tokens: 12 },
        }),
      ),
    );

    const response = await askTypeSafeNoul(
      {
        state: {},
        questions: { summary: { type: "noul", instructions: "Supported?" } },
      },
      1500,
    );

    expect(response.model).toBe("jev-latest");
    expect(response.answers?.summary).toEqual({ type: "noul", noul: 0.82 });
    expect(response.usage).toEqual({ input_tokens: 900, output_tokens: 12 });
  });

  it("throws without a key and never calls fetch", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      askTypeSafeNoul(
        {
          state: {},
          questions: { summary: { type: "noul", instructions: "Supported?" } },
        },
        1500,
      ),
    ).rejects.toThrow(TypeSafeConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws a sanitized error on non-2xx, without the body or key", async () => {
    const failure = errorResponse(500, { error: "boom-secret-detail" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failure));

    const error = await askTypeSafeNoul(
      {
        state: {},
        questions: { summary: { type: "noul", instructions: "Supported?" } },
      },
      1500,
    ).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(TypeSafeProviderError);
    expect((error as Error).message).toBe("TypeSafe returned 500");
    expect((error as Error).message).not.toContain("boom-secret-detail");
    expect((error as Error).message).not.toContain(API_KEY);
    expect(failure.json).not.toHaveBeenCalled();
  });

  it("throws a sanitized error on a null top-level response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(null)));

    await expect(
      askTypeSafeNoul(
        {
          state: {},
          questions: { summary: { type: "noul", instructions: "Supported?" } },
        },
        1500,
      ),
    ).rejects.toThrow("TypeSafe returned an invalid response");
  });

  it("aborts a stalled body read within the timeout", async () => {
    vi.stubGlobal("fetch", hangingBodyFetch());

    const error = await askTypeSafeNoul(
      {
        state: {},
        questions: { summary: { type: "noul", instructions: "Supported?" } },
      },
      20,
    ).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
    expect(error).not.toBeInstanceOf(TypeSafeProviderError);
  });
});

describe("timeout hygiene", () => {
  it("clears the timeout after a successful call", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okResponse({ answers: {} })),
    );

    await askTypeSafe(
      {
        state: {},
        questions: { pick: { type: "choice", instructions: "Pick.", criteria: { c1: "one" } } },
      },
      1000,
    );

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it("clears the timeout after a failed call", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(503)));

    await expect(
      askTypeSafeNoul(
        {
          state: {},
          questions: { summary: { type: "noul", instructions: "Supported?" } },
        },
        1000,
      ),
    ).rejects.toThrow(TypeSafeProviderError);

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});

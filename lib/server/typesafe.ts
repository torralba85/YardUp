/**
 * Minimal server-only client for TypeSafe's System One endpoint: typed, fast
 * judgments (choice / yes-no / score) instead of generated text. Never import
 * into client bundles — the API key is a server secret.
 *
 * @see https://docs.typesafe.ai/api
 */

const TYPESAFE_SYSTEMONE_API = "https://api.typesafe.ai/v1/systemone";
const DEFAULT_MODEL = "jev-latest";

/** A Choice question: pick one key of `criteria`, each described by its value. */
export interface TypeSafeChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
}

export interface TypeSafeChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

/** Token usage reported by the provider, when present. */
export interface TypeSafeUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface TypeSafeResponse {
  model?: string;
  answers?: Record<string, TypeSafeChoiceAnswer | undefined>;
  usage?: TypeSafeUsage;
}

/**
 * A Noul (yes/no) question: how true is `instructions` of `state`, scored
 * 0..1? The optional `criteria` labels what each end of the scale means.
 */
export interface TypeSafeNoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export interface TypeSafeNoulAnswer {
  type: "noul";
  noul: number;
}

export interface TypeSafeNoulResponse {
  model?: string;
  answers?: Record<string, TypeSafeNoulAnswer | undefined>;
  usage?: TypeSafeUsage;
}

export class TypeSafeConfigError extends Error {
  constructor() {
    super("TYPESAFE_API_KEY is not configured.");
    this.name = "TypeSafeConfigError";
  }
}

export class TypeSafeProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TypeSafeProviderError";
  }
}

/** Whether a TypeSafe key is available to this server. */
export function isTypeSafeConfigured(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

/**
 * Shared System One transport. Sends one batch of questions over shared
 * `state`, with the same model, endpoint, auth, and timeout for every
 * question type. Questions run in parallel on the provider and cannot see one
 * another's answers.
 *
 * The timeout covers the body read as well as the headers, so a stalled
 * stream trips the same bound. Errors carry the status code only — never the
 * key or the response content. Per-answer validation belongs to each caller;
 * only a null or non-object top-level response is rejected here, so a
 * degenerate payload fails as a provider error instead of crashing downstream.
 *
 * @throws {TypeSafeConfigError} when no key is configured.
 * @throws {TypeSafeProviderError} on a non-2xx response, an unreadable body,
 *   or a null/non-object top-level response.
 */
async function postTypeSafe<T>(payload: {
  state: unknown;
  questions: Record<string, unknown>;
}, timeoutMs: number): Promise<T> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) throw new TypeSafeConfigError();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(TYPESAFE_SYSTEMONE_API, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: DEFAULT_MODEL, ...payload }),
    });
    if (!res.ok) throw new TypeSafeProviderError(`TypeSafe returned ${res.status}`);
    // Keep the abort timer armed through the body read so a stalled stream
    // trips the same bound as stalled headers.
    let data: unknown;
    try {
      data = await res.json();
    } catch (err) {
      // An abort during the body read stays an abort, not a parse failure.
      if (controller.signal.aborted) throw err;
      throw new TypeSafeProviderError("TypeSafe returned an invalid response");
    }
    if (typeof data !== "object" || data === null) {
      throw new TypeSafeProviderError("TypeSafe returned an invalid response");
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask one batch of Choice questions over shared `state`. Questions run in
 * parallel on the provider and cannot see one another's answers.
 *
 * @throws {TypeSafeConfigError} when no key is configured.
 * @throws {TypeSafeProviderError} on a non-2xx response, an unreadable body,
 *   or a null/non-object top-level response.
 */
export async function askTypeSafe(
  body: { state: unknown; questions: Record<string, TypeSafeChoiceQuestion> },
  timeoutMs: number,
): Promise<TypeSafeResponse> {
  return postTypeSafe<TypeSafeResponse>(body, timeoutMs);
}

/**
 * Ask one batch of Noul (yes/no) questions over shared `state`. Questions run
 * in parallel on the provider and cannot see one another's answers. Each
 * answer scores its question 0..1; the caller validates every expected
 * answer at runtime.
 *
 * @throws {TypeSafeConfigError} when no key is configured.
 * @throws {TypeSafeProviderError} on a non-2xx response, an unreadable body,
 *   or a null/non-object top-level response.
 */
export async function askTypeSafeNoul(
  body: { state: unknown; questions: Record<string, TypeSafeNoulQuestion> },
  timeoutMs: number,
): Promise<TypeSafeNoulResponse> {
  return postTypeSafe<TypeSafeNoulResponse>(body, timeoutMs);
}

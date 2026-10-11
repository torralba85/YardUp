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

/**
 * A Noul question: the probability that `instructions` is true of `state`.
 * The optional `criteria` describe what a yes and a no mean.
 */
export interface TypeSafeNoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true: string; false: string };
}

/** `noul` is the probability of yes (0 to 1); a Noul has no confidence. */
export interface TypeSafeNoulAnswer {
  type: "noul";
  noul: number;
}

export type TypeSafeQuestion = TypeSafeChoiceQuestion | TypeSafeNoulQuestion;
export type TypeSafeAnswer = TypeSafeChoiceAnswer | TypeSafeNoulAnswer;

/** Token usage reported by the provider, when present. */
export interface TypeSafeUsage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Answers come back under the caller's question ids. `A` defaults to the
 * Choice answer for Choice-only callers; a request mixing types reads
 * {@link TypeSafeAnswer} and narrows on `type`.
 */
export interface TypeSafeResponse<A = TypeSafeChoiceAnswer> {
  model?: string;
  answers?: Record<string, A | undefined>;
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
 * Ask one batch of questions over shared `state`. Questions run in parallel on
 * the provider and cannot see one another's answers.
 *
 * @throws {TypeSafeConfigError} when no key is configured.
 * @throws {TypeSafeProviderError} on a non-2xx response.
 */
export async function askTypeSafe<A = TypeSafeChoiceAnswer>(
  body: { state: unknown; questions: Record<string, TypeSafeQuestion> },
  timeoutMs: number,
): Promise<TypeSafeResponse<A>> {
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
      body: JSON.stringify({ model: DEFAULT_MODEL, ...body }),
    });
    if (!res.ok) throw new TypeSafeProviderError(`TypeSafe returned ${res.status}`);
    // Keep the abort timer armed through the body read so a stalled stream
    // trips the same bound as stalled headers.
    return (await res.json()) as TypeSafeResponse<A>;
  } finally {
    clearTimeout(timer);
  }
}

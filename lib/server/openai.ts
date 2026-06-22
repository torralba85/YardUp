const OPENAI_RESPONSES_API = "https://api.openai.com/v1/responses";
const DEFAULT_TIMEOUT_MS = 60_000;

interface OpenAITextContent {
  type?: string;
  text?: string;
  refusal?: string;
}

interface OpenAIOutputItem {
  type?: string;
  result?: string;
  content?: OpenAITextContent[];
}

interface OpenAIResponseShape {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: { message?: string };
}

export class OpenAIConfigError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured.");
    this.name = "OpenAIConfigError";
  }
}

export class OpenAIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIProviderError";
  }
}

export async function createOpenAIResponse(
  body: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<OpenAIResponseShape> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAIConfigError();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(OPENAI_RESPONSES_API, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as OpenAIResponseShape;
    if (!res.ok) {
      throw new OpenAIProviderError(
        json.error?.message || `OpenAI returned ${res.status}`,
      );
    }
    return json;
  } catch (err) {
    if (err instanceof OpenAIConfigError || err instanceof OpenAIProviderError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new OpenAIProviderError("OpenAI request timed out.");
    }
    throw new OpenAIProviderError("OpenAI request failed.");
  } finally {
    clearTimeout(timer);
  }
}

export function extractResponseText(response: OpenAIResponseShape): string | null {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text?.trim()) {
        return content.text;
      }
      if (content.type === "refusal" && content.refusal?.trim()) {
        throw new OpenAIProviderError(content.refusal);
      }
    }
  }

  return null;
}

export function extractGeneratedImageBase64(response: OpenAIResponseShape): string | null {
  for (const item of response.output ?? []) {
    if (item.type === "image_generation_call" && item.result?.trim()) {
      return item.result;
    }
  }
  return null;
}

import { NextResponse } from "next/server";
import { OpenAIProviderRateLimitError } from "@/lib/server/ai-rate-limit";
import { OpenAIConfigError, OpenAIProviderError } from "@/lib/server/openai";

export interface AIRouteErrorMessages {
  config: string;
  provider: string;
  syntax: string;
  unavailable: string;
}

export function createAIRouteErrorResponse(
  err: unknown,
  routeName: string,
  messages: AIRouteErrorMessages,
): NextResponse {
  if (err instanceof OpenAIConfigError) {
    return NextResponse.json({ error: messages.config }, { status: 501 });
  }

  if (err instanceof OpenAIProviderRateLimitError) {
    return NextResponse.json(
      {
        error:
          err.status === 429
            ? "AI is busy right now. Please try again shortly."
            : messages.unavailable,
      },
      {
        status: err.status,
        headers: { "Retry-After": String(err.retryAfter) },
      },
    );
  }

  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: messages.syntax }, { status: 502 });
  }

  if (err instanceof OpenAIProviderError) {
    return NextResponse.json({ error: messages.provider }, { status: 502 });
  }

  console.error(`[${routeName}] Unexpected error:`, err);
  return NextResponse.json({ error: messages.unavailable }, { status: 500 });
}

import { NextResponse, type NextRequest } from "next/server";
import { checkAIRateLimit } from "@/lib/server/ai-rate-limit";
import { requireApiAuth } from "@/lib/server/api-auth";
import {
  createAIRouteErrorResponse,
  type AIRouteErrorMessages,
} from "@/lib/server/ai-route-errors";
import {
  createOpenAIResponse,
  extractFunctionCalls,
  extractResponseText,
  OpenAIProviderError,
  type OpenAIFunctionCall,
  type OpenAIResponseShape,
} from "@/lib/server/openai";

const DEFAULT_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5.5";
const DEFAULT_MAX_OUTPUT_TOKENS = 1000;
const DEFAULT_MAX_TOOL_ROUNDS = 4;
const DEFAULT_DEADLINE_MS = 90_000;

/**
 * A deterministic, server-side function the model may call mid-generation.
 * Handlers are pure over the provided `ctx` (derived from validated input);
 * they never accept free-form URLs or paths, keeping the tool surface safe.
 */
export interface AIToolHandler<Ctx> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: unknown, ctx: Ctx) => Promise<unknown>;
}

export type AIInputValidation<Input> =
  | { ok: true; value: Input }
  | { ok: false; error: string };

/**
 * Declarative definition of one AI panel. Everything that varies per panel
 * lives here; the shared runtime ({@link createAIPanelRoute}) handles auth,
 * rate limiting, the agentic tool loop, structured output, and error mapping.
 */
// `Output` is a phantom type parameter: it has no runtime carrier in this
// interface, but the runtime (runAgentic / createAIPanelRoute) infers it from
// the definition to type the structured result and the route response.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface AIPanelDefinition<Input, Output, Ctx> {
  /** Stable id, also used as the route segment and json_schema name. */
  id: string;
  /** Rate-limit namespace, e.g. `"ai-permit-pathway"`. */
  namespace: string;
  rateLimit: { limit: number; windowMs: number };
  systemPrompt: string;
  /** Strict json_schema the final structured answer must satisfy. */
  outputSchema: Record<string, unknown>;
  validateInput: (raw: unknown) => AIInputValidation<Input>;
  /** Derive the tool-execution context from validated input. */
  buildContext: (input: Input) => Ctx;
  tools: AIToolHandler<Ctx>[];
  errorMessages: AIRouteErrorMessages;
  model?: string;
  maxOutputTokens?: number;
  /** Max tool-calling rounds before a tool-free finalize is forced. */
  maxToolRounds?: number;
  /** Cumulative wall-clock budget across all model calls. */
  deadlineMs?: number;
}

/** Injectable side-effects, so the loop is unit-testable without the network. */
export interface AIPipelineDeps<Ctx> {
  createResponse: (body: Record<string, unknown>) => Promise<OpenAIResponseShape>;
  executeTool: (
    tools: AIToolHandler<Ctx>[],
    call: OpenAIFunctionCall,
    ctx: Ctx,
  ) => Promise<string>;
}

function toResponsesToolSchema<Ctx>(tool: AIToolHandler<Ctx>): Record<string, unknown> {
  return {
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: true,
  };
}

function defaultDeps<Ctx>(): AIPipelineDeps<Ctx> {
  return {
    createResponse: (body) => createOpenAIResponse(body),
    executeTool,
  };
}

function parseFinal<Output>(res: OpenAIResponseShape): Output {
  const text = extractResponseText(res);
  if (!text) throw new OpenAIProviderError("OpenAI returned no final output.");
  return JSON.parse(text) as Output;
}

/**
 * Run one panel's request as an agentic loop: the model may call allow-listed
 * tools, we execute them server-side and thread the results back, and it
 * repeats until it emits a schema-conforming final answer. A `maxToolRounds`
 * cap and a cumulative `deadlineMs` bound cost/latency; if either is hit, a
 * final tool-free call is forced so the caller still gets a structured result.
 */
export async function runAgentic<Input, Output, Ctx>(
  def: AIPanelDefinition<Input, Output, Ctx>,
  input: Input,
  ctx: Ctx,
  deps: AIPipelineDeps<Ctx>,
): Promise<Output> {
  const model = def.model ?? DEFAULT_TEXT_MODEL;
  const maxOutputTokens = def.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
  const maxToolRounds = def.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
  const deadline = Date.now() + (def.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const toolSchemas = def.tools.map(toResponsesToolSchema);
  const format = {
    type: "json_schema",
    name: def.id.replace(/-/g, "_"),
    schema: def.outputSchema,
    strict: true,
  };

  let running: unknown[] = [
    { role: "system", content: def.systemPrompt },
    { role: "user", content: JSON.stringify(input) },
  ];

  for (let round = 0; round < maxToolRounds; round++) {
    const res = await deps.createResponse({
      model,
      max_output_tokens: maxOutputTokens,
      input: running,
      tools: toolSchemas.length > 0 ? toolSchemas : undefined,
      text: { format },
    });

    const calls = extractFunctionCalls(res);
    if (calls.length === 0) return parseFinal<Output>(res);

    const callItems = (res.output ?? []).filter((item) => item.type === "function_call");
    const outputs = await Promise.all(
      calls.map((call) => deps.executeTool(def.tools, call, ctx)),
    );

    running = [
      ...running,
      ...callItems,
      ...outputs.map((output, i) => ({
        type: "function_call_output",
        call_id: calls[i].call_id,
        output,
      })),
    ];

    if (Date.now() >= deadline) break;
  }

  // Guardrail: the model kept calling tools past the budget. Force a tool-free
  // finalize so the caller gets a structured answer instead of an error.
  const finalRes = await deps.createResponse({
    model,
    max_output_tokens: maxOutputTokens,
    input: [
      ...running,
      {
        role: "user",
        content: "Provide your final answer now using the information already gathered.",
      },
    ],
    text: { format },
  });
  return parseFinal<Output>(finalRes);
}

/**
 * Build a Next.js POST handler for an AI panel: auth → rate-limit → validate →
 * agentic loop → structured JSON, with the shared AI error taxonomy on failure.
 */
export function createAIPanelRoute<Input, Output, Ctx>(
  def: AIPanelDefinition<Input, Output, Ctx>,
  deps: AIPipelineDeps<Ctx> = defaultDeps<Ctx>(),
): (request: NextRequest) => Promise<NextResponse> {
  return async function POST(request: NextRequest): Promise<NextResponse> {
    const auth = await requireApiAuth(request);
    if (auth instanceof NextResponse) return auth;

    const limited = await checkAIRateLimit(request, {
      limit: def.rateLimit.limit,
      namespace: def.namespace,
      windowMs: def.rateLimit.windowMs,
    });
    if (limited) return limited;

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const validated = def.validateInput(raw);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    try {
      const ctx = def.buildContext(validated.value);
      const result = await runAgentic(def, validated.value, ctx, deps);
      return NextResponse.json(result);
    } catch (err) {
      return createAIRouteErrorResponse(err, `/api/ai/${def.id}`, def.errorMessages);
    }
  };
}

/**
 * Execute one model-requested tool call and return the string handed back to
 * the model as `function_call_output.output`.
 *
 * The happy path (find tool → parse args → run → stringify) is implemented.
 * The FAILURE POLICY is intentionally left to you — it's the safety/UX heart of
 * an agentic pipeline. See the two TODOs below and the RED tests in
 * `ai-pipeline.test.ts` (describe "executeTool"). Agreed default:
 * recover-and-continue (return an `{ error }` payload the model can read).
 */
export async function executeTool<Ctx>(
  tools: AIToolHandler<Ctx>[],
  call: OpenAIFunctionCall,
  ctx: Ctx,
): Promise<string> {
  const tool = tools.find((t) => t.name === call.name);
  if (!tool) {
    // TODO(you): an unknown tool must not crash the request. Return a JSON
    // string with an `error` field naming the unknown tool so the model can
    // recover. (Test: "returns an { error } payload for an unknown tool name".)
    throw new Error(`TODO: decide unknown-tool policy for "${call.name}"`);
  }

  try {
    const args = JSON.parse(call.arguments) as unknown;
    const result = await tool.execute(args, ctx);
    return JSON.stringify(result);
  } catch (err) {
    // TODO(you): pick the failure policy. Agreed default = recover-and-continue:
    // return JSON.stringify({ error: <message> }) so the model sees the failure
    // and adapts, instead of re-throwing (which 502s the whole request). Swap to
    // `throw err` for fail-fast. (Test: "recovers from a throwing tool ...".)
    throw err;
  }
}

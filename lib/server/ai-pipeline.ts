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
const DEFAULT_DEADLINE_MS = 75_000;

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
export interface AIPanelDefinition<Input, Output, Ctx> {
  /** Stable id, also used as the route segment and json_schema name. */
  id: string;
  /** Rate-limit namespace, e.g. `"ai-project-brief"`. */
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
  /** Ordered tool names that must run before a final answer can be accepted. */
  requiredToolSequence?: string[];
  /**
   * Shape the structured output into the response payload for this caller —
   * e.g. redact paid content when the authenticated user holds no purchase.
   * Defaults to returning the output unchanged.
   */
  finalize?: (
    output: Output,
    meta: { uid: string; input: Input },
  ) => Promise<unknown> | unknown;
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

function outputItemsForHistory(
  res: OpenAIResponseShape,
  calls: OpenAIFunctionCall[],
): unknown[] {
  const callIds = new Set(calls.map((call) => call.call_id));
  return (res.output ?? []).filter((item) => {
    if (!item) return false;
    if (item.type !== "function_call") return true;
    return Boolean(item.call_id && item.name && callIds.has(item.call_id));
  });
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
  const completedRequiredTools = new Set<string>();
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
    const nextRequiredTool = def.requiredToolSequence?.find(
      (toolName) => !completedRequiredTools.has(toolName),
    );
    const activeToolSchemas = nextRequiredTool
      ? toolSchemas.filter((tool) => tool.name === nextRequiredTool)
      : toolSchemas;
    if (nextRequiredTool && activeToolSchemas.length === 0) {
      throw new OpenAIProviderError(`Required tool "${nextRequiredTool}" is not configured.`);
    }

    const res = await deps.createResponse({
      model,
      max_output_tokens: maxOutputTokens,
      input: running,
      tools: activeToolSchemas.length > 0 ? activeToolSchemas : undefined,
      ...(activeToolSchemas.length > 0 ? { parallel_tool_calls: false } : {}),
      ...(nextRequiredTool
        ? { tool_choice: { type: "function", name: nextRequiredTool } }
        : {}),
      text: { format },
    });

    const calls = extractFunctionCalls(res);
    if (calls.length === 0) {
      if (nextRequiredTool) {
        throw new OpenAIProviderError(
          `OpenAI did not call required tool "${nextRequiredTool}".`,
        );
      }
      return parseFinal<Output>(res);
    }

    const responseHistory = outputItemsForHistory(res, calls);
    const outputs = await Promise.all(
      calls.map((call) => deps.executeTool(def.tools, call, ctx)),
    );
    for (const call of calls) completedRequiredTools.add(call.name);

    running = [
      ...running,
      ...responseHistory,
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
      const payload = def.finalize
        ? await def.finalize(result, { uid: auth.uid, input: validated.value })
        : result;
      return NextResponse.json(payload);
    } catch (err) {
      return createAIRouteErrorResponse(err, `/api/ai/${def.id}`, def.errorMessages);
    }
  };
}

/**
 * Execute one model-requested tool call and return the string handed back to
 * the model as `function_call_output.output`.
 *
 * Failure policy: recover-and-continue. An unknown tool or a throwing tool
 * returns a JSON `{ error }` payload the model can read and adapt to, rather
 * than throwing and 502-ing the whole request. Covered by the "executeTool"
 * tests in `ai-pipeline.test.ts`.
 */
export async function executeTool<Ctx>(
  tools: AIToolHandler<Ctx>[],
  call: OpenAIFunctionCall,
  ctx: Ctx,
): Promise<string> {
  const tool = tools.find((t) => t.name === call.name);
  if (!tool) {
    // Recover: let the model see the unknown tool and adapt, not crash.
    return JSON.stringify({ error: `Unknown tool: ${call.name}` });
  }

  try {
    const args = JSON.parse(call.arguments) as unknown;
    const result = await tool.execute(args, ctx);
    return JSON.stringify(result);
  } catch (err) {
    // Recover-and-continue: surface the failure to the model as data so it can
    // adapt (e.g. try a different tool) instead of 502-ing the whole request.
    const message = err instanceof Error ? err.message : "Tool execution failed.";
    return JSON.stringify({ error: message });
  }
}

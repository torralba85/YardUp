import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import {
  cleanJsonText,
  createAIPanelRoute,
  executeTool,
  runAgentic,
  type AIPanelDefinition,
} from "./ai-pipeline";

// --- Fixtures -------------------------------------------------------------

interface TestInput {
  q: string;
}
interface TestOutput {
  answer: string;
}
interface TestCtx {
  q: string;
}

const testDef: AIPanelDefinition<TestInput, TestOutput, TestCtx> = {
  id: "test-panel",
  namespace: "ai-test-panel",
  rateLimit: { limit: 50, windowMs: 60_000 },
  systemPrompt: "You are a test panel.",
  outputSchema: {
    type: "object",
    properties: { answer: { type: "string" } },
    required: ["answer"],
    additionalProperties: false,
  },
  validateInput: (raw) => {
    const r = raw as { q?: unknown };
    return typeof r?.q === "string"
      ? { ok: true, value: { q: r.q } }
      : { ok: false, error: "q is required" };
  },
  buildContext: (input) => ({ q: input.q }),
  tools: [
    {
      name: "lookup",
      description: "A test tool.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => ({ ok: true }),
    },
  ],
  errorMessages: {
    config: "config",
    provider: "provider",
    syntax: "syntax",
    unavailable: "unavailable",
  },
};

/** A Responses API reply carrying a final structured message. */
function messageResponse(obj: unknown) {
  return {
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(obj) }] }],
  };
}

/** A Responses API reply asking to call one tool. */
function toolCallResponse(name: string, args: unknown, callId = "call_1") {
  return {
    output: [
      { id: "fc_1", call_id: callId, type: "function_call", name, arguments: JSON.stringify(args) },
    ],
  };
}

/** A fake createResponse that replays a script and records every request body. */
function scriptedResponder(scripts: unknown[]) {
  const calls: Record<string, unknown>[] = [];
  let i = 0;
  const fn = async (body: Record<string, unknown>) => {
    calls.push(body);
    return scripts[Math.min(i++, scripts.length - 1)] as never;
  };
  return { fn, calls };
}

/** Minimal NextRequest stand-in — the route only calls .json() and .headers. */
function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body, headers: new Headers() } as unknown as NextRequest;
}

// --- The agentic loop (owned by the runtime) ------------------------------

describe("runAgentic", () => {
  it("executes a tool call, threads the result back, then returns the finalized output", async () => {
    const { fn, calls } = scriptedResponder([
      toolCallResponse("lookup", { jurisdiction: "Seattle" }, "call_1"),
      messageResponse({ answer: "done" }),
    ]);
    const executeToolFake = async () => JSON.stringify({ tracks: ["a"] });

    const result = await runAgentic(testDef, { q: "x" }, { q: "x" }, {
      createResponse: fn,
      executeTool: executeToolFake,
    });

    expect(result).toEqual({ answer: "done" });
    expect(calls).toHaveLength(2);
    // The follow-up request must carry our tool output, keyed by call_id.
    const followUpInput = calls[1].input as Array<Record<string, unknown>>;
    const toolOutput = followUpInput.find((m) => m.type === "function_call_output");
    expect(toolOutput).toMatchObject({
      call_id: "call_1",
      output: JSON.stringify({ tracks: ["a"] }),
    });
  });

  it("returns immediately without invoking any tool when the model needs none", async () => {
    const { fn, calls } = scriptedResponder([messageResponse({ answer: "immediate" })]);
    let toolRan = false;

    const result = await runAgentic(testDef, { q: "x" }, { q: "x" }, {
      createResponse: fn,
      executeTool: async () => {
        toolRan = true;
        return "{}";
      },
    });

    expect(result).toEqual({ answer: "immediate" });
    expect(calls).toHaveLength(1);
    expect(toolRan).toBe(false);
  });

  it("preserves reasoning items while dropping malformed function calls from history", async () => {
    const reasoningItem = { id: "rs_1", type: "reasoning", summary: [] };
    const malformedCall = {
      id: "fc_bad",
      call_id: "call_bad",
      type: "function_call",
      arguments: "{}",
    };
    const validCall = {
      id: "fc_1",
      call_id: "call_1",
      type: "function_call",
      name: "lookup",
      arguments: "{}",
    };
    const { fn, calls } = scriptedResponder([
      { output: [reasoningItem, malformedCall, validCall] },
      messageResponse({ answer: "done" }),
    ]);

    const result = await runAgentic(testDef, { q: "x" }, { q: "x" }, {
      createResponse: fn,
      executeTool: async () => "{}",
    });

    expect(result).toEqual({ answer: "done" });
    const followUpInput = calls[1].input as Array<Record<string, unknown>>;
    expect(followUpInput).toContainEqual(reasoningItem);
    expect(followUpInput).toContainEqual(validCall);
    expect(followUpInput).not.toContainEqual(malformedCall);
    expect(
      followUpInput.filter((item) => item.type === "function_call_output"),
    ).toEqual([{ type: "function_call_output", call_id: "call_1", output: "{}" }]);
  });

  it("forces configured tools in sequence before accepting a final output", async () => {
    const sequenceDef: AIPanelDefinition<TestInput, TestOutput, TestCtx> = {
      ...testDef,
      tools: [
        ...testDef.tools,
        {
          name: "bench",
          description: "Second test tool.",
          parameters: { type: "object", properties: {}, additionalProperties: false },
          execute: async () => ({ stages: [] }),
        },
      ],
      requiredToolSequence: ["lookup", "bench"],
    };
    const { fn, calls } = scriptedResponder([
      toolCallResponse("lookup", {}, "call_1"),
      toolCallResponse("bench", {}, "call_2"),
      messageResponse({ answer: "done" }),
    ]);

    const result = await runAgentic(sequenceDef, { q: "x" }, { q: "x" }, {
      createResponse: fn,
      executeTool: async () => "{}",
    });

    expect(result).toEqual({ answer: "done" });
    expect(calls[0]).toMatchObject({
      parallel_tool_calls: false,
      tool_choice: { type: "function", name: "lookup" },
      tools: [expect.objectContaining({ name: "lookup" })],
    });
    expect(calls[1]).toMatchObject({
      parallel_tool_calls: false,
      tool_choice: { type: "function", name: "bench" },
      tools: [expect.objectContaining({ name: "bench" })],
    });
    expect(calls[2].tool_choice).toBeUndefined();
  });

  it("stops after maxToolRounds and forces a tool-free finalize", async () => {
    const loopingTool = toolCallResponse("lookup", {}, "call_x");
    const { fn, calls } = scriptedResponder([
      loopingTool,
      loopingTool,
      messageResponse({ answer: "forced" }),
    ]);
    let toolCount = 0;

    const result = await runAgentic({ ...testDef, maxToolRounds: 2 }, { q: "x" }, { q: "x" }, {
      createResponse: fn,
      executeTool: async () => {
        toolCount += 1;
        return "{}";
      },
    });

    expect(result).toEqual({ answer: "forced" });
    expect(toolCount).toBe(2); // tools ran for the two allowed rounds
    expect(calls).toHaveLength(3); // 2 rounds + 1 forced finalize
    expect(calls[2].tools).toBeUndefined(); // the forced finalize omits tools
  });
});

// --- The route wrapper (owned by the runtime) -----------------------------

describe("createAIPanelRoute", () => {
  it("returns 200 with the structured result on success", async () => {
    const { fn } = scriptedResponder([messageResponse({ answer: "ok" })]);
    const POST = createAIPanelRoute(testDef, { createResponse: fn, executeTool: async () => "{}" });

    const res = await POST(fakeRequest({ q: "hi" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: "ok" });
  });

  it("responds with the finalize hook's payload, passing the caller uid and input", async () => {
    const meta: Array<{ uid: string; input: TestInput }> = [];
    const finalizingDef: AIPanelDefinition<TestInput, TestOutput, TestCtx> = {
      ...testDef,
      finalize: (output, m) => {
        meta.push(m);
        return { tier: "preview", from: output.answer };
      },
    };
    const { fn } = scriptedResponder([messageResponse({ answer: "ok" })]);
    const POST = createAIPanelRoute(finalizingDef, {
      createResponse: fn,
      executeTool: async () => "{}",
    });

    const res = await POST(fakeRequest({ q: "hi" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tier: "preview", from: "ok" });
    // NODE_ENV=test resolves the stub local-dev uid; the hook still sees it.
    expect(meta).toEqual([{ uid: "local-dev", input: { q: "hi" }, ctx: { q: "hi" } }]);
  });

  it("returns 400 when input validation fails", async () => {
    const POST = createAIPanelRoute(testDef, {
      createResponse: async () => messageResponse({ answer: "x" }) as never,
      executeTool: async () => "{}",
    });

    const res = await POST(fakeRequest({ nope: 1 }));

    expect(res.status).toBe(400);
  });
});

// --- executeTool: the tool-execution policy -------------------------------
// Recover-and-continue: a failing or unknown tool returns an { error } payload
// the model can read, instead of throwing and 502-ing the whole request.

describe("executeTool", () => {
  const tools = [
    {
      name: "echo",
      description: "",
      parameters: {},
      execute: async (args: unknown) => ({ got: args }),
    },
    {
      name: "boom",
      description: "",
      parameters: {},
      execute: async () => {
        throw new Error("kaboom");
      },
    },
  ];

  it("returns the tool result as a JSON string on success", async () => {
    const out = await executeTool(tools, { call_id: "c1", name: "echo", arguments: '{"x":1}' }, {});
    expect(JSON.parse(out)).toEqual({ got: { x: 1 } });
  });

  it("recovers from a throwing tool by returning an { error } payload (does not throw)", async () => {
    const out = await executeTool(tools, { call_id: "c2", name: "boom", arguments: "{}" }, {});
    expect(JSON.parse(out).error).toMatch(/kaboom/);
  });

  it("returns an { error } payload for an unknown tool name", async () => {
    const out = await executeTool(tools, { call_id: "c3", name: "missing", arguments: "{}" }, {});
    expect(JSON.parse(out).error).toMatch(/unknown tool/i);
  });
});

describe("cleanJsonText", () => {
  it("leaves clean JSON string untouched", () => {
    expect(cleanJsonText('{"a": 1}')).toBe('{"a": 1}');
  });

  it("strips markdown json fences", () => {
    const fenced = '```json\n{"a": 1}\n```';
    expect(cleanJsonText(fenced)).toBe('{"a": 1}');
  });

  it("strips generic markdown fences", () => {
    const fenced = '```\n{"a": 1}\n```';
    expect(cleanJsonText(fenced)).toBe('{"a": 1}');
  });

  it("extracts balanced JSON when conversational text surrounds it", () => {
    const conversational = 'Here is your brief:\n{"a": 1}\nHope this helps!';
    expect(cleanJsonText(conversational)).toBe('{"a": 1}');
  });
});

describe("runAgentic edge cases", () => {
  it("successfully parses fenced JSON in the model final answer", async () => {
    const fencedFinal = {
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '```json\n{"answer": "clean"}\n```' }],
        },
      ],
    };
    const result = await runAgentic(testDef, { q: "x" }, { q: "x" }, {
      createResponse: async () => fencedFinal as never,
      executeTool: async () => "{}",
    });
    expect(result).toEqual({ answer: "clean" });
  });

  it("throws OpenAIProviderError when response status is incomplete", async () => {
    const incompleteRes = {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: '{"answer": "trunc' }],
        },
      ],
    };
    await expect(
      runAgentic(testDef, { q: "x" }, { q: "x" }, {
        createResponse: async () => incompleteRes as never,
        executeTool: async () => "{}",
      }),
    ).rejects.toThrow(/OpenAI output was incomplete/i);
  });
});

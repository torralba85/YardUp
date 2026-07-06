import { describe, expect, it } from "vitest";
import { extractFunctionCalls } from "./openai";

describe("extractFunctionCalls", () => {
  it("returns each function_call from the output array, in order, ignoring other items", () => {
    const response = {
      output: [
        {
          id: "fc_1",
          call_id: "call_1",
          type: "function_call",
          name: "lookup_permit_tracks",
          arguments: '{"jurisdiction":"Seattle, WA"}',
        },
        { type: "message", content: [{ type: "output_text", text: "thinking" }] },
        {
          id: "fc_2",
          call_id: "call_2",
          type: "function_call",
          name: "get_stage_benchmarks",
          arguments: '{"trackId":"ca-state-adu"}',
        },
      ],
    };

    expect(extractFunctionCalls(response)).toEqual([
      {
        call_id: "call_1",
        name: "lookup_permit_tracks",
        arguments: '{"jurisdiction":"Seattle, WA"}',
      },
      {
        call_id: "call_2",
        name: "get_stage_benchmarks",
        arguments: '{"trackId":"ca-state-adu"}',
      },
    ]);
  });

  it("returns an empty array when the response has no function calls", () => {
    expect(
      extractFunctionCalls({
        output: [{ type: "message", content: [{ type: "output_text", text: "done" }] }],
      }),
    ).toEqual([]);
    expect(extractFunctionCalls({})).toEqual([]);
  });
});

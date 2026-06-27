import { PassThrough } from "node:stream";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { requestForNext } = require("../functions/request-replay");

async function readReplayBody(replay: { body?: BodyInit | null }) {
  return new Response(replay.body).text();
}

describe("requestForNext", () => {
  it("returns GET requests unchanged", () => {
    const req = { method: "GET" };
    expect(requestForNext(req)).toBe(req);
  });

  it("replays Firebase rawBody as a fresh request stream", async () => {
    const consumedBodySymbol = Symbol("consumed-body");
    const req = new PassThrough() as PassThrough & {
      method: string;
      url: string;
      headers: Record<string, string>;
      rawBody: Buffer;
      [consumedBodySymbol]?: boolean;
    };
    req.method = "POST";
    req.url = "/api/ai/parcel-insights";
    req.headers = { "content-type": "application/json" };
    req.rawBody = Buffer.from('{"parcel":true}');
    req[consumedBodySymbol] = true;

    const replay = requestForNext(req);

    expect(replay).not.toBe(req);
    expect(replay.method).toBe("POST");
    expect(replay.url).toBe("/api/ai/parcel-insights");
    expect(Object.getOwnPropertySymbols(replay.originalRequest)).not.toContain(
      consumedBodySymbol,
    );
    await expect(readReplayBody(replay)).resolves.toBe('{"parcel":true}');
  });

  it("replays parsed JSON bodies when Firebase rawBody is unavailable", async () => {
    const req = new PassThrough() as PassThrough & {
      method: string;
      url: string;
      headers: Record<string, string>;
      body: Record<string, boolean>;
    };
    req.method = "POST";
    req.url = "/api/ai/parcel-insights";
    req.headers = { "content-type": "application/json" };
    req.body = { parcel: true };

    const replay = requestForNext(req);

    expect(replay).not.toBe(req);
    expect(replay.originalRequest.rawBody).toEqual(Buffer.from('{"parcel":true}'));
    await expect(readReplayBody(replay)).resolves.toBe('{"parcel":true}');
  });
});

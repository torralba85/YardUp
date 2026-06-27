import { PassThrough } from "node:stream";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { requestForNext } = require("../functions/request-replay");

async function readStream(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

describe("requestForNext", () => {
  it("returns GET requests unchanged", () => {
    const req = { method: "GET" };
    expect(requestForNext(req)).toBe(req);
  });

  it("replays Firebase rawBody as a fresh request stream", async () => {
    const req = new PassThrough() as PassThrough & {
      method: string;
      url: string;
      headers: Record<string, string>;
      rawBody: Buffer;
    };
    req.method = "POST";
    req.url = "/api/ai/parcel-insights";
    req.headers = { "content-type": "application/json" };
    req.rawBody = Buffer.from('{"parcel":true}');

    const replay = requestForNext(req);

    expect(replay).not.toBe(req);
    expect(replay.method).toBe("POST");
    expect(replay.url).toBe("/api/ai/parcel-insights");
    await expect(readStream(replay)).resolves.toBe('{"parcel":true}');
  });
});

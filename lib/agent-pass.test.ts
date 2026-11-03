import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AGENT_PASS_REDEEM_TTL_MS,
  AgentPassError,
  clearAgentPass,
  clearAgentPassRedeemIntent,
  hasAgentPassRedeemIntent,
  normalizeAgentPassCode,
  readAgentPass,
  redeemAgentPass,
  rememberAgentPass,
  rememberAgentPassRedeemIntent,
} from "./agent-pass";

beforeEach(() => {
  clearAgentPass();
  clearAgentPassRedeemIntent();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeAgentPassCode", () => {
  it.each([
    [" smith-elm ", "SMITH-ELM"],
    ["sm ith1", "SMITH1"],
    ["AB12", "AB12"],
  ])("normalizes %j", (raw, code) => {
    expect(normalizeAgentPassCode(raw)).toBe(code);
  });

  it.each(["", "abc", "-SMITH", "SMITH-", "SMITH/ELM", "A".repeat(25), 42, null])("rejects %j", (raw) => {
    expect(normalizeAgentPassCode(raw)).toBeNull();
  });
});

describe("remembered code and claim intent", () => {
  it("keeps a valid linked code for the tab and ignores invalid ones", () => {
    expect(rememberAgentPass("not a code!")).toBeNull();
    expect(readAgentPass()).toBeNull();
    rememberAgentPass("smith-elm");
    expect(readAgentPass()).toBe("SMITH-ELM");
    clearAgentPass();
    expect(readAgentPass()).toBeNull();
  });

  it("expires a guest's claim click and scopes it to the property", () => {
    const start = 1_000_000;
    rememberAgentPassRedeemIntent("1-elm-st-san-diego", start);
    expect(hasAgentPassRedeemIntent("1-elm-st-san-diego", start + 1000)).toBe(true);
    expect(hasAgentPassRedeemIntent(undefined, start + 1000)).toBe(true);
    expect(hasAgentPassRedeemIntent("9-oak-ave-san-jose", start + 1000)).toBe(false);
    expect(hasAgentPassRedeemIntent("1-elm-st-san-diego", start + AGENT_PASS_REDEEM_TTL_MS + 1)).toBe(false);
    clearAgentPassRedeemIntent();
    expect(hasAgentPassRedeemIntent()).toBe(false);
  });
});

describe("redeemAgentPass", () => {
  it("posts the claim with the bearer token and resolves on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "granted" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await redeemAgentPass({ code: "SMITH-ELM", certKey: "1-elm-st-san-diego", idToken: "tok", city: "San Diego" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/certificates/redeem");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ code: "SMITH-ELM", certKey: "1-elm-st-san-diego", city: "San Diego" });
  });

  it("surfaces the server's message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "This code has expired." }), { status: 410 })));
    await expect(redeemAgentPass({ code: "SMITH-ELM", certKey: "k", idToken: "tok" })).rejects.toEqual(
      new AgentPassError("This code has expired."),
    );
  });

  it("explains a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(redeemAgentPass({ code: "SMITH-ELM", certKey: "k", idToken: "tok" })).rejects.toBeInstanceOf(AgentPassError);
  });
});

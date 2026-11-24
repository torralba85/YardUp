import { beforeEach, describe, expect, it } from "vitest";
import { POSE_SCOPE_KEY, poseScopeForLot, poseScopeMatchesLot } from "./pose-scope";
import { planScopeForLot } from "./preapproved-plans";

const homeA = { address: "1 Elm St", city: "San Diego" };
const homeB = { address: "2 Oak Ave", city: "San Diego" };

describe("pose scope", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("issues an opaque label that stays stable while the tab stays on one lot", () => {
    const token = poseScopeForLot(homeA, "live");
    expect(token).toMatch(/^[a-f0-9]{16}$/);
    expect(poseScopeForLot(homeA, "live")).toBe(token);
    expect(poseScopeMatchesLot(token, homeA, "live")).toBe(true);
  });

  it("matches only the lot and mode it was issued for", () => {
    const token = poseScopeForLot(homeA, "live");
    expect(poseScopeMatchesLot(token, homeB, "live")).toBe(false);
    expect(poseScopeMatchesLot(token, homeA, "estimated")).toBe(false);
    expect(poseScopeMatchesLot("0123456789abcdef", homeA, "live")).toBe(false);
  });

  it("issues a fresh label when the lot changes, retiring the old one", () => {
    const first = poseScopeForLot(homeA, "live");
    const second = poseScopeForLot(homeB, "live");
    expect(second).not.toBe(first);
    expect(poseScopeMatchesLot(first, homeA, "live")).toBe(false);
  });

  it("is random rather than derived from the address", () => {
    const first = poseScopeForLot(homeA, "live");
    window.sessionStorage.clear();
    const second = poseScopeForLot(homeA, "live");
    expect(second).not.toBe(first);
    expect(first).not.toBe(planScopeForLot(homeA, "live"));
    expect(poseScopeMatchesLot(first, homeA, "live")).toBe(false);
  });

  it("ignores a malformed stored label", () => {
    window.sessionStorage.setItem(POSE_SCOPE_KEY, JSON.stringify({ token: "not-hex", lot: "live:x" }));
    expect(poseScopeMatchesLot("not-hex", homeA, "live")).toBe(false);
    expect(poseScopeForLot(homeA, "live")).toMatch(/^[a-f0-9]{16}$/);
  });
});

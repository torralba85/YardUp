import { describe, expect, it } from "vitest";
import {
  hasBuilderCheckoutReturnMarkers,
  isBuilderCheckoutConfirmed,
  readBuilderCheckoutReturn,
  stripBuilderCheckoutReturnMarkers,
} from "./builder-checkout-return";
import type { BuilderInboxItem, BuilderLedgerEntry } from "./marketplace-types";

function inboxItem(id: string, unlocked: boolean): BuilderInboxItem {
  return { request: { id }, unlocked } as unknown as BuilderInboxItem;
}

function ledgerEntry(referenceId: string): BuilderLedgerEntry {
  return {
    id: `builder-1_${referenceId}`,
    builderId: "builder-1",
    type: "purchase",
    creditsChange: 5,
    amountPaid: 175,
    referenceId,
    description: "",
    createdAt: "2026-10-07T00:00:00.000Z",
  };
}

describe("readBuilderCheckoutReturn", () => {
  it("reads a lead-unlock success return", () => {
    expect(readBuilderCheckoutReturn("?lead=req-1&unlocked=1")).toEqual({
      kind: "lead_unlock",
      requestId: "req-1",
    });
  });

  it("reads a credit-pack success return with its Session id", () => {
    expect(readBuilderCheckoutReturn("?credits_added=1&session_id=cs_live_abc")).toEqual({
      kind: "credit_pack",
      sessionId: "cs_live_abc",
    });
  });

  it("ignores a cancel return, a plain lead link, and an unmatched legacy credit return", () => {
    expect(readBuilderCheckoutReturn("?lead=req-1")).toBeNull();
    expect(readBuilderCheckoutReturn("?unlocked=1")).toBeNull();
    expect(readBuilderCheckoutReturn("?credits_added=1")).toBeNull();
    // Stripe did not substitute the template, or the value was tampered with.
    expect(
      readBuilderCheckoutReturn("?credits_added=1&session_id={CHECKOUT_SESSION_ID}"),
    ).toBeNull();
  });
});

describe("return markers", () => {
  it("strips only the one-shot markers and keeps inbox view state", () => {
    const search = "?lead=req-1&unlocked=1&view=table";
    expect(hasBuilderCheckoutReturnMarkers(search)).toBe(true);
    expect(stripBuilderCheckoutReturnMarkers(search)).toBe("lead=req-1&view=table");
    expect(
      stripBuilderCheckoutReturnMarkers("?credits_added=1&session_id=cs_test_1"),
    ).toBe("");
    expect(hasBuilderCheckoutReturnMarkers("?lead=req-1")).toBe(false);
  });
});

describe("isBuilderCheckoutConfirmed", () => {
  it("confirms a lead unlock once that lead reads as unlocked", () => {
    const target = { kind: "lead_unlock", requestId: "req-1" } as const;
    expect(isBuilderCheckoutConfirmed(target, [inboxItem("req-1", false)], [])).toBe(false);
    expect(
      isBuilderCheckoutConfirmed(target, [inboxItem("req-2", true), inboxItem("req-1", true)], []),
    ).toBe(true);
  });

  it("confirms a credit pack only by its own ledger entry", () => {
    const target = { kind: "credit_pack", sessionId: "cs_test_new" } as const;
    expect(isBuilderCheckoutConfirmed(target, [], [ledgerEntry("cs_test_old")])).toBe(false);
    expect(isBuilderCheckoutConfirmed(target, [], [ledgerEntry("cs_test_new")])).toBe(true);
  });
});

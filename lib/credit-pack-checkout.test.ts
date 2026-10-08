import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCheckoutAttemptId } from "./checkout-attempt";
import {
  clearCreditPackCheckoutAttempts,
  startCreditPackCheckout,
} from "./credit-pack-checkout";

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sentAttemptId(call: number): string {
  return JSON.parse(fetchMock.mock.calls[call][1].body).checkoutAttemptId;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  clearCreditPackCheckoutAttempts([5, 10]);
  vi.unstubAllGlobals();
});

describe("startCreditPackCheckout", () => {
  it("reuses one attempt id per pack across retries, so a double click resumes one Session", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { url: "https://checkout.stripe.test/a" }));

    await startCreditPackCheckout(5, "tok");
    await startCreditPackCheckout(5, "tok");
    await startCreditPackCheckout(10, "tok");

    expect(sentAttemptId(0)).toBe(sentAttemptId(1));
    expect(sentAttemptId(2)).not.toBe(sentAttemptId(0));
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).pack).toBe(5);
  });

  it("rotates the attempt id and retries once when the reused Session already finished", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(409, { error: "That checkout has already finished.", retryWithNewAttempt: true }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { url: "https://checkout.stripe.test/new" }));

    const outcome = await startCreditPackCheckout(5, "tok");

    expect(outcome).toEqual({ kind: "redirect", url: "https://checkout.stripe.test/new" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentAttemptId(1)).not.toBe(sentAttemptId(0));
  });

  it("surfaces a server error without retrying", async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, { error: "Could not start checkout. Please try again." }));

    await expect(startCreditPackCheckout(5, "tok")).rejects.toThrow(
      "Could not start checkout. Please try again.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears the attempt id after a demo grant", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: "granted", demo: true }));
    const before = getCheckoutAttemptId("credit_pack", "5");

    expect(await startCreditPackCheckout(5, "tok")).toEqual({ kind: "granted" });
    expect(getCheckoutAttemptId("credit_pack", "5")).not.toBe(before);
  });
});

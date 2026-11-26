import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { STORE_PRODUCTS } from "@/lib/commerce/products";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

const verifyAndGrantPurchase = vi.fn();

vi.mock("@/lib/server/store-purchases", () => ({
  verifyAndGrantPurchase: (...args: unknown[]) => verifyAndGrantPurchase(...args),
}));

import { POST } from "./route";

function post(body: unknown) {
  return new NextRequest("http://localhost/api/store/purchases/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/store/purchases/verify", () => {
  beforeEach(() => {
    verifyAndGrantPurchase.mockReset();
    resetRateLimitBuckets();
  });

  it.each([null, [], "receipt", 7])(
    "returns 400 for a non-object JSON body (%j)",
    async (body) => {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
      expect(verifyAndGrantPurchase).not.toHaveBeenCalled();
    },
  );

  it("returns 400 for missing or non-string fields", async () => {
    expect((await POST(post({ platform: "app-store" }))).status).toBe(400);
    expect(
      (await POST(post({ platform: "app-store", productId: 123, token: "abc" }))).status,
    ).toBe(400);
    expect(
      (
        await POST(
          post({
            platform: "app-store",
            productId: STORE_PRODUCTS.certificate.id,
            token: { nested: true },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          post({
            platform: "app-store",
            productId: STORE_PRODUCTS.certificate.id,
            token: "demo:tx-1",
            certKey: 42,
          }),
        )
      ).status,
    ).toBe(400);
    expect(verifyAndGrantPurchase).not.toHaveBeenCalled();
  });

  it("returns grant payload on success and forwards certKey", async () => {
    verifyAndGrantPurchase.mockResolvedValue({
      ok: true,
      replay: false,
      grant: {
        id: "app-store:tx-1",
        uid: "local-dev",
        platform: "app-store",
        productId: STORE_PRODUCTS.certificate.id,
        credits: 0,
        certificateCredits: 1,
        transactionId: "tx-1",
        createdAt: "2026-07-13T00:00:00.000Z",
        certKey: "lot-7",
      },
    });

    const res = await POST(
      post({
        platform: "app-store",
        productId: STORE_PRODUCTS.certificate.id,
        token: "demo:tx-1",
        certKey: "lot-7",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.granted).toBe(true);
    expect(json.grant.certificateCredits).toBe(1);
    expect(verifyAndGrantPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "local-dev",
        platform: "app-store",
        productId: STORE_PRODUCTS.certificate.id,
        certKey: "lot-7",
      }),
    );
  });

  it("maps verifier failures to error responses", async () => {
    verifyAndGrantPurchase.mockResolvedValue({
      ok: false,
      error: "Invalid signature",
      status: 400,
    });
    const res = await POST(
      post({
        platform: "app-store",
        productId: STORE_PRODUCTS.certificate.id,
        token: "bad",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid signature" });
  });
});

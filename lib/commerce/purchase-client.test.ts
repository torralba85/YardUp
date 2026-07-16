import { describe, expect, it, vi } from "vitest";
import { STORE_PRODUCTS } from "./products";
import { createPurchaseClient, PurchaseClientError } from "./purchase-client";

describe("createPurchaseClient", () => {
  it("uses the web channel by default", () => {
    const client = createPurchaseClient({
      win: {},
      allowSyntheticWeb: true,
    });
    expect(client.channel).toBe("web");
  });

  it("web purchase returns a receipt via stripe handler redirect", async () => {
    const startStripe = vi.fn(async () => ({
      kind: "redirect" as const,
      url: "https://checkout.stripe.com/test",
    }));
    const client = createPurchaseClient({
      win: {},
      stripe: { startStripe },
    });
    const receipt = await client.purchase(STORE_PRODUCTS.certificate.id);
    expect(startStripe).toHaveBeenCalledWith(STORE_PRODUCTS.certificate.id);
    expect(receipt.platform).toBe("web");
    expect(receipt.productId).toBe(STORE_PRODUCTS.certificate.id);
  });

  it("rejects unknown product ids", async () => {
    const client = createPurchaseClient({ win: {}, allowSyntheticWeb: true });
    await expect(client.purchase("com.unknown.sku")).rejects.toBeInstanceOf(
      PurchaseClientError,
    );
  });

  it("app-store client posts to the StoreKit bridge and verifies", async () => {
    const postMessage = vi.fn((payload: { callback: string }) => {
      const g = globalThis as unknown as Record<
        string,
        (r: { ok: boolean; jws: string }) => void
      >;
      g[payload.callback]({ ok: true, jws: "signed.jws.token" });
    });
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ granted: true }), { status: 200 }),
    );
    const client = createPurchaseClient({
      win: {
        webkit: { messageHandlers: { lotfoundryStore: { postMessage } } },
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getIdToken: async () => "id-token",
    });
    expect(client.channel).toBe("app-store");
    const receipt = await client.purchase(STORE_PRODUCTS.builder5.id);
    expect(receipt.token).toBe("signed.jws.token");
    expect(fetchImpl).toHaveBeenCalled();
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[1].headers).toMatchObject({ Authorization: "Bearer id-token" });
  });

  it("forwards certKey to the store verify route for certificate unlocks", async () => {
    const postMessage = vi.fn((payload: { callback: string }) => {
      const g = globalThis as unknown as Record<
        string,
        (r: { ok: boolean; jws: string }) => void
      >;
      g[payload.callback]({ ok: true, jws: "signed.jws.token" });
    });
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ granted: true }), { status: 200 }),
    );
    const client = createPurchaseClient({
      win: {
        webkit: { messageHandlers: { lotfoundryStore: { postMessage } } },
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getIdToken: async () => "id-token",
    });
    await client.purchase(STORE_PRODUCTS.certificate.id, { certKey: "lot-99" });
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(call[1].body))).toMatchObject({
      platform: "app-store",
      productId: STORE_PRODUCTS.certificate.id,
      token: "signed.jws.token",
      certKey: "lot-99",
    });
  });

  it("google-play client uses Digital Goods service", async () => {
    const getDigitalGoodsService = vi.fn(async () => ({
      getDetails: vi.fn(async () => [{ itemId: STORE_PRODUCTS.builder10.id }]),
      listPurchases: vi.fn(async () => [
        { itemId: STORE_PRODUCTS.builder10.id, purchaseToken: "play-token-1" },
      ]),
      acknowledge: vi.fn(async () => undefined),
    }));
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ granted: true }), { status: 200 }),
    );
    const client = createPurchaseClient({
      win: { getDigitalGoodsService },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(client.channel).toBe("google-play");
    const receipt = await client.purchase(STORE_PRODUCTS.builder10.id);
    expect(receipt.token).toBe("play-token-1");
    expect(fetchImpl).toHaveBeenCalled();
  });
});

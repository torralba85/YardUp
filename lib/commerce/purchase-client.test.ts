import { afterEach, describe, expect, it, vi } from "vitest";
import { STORE_PRODUCTS } from "./products";
import {
  createPurchaseClient,
  getGooglePlayProductPrices,
  PurchaseClientError,
} from "./purchase-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

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
        (result: { ok: boolean; jws: string }) => void
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
        (result: { ok: boolean; jws: string }) => void
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

  it("google-play verifies, consumes, then completes successfully", async () => {
    const order: string[] = [];
    const consume = vi.fn(async () => {
      order.push("consume");
    });
    const complete = vi.fn(async (result: string) => {
      order.push(`complete:${result}`);
    });
    vi.stubGlobal(
      "PaymentRequest",
      class {
        async show() {
          return {
            details: { purchaseToken: "play-token-1" },
            complete,
          };
        }
      },
    );
    const getDigitalGoodsService = vi.fn(async () => ({
      getDetails: vi.fn(async () => [{ itemId: STORE_PRODUCTS.builder10.id }]),
      consume,
    }));
    const fetchImpl = vi.fn(async () => {
      order.push("verify");
      return new Response(JSON.stringify({ granted: true }), { status: 200 });
    });
    const client = createPurchaseClient({
      win: { getDigitalGoodsService },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const receipt = await client.purchase(STORE_PRODUCTS.builder10.id);
    expect(receipt.token).toBe("play-token-1");
    expect(order).toEqual(["verify", "consume", "complete:success"]);
    expect(consume).toHaveBeenCalledWith("play-token-1");
  });

  it("google-play completes as failed and does not consume when verification fails", async () => {
    const consume = vi.fn(async () => undefined);
    const complete = vi.fn(async () => undefined);
    vi.stubGlobal(
      "PaymentRequest",
      class {
        async show() {
          return {
            details: { purchaseToken: "play-token-bad" },
            complete,
          };
        }
      },
    );
    const getDigitalGoodsService = vi.fn(async () => ({
      getDetails: vi.fn(async () => [{ itemId: STORE_PRODUCTS.builder1.id }]),
      consume,
    }));
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Invalid purchase" }), { status: 400 }),
    );
    const client = createPurchaseClient({
      win: { getDigitalGoodsService },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.purchase(STORE_PRODUCTS.builder1.id)).rejects.toThrow(
      "Invalid purchase",
    );
    expect(consume).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledWith("fail");
  });

  it("google-play listPurchases fallback consumes repeatable products", async () => {
    const consume = vi.fn(async () => undefined);
    const getDigitalGoodsService = vi.fn(async () => ({
      getDetails: vi.fn(async () => [{ itemId: STORE_PRODUCTS.builder10.id }]),
      listPurchases: vi.fn(async () => [
        { itemId: STORE_PRODUCTS.builder10.id, purchaseToken: "play-token-2" },
      ]),
      consume,
    }));
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ granted: true }), { status: 200 }),
    );
    const client = createPurchaseClient({
      win: { getDigitalGoodsService },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const receipt = await client.purchase(STORE_PRODUCTS.builder10.id);
    expect(receipt.token).toBe("play-token-2");
    expect(consume).toHaveBeenCalledWith("play-token-2");
  });
});

describe("getGooglePlayProductPrices", () => {
  it("uses the localized prices returned by Google Play", async () => {
    const getDigitalGoodsService = vi.fn(async () => ({
      getDetails: vi.fn(async () => [
        // The amounts Play actually persists for these SKUs: a $175 / $300
        // base sells for $174.99 / $299.99 after mandatory price charming.
        {
          itemId: STORE_PRODUCTS.builder5.id,
          price: { value: "174.99", currency: "USD" },
        },
        {
          itemId: STORE_PRODUCTS.builder10.id,
          price: { value: 299.99, currency: "USD" },
        },
      ]),
    }));

    const prices = await getGooglePlayProductPrices(
      [STORE_PRODUCTS.builder5.id, STORE_PRODUCTS.builder10.id],
      {
        win: { getDigitalGoodsService },
        locale: "en-US",
      },
    );

    expect(prices[STORE_PRODUCTS.builder5.id]).toMatchObject({
      value: 174.99,
      currency: "USD",
      formatted: "$174.99",
    });
    expect(prices[STORE_PRODUCTS.builder10.id].formatted).toBe("$299.99");
  });
});

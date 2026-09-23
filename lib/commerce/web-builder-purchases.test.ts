import { describe, expect, it, vi } from "vitest";
import { createPurchaseClient } from "./purchase-client";
import { STORE_PRODUCTS } from "./products";

describe("web-only builder purchases", () => {
  it.each(["builder1", "builder5", "builder10"] as const)(
    "blocks %s before contacting either native store, but preserves web checkout",
    async (key) => {
      const getDigitalGoodsService = vi.fn();
      const postMessage = vi.fn();
      for (const win of [
        { getDigitalGoodsService },
        { webkit: { messageHandlers: { lotfoundryStore: { postMessage } } } },
      ]) {
        const client = createPurchaseClient({ win });
        await expect(client.purchase(STORE_PRODUCTS[key].id)).rejects.toThrow(
          "Builder purchases are unavailable in this app.",
        );
      }
      expect(getDigitalGoodsService).not.toHaveBeenCalled();
      expect(postMessage).not.toHaveBeenCalled();
      const startStripe = vi.fn(async () => ({ kind: "granted" as const }));
      await createPurchaseClient({ win: {}, stripe: { startStripe } }).purchase(STORE_PRODUCTS[key].id);
      expect(startStripe).toHaveBeenCalledWith(STORE_PRODUCTS[key].id);
    },
  );
});

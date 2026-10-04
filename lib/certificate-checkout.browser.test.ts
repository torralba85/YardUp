import { afterEach, expect, it, vi } from "vitest";
import { startCertificateCheckout } from "./certificate-checkout";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

it("starts Stripe certificate checkout in a browser that exposes an unusable store API", async () => {
  const getDigitalGoodsService = vi.fn(async () => {
    throw new DOMException("unsupported context", "OperationError");
  });
  vi.stubGlobal("getDigitalGoodsService", getDigitalGoodsService);
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ url: "https://checkout.stripe.com/test" }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await expect(startCertificateCheckout({
    certKey: "lot-42",
    parcelName: "42 Oak St",
    idToken: "firebase-token",
  })).resolves.toEqual({ kind: "redirect", url: "https://checkout.stripe.com/test" });

  expect(getDigitalGoodsService).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith("/api/stripe/checkout-certificate", expect.objectContaining({
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer firebase-token",
    },
    body: expect.any(String),
  }));
});

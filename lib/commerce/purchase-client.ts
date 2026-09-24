/**
 * Channel-aware digital purchase client.
 *
 * Web → existing Stripe checkout routes.
 * App Store → WKWebView StoreKit bridge (`lotfoundryStore`).
 * Google Play → Digital Goods API + PaymentRequest.
 *
 * Entitlements are never granted client-side; store receipts must be verified
 * by `POST /api/store/purchases/verify`.
 */

import {
  detectPurchaseChannel,
  type PurchaseChannel,
  type PurchaseChannelWindow,
} from "./purchase-channel";
import { getStoreProduct } from "./products";

export interface PurchaseReceipt {
  platform: PurchaseChannel;
  productId: string;
  token: string;
  /** Bound lot certificate key (certificate SKUs only). */
  certKey?: string;
}

/** Optional context for store verification (e.g. which lot to unlock). */
export interface PurchaseContext {
  certKey?: string;
}

export interface PurchaseClient {
  channel: PurchaseChannel;
  purchase(productId: string, context?: PurchaseContext): Promise<PurchaseReceipt>;
}

export class PurchaseClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseClientError";
  }
}

export interface StripePurchaseHandlers {
  /** Start Stripe checkout for a store product id; return redirect URL or grant. */
  startStripe: (productId: string) => Promise<
    | { kind: "redirect"; url: string }
    | { kind: "granted"; demo?: boolean }
  >;
}

export interface CreatePurchaseClientOptions {
  win?: PurchaseChannelWindow | null;
  stripe?: StripePurchaseHandlers;
  /** Injectable fetch for server verify (store paths). */
  fetchImpl?: typeof fetch;
  /** Firebase ID token for verify route. */
  getIdToken?: () => Promise<string | undefined>;
  /**
   * When true, web channel returns a synthetic demo receipt instead of calling
   * Stripe — used only in unit tests.
   */
  allowSyntheticWeb?: boolean;
}

interface StoreKitBridge {
  postMessage: (payload: unknown) => void;
}

interface DigitalGoodsService {
  getDetails: (productIds: string[]) => Promise<DigitalGoodsItemDetails[]>;
  listPurchases?: () => Promise<Array<{ itemId: string; purchaseToken: string }>>;
  consume?: (token: string) => Promise<void>;
}

interface DigitalGoodsItemDetails {
  itemId: string;
  price?: {
    value: number | string;
    currency: string;
  };
}

export interface StoreProductPrice {
  itemId: string;
  value: number;
  currency: string;
  formatted: string;
}

interface DigitalGoodsPaymentResponse {
  details: { purchaseToken?: string; token?: string };
  complete: (result: string) => Promise<void>;
}

/** Build a purchase client for the current runtime channel. */
export function createPurchaseClient(
  options: CreatePurchaseClientOptions = {},
): PurchaseClient {
  const win =
    options.win === undefined
      ? typeof window !== "undefined"
        ? (window as unknown as PurchaseChannelWindow)
        : null
      : options.win;
  const channel = detectPurchaseChannel(win);

  if (channel === "web") {
    return createWebClient(options);
  }
  if (channel === "app-store") {
    return createAppStoreClient(win, options);
  }
  return createGooglePlayClient(win, options);
}

/**
 * Read localized Google Play prices from the billing backend. Store prices
 * must come from `getDetails()` rather than a web/Stripe catalog because Play
 * controls the amount and localization shown in its purchase sheet.
 */
export async function getGooglePlayProductPrices(
  productIds: string[],
  options: {
    win?: PurchaseChannelWindow | null;
    locale?: string;
  } = {},
): Promise<Record<string, StoreProductPrice>> {
  const win =
    options.win === undefined
      ? typeof window !== "undefined"
        ? (window as unknown as PurchaseChannelWindow)
        : null
      : options.win;
  const getService = win?.getDigitalGoodsService;
  if (typeof getService !== "function") {
    throw new PurchaseClientError("Google Play pricing is unavailable.");
  }

  const service = (await Promise.resolve(
    getService("https://play.google.com/billing"),
  )) as DigitalGoodsService | null;
  if (!service?.getDetails) {
    throw new PurchaseClientError("Google Play pricing is unavailable.");
  }

  const details = await service.getDetails(productIds);
  const locale =
    options.locale ??
    (typeof navigator !== "undefined" ? navigator.language : "en-US");
  const prices: Record<string, StoreProductPrice> = {};

  for (const item of details) {
    const value = Number(item.price?.value);
    const currency = item.price?.currency;
    if (!Number.isFinite(value) || value < 0 || !currency) continue;

    prices[item.itemId] = {
      itemId: item.itemId,
      value,
      currency,
      formatted: formatCurrencyAmount(value, currency, locale),
    };
  }

  return prices;
}

export function formatCurrencyAmount(
  value: number,
  currency: string,
  locale?: string,
  options?: { compact?: boolean },
): string {
  const resolvedLocale =
    locale ??
    (typeof navigator !== "undefined" ? navigator.language : "en-US");
  // A whole amount reads better without ".00" in a tight CTA slot, but a
  // charming price like 48.99 must keep its cents or it misquotes the total.
  const dropCents = options?.compact === true && Number.isInteger(value);
  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency,
    ...(dropCents ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  }).format(value);
}

function createWebClient(options: CreatePurchaseClientOptions): PurchaseClient {
  return {
    channel: "web",
    async purchase(productId: string, context?: PurchaseContext): Promise<PurchaseReceipt> {
      assertKnownProduct(productId);
      if (!options.stripe) {
        if (options.allowSyntheticWeb) {
          return {
            platform: "web",
            productId,
            token: `web-demo:${productId}`,
            certKey: context?.certKey,
          };
        }
        throw new PurchaseClientError("Stripe checkout is not configured for this surface.");
      }
      const outcome = await options.stripe.startStripe(productId);
      if (outcome.kind === "redirect") {
        if (typeof window !== "undefined") {
          window.location.assign(outcome.url);
        }
        return {
          platform: "web",
          productId,
          token: `stripe-redirect:${productId}`,
          certKey: context?.certKey,
        };
      }
      return {
        platform: "web",
        productId,
        token: outcome.demo ? `stripe-demo:${productId}` : `stripe-granted:${productId}`,
        certKey: context?.certKey,
      };
    },
  };
}

function createAppStoreClient(
  win: PurchaseChannelWindow | null | undefined,
  options: CreatePurchaseClientOptions,
): PurchaseClient {
  return {
    channel: "app-store",
    async purchase(productId: string, context?: PurchaseContext): Promise<PurchaseReceipt> {
      assertKnownProduct(productId);
      if (getStoreProduct(productId)!.leadCredits > 0) {
        throw new PurchaseClientError("Builder purchases are unavailable in this app.");
      }
      const handler = win?.webkit?.messageHandlers?.lotfoundryStore as
        | StoreKitBridge
        | undefined;
      if (!handler?.postMessage) {
        throw new PurchaseClientError(
          "App Store billing is unavailable in this build. Update the LotFoundry app.",
        );
      }

      const token = await new Promise<string>((resolve, reject) => {
        const requestId = `sk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const callbackName = `__lotfoundryStoreCallback_${requestId}`;
        const timeout = setTimeout(() => {
          cleanup();
          reject(new PurchaseClientError("App Store purchase timed out."));
        }, 120_000);

        function cleanup() {
          clearTimeout(timeout);
          try {
            delete (globalThis as Record<string, unknown>)[callbackName];
          } catch {
            // ignore
          }
        }

        (globalThis as Record<string, unknown>)[callbackName] = (
          result: { ok?: boolean; jws?: string; error?: string } | string,
        ) => {
          cleanup();
          if (typeof result === "string") {
            resolve(result);
            return;
          }
          if (result?.ok === false || result?.error) {
            reject(new PurchaseClientError(result.error || "App Store purchase failed."));
            return;
          }
          if (!result?.jws) {
            reject(new PurchaseClientError("App Store returned an empty receipt."));
            return;
          }
          resolve(result.jws);
        };

        handler.postMessage({
          action: "purchase",
          productId,
          requestId,
          callback: callbackName,
          certKey: context?.certKey,
        });
      });

      await verifyOnServer(
        { platform: "app-store", productId, token, certKey: context?.certKey },
        options,
      );
      return { platform: "app-store", productId, token, certKey: context?.certKey };
    },
  };
}

function createGooglePlayClient(
  win: PurchaseChannelWindow | null | undefined,
  options: CreatePurchaseClientOptions,
): PurchaseClient {
  return {
    channel: "google-play",
    async purchase(productId: string, context?: PurchaseContext): Promise<PurchaseReceipt> {
      assertKnownProduct(productId);
      if (getStoreProduct(productId)!.leadCredits > 0) {
        throw new PurchaseClientError("Builder purchases are unavailable in this app.");
      }
      const getService = win?.getDigitalGoodsService;
      if (typeof getService !== "function") {
        throw new PurchaseClientError(
          "Google Play billing is unavailable in this browser.",
        );
      }

      const service = (await Promise.resolve(
        getService("https://play.google.com/billing"),
      )) as DigitalGoodsService | null;
      if (!service?.getDetails || !service.consume) {
        throw new PurchaseClientError("Google Play billing service is not available.");
      }

      await service.getDetails([productId]);

      const paymentMethodData = [
        {
          supportedMethods: "https://play.google.com/billing",
          data: { sku: productId },
        },
      ];
      const PaymentRequestCtor = (globalThis as { PaymentRequest?: new (
        methodData: unknown[],
        details: unknown,
      ) => { show: () => Promise<DigitalGoodsPaymentResponse> } }).PaymentRequest;

      let token: string;
      let paymentResponse: DigitalGoodsPaymentResponse | null = null;
      if (PaymentRequestCtor) {
        const request = new PaymentRequestCtor(paymentMethodData, {
          total: { label: "Total", amount: { currency: "USD", value: "0" } },
        });
        paymentResponse = await request.show();
        token =
          paymentResponse.details.purchaseToken ||
          paymentResponse.details.token ||
          "";
      } else if (service.listPurchases) {
        const purchases = await service.listPurchases();
        const match = purchases.find((purchase) => purchase.itemId === productId);
        token = match?.purchaseToken ?? "";
      } else {
        throw new PurchaseClientError("Could not complete the Google Play purchase.");
      }

      if (!token) {
        await paymentResponse?.complete("fail").catch(() => undefined);
        throw new PurchaseClientError("Google Play returned an empty purchase token.");
      }

      try {
        await verifyOnServer(
          { platform: "google-play", productId, token, certKey: context?.certKey },
          options,
        );
        // Every catalog item is a repeatable credit. Consume only after the
        // server records the idempotent grant so the SKU can be purchased again.
        await service.consume(token);
        await paymentResponse?.complete("success");
      } catch (err) {
        await paymentResponse?.complete("fail").catch(() => undefined);
        throw err;
      }

      return {
        platform: "google-play",
        productId,
        token,
        certKey: context?.certKey,
      };
    },
  };
}

function assertKnownProduct(productId: string) {
  if (!getStoreProduct(productId)) {
    throw new PurchaseClientError("Unknown product.");
  }
}

async function verifyOnServer(
  receipt: PurchaseReceipt & { certKey?: string },
  options: CreatePurchaseClientOptions,
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const idToken = options.getIdToken ? await options.getIdToken() : undefined;
  const res = await fetchImpl("/api/store/purchases/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      platform: receipt.platform,
      productId: receipt.productId,
      token: receipt.token,
      ...(receipt.certKey ? { certKey: receipt.certKey } : {}),
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new PurchaseClientError(data?.error ?? "Purchase verification failed.");
  }
}

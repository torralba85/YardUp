"use client";

/**
 * Channel-aware price display for the store catalog.
 *
 * Web quotes come from the Stripe catalog. Google Play quotes must come from
 * `getDetails()` instead, because Play — not this app — decides the amount: it
 * applies mandatory price charming (a $49 base sells for $48.99) and localizes
 * the currency per country. Quoting the Stripe amount inside a store shell
 * therefore shows a total the buyer is never charged, so a store channel never
 * falls back to it; it shows a placeholder until Play answers.
 *
 * This is the same rule the Credit Shop already followed for the 5- and
 * 10-credit packs, lifted here so every paywall obeys it.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { CREDIT_PACK_PRICES_CENTS, formatUsdCents } from "@/lib/credit-packs";
import { LEAD_UNLOCK_PRICE_CENTS } from "@/lib/lead-unlock-pricing";
import { STORE_PRODUCTS, type StoreProductKey } from "./products";
import {
  detectPurchaseChannel,
  type PurchaseChannel,
  type PurchaseChannelWindow,
} from "./purchase-channel";
import type { StoreProductPrice } from "./purchase-client";

/** Text shown in a price slot the channel cannot fill with a real amount. */
export const STORE_PRICE_PLACEHOLDER = {
  loading: "…",
  /** App Store quotes in its own sheet; there is no API to read it from here. */
  deferred: "At checkout",
  unavailable: "Unavailable",
} as const;

/** A price ready to render, plus whether it is the amount actually charged. */
export interface StorePriceDisplay {
  /** Commerce channel the amount was resolved on. */
  channel: PurchaseChannel;
  /** Total including cents, e.g. `"$48.99"`. */
  amount: string;
  /** Total without zero cents, e.g. `"$49"` — for tight CTA slots. */
  amountCompact: string;
  /** Price per credit for multi-credit packs, e.g. `"$30"`. */
  unitAmount: string;
  /** Whether the strings above are what this channel will charge. */
  exact: boolean;
  /** True while the store price is still being read. */
  loading: boolean;
  /** User-facing message when the channel could not supply a price. */
  error: string | null;
}

/** Stripe-catalog price per store product, in cents. */
const WEB_PRICE_CENTS: Record<StoreProductKey, number> = {
  certificate: CERTIFICATE_PRICE_CENTS,
  builder1: LEAD_UNLOCK_PRICE_CENTS,
  builder5: CREDIT_PACK_PRICES_CENTS[5],
  builder10: CREDIT_PACK_PRICES_CENTS[10],
};

/** Credits a product grants — the divisor for its per-credit price. */
function creditsFor(product: StoreProductKey): number {
  const entry = STORE_PRODUCTS[product];
  return entry.leadCredits + entry.certificateCredits;
}

/** The Stripe-catalog quote, which is also the pre-hydration default. */
function webPrice(product: StoreProductKey): StorePriceDisplay {
  const cents = WEB_PRICE_CENTS[product];
  return {
    channel: "web",
    amount: formatUsdCents(cents, { cents: true }),
    amountCompact: formatUsdCents(cents),
    unitAmount: formatUsdCents(cents / creditsFor(product)),
    exact: true,
    loading: false,
    error: null,
  };
}

function placeholderPrice(
  channel: PurchaseChannel,
  text: string,
  state: { loading: boolean; error: string | null },
): StorePriceDisplay {
  return {
    channel,
    amount: text,
    amountCompact: text,
    unitAmount: text,
    exact: false,
    ...state,
  };
}

/**
 * In-flight and settled Play lookups, shared across every mounted component so
 * an inbox of lead cards issues one `getDetails` call per product, not one per
 * card. Keyed by product id alone: a page has exactly one billing service, so
 * `win` cannot vary between callers outside tests, which clear the cache. A
 * rejected lookup is evicted so the next mount can retry.
 */
const playPriceRequests = new Map<string, Promise<StoreProductPrice>>();

function loadPlayPrice(
  productId: string,
  win: PurchaseChannelWindow | null | undefined,
): Promise<StoreProductPrice> {
  const cached = playPriceRequests.get(productId);
  if (cached) return cached;

  const pending = (async () => {
    const { getGooglePlayProductPrices } = await import("./purchase-client");
    const prices = await getGooglePlayProductPrices([productId], { win });
    const price = prices[productId];
    if (!price) {
      throw new Error(`Google Play returned no price for ${productId}.`);
    }
    return price;
  })();

  playPriceRequests.set(productId, pending);
  void pending.catch(() => playPriceRequests.delete(productId));
  return pending;
}

/** Drop cached Play lookups. Exported for tests. */
export function clearStorePriceCache(): void {
  playPriceRequests.clear();
}

/** Options for {@link useStorePrice}. */
export interface UseStorePriceOptions {
  /** Force a channel instead of detecting it — for tests and story surfaces. */
  channel?: PurchaseChannel;
  /** Injectable window for channel detection and Play lookups. */
  win?: PurchaseChannelWindow | null;
}

/** The channel never changes within a page, so there is nothing to subscribe to. */
const unsubscribeChannel = () => {};
const subscribeChannel = () => unsubscribeChannel;

/** A Play lookup result, tagged with the product it belongs to. */
interface ResolvedPlayPrice {
  product: StoreProductKey;
  value: StorePriceDisplay;
}

/**
 * Resolve a store product's price for the current commerce channel.
 *
 * The channel is read through `useSyncExternalStore` so the server snapshot is
 * always `web`: prerendered HTML carries the Stripe amount, then the client
 * re-renders on its real channel without a hydration mismatch. A store channel
 * therefore never paints the Stripe amount beyond that first commit — it shows
 * a placeholder until Play answers with what it will charge.
 */
export function useStorePrice(
  product: StoreProductKey,
  options: UseStorePriceOptions = {},
): StorePriceDisplay {
  const { channel: forcedChannel, win } = options;
  const channel = useSyncExternalStore(
    subscribeChannel,
    () => forcedChannel ?? detectPurchaseChannel(win),
    () => "web" as PurchaseChannel,
  );
  const [resolved, setResolved] = useState<ResolvedPlayPrice | null>(null);

  useEffect(() => {
    if (channel !== "google-play") return;
    let cancelled = false;

    void (async () => {
      try {
        const { formatCurrencyAmount } = await import("./purchase-client");
        const play = await loadPlayPrice(STORE_PRODUCTS[product].id, win);
        if (cancelled) return;
        const credits = creditsFor(product);
        setResolved({
          product,
          value: {
            channel,
            amount: formatCurrencyAmount(play.value, play.currency),
            amountCompact: formatCurrencyAmount(play.value, play.currency, undefined, {
              compact: true,
            }),
            unitAmount: formatCurrencyAmount(
              play.value / credits,
              play.currency,
              undefined,
              { compact: true },
            ),
            exact: true,
            loading: false,
            error: null,
          },
        });
      } catch {
        if (cancelled) return;
        setResolved({
          product,
          value: placeholderPrice(channel, STORE_PRICE_PLACEHOLDER.unavailable, {
            loading: false,
            error: "Google Play pricing is unavailable. Please try again.",
          }),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channel, product, win]);

  if (channel === "web") return webPrice(product);
  if (channel === "app-store") {
    return placeholderPrice(channel, STORE_PRICE_PLACEHOLDER.deferred, {
      loading: false,
      error: null,
    });
  }
  // A result for a different product is stale — a switched SKU waits for its
  // own lookup rather than showing the previous product's total.
  if (resolved?.product === product) return resolved.value;
  return placeholderPrice(channel, STORE_PRICE_PLACEHOLDER.loading, {
    loading: true,
    error: null,
  });
}

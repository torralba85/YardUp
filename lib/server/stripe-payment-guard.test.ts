import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { hasExpectedPayment } from "./stripe-payment-guard";

describe("hasExpectedPayment", () => {
  it("accepts a matching USD one-time payment", () => {
    const session = {
      mode: "payment",
      currency: "usd",
      amount_total: 2900,
    } as Stripe.Checkout.Session;

    expect(hasExpectedPayment(session, 2900)).toBe(true);
  });

  it("rejects an underpaid USD payment", () => {
    const session = {
      mode: "payment",
      currency: "usd",
      amount_total: 100,
    } as Stripe.Checkout.Session;

    expect(hasExpectedPayment(session, 2900)).toBe(false);
  });

  it("rejects non-payment mode like subscription", () => {
    const session = {
      mode: "subscription",
      currency: "usd",
      amount_total: 2900,
    } as unknown as Stripe.Checkout.Session;

    expect(hasExpectedPayment(session, 2900)).toBe(false);
  });

  it("rejects a foreign currency payment without valid conversion", () => {
    const session = {
      mode: "payment",
      currency: "eur",
      amount_total: 2900,
    } as Stripe.Checkout.Session;

    expect(hasExpectedPayment(session, 2900)).toBe(false);
  });

  it("accepts a foreign currency payment when currency_conversion proves exact USD amount", () => {
    const session = {
      mode: "payment",
      currency: "cad",
      amount_total: 3950,
      currency_conversion: {
        source_currency: "usd",
        amount_total: 2900,
      },
    } as unknown as Stripe.Checkout.Session;

    expect(hasExpectedPayment(session, 2900)).toBe(true);
  });

  it("rejects a converted payment when currency_conversion amount does not match expected", () => {
    const session = {
      mode: "payment",
      currency: "cad",
      amount_total: 1500,
      currency_conversion: {
        source_currency: "usd",
        amount_total: 1000,
      },
    } as unknown as Stripe.Checkout.Session;

    expect(hasExpectedPayment(session, 2900)).toBe(false);
  });
});

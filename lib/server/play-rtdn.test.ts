import { describe, expect, it } from "vitest";
import {
  PRODUCT_TYPE_ONE_TIME,
  PRODUCT_TYPE_SUBSCRIPTION,
  REFUND_TYPE_FULL,
  asOneTimeVoid,
  decodeRtdnEnvelope,
  type DeveloperNotification,
} from "./play-rtdn";

/** Wrap a developer notification the way a Pub/Sub push subscription does. */
function envelope(
  notification: Record<string, unknown>,
  messageId = "msg-1",
): unknown {
  return {
    message: {
      data: Buffer.from(JSON.stringify(notification)).toString("base64"),
      messageId,
      publishTime: "2026-08-04T00:00:00.000Z",
    },
    subscription: "projects/yardup-2026/subscriptions/play-rtdn",
  };
}

const VOID_NOTIFICATION = {
  version: "1.0",
  packageName: "com.lotfoundry.app",
  eventTimeMillis: "1503349566168",
  voidedPurchaseNotification: {
    purchaseToken: "PURCHASE_TOKEN",
    orderId: "GS.0000-0000-0000",
    productType: PRODUCT_TYPE_ONE_TIME,
    refundType: REFUND_TYPE_FULL,
  },
};

describe("decodeRtdnEnvelope", () => {
  it("decodes a base64 developer notification and its message id", () => {
    const result = decodeRtdnEnvelope(envelope(VOID_NOTIFICATION, "msg-42"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decoded.messageId).toBe("msg-42");
    expect(result.decoded.notification.packageName).toBe("com.lotfoundry.app");
    expect(result.decoded.notification.voidedPurchaseNotification?.orderId).toBe(
      "GS.0000-0000-0000",
    );
  });

  it("accepts the snake_case message_id some emulators emit", () => {
    const result = decodeRtdnEnvelope({
      message: {
        data: Buffer.from(JSON.stringify(VOID_NOTIFICATION)).toString("base64"),
        message_id: "snake-7",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decoded.messageId).toBe("snake-7");
  });

  it.each([
    ["a non-object body", "nope"],
    ["an array body", []],
    ["a missing message", {}],
    ["a missing messageId", { message: { data: "e30=" } }],
    ["a missing data payload", { message: { messageId: "m" } }],
  ])("rejects %s", (_label, body) => {
    expect(decodeRtdnEnvelope(body).ok).toBe(false);
  });

  it("rejects data that is not JSON", () => {
    const result = decodeRtdnEnvelope({
      message: {
        data: Buffer.from("not json at all").toString("base64"),
        messageId: "m",
      },
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a payload with no packageName", () => {
    const result = decodeRtdnEnvelope(
      envelope({ version: "1.0", eventTimeMillis: "1" }),
    );

    expect(result.ok).toBe(false);
  });
});

describe("asOneTimeVoid", () => {
  it("returns the void payload for a one-time product refund", () => {
    const voided = asOneTimeVoid(VOID_NOTIFICATION as DeveloperNotification);

    expect(voided).not.toBeNull();
    expect(voided?.purchaseToken).toBe("PURCHASE_TOKEN");
    expect(voided?.refundType).toBe(REFUND_TYPE_FULL);
  });

  it("ignores subscription voids — LotFoundry sells no subscriptions", () => {
    const notification = {
      ...VOID_NOTIFICATION,
      voidedPurchaseNotification: {
        ...VOID_NOTIFICATION.voidedPurchaseNotification,
        productType: PRODUCT_TYPE_SUBSCRIPTION,
      },
    } as DeveloperNotification;

    expect(asOneTimeVoid(notification)).toBeNull();
  });

  it("treats a missing productType as one-time rather than dropping the refund", () => {
    const notification = {
      ...VOID_NOTIFICATION,
      voidedPurchaseNotification: {
        purchaseToken: "TOKEN",
        orderId: "GS.1",
        refundType: REFUND_TYPE_FULL,
      },
    } as unknown as DeveloperNotification;

    expect(asOneTimeVoid(notification)?.purchaseToken).toBe("TOKEN");
  });

  it("returns null for a purchase notification", () => {
    const notification = {
      version: "1.0",
      packageName: "com.lotfoundry.app",
      eventTimeMillis: "1",
      oneTimeProductNotification: {
        version: "1.0",
        notificationType: 1,
        purchaseToken: "TOKEN",
        sku: "com.lotfoundry.builder.credits5",
      },
    } as DeveloperNotification;

    expect(asOneTimeVoid(notification)).toBeNull();
  });

  it("returns null for a void with no purchase token", () => {
    const notification = {
      ...VOID_NOTIFICATION,
      voidedPurchaseNotification: { orderId: "GS.1", productType: 2, refundType: 1 },
    } as unknown as DeveloperNotification;

    expect(asOneTimeVoid(notification)).toBeNull();
  });
});

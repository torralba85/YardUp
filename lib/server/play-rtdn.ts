/**
 * Google Play Real-time Developer Notifications (RTDN) envelope decoding.
 *
 * Play publishes notifications to a Cloud Pub/Sub topic; a push subscription
 * POSTs them to us wrapped in a Pub/Sub envelope whose `message.data` is a
 * base64 `DeveloperNotification`. This module is pure — no Firestore, no
 * network — so the parsing rules stay cheap to test.
 *
 * Schema: https://developer.android.com/google/play/billing/rtdn-reference
 */

/** `productType` values on a voided-purchase notification. */
export const PRODUCT_TYPE_SUBSCRIPTION = 1;
export const PRODUCT_TYPE_ONE_TIME = 2;

/** `refundType` values on a voided-purchase notification. */
export const REFUND_TYPE_FULL = 1;
export const REFUND_TYPE_QUANTITY_PARTIAL = 2;

/** `notificationType` values on a one-time product notification. */
export const ONE_TIME_PRODUCT_PURCHASED = 1;
export const ONE_TIME_PRODUCT_CANCELED = 2;

/**
 * A voided purchase — refund, chargeback, or developer-issued revocation.
 *
 * Note what is *absent*: Play does not send the SKU or any user identity here,
 * only the purchase token and order id. Resolving those back to an account is
 * the consumer's job (see `voided-purchases.ts`).
 */
export interface VoidedPurchaseNotification {
  purchaseToken: string;
  orderId: string;
  /** {@link PRODUCT_TYPE_SUBSCRIPTION} or {@link PRODUCT_TYPE_ONE_TIME}. */
  productType: number;
  /** {@link REFUND_TYPE_FULL} or {@link REFUND_TYPE_QUANTITY_PARTIAL}. */
  refundType: number;
}

export interface OneTimeProductNotification {
  version: string;
  /** {@link ONE_TIME_PRODUCT_PURCHASED} or {@link ONE_TIME_PRODUCT_CANCELED}. */
  notificationType: number;
  purchaseToken: string;
  sku: string;
}

export interface DeveloperNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  oneTimeProductNotification?: OneTimeProductNotification;
  subscriptionNotification?: Record<string, unknown>;
  voidedPurchaseNotification?: VoidedPurchaseNotification;
  testNotification?: { version: string };
}

/** A decoded RTDN plus the Pub/Sub message id used as the idempotency key. */
export interface DecodedRtdn {
  messageId: string;
  notification: DeveloperNotification;
}

export type DecodeRtdnResult =
  | { ok: true; decoded: DecodedRtdn }
  | { ok: false; error: string };

/**
 * Decode a Pub/Sub push envelope into a {@link DeveloperNotification}.
 *
 * Pub/Sub delivers at-least-once, so `messageId` is returned for the caller to
 * dedupe on. Both `messageId` and `message_id` spellings are accepted — the
 * REST envelope uses camelCase but some emulators emit snake_case.
 *
 * @param body - The parsed JSON request body from the push subscription.
 * @returns The decoded notification, or a reason it could not be read.
 */
export function decodeRtdnEnvelope(body: unknown): DecodeRtdnResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body is not a Pub/Sub envelope." };
  }

  const envelope = body as {
    message?: { data?: unknown; messageId?: unknown; message_id?: unknown };
  };
  const message = envelope.message;
  if (!message || typeof message !== "object") {
    return { ok: false, error: "Envelope is missing `message`." };
  }

  const messageId =
    typeof message.messageId === "string"
      ? message.messageId
      : typeof message.message_id === "string"
        ? message.message_id
        : "";
  if (!messageId) {
    return { ok: false, error: "Envelope is missing `message.messageId`." };
  }

  if (typeof message.data !== "string" || message.data.length === 0) {
    return { ok: false, error: "Envelope is missing `message.data`." };
  }

  let json: string;
  try {
    json = Buffer.from(message.data, "base64").toString("utf8");
  } catch {
    return { ok: false, error: "`message.data` is not valid base64." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "`message.data` is not valid JSON." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Decoded payload is not an object." };
  }

  const notification = parsed as DeveloperNotification;
  if (typeof notification.packageName !== "string" || !notification.packageName) {
    return { ok: false, error: "Notification is missing `packageName`." };
  }

  return { ok: true, decoded: { messageId, notification } };
}

/**
 * Narrow a notification to the voided-purchase case we act on.
 *
 * Subscription voids are ignored deliberately: LotFoundry sells only one-time
 * products, so a subscription void here means the payload is not ours to
 * interpret and should be acked rather than retried.
 *
 * @param notification - A decoded developer notification.
 * @returns The voided-purchase payload when it is a one-time void, else `null`.
 */
export function asOneTimeVoid(
  notification: DeveloperNotification,
): VoidedPurchaseNotification | null {
  const voided = notification.voidedPurchaseNotification;
  if (!voided) return null;
  if (typeof voided.purchaseToken !== "string" || !voided.purchaseToken) return null;
  // `productType` is absent on some historical payloads; treat missing as
  // one-time rather than dropping a real refund on the floor.
  if (voided.productType === PRODUCT_TYPE_SUBSCRIPTION) return null;
  return voided;
}

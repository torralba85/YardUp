/**
 * Platform receipt verification for App Store (StoreKit 2 JWS) and Google Play
 * purchase tokens. Used by {@link createDefaultStoreVerifier}.
 *
 * Demo tokens (`demo:<id>`) are accepted only when LOTFOUNDRY_STORE_DEMO,
 * LOTFOUNDRY_DEMO_UNLOCKS, or NODE_ENV=test is set — never as a production
 * bypass when platform credentials are configured without a real receipt.
 */

import { createVerify, X509Certificate, type KeyObject } from "crypto";

export interface AppleVerifyInput {
  productId: string;
  token: string;
  bundleId: string;
}

export interface GoogleVerifyInput {
  productId: string;
  token: string;
  packageName: string;
  /** Raw service-account JSON string (private_key + client_email). */
  serviceAccountJson: string;
}

export type ReceiptVerifyOk = { transactionId: string };
export type ReceiptVerifyResult = ReceiptVerifyOk | { error: string };

// Apple's App Store Server library requires these certificate extension OIDs:
// leaf = Apple App Store receipt signing, intermediate = Apple WWDR CA.
const STOREKIT_LEAF_OID_DER = Buffer.from("060a2a864886f76364060b01", "hex");
const STOREKIT_INTERMEDIATE_OID_DER = Buffer.from(
  "060a2a864886f76364060201",
  "hex",
);

function isDemoMode(): boolean {
  return (
    process.env.LOTFOUNDRY_STORE_DEMO === "true" ||
    process.env.NODE_ENV === "test" ||
    process.env.LOTFOUNDRY_DEMO_UNLOCKS === "true"
  );
}

/** Parse `demo:<transactionId>` (or `test-receipt:<id>` in tests) when demo mode is on. */
export function parseDemoReceiptToken(token: string): string | null {
  if (!isDemoMode()) return null;
  if (token.startsWith("demo:")) {
    const id = token.slice("demo:".length).trim();
    return id || null;
  }
  // Explicit test-only prefix — never treat arbitrary long strings as demo,
  // so production verifier tests can still reject malformed JWS.
  if (process.env.NODE_ENV === "test" && token.startsWith("test-receipt:")) {
    const id = token.slice("test-receipt:".length).trim();
    return id || simpleHash(token);
  }
  return null;
}

function simpleHash(token: string): string {
  let h = 0;
  for (let i = 0; i < token.length; i += 1) {
    h = (h * 31 + token.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function base64UrlToBuffer(segment: string): Buffer {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function certificateContainsOid(cert: X509Certificate, oidDer: Buffer): boolean {
  return cert.raw.includes(oidDer);
}

/**
 * Validate the JWS `x5c` certificate chain and return the leaf public key.
 *
 * Every certificate must be inside its validity window, each one must be
 * signed by the next in the chain, the final certificate must match the pinned
 * Apple root, and real multi-certificate chains must carry Apple's StoreKit
 * leaf and WWDR intermediate policy OIDs. The OID checks prevent a different
 * Apple-issued certificate purpose from being used to forge a receipt.
 */
function verifyAppleCertChain(
  x5c: string[],
): { key: KeyObject } | { error: string } {
  const pin = process.env.APPLE_ROOT_CA_FINGERPRINT256;
  if (!pin) {
    return {
      error:
        "App Store verification requires APPLE_ROOT_CA_FINGERPRINT256 to pin the Apple root certificate.",
    };
  }

  let certs: X509Certificate[];
  try {
    certs = x5c.map((b64) => new X509Certificate(Buffer.from(b64, "base64")));
  } catch {
    return { error: "App Store receipt certificate chain could not be decoded." };
  }
  if (certs.length === 0) {
    return { error: "App Store receipt is missing the signing certificate." };
  }

  const nowMs = Date.now();
  for (const cert of certs) {
    if (nowMs < Date.parse(cert.validFrom) || nowMs > Date.parse(cert.validTo)) {
      return { error: "App Store receipt certificate chain is expired." };
    }
  }
  for (let i = 0; i < certs.length - 1; i += 1) {
    if (!certs[i].verify(certs[i + 1].publicKey)) {
      return { error: "App Store receipt certificate chain is broken." };
    }
  }

  const root = certs[certs.length - 1];
  const normalize = (fp: string) => fp.replace(/[^0-9a-f]/gi, "").toLowerCase();
  if (normalize(root.fingerprint256) !== normalize(pin)) {
    return { error: "App Store receipt is not anchored to the pinned Apple root." };
  }

  // A one-certificate chain can only pass a production Apple-root pin if it is
  // the root itself (whose private key is unavailable). Keeping that shape
  // supported also permits the isolated pinned-root fixture used in tests.
  if (certs.length > 1) {
    if (!certificateContainsOid(certs[0], STOREKIT_LEAF_OID_DER)) {
      return { error: "App Store receipt leaf certificate is not valid for StoreKit." };
    }
    if (!certificateContainsOid(certs[1], STOREKIT_INTERMEDIATE_OID_DER)) {
      return {
        error: "App Store receipt intermediate certificate is not an Apple WWDR certificate.",
      };
    }
  }

  return { key: certs[0].publicKey };
}

/**
 * Verify a StoreKit 2 signed transaction JWS.
 *
 * Validates the `x5c` chain, StoreKit certificate purpose, and pinned Apple
 * root, verifies the ES256 signature with the leaf key, then checks bundleId +
 * productId against the payload.
 */
export function verifyAppleSignedTransaction(
  input: AppleVerifyInput,
): ReceiptVerifyResult {
  const demo = parseDemoReceiptToken(input.token);
  if (demo) return { transactionId: `apple:${demo}:${input.productId}` };

  const parts = input.token.split(".");
  if (parts.length !== 3) {
    return { error: "App Store receipt is not a valid JWS." };
  }

  let header: { alg?: string; x5c?: string[] };
  let payload: {
    transactionId?: string;
    originalTransactionId?: string;
    bundleId?: string;
    productId?: string;
    type?: string;
  };
  try {
    header = JSON.parse(base64UrlToBuffer(parts[0]).toString("utf8")) as typeof header;
    payload = JSON.parse(base64UrlToBuffer(parts[1]).toString("utf8")) as typeof payload;
  } catch {
    return { error: "App Store receipt payload could not be decoded." };
  }

  if (header.alg !== "ES256") {
    return { error: "App Store receipt uses an unsupported algorithm." };
  }
  if (!header.x5c?.length) {
    return { error: "App Store receipt is missing the signing certificate." };
  }

  try {
    const chain = verifyAppleCertChain(header.x5c);
    if ("error" in chain) return chain;
    const signature = base64UrlToBuffer(parts[2]);
    const signingInput = `${parts[0]}.${parts[1]}`;
    // JOSE ES256 uses raw R||S (64 bytes); Node's verify expects DER.
    const der = signature.length === 64 ? joseEs256ToDer(signature) : signature;
    const verifier = createVerify("SHA256");
    verifier.update(signingInput);
    verifier.end();
    if (!verifier.verify(chain.key, der)) {
      return { error: "App Store receipt signature is invalid." };
    }
  } catch (err) {
    console.error("[store-receipt] Apple JWS verify failed", err);
    return { error: "App Store receipt signature verification failed." };
  }

  if (payload.bundleId !== input.bundleId) {
    return { error: "App Store receipt bundle id does not match this app." };
  }
  if (payload.productId !== input.productId) {
    return { error: "App Store receipt product id does not match the purchase." };
  }
  const transactionId = payload.transactionId || payload.originalTransactionId;
  if (!transactionId) {
    return { error: "App Store receipt is missing a transaction id." };
  }
  return { transactionId: String(transactionId) };
}

/** Convert raw 64-byte ES256 signature (R||S) to DER for Node crypto. */
function joseEs256ToDer(raw: Buffer): Buffer {
  if (raw.length !== 64) return raw;
  const r = raw.subarray(0, 32);
  const s = raw.subarray(32, 64);
  const enc = (part: Buffer) => {
    let i = 0;
    while (i < part.length - 1 && part[i] === 0) i += 1;
    let value = part.subarray(i);
    if (value[0] & 0x80) value = Buffer.concat([Buffer.from([0]), value]);
    return Buffer.concat([Buffer.from([0x02, value.length]), value]);
  };
  const body = Buffer.concat([enc(r), enc(s)]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body]);
}

/** Verify a Google Play product purchase token via the Android Publisher API. */
export async function verifyGooglePlayPurchase(
  input: GoogleVerifyInput,
  fetchImpl: typeof fetch = fetch,
): Promise<ReceiptVerifyResult> {
  const demo = parseDemoReceiptToken(input.token);
  if (demo) return { transactionId: `google:${demo}:${input.productId}` };

  let email: string;
  let privateKey: string;
  try {
    const serviceAccount = JSON.parse(input.serviceAccountJson) as {
      client_email?: string;
      private_key?: string;
    };
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return { error: "Google Play service account is misconfigured." };
    }
    email = serviceAccount.client_email;
    privateKey = serviceAccount.private_key;
  } catch {
    return { error: "Google Play service account JSON is invalid." };
  }

  let accessToken: string;
  try {
    accessToken = await fetchGoogleAccessToken(email, privateKey, fetchImpl);
  } catch (err) {
    console.error("[store-receipt] Google OAuth failed", err);
    return { error: "Google Play authentication failed." };
  }

  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(input.packageName)}/purchases/products/` +
    `${encodeURIComponent(input.productId)}/tokens/${encodeURIComponent(input.token)}`;

  try {
    const res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[store-receipt] Play API error", res.status, body);
      return { error: "Google Play purchase verification failed." };
    }
    const data = (await res.json()) as {
      purchaseState?: number;
      orderId?: string;
      purchaseToken?: string;
    };
    // purchaseState 0 = purchased
    if (data.purchaseState !== undefined && data.purchaseState !== 0) {
      return { error: "Google Play purchase is not in a purchased state." };
    }
    const transactionId = data.orderId || data.purchaseToken || input.token;
    return { transactionId: String(transactionId) };
  } catch (err) {
    console.error("[store-receipt] Play API request failed", err);
    return { error: "Google Play purchase verification failed." };
  }
}

async function fetchGoogleAccessToken(
  clientEmail: string,
  privateKey: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString(
    "base64url",
  );
  const claim = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const unsigned = `${header}.${claim}`;
  const { createSign } = await import("crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`token endpoint ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("missing access_token");
  return data.access_token;
}

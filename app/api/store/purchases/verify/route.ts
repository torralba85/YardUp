import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { verifyAndGrantPurchase } from "@/lib/server/store-purchases";
import type { PurchaseChannel } from "@/lib/commerce/purchase-channel";

export const runtime = "nodejs";

const PLATFORMS = new Set<PurchaseChannel>(["app-store", "google-play", "web"]);
const MAX_PRODUCT_ID_LEN = 128;
const MAX_TOKEN_LEN = 16_384;
const MAX_CERT_KEY_LEN = 200;

/**
 * POST /api/store/purchases/verify
 *
 * Authenticated store receipt verification. Grants lead/certificate credits
 * exactly once per platform transaction id.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  const limited = checkRateLimit(request, {
    namespace: "store-purchases-verify",
    limit: 20,
    windowMs: 60_000,
    clientKey: auth.uid,
  });
  if (limited) return limited;

  let record: Record<string, unknown>;
  try {
    const parsed = (await request.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    record = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const platform =
    typeof record.platform === "string"
      ? (record.platform as PurchaseChannel)
      : undefined;
  if (!platform || !PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "Invalid purchase platform." }, { status: 400 });
  }
  const productId =
    typeof record.productId === "string" ? record.productId.trim() : "";
  const token = typeof record.token === "string" ? record.token.trim() : "";
  if (
    !productId ||
    productId.length > MAX_PRODUCT_ID_LEN ||
    !token ||
    token.length > MAX_TOKEN_LEN
  ) {
    return NextResponse.json(
      { error: "productId and token are required." },
      { status: 400 },
    );
  }

  let certKey: string | undefined;
  if (record.certKey !== undefined) {
    if (typeof record.certKey !== "string" || record.certKey.trim().length > MAX_CERT_KEY_LEN) {
      return NextResponse.json({ error: "Invalid certKey." }, { status: 400 });
    }
    certKey = record.certKey.trim() || undefined;
  }

  const result = await verifyAndGrantPurchase({
    uid: auth.uid,
    platform,
    productId,
    token,
    certKey,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    granted: true,
    replay: result.replay,
    grant: result.grant,
  });
}

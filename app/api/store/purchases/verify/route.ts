import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { verifyAndGrantPurchase } from "@/lib/server/store-purchases";
import type { PurchaseChannel } from "@/lib/commerce/purchase-channel";

export const runtime = "nodejs";

const PLATFORMS = new Set<PurchaseChannel>(["app-store", "google-play", "web"]);

/**
 * POST /api/store/purchases/verify
 *
 * Authenticated store receipt verification. Grants lead/certificate credits
 * exactly once per platform transaction id.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: {
    platform?: string;
    productId?: string;
    token?: string;
    certKey?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const platform = body.platform as PurchaseChannel | undefined;
  if (!platform || !PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "Invalid purchase platform." }, { status: 400 });
  }
  if (!body.productId || !body.token) {
    return NextResponse.json(
      { error: "productId and token are required." },
      { status: 400 },
    );
  }

  const result = await verifyAndGrantPurchase({
    uid: auth.uid,
    platform,
    productId: body.productId,
    token: body.token,
    certKey: body.certKey,
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

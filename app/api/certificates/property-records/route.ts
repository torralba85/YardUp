import { NextResponse, type NextRequest } from "next/server";
import { certificateKey } from "@/lib/certificate-key";
import { requireApiAuth } from "@/lib/server/api-auth";
import { certificateGrantRef } from "@/lib/server/certificate-purchases";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { propertyRecords } from "@/lib/server/realie";

export const runtime = "nodejs";

function reply(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, { allowAnonymous: true });
  if (auth instanceof NextResponse) return auth;
  if (auth.uid === "local-dev")
    return reply({ error: "Verified purchase required" }, 403);
  const limited = checkRateLimit(request, {
    namespace: "paid-property-records",
    clientKey: auth.uid,
    limit: 15,
    windowMs: 60000,
  });
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const { address, city, mode } = body ?? {};
  if (
    ![address, city].every(
      (v) => typeof v === "string" && v.trim() && v.length <= 200,
    ) ||
    !["history", "comparables"].includes(mode)
  )
    return reply({ error: "Invalid property request" }, 400);
  const key = certificateKey({ address, city });
  try {
    const grant = (await certificateGrantRef(auth.uid, key).get()).data();
    const session = grant?.stripeSessionId;
    const paid =
      typeof session === "string" &&
      ((session.startsWith("cs_") && grant?.amount > 0) ||
        /^store:(app-store|google-play):.+$/.test(session));
    if (
      !grant ||
      grant.uid !== auth.uid ||
      grant.certKey !== key ||
      grant.status !== "granted" ||
      grant.demo ||
      grant.source === "agent_pass" ||
      !paid
    )
      return reply({ error: "Paid certificate required" }, 403);
    const lotAddress = grant.address || address;
    const lotCity = grant.city || city;
    // Older mobile grants store only the address/city slug. Derive locality from
    // that identity instead of accepting independent search coordinates or state.
    const state =
      grant.state ||
      /\b([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/i
        .exec(lotCity)?.[1]
        ?.toUpperCase();
    if (
      !state ||
      certificateKey({ address: lotAddress, city: lotCity }) !== key
    )
      return reply({ sections: [] });
    return reply({
      sections: await propertyRecords(
        lotAddress,
        lotCity,
        state,
        mode === "comparables",
      ),
    });
  } catch {
    return reply(
      { error: "Property records are temporarily unavailable" },
      503,
    );
  }
}

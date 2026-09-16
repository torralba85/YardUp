import type { NextRequest } from "next/server";

/**
 * Whether a request arrived without a signed-in caller's bearer token.
 *
 * This is a *cost* signal, not an authorization one. Routes use it to keep
 * anonymous visitors on the keyless provider chain (free county/statewide GIS,
 * Nominatim) so a public address lookup can never spend metered Regrid or
 * Google quota. Claiming to be a guest only ever buys a caller a cheaper,
 * more limited answer, so there is nothing to gain by forging it — which is
 * why absence of the header is enough and no token verification happens here.
 */
export function isGuestRequest(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  return !header || !/^Bearer\s+\S/i.test(header);
}

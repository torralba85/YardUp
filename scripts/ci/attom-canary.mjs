/** Check the deployed API's ATTOM binding without reading or returning its key. */
export async function verifyAttomOnProduction(idToken, appCheckToken, fetchImpl = fetch) {
  if (typeof idToken !== "string" || !idToken) {
    throw new Error("ATTOM canary requires a signed-in disposable account.");
  }
  // ATTOM's documented sample property. Coordinates independently resolved
  // with the keyless Census geocoder; no customer address is used.
  const url = new URL("https://lotfoundry.net/api/parcel");
  url.searchParams.set("lat", "39.77892690284");
  url.searchParams.set("lng", "-105.047513021034");
  url.searchParams.set("address", "4529 Winona Court, Denver, CO 80212");
  const headers = { Authorization: `Bearer ${idToken}` };
  if (appCheckToken) headers["X-Firebase-AppCheck"] = appCheckToken;

  let response;
  try {
    response = await fetchImpl(url.toString(), {
      headers,
      signal: AbortSignal.timeout(50_000),
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    throw new Error("ATTOM production API request failed or timed out.");
  }
  if (!response.ok) throw new Error(`ATTOM production API returned HTTP ${response.status}.`);

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("ATTOM production API returned invalid JSON.");
  }
  const attempts = data?.dataQuality?.providerAttempts;
  const attempt = Array.isArray(attempts) ? attempts.find((entry) => entry?.provider === "ATTOM") : undefined;
  const evidence = data?.dataQuality?.addressVerification;
  if (attempt?.outcome !== "matched" || evidence?.source?.provider !== "ATTOM" ||
    evidence.status !== "observed" || typeof evidence.source.recordId !== "string" || !evidence.source.recordId) {
    const safeOutcomes = ["no-match", "unsupported", "timeout", "auth-failed", "provider-error", "invalid-response"];
    const reason = safeOutcomes.includes(attempt?.outcome) ? attempt.outcome : "missing address evidence";
    throw new Error(`ATTOM live address check failed: ${reason}.`);
  }
  return { provider: "ATTOM", outcome: "matched" };
}

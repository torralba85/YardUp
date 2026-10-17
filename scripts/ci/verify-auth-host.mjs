import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

/** A reachable app shell or redirect is not a working Firebase OAuth helper. */
export async function verifyAuthHost(host, fetchImpl = fetch) {
  if (!host || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/i.test(host)) {
    throw new Error("Firebase authDomain must be a hostname, without a scheme, path or credentials.");
  }
  for (const name of ["handler", "iframe"]) {
    const url = new URL(`/__/auth/${name}`, `https://${host}`);
    let response;
    let body;
    try {
      response = await fetchImpl(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
      body = await response.text();
    } catch {
      throw new Error(`Could not reach ${url}. Verify DNS, Firebase Hosting and TLS before deploying.`);
    }
    if (response.status !== 200) {
      throw new Error(`${url} returned HTTP ${response.status}; expected 200 without a redirect.`);
    }
    const script = new RegExp(`<script\\b[^>]*\\bsrc=["'](?:/__/auth/)?${name}\\.js["']`, "i");
    if (!response.headers.get("content-type")?.includes("text/html") || !script.test(body)) {
      throw new Error(`${url} did not serve the Firebase auth helper.`);
    }
  }
  return host;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    // Check the exact host that Next will bake into the deployed client. A CLI
    // argument is available for read-only diagnosis before a production build.
    const host = process.argv[2] ?? parseEnv(readFileSync(".env.production.local", "utf8")).NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    await verifyAuthHost(host);
    console.log(`Firebase auth helpers ready: ${host}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

import type { Page } from "@playwright/test";

/** Browser-only Firebase responses. No account is created and no real token is used. */
export async function mockTestOwnerAuth(page: Page) {
  const uid = "studio-e2e-owner";
  const email = "studio-owner@example.test";
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const idToken = `${encode({ alg: "none" })}.${encode({
    sub: uid, user_id: uid, email, iat: now, exp: now + 3600, auth_time: now,
    firebase: { sign_in_provider: "password" },
  })}.test-only`;

  await page.route(/https:\/\/[^/]*googleapis\.com\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "identitytoolkit.googleapis.com" && url.pathname.endsWith("accounts:signInWithPassword")) {
      await route.fulfill({ json: { localId: uid, email, displayName: "Test owner", idToken, refreshToken: "test-only", expiresIn: "3600", registered: true } });
    } else if (url.hostname === "identitytoolkit.googleapis.com" && url.pathname.endsWith("accounts:lookup")) {
      await route.fulfill({ json: { users: [{ localId: uid, email, displayName: "Test owner", emailVerified: true, providerUserInfo: [{ providerId: "password", email, rawId: email }] }] } });
    } else {
      // Firestore falls back to the in-memory owner profile. Block Maps, App
      // Check and every other Google API too: synthetic tokens never leave CI.
      await route.abort();
    }
  });
  await page.route("**/api/**", (route) => route.fulfill({ status: 503, json: { error: "Unavailable in browser fixture" } }));
}

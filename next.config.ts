import type { NextConfig } from "next";

// Match the first public hostname, allowing a forwarded port and proxy chain.
const firebaseHost = "[^,:\\s]+\\.(?:web\\.app|firebaseapp\\.com)(?::[0-9]+)?(?:,.*)?";
const noindexHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["motion"],
  // Firebase Hosting serves static assets; API routes go to Cloud Functions
  basePath: "",
  assetPrefix: "",
  // Pin the workspace root: functions/ has its own package-lock.json, which
  // makes Next's automatic root inference ambiguous (multiple-lockfile warning).
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      // Mirror proxy.ts host priority. Never let an internal Host override a
      // canonical public hostname. Firebase's reserved handlers are untouched.
      {
        source: "/((?!__(?:/|$)).*)",
        has: [{ type: "header", key: "x-fh-requested-host", value: firebaseHost }],
        headers: noindexHeaders,
      },
      {
        source: "/((?!__(?:/|$)).*)",
        has: [{ type: "header", key: "x-forwarded-host", value: firebaseHost }],
        missing: [{ type: "header", key: "x-fh-requested-host" }],
        headers: noindexHeaders,
      },
      {
        source: "/((?!__(?:/|$)).*)",
        has: [{ type: "host", value: firebaseHost }],
        missing: [
          { type: "header", key: "x-fh-requested-host" },
          { type: "header", key: "x-forwarded-host" },
        ],
        headers: noindexHeaders,
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nothing embeds LotFoundry app pages. Firebase Hosting serves the
          // reserved `/__/auth/*` helper before the Next app, so this header
          // does not apply to Firebase's OAuth helper iframe.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // payment=(self) is required, not optional: Google Play Billing in
          // the Android TWA goes through PaymentRequest in
          // lib/commerce/purchase-client.ts. Denying it breaks every in-app
          // purchase on Android. The app uses no camera, mic, or geolocation.
          //
          // (self) is correct even though Play's payment method identifier is
          // the cross-origin "https://play.google.com/billing". The `payment`
          // allowlist gates which DOCUMENT ORIGINS may call the Payment Request
          // API — a blocked policy makes the PaymentRequest() constructor throw
          // SecurityError — it does not filter supportedMethods. LotFoundry
          // calls it from its own top-level document, so (self) covers it.
          // Do not "fix" this to payment=() or widen it to include
          // play.google.com; the former kills Android revenue and the latter
          // grants nothing, since the allowlist is about embedding contexts.
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), usb=(), payment=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

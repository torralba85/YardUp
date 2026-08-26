import type { NextConfig } from "next";

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
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nothing embeds LotFoundry, and the Firebase Auth helper iframe is
          // served from authDomain (yardup-2026.firebaseapp.com), a different
          // origin, so denying frames here does not affect sign-in.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // payment=(self) is required, not optional: Google Play Billing in
          // the Android TWA goes through PaymentRequest in
          // lib/commerce/purchase-client.ts. Denying it breaks every in-app
          // purchase on Android. The app uses no camera, mic, or geolocation.
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

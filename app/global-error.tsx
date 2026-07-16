"use client";

import { useEffect } from "react";

/**
 * Root error boundary. Replaces the entire document when the root layout
 * itself fails, so it must render its own <html>/<body> and cannot rely on
 * the app's fonts or global CSS — plain system-safe styles only.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F2E5D5",
          color: "#261307",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <main id="main-content" style={{ maxWidth: 560, padding: "48px 24px" }}>
          <h1 style={{ fontSize: 32, lineHeight: 1.1, margin: 0 }}>
            LotFoundry hit an unexpected error.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#6B5B4D" }}>
            Your saved concepts are safe. Try again, or email{" "}
            <a href="mailto:support@lotfoundry.com" style={{ color: "#8C5B3F" }}>
              support@lotfoundry.com
            </a>{" "}
            if it keeps happening.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              height: 44,
              padding: "0 24px",
              borderRadius: 9999,
              border: "none",
              background: "#8C5B3F",
              color: "#F2E5D5",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

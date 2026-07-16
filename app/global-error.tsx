"use client";

import { useEffect } from "react";

/** Root error boundary when the root layout itself fails. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F2E5D5",
          color: "#261307",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#6B5B4D", maxWidth: "28rem" }}>
          LotFoundry could not load this page. Retry or open Help.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              borderRadius: 9999,
              border: "none",
              background: "#2F4A38",
              color: "#F2E5D5",
              padding: "0 1.25rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
          <a
            href="/help"
            style={{
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 9999,
              border: "1px solid #E0CDB4",
              background: "#FBF6EE",
              color: "#261307",
              padding: "0 1.25rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Get help
          </a>
        </div>
      </body>
    </html>
  );
}

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
      <head>
        <style>{`a:focus-visible,button:focus-visible{outline:2px solid #161616;outline-offset:5px}button:hover{background:#EE4B17!important}a:hover{background:#EBEBE6!important}`}</style>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F5F5F0",
          color: "#161616",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", letterSpacing: "-0.035em", lineHeight: 1.15, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#65655F", maxWidth: "28rem" }}>
          LotFoundry could not load this page. Retry or open Help.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem", marginTop: "1.5rem" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              borderRadius: 3,
              border: "none",
              background: "#FF5B24",
              color: "#161616",
              padding: "0 1.25rem",
              fontWeight: 600,
              fontFamily: "inherit",
              fontSize: "0.875rem",
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
              borderRadius: 3,
              border: "1px solid #65655F",
              background: "#F5F5F0",
              color: "#161616",
              padding: "0 1.25rem",
              fontWeight: 600,
              fontSize: "0.875rem",
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

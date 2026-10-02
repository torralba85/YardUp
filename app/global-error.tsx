"use client";

import { useEffect } from "react";
import { COLOR } from "@/lib/design-tokens";


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
        <style>{`a:focus-visible,button:focus-visible{outline:2px solid ${COLOR["lot-orange-ink"]};outline-offset:5px}button:hover{background:${COLOR["lot-orange-hover"]}!important}a:hover{background:${COLOR["lot-surface"]}!important}`}</style>
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
          background: COLOR["lot-chalk"],
          color: COLOR["lot-ink"],
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", letterSpacing: "-0.035em", lineHeight: 1.15, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: COLOR["lot-stone"], maxWidth: "28rem" }}>
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
              background: COLOR["lot-orange"],
              color: COLOR["lot-ink"],
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
              border: `1px solid ${COLOR["lot-stone"]}`,
              background: COLOR["lot-chalk"],
              color: COLOR["lot-ink"],
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

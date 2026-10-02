"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";

/** Downloads the authenticated account export as a JSON file. */
export function DataExportButton() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!user) {
      setError("Sign in to export your data.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/account/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lotfoundry-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={() => void handleExport()}
        loading={pending}
      >
        Export my data
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-status-blocked">
          {error}
        </p>
      ) : null}
    </div>
  );
}

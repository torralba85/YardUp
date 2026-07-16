"use client";

import { useState } from "react";
import { Download, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { downloadBlob } from "@/lib/report";
import { Button } from "@/components/ui/Button";

/**
 * "Export my data" control: fetches the authenticated account export from
 * `/api/account/export` and downloads it as portable JSON.
 */
export function DataExportButton() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/account/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Export failed. Please try again.");
      }
      const body = await res.text();
      downloadBlob("lotfoundry-account-export.json", body, "application/json");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => void handleExport()}
        loading={pending}
        leftIcon={<Download size={14} />}
      >
        Export my data
      </Button>
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-lf-brick">
          <TriangleAlert size={12} aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import type { RecordSection } from "@/lib/server/realie";

type Result = RecordSection[] | "denied" | "error";
type Mode = "history" | "comparables";

export default function PropertyRecords({
  user,
  address,
  city,
}: {
  user: User;
  address: string;
  city: string;
}) {
  const [history, setHistory] = useState<Result | null>(null);
  const [comps, setComps] = useState<Result | null>(null);
  const [requested, setRequested] = useState(false);
  const load = useCallback(
    async (mode: Mode, signal: AbortSignal): Promise<Result> => {
      try {
        const token = await user.getIdToken();
        if (signal.aborted) return "error";
        const res = await fetch("/api/certificates/property-records", {
          method: "POST",
          signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address, city, mode }),
        });
        if (res.status === 401 || res.status === 403) return "denied";
        if (!res.ok) return "error";
        return (await res.json()).sections;
      } catch {
        return "error";
      }
    },
    [address, city, user],
  );
  useEffect(() => {
    const controller = new AbortController();
    const mode = requested ? "comparables" : "history";
    void load(mode, controller.signal).then((result) => {
      if (!controller.signal.aborted)
        (requested ? setComps : setHistory)(result);
    });
    return () => controller.abort();
  }, [load, requested]);

  if (history === null || history === "denied" || comps === "denied")
    return null;
  return (
    <section
      className="space-y-3 border border-lot-line bg-lot-chalk p-4"
      aria-label="Property records"
    >
      <h3 className="font-semibold text-lot-ink">Property records</h3>
      <p className="text-sm text-lot-stone">
        County assessor and recorder data via Realie. Coverage varies by county.
      </p>
      {history === "error" && (
        <p>Property history is temporarily unavailable.</p>
      )}
      {Array.isArray(history) && !history.length && (
        <p>No confirmed property history was returned for this address.</p>
      )}
      {[
        ...(Array.isArray(history) ? history : []),
        ...(Array.isArray(comps) ? comps : []),
      ].map((group) => (
        <div key={group.title}>
          <h4 className="text-sm font-semibold">{group.title}</h4>
          <ul className="space-y-1 text-sm">
            {group.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ))}
      {!requested && (
        <Button onClick={() => setRequested(true)}>
          See nearby comparable sales
        </Button>
      )}
      {requested && (
        <p role="status" className="text-sm">
          {comps === null
            ? "Looking up comparable sales…"
            : comps === "error"
              ? "Comparable sales are temporarily unavailable."
              : !comps.length
                ? "No verified nearby sales were returned."
                : ""}
        </p>
      )}
    </section>
  );
}

"use client";

import { useId, useState } from "react";
import { FieldLabel, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { SavedScenario } from "@/lib/saved-scenarios";

export default function EmailLayoutCapture({ scenario }: { scenario: Omit<SavedScenario, "id" | "createdAt" | "name"> }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return <form className="border border-lot-line bg-lot-surface p-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      const website = new FormData(event.currentTarget).get("website");
      const response = await fetch("/api/scenario-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent, scenario, website }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not send your layout.");
      setMessage(data.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send your layout."); }
    finally { setBusy(false); }
  }}>
    <h3 className="text-sm font-semibold text-lot-ink">Keep your 3D lot layout</h3>
    <p className="lf-body-sm mt-1 text-lot-stone">Not ready to decide? Receive a link to this lot, design, and placement. No account or purchase required.</p>
    <div className="mt-3"><FieldLabel htmlFor={`${id}-email`}>Email address</FieldLabel><Input id={`${id}-email`} type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
    <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="mt-3 flex min-h-11 items-start gap-3 text-xs leading-5 text-lot-stone"><input className="mt-1 h-5 w-5 shrink-0 accent-lot-orange" type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Email this layout to me. Anyone with the link can view its property address and design for 30 days. This is one email, with no marketing subscription. <a href="/privacy" className="underline">Privacy policy</a></span></label>
    <Button className="mt-3 w-full" type="submit" disabled={busy || !consent}>{busy ? "Sending layout" : "Email me my 3D lot layout"}</Button>
    {message && <p role="status" className="mt-3 text-xs leading-5 text-lot-ink">{message}</p>}
    {error && <p role="alert" className="mt-3 text-xs leading-5 text-status-blocked">{error}</p>}
  </form>;
}

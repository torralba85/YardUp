"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Copy, Mail, TriangleAlert } from "lucide-react";
import { Input, FieldLabel } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { serializeScenarioParams } from "@/lib/scenario-url";
import { buildScenarioShareUrl, isAllowedScenarioUrl } from "@/lib/scenario-share-url";
import { readCapturedEmail, rememberCapturedEmail } from "@/lib/certificate-purchase-intent";
import { trackEvent } from "@/lib/analytics/gtag";

interface Receipt { scenarioUrl: string; delivery: "sent" | "queued" }

export default function EmailScenarioLinkCard({ scenario, initialEmail = "" }: { scenario: SavedScenario; initialEmail?: string }) {
  const id = useId();
  const [email, setEmail] = useState(initialEmail);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [copyFallback, setCopyFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  let scenarioParams = "";
  try {
    scenarioParams = serializeScenarioParams(scenario);
  } catch {
    scenarioParams = `${scenario.config.width}x${scenario.config.length}x${scenario.config.height}`;
  }
  const storageKey = `lf:studio-link:${scenario.liveParcel?.address}|${scenario.liveParcel?.city}|${scenarioParams}`;

  useEffect(() => {
    // This component is keyed to the active address and design. Restore only this tab's submitted state.
    /* eslint-disable react-hooks/set-state-in-effect */
    setEmail(initialEmail || readCapturedEmail());
    let savedReceipt: Receipt | null = null;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      const saved: unknown = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved === "object" && "scenarioUrl" in saved && "delivery" in saved && isAllowedScenarioUrl(saved.scenarioUrl) && (saved.delivery === "queued" || saved.delivery === "sent")) {
        savedReceipt = { scenarioUrl: saved.scenarioUrl, delivery: saved.delivery };
      }
    } catch { /* The form still works when session storage is unavailable. */ }
    setReceipt(savedReceipt);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialEmail, storageKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true); setError("");
    try {
      // A single-use App Check token shows the server this send came from a real browser.
      const appCheckToken = await import("@/lib/app-check-token").then((module) => module.limitedUseAppCheckToken()).catch(() => null);
      const response = await fetch("/api/studio/email-scenario-link", { method: "POST", headers: { "Content-Type": "application/json", ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}) }, body: JSON.stringify({
        email, marketingOptIn, website, address: scenario.liveParcel?.address, parcelId: scenario.parcelId,
        scenarioUrl: buildScenarioShareUrl(scenario), scenario,
      }) });
      const data = await response.json();
      if (!response.ok || data.ok !== true || !isAllowedScenarioUrl(data.scenarioUrl) || !["sent", "queued"].includes(data.delivery)) throw new Error(data.error || "We could not save your link. Please try again.");
      const next: Receipt = { scenarioUrl: data.scenarioUrl, delivery: data.delivery };
      setReceipt(next);
      rememberCapturedEmail(email);
      try { window.sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Optional UI continuity. */ }
      // The shared wrapper handles opt-in, tag initialization, revocation and automated-traffic suppression.
      trackEvent("studio_lead_email_captured", { delivery: next.delivery, marketing_opt_in: marketingOptIn });
    } catch (err) { setError(err instanceof Error ? err.message : "We could not save your link. Please try again."); }
    finally { sending.current = false; setBusy(false); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(receipt!.scenarioUrl); setCopied(true); }
    catch { setCopyFallback(true); }
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0 rounded-none border border-lot-line-dark bg-lot-ink p-5 text-lot-chalk">
      <div className="flex items-start gap-3">
        <Mail size={19} className="mt-0.5 shrink-0 text-status-review-on-dark" aria-hidden="true" />
        <div className="min-w-0">
          <h3 id={`${id}-heading`} className="font-display text-lg font-medium leading-snug">Save this 3D lot layout for later — Free</h3>
          <p className="mt-2 text-sm leading-5 text-lot-stone-on-dark">Get a permanent link to your 3D setback model and headline estimate emailed to you.</p>
        </div>
      </div>
      {receipt ? (
        <div className="mt-4 space-y-3">
          <p role="status" className="flex items-start gap-2 text-sm text-status-eligible-on-dark">
            <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
            {receipt.delivery === "sent" ? "Sent! Check your inbox for your 3D lot link (plus a quick-copy link button below)." : "Saved! We couldn't email it right now, so copy your 3D lot link below to keep it."}
          </p>
          <Button type="button" variant="secondary" className="border-lot-stone-on-dark bg-lot-ink text-lot-chalk hover:bg-lot-surface-dark focus-visible:ring-lot-chalk focus-visible:ring-offset-lot-ink" onClick={() => void copyLink()} leftIcon={<Copy size={15} />}>{copied ? "Copied!" : "Copy Link"}</Button>
          {copyFallback && <div><label htmlFor={`${id}-copy`} className="block text-xs text-lot-stone-on-dark">Select and copy your link</label><Input id={`${id}-copy`} className="bg-lot-surface-dark text-lot-chalk focus-visible:ring-lot-chalk" readOnly value={receipt.scenarioUrl} onFocus={(event) => event.target.select()} /></div>}
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 min-[480px]:flex-row">
            <div className="min-w-0 flex-1"><FieldLabel htmlFor={`${id}-email`} className="sr-only">Email address for your 3D lot link</FieldLabel><Input id={`${id}-email`} className="bg-lot-surface-dark text-lot-chalk placeholder:text-lot-stone-on-dark focus-visible:ring-lot-chalk" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></div>
            <Button type="submit" className="focus-visible:ring-lot-chalk focus-visible:ring-offset-lot-ink" loading={busy} disabled={busy}>Email My 3D Link</Button>
          </div>
          <div className="hidden" aria-hidden="true"><label htmlFor={`${id}-website`}>Website</label><input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-xs leading-5 text-lot-stone-on-dark"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-lot-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-chalk" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} disabled={busy} />Also send me San Diego / California ADU permit &amp; fee waiver updates.</label>
          <p className="text-xs leading-5 text-lot-stone-on-dark">We’ll save your email and design to send this link. Anyone with the link can view the layout and property address. Updates are optional. <a href="/privacy" className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-lot-chalk">Privacy</a></p>
          {error && <p role="alert" className="flex items-start gap-2 text-sm text-status-blocked-on-dark"><TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{error}</p>}
        </form>
      )}
    </section>
  );
}

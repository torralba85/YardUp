"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth-context";
import { computeBuilderMetrics } from "@/lib/builder-metrics";
import { startLeadUnlock } from "@/lib/lead-unlock-api";
import { formatUnlockPrice } from "@/lib/lead-unlock-pricing";
import { fetchUnlockedContact } from "@/lib/marketplace-firestore";
import type {
  BuilderInboxItem,
  BuilderProfile,
  UnlockedLeadContact,
} from "@/lib/marketplace-types";
import BuilderMoneyBand from "./BuilderMoneyBand";
import LeadCard, { type LeadAccess } from "./LeadCard";
import UnlockSlip from "./UnlockSlip";
import { 
  ArrowLeft, 
  CheckCircle2, 
  CircleSlash, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Lock, 
  Mail, 
  Phone, 
  Unlock,
} from "lucide-react";
import { buildReportHtml, buildReportCsv, downloadBlob } from "@/lib/report";
import { finishLabels, roofLabels, formatCompactCurrency, formatCurrency } from "@/lib/feasibility";

const TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "interested", label: "Interested" },
  { key: "archived", label: "Archived" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** TRIAGE filter only (8A): the lock/access axis is never a tab. */
function inTab(item: BuilderInboxItem, key: TabKey): boolean {
  if (key === "all") return true;
  if (key === "new") return item.response.status === "new";
  if (key === "interested") return item.response.status === "interested";
  return item.response.status === "not-a-fit"; // archived
}

/**
 * The builder's lead inbox: a money band of headline metrics, triage tabs
 * (all / new / interested / archived), and a list of {@link LeadCard}s. Drives
 * the unlock flow ({@link UnlockSlip} → Stripe/demo grant) and reveals contact
 * via {@link fetchUnlockedContact} once a lead is unlocked.
 */
export default function BuilderInbox({
  profile,
  items,
  onRespond,
}: {
  profile: BuilderProfile;
  items: BuilderInboxItem[];
  onRespond: (requestId: string, status: "interested" | "not-a-fit") => Promise<void>;
}) {
  const { user } = useAuth();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabKey>("all");

  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [credits, setCredits] = useState(profile.credits ?? 0);
  const [access, setAccess] = useState<Record<string, LeadAccess>>({});
  const [contacts, setContacts] = useState<Record<string, UnlockedLeadContact>>({});
  const [demoGrants, setDemoGrants] = useState<Record<string, boolean>>({});
  const [slipId, setSlipId] = useState<string | null>(null);
  const [slipPending, setSlipPending] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  // Base access is derived inline at render (item.unlocked → unlocked); the
  // `access` map only holds transient overrides from the in-session unlock
  // flow. This effect just hydrates contacts for already-unlocked leads (the
  // gated read succeeds because the grant exists).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const item of items.filter((i) => i.unlocked)) {
        try {
          const contact = await fetchUnlockedContact(item.request.id);
          if (!cancelled && contact) {
            setContacts((current) => ({ ...current, [item.request.id]: contact }));
          }
        } catch {
          // Transient gated-read failure — card stays unlocked without detail.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const metrics = computeBuilderMetrics(items);
  const filtered = items.filter((item) => inTab(item, tab));
  const tabCounts: Record<TabKey, number> = {
    all: items.length,
    new: metrics.newLeadCount,
    interested: metrics.interestedCount,
    archived: metrics.archivedCount,
  };
  const slipItem = items.find((item) => item.request.id === slipId) ?? null;

  function respond(requestId: string, status: "interested" | "not-a-fit") {
    setPendingId(requestId);
    setError(null);
    startTransition(async () => {
      try {
        await onRespond(requestId, status);
      } catch {
        setError("Could not update this request.");
      } finally {
        setPendingId(null);
      }
    });
  }

  async function confirmUnlock() {
    if (!slipItem) return;
    const requestId = slipItem.request.id;
    const serial = slipItem.request.preview.previewSerial;
    setSlipPending(true);
    setSlipError(null);
    try {
      const idToken = await user?.getIdToken();

      if (credits > 0) {
        const res = await fetch("/api/lead/unlock-credit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ requestId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unlock failed");

        setCredits(data.newCredits);

        setSlipId(null);
        setAccess((current) => ({ ...current, [requestId]: "confirming" }));
        setAnnounce(`Lead ${serial}: credit applied, recording unlock.`);

        const contact = await fetchUnlockedContact(requestId);
        if (contact) {
          setContacts((current) => ({ ...current, [requestId]: contact }));
        }
        setDemoGrants((current) => ({ ...current, [requestId]: false }));
        setAccess((current) => ({ ...current, [requestId]: "unlocked" }));
        setAnnounce(`Lead ${serial} unlocked. Owner contact is now visible.`);
        return;
      }

      const outcome = await startLeadUnlock(requestId, idToken);

      if (outcome.kind === "redirect") {
        window.location.assign(outcome.url);
        return;
      }

      // Demo / already-granted: record, then reveal in place (never a flip).
      setSlipId(null);
      setAccess((current) => ({ ...current, [requestId]: "confirming" }));
      setAnnounce(`Lead ${serial}: payment received, recording unlock.`);

      const contact = await fetchUnlockedContact(requestId);
      if (contact) {
        setContacts((current) => ({ ...current, [requestId]: contact }));
      }
      setDemoGrants((current) => ({ ...current, [requestId]: outcome.demo }));
      setAccess((current) => ({ ...current, [requestId]: "unlocked" }));
      setAnnounce(`Lead ${serial} unlocked. Owner contact is now visible.`);
    } catch (err) {
      setSlipError(err instanceof Error ? err.message : "Unlock failed.");
    } finally {
      setSlipPending(false);
    }
  }

  return (
    <section className="mt-6">
      <div className="border border-lf-hairline bg-lf-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="lf-panel-heading">{profile.companyName}</h2>
            <p className="lf-body-sm mt-1 text-lf-muted">
              {profile.serviceAreas.map((area) => `${area.city}, ${area.state}`).join(" | ")}
            </p>
          </div>
          <span className="rounded-full border border-lf-hairline px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
            {profile.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="mt-4 border border-lf-hairline">
        <BuilderMoneyBand metrics={metrics} credits={credits} />
      </div>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      {error && (
        <div role="alert" className="mt-4 border border-lf-brick/20 bg-lf-brick/5 p-3 text-sm text-lf-brick">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <ZeroEverEmptyState />
      ) : (
        <div className="mt-4 flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-lf-hairline pb-4">
              <div role="tablist" aria-label="Filter leads by status" className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => {
                      setTab(t.key);
                      setSelectedItemId(null);
                    }}
                    className={`border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition ${
                      tab === t.key
                        ? "border-lf-espresso bg-lf-espresso text-lf-sand"
                        : "border-lf-hairline text-lf-muted hover:bg-lf-sand-2"
                    }`}
                  >
                    {t.label} · {tabCounts[t.key]}
                  </button>
                ))}
              </div>

              {/* Cards vs Table View Mode Segment Toggle */}
              <div className="flex rounded-full border border-lf-hairline p-0.5 self-start md:self-auto bg-lf-card">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`rounded-full px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-lf-espresso text-lf-sand font-semibold"
                      : "text-lf-muted hover:bg-lf-sand-2"
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-full px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition cursor-pointer ${
                    viewMode === "table"
                      ? "bg-lf-espresso text-lf-sand font-semibold"
                      : "text-lf-muted hover:bg-lf-sand-2"
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="mt-4 border border-lf-hairline bg-lf-card p-6 text-sm text-lf-muted">
                {tab === "archived"
                  ? "Nothing archived yet."
                  : `No ${tab} leads right now.`}
              </div>
            ) : viewMode === "cards" ? (
              <div className="mt-4 grid gap-4">
                {filtered.map((item) => (
                  <LeadCard
                    key={item.request.id}
                    item={item}
                    access={access[item.request.id] ?? (item.unlocked ? "unlocked" : "locked")}
                    contact={contacts[item.request.id] ?? null}
                    demo={demoGrants[item.request.id]}
                    hasCredits={credits > 0}
                    responding={isPending && pendingId === item.request.id}
                    onUnlockClick={() => {
                      setSlipId(item.request.id);
                      setSlipError(null);
                    }}
                    onRespond={(status) => respond(item.request.id, status)}
                  />
                ))}
              </div>
            ) : (
              <div className={`mt-4 ${selectedItemId ? "hidden xl:block" : "block"} overflow-x-auto border border-lf-hairline bg-lf-card`}>
                <table className="w-full text-left border-collapse" aria-label="Inbox Leads Ledger">
                  <thead>
                    <tr className="border-b border-lf-hairline bg-lf-sand-2">
                      <th scope="col" className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-lf-muted">Lead / Recorded</th>
                      <th scope="col" className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-lf-muted">Location</th>
                      <th scope="col" className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-lf-muted text-right">Rent Potential</th>
                      <th scope="col" className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-lf-muted">Specs</th>
                      <th scope="col" className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-lf-muted">Economics</th>
                      <th scope="col" className="px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-lf-muted text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const itemAccess = access[item.request.id] ?? (item.unlocked ? "unlocked" : "locked");
                      const itemContact = contacts[item.request.id] ?? null;
                      const hasAccess = itemAccess === "unlocked";
                      const dateStr = item.request.createdAt ? new Date(item.request.createdAt).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).toUpperCase() : "PENDING";
                      const isSelected = selectedItemId === item.request.id;

                      return (
                        <tr
                          key={item.request.id}
                          onClick={() => setSelectedItemId(item.request.id)}
                          className={`group border-b border-lf-hairline cursor-pointer transition hover:bg-lf-sand-2/50 ${
                            isSelected ? "bg-lf-sand-2 border-l-[3px] border-l-lf-clay" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-mono text-[10.5px] font-semibold text-lf-espresso group-hover:text-lf-clay transition">
                              {item.request.preview.previewSerial}
                            </div>
                            <div className="font-mono text-[9px] text-lf-muted mt-0.5">{dateStr}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-lf-espresso text-xs truncate max-w-[180px]">
                              {hasAccess && itemContact ? itemContact.streetAddress : item.request.preview.neighborhood}
                            </div>
                            <div className="font-mono text-[9.5px] text-lf-muted mt-0.5">{item.request.preview.zip}</div>
                          </td>
                          <td className="px-4 py-3.5 text-right lf-money-sm text-lf-forest whitespace-nowrap">
                            {formatCurrency(item.request.preview.rentBand)}
                            <span className="font-mono text-[8px] font-normal text-lf-muted ml-0.5">/mo</span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-mono text-[9.5px] text-lf-espresso font-medium">
                              {item.request.preview.aduSqft.toLocaleString()} sf ADU
                            </div>
                            <div className="font-mono text-[8.5px] text-lf-muted mt-0.5">
                              {item.request.preview.lotSqft.toLocaleString()} sf lot
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-mono text-[9.5px] text-lf-espresso">
                              Build: {formatCompactCurrency(item.request.preview.buildBandLow)}–{formatCompactCurrency(item.request.preview.buildBandHigh)}
                            </div>
                            <div className="font-mono text-[8.5px] text-lf-muted mt-0.5">
                              Payback: {item.request.preview.paybackYears} yrs
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {itemAccess === "locked" && <Lock size={12} className="text-lf-muted" />}
                              {itemAccess === "unlocked" && <Unlock size={12} className="text-lf-forest" />}
                              {itemAccess === "confirming" && (
                                <span className="h-2 w-2 rounded-full bg-lf-amber animate-pulse" />
                              )}
                              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-lf-muted ml-0.5">
                                {item.response.status === "interested" ? "Interested" : item.response.status === "not-a-fit" ? "Archived" : "New"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <aside className={`w-full shrink-0 space-y-4 ${viewMode === 'cards' ? 'xl:w-80' : 'xl:w-[450px] 2xl:w-[520px]'}`}>
            {viewMode === "table" && (
              <div className={`${selectedItemId ? "block" : "hidden xl:block"} xl:sticky xl:top-4 h-fit`}>
                {selectedItemId === null ? (
                  /* No Selection State */
                  <div className="flex flex-col items-center justify-center border border-dashed border-lf-taupe bg-lf-card/50 p-8 text-center min-h-[350px]">
                    <FileText size={36} className="text-lf-taupe" />
                    <h3 className="lf-card-heading mt-3 text-sm font-semibold text-lf-espresso">No lead selected</h3>
                    <p className="lf-body-sm mt-1.5 max-w-xs text-lf-muted">
                      Select a lead from the ledger table on the left to inspect its feasibility details and contact information.
                    </p>
                  </div>
                ) : (
                  /* Lead Inspection Pane Container (defined in Task 3) */
                  <div id="lead-inspection-pane" className="border border-lf-hairline bg-lf-card p-5">
                    {(() => {
                      const selectedItem = items.find((i) => i.request.id === selectedItemId);
                      if (!selectedItem) return null;

                      const itemAccess = access[selectedItem.request.id] ?? (selectedItem.unlocked ? "unlocked" : "locked");
                      const itemContact = contacts[selectedItem.request.id] ?? null;
                      const demo = demoGrants[selectedItem.request.id];
                      const responding = isPending && pendingId === selectedItem.request.id;

                      const recordedDate = selectedItem.request.createdAt
                        ? new Date(selectedItem.request.createdAt)
                            .toLocaleDateString("en-US", {
                              timeZone: "UTC",
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                            })
                            .toUpperCase()
                        : null;

                      // Functions for actions
                      const handleDownloadHtml = () => {
                        if (itemContact?.snapshot) {
                          const html = buildReportHtml({
                            parcel: itemContact.snapshot.parcel,
                            config: itemContact.snapshot.config,
                            result: itemContact.snapshot.result,
                          });
                          downloadBlob(`lotfoundry-certificate-${selectedItem.request.preview.previewSerial}.html`, html, "text/html");
                        }
                      };

                      const handleDownloadCsv = () => {
                        if (itemContact?.snapshot) {
                          const csv = buildReportCsv({
                            parcel: itemContact.snapshot.parcel,
                            config: itemContact.snapshot.config,
                            result: itemContact.snapshot.result,
                          });
                          downloadBlob(`lotfoundry-report-${selectedItem.request.preview.previewSerial}.csv`, csv, "text/csv");
                        }
                      };

                      return (
                        <div className="flex flex-col gap-4">
                          {/* Mobile Back Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedItemId(null)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-lf-clay transition hover:text-lf-clay-strong lg:hidden self-start"
                          >
                            <ArrowLeft size={14} />
                            Back to inbox list
                          </button>

                          <div className="flex items-center justify-between border-b border-lf-hairline pb-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
                              NO. {selectedItem.request.preview.previewSerial}
                              {recordedDate ? ` · RECORDED ${recordedDate}` : ""}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                              itemAccess === "unlocked" 
                                ? "bg-lf-forest-soft text-lf-forest" 
                                : itemAccess === "confirming" 
                                ? "bg-lf-amber-soft text-lf-amber-ink" 
                                : "bg-lf-taupe-soft text-lf-muted"
                            }`}>
                              {itemAccess === "unlocked" ? "Unlocked" : itemAccess === "confirming" ? "Confirming" : "Locked"}
                            </span>
                          </div>

                          {/* 1. Locked State Panel */}
                          {itemAccess === "locked" && (
                            <div className="space-y-4">
                              <div>
                                <p className="lf-money-md text-lf-forest">
                                  {formatCurrency(selectedItem.request.preview.rentBand)}
                                  <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-muted">
                                    /mo rent potential
                                  </span>
                                </p>
                                <p className="mt-2 font-semibold text-lf-espresso text-sm">
                                  {selectedItem.request.preview.neighborhood}
                                </p>
                                <p className="mt-1 flex flex-wrap gap-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-muted">
                                  <span>{selectedItem.request.preview.lotSqft.toLocaleString()} sqft lot</span>
                                  <span>{selectedItem.request.preview.aduSqft.toLocaleString()} sf ADU</span>
                                  <span>{finishLabels[selectedItem.request.preview.config.finish]}</span>
                                </p>
                              </div>

                              <div className="border border-dashed border-lf-taupe p-4 bg-lf-sand-2/30 text-center rounded-lg space-y-3">
                                <Lock size={24} className="mx-auto text-lf-taupe" />
                                <h4 className="text-xs font-semibold text-lf-espresso uppercase tracking-wider">Feasibility Certificate Locked</h4>
                                <p className="text-xs text-lf-muted max-w-xs mx-auto leading-relaxed">
                                  Unlock this lead to reveal the exact street address, parcel boundaries, zoning calculations, detailed finances ledger, and direct homeowner contact info.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSlipId(selectedItem.request.id);
                                    setSlipError(null);
                                  }}
                                  className="w-full justify-center inline-flex items-center gap-2 bg-lf-forest px-4 py-2.5 text-xs font-semibold text-lf-sand transition hover:brightness-95 cursor-pointer rounded-full"
                                >
                                  Unlock Lead
                                  <span className="font-display text-sm font-semibold">{formatUnlockPrice()}</span>
                                </button>
                              </div>

                              {/* Response triage inline buttons */}
                              <div className="flex items-center justify-between border-t border-lf-hairline pt-3">
                                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-lf-muted">
                                  Response: {selectedItem.response.status === "interested" ? "Interested" : selectedItem.response.status === "not-a-fit" ? "Archived" : "New"}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => respond(selectedItem.request.id, "interested")}
                                    disabled={responding}
                                    className="flex h-8 items-center gap-1 bg-lf-mahogany px-2.5 text-[10.5px] font-semibold text-lf-sand transition hover:bg-lf-espresso disabled:opacity-50 cursor-pointer rounded-full"
                                  >
                                    <CheckCircle2 size={12} />
                                    Interested
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => respond(selectedItem.request.id, "not-a-fit")}
                                    disabled={responding}
                                    className="flex h-8 items-center gap-1 border border-lf-hairline px-2.5 text-[10.5px] font-semibold text-lf-muted transition hover:bg-lf-sand-2 disabled:opacity-50 cursor-pointer rounded-full"
                                  >
                                    <CircleSlash size={12} />
                                    Not a fit
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. Confirming State Panel */}
                          {itemAccess === "confirming" && (
                            <div className="border border-lf-amber-ink/35 bg-lf-amber-soft px-3.5 py-3 rounded-lg">
                              <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-lf-amber-ink">
                                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lf-amber-ink" />
                                Recording lead unlock…
                              </div>
                              <p className="mt-1.5 text-xs text-lf-espresso">
                                Usually a few seconds. The owner contact and certificate will appear right here.
                              </p>
                            </div>
                          )}

                          {/* 3. Unlocked State Panel */}
                          {itemAccess === "unlocked" && itemContact && (
                            <div className="space-y-4 lf-stamp">
                              {/* Homeowner Info Block */}
                              <div className="border border-lf-forest bg-lf-forest-soft p-4 rounded-lg">
                                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-lf-forest font-semibold">
                                  <span>Owner Contact Unlocked{demo ? " · Demo" : ""}</span>
                                </div>
                                <address className="mt-2 font-mono text-xs not-italic leading-relaxed text-lf-espresso">
                                  <span className="block font-semibold text-sm">{itemContact.ownerContact.name}</span>
                                  <span className="block mt-1">
                                    <Mail size={11} className="inline mr-1 text-lf-muted" />
                                    {itemContact.ownerContact.email}
                                  </span>
                                  {itemContact.ownerContact.phone && (
                                    <span className="block mt-0.5">
                                      <Phone size={11} className="inline mr-1 text-lf-muted" />
                                      {itemContact.ownerContact.phone}
                                    </span>
                                  )}
                                </address>
                                {itemContact.ownerContact.message && (
                                  <div className="mt-3 border-t border-dashed border-lf-hairline pt-2">
                                    <span className="font-mono text-[9px] uppercase text-lf-muted font-medium">Homeowner Message:</span>
                                    <p className="text-xs italic text-lf-espresso mt-1 leading-relaxed bg-lf-card/60 p-2 border-l border-lf-taupe">
                                      &ldquo;{itemContact.ownerContact.message}&rdquo;
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Visual Certificate Section */}
                              <div className="space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-lf-espresso">Feasibility Certificate</div>

                                {(!itemContact.snapshot?.result || !itemContact.snapshot?.parcel || !itemContact.snapshot?.config) ? (
                                  /* Defensively Fallback to Plain Text Report if structure is not present (e.g. tests) */
                                  <div className="border border-lf-hairline bg-lf-card/60 p-3.5 rounded-lg max-h-[300px] overflow-y-auto">
                                    <pre className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-lf-espresso">
                                      {itemContact.snapshot?.reportText || "Feasibility certificate data unavailable."}
                                    </pre>
                                  </div>
                                ) : (
                                  /* Full styled inline certificate report */
                                  <div className="border-[1.5px] border-lf-espresso bg-lf-card p-1 rounded-lg">
                                    <div className="border border-lf-taupe p-4 space-y-4">
                                      {/* Monogram / Header */}
                                      <div className="text-center border-b border-lf-hairline pb-2">
                                        <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-lf-clay font-bold">LotFoundry</div>
                                        <h5 className="font-display font-semibold text-sm text-lf-espresso leading-tight mt-0.5">Certificate of Feasibility</h5>
                                        <p className="font-mono text-[7.5px] text-lf-muted mt-1 truncate">
                                          No. {selectedItem.request.preview.previewSerial} · {itemContact.streetAddress}
                                        </p>
                                      </div>

                                      {/* Annual Ledger T-Account */}
                                      <div className="space-y-1">
                                        <div className="font-mono text-[8px] uppercase tracking-[0.1%u] text-lf-clay font-bold">Ledger Balance</div>
                                        <div className="border border-lf-hairline text-[10px] divide-y divide-lf-hairline bg-lf-sand-2/20">
                                          <div className="grid grid-cols-2 p-1.5">
                                            <div>
                                              <span className="font-semibold block text-lf-espresso">Gross Rent (annual)</span>
                                              <span className="text-[9px] text-lf-muted">ADU rent potential</span>
                                            </div>
                                            <div className="text-right font-mono font-semibold text-lf-espresso">
                                              {formatCurrency(itemContact.snapshot.result.monthlyRent * 12)}
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 p-1.5">
                                            <div>
                                              <span className="font-semibold block text-lf-espresso">Allowance</span>
                                              <span className="text-[9px] text-lf-muted">Maint, vacancy, taxes</span>
                                            </div>
                                            <div className="text-right font-mono text-lf-muted">
                                              -{formatCurrency((itemContact.snapshot.result.monthlyRent * 12) - itemContact.snapshot.result.annualNoi)}
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 p-1.5 bg-lf-forest-soft text-lf-forest font-semibold">
                                            <div>Net Income (NOI)</div>
                                            <div className="text-right font-mono">
                                              {formatCurrency(itemContact.snapshot.result.annualNoi)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Technical details table */}
                                      <div className="text-[10px] space-y-1 border-t border-dashed border-lf-hairline pt-3">
                                        <div className="flex justify-between py-1">
                                          <span className="font-mono text-lf-muted text-[8px] uppercase">ADU Size</span>
                                          <span className="font-semibold text-lf-espresso">{itemContact.snapshot.result.aduSqft} sf</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="font-mono text-lf-muted text-[8px] uppercase">Roof Style</span>
                                          <span className="font-semibold text-lf-espresso">{roofLabels[itemContact.snapshot.config.roof]}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="font-mono text-lf-muted text-[8px] uppercase">Zoning Status</span>
                                          <span className={`font-semibold border px-1 text-[8.5px] ${
                                            itemContact.snapshot.result.zoningStatus === "Compliant" 
                                              ? "border-lf-forest text-lf-forest" 
                                              : "border-lf-amber text-lf-amber-ink"
                                          }`}>
                                            {itemContact.snapshot.result.zoningStatus}
                                          </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="font-mono text-lf-muted text-[8px] uppercase">Build cost range</span>
                                          <span className="font-semibold text-lf-espresso">
                                            {formatCurrency(itemContact.snapshot.result.costLow)} - {formatCurrency(itemContact.snapshot.result.costHigh)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="font-mono text-lf-muted text-[8px] uppercase">Payback Estimate</span>
                                          <span className="font-semibold text-lf-espresso">{itemContact.snapshot.result.paybackYears} yrs</span>
                                        </div>
                                      </div>

                                      <div className="text-[8px] font-mono text-center border-2 border-lf-brick/30 text-lf-brick py-1 font-bold uppercase tracking-wider rotate-[-2deg]">
                                        Concept &middot; Not a Permit
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Report Actions */}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleDownloadHtml}
                                  disabled={!itemContact.snapshot?.result}
                                  className="flex-1 flex h-8 items-center justify-center gap-1 rounded-md bg-lf-mahogany text-[10px] font-semibold text-lf-sand-2 transition hover:bg-lf-espresso cursor-pointer disabled:opacity-50"
                                >
                                  <Download size={11} />
                                  Download HTML
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDownloadCsv}
                                  disabled={!itemContact.snapshot?.result}
                                  className="flex-1 flex h-8 items-center justify-center gap-1 rounded-md border border-lf-hairline text-[10px] font-semibold text-lf-muted transition hover:bg-lf-sand-2 cursor-pointer disabled:opacity-50"
                                >
                                  <FileSpreadsheet size={11} />
                                  CSV Export
                                </button>
                              </div>

                              {/* Response triage inline buttons */}
                              <div className="flex items-center justify-between border-t border-lf-hairline pt-3">
                                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-lf-muted">
                                  Response: {selectedItem.response.status === "interested" ? "Interested" : selectedItem.response.status === "not-a-fit" ? "Archived" : "New"}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => respond(selectedItem.request.id, "interested")}
                                    disabled={responding}
                                    className="flex h-8 items-center gap-1 bg-lf-mahogany px-2.5 text-[10.5px] font-semibold text-lf-sand transition hover:bg-lf-espresso disabled:opacity-50 cursor-pointer rounded-full"
                                  >
                                    <CheckCircle2 size={12} />
                                    Interested
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => respond(selectedItem.request.id, "not-a-fit")}
                                    disabled={responding}
                                    className="flex h-8 items-center gap-1 border border-lf-hairline px-2.5 text-[10.5px] font-semibold text-lf-muted transition hover:bg-lf-sand-2 disabled:opacity-50 cursor-pointer rounded-full"
                                  >
                                    <CircleSlash size={12} />
                                    Not a fit
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            
            <CreditShop />
          </aside>
        </div>
      )}

      {slipItem && (
        <UnlockSlip
          item={slipItem}
          companyName={profile.companyName}
          hasCredits={credits > 0}
          pending={slipPending}
          error={slipError}
          onConfirm={confirmUnlock}
          onClose={() => {
            if (!slipPending) {
              setSlipId(null);
              setSlipError(null);
            }
          }}
        />
      )}
    </section>
  );
}

/**
 * 7A zero-ever state: the cause (no matched leads), the lever (complete the
 * profile / add areas to get matched first), and an EXAMPLE card so a builder
 * with no leads still sees the shape of one. The example deliberately carries
 * no unlock CTA — there is nothing real to unlock.
 */
function ZeroEverEmptyState() {
  return (
    <div className="mt-5">
      <div className="border border-lf-hairline bg-lf-card p-6">
        <h3 className="lf-card-heading text-lf-espresso">No matched leads yet</h3>
        <p className="lf-body-sm mt-1.5 max-w-prose text-lf-muted">
          A lead lands here when a homeowner in one of your service areas submits a feasibility
          report. Complete your profile and add every area you build in — complete profiles get
          matched first.
        </p>
      </div>

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-lf-muted">
        Example · this is what a lead looks like
      </p>
      <article
        aria-label="Example lead"
        className="mt-2 border border-dashed border-lf-taupe bg-lf-card/70 p-5"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
            NO. LF-EXAMPLE
          </span>
          <span className="rounded-full bg-lf-taupe-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
            Example
          </span>
        </div>
        <p className="mt-2 font-semibold text-lf-espresso">
          Ballard, WA
          <span className="ml-1.5 font-mono text-[10.5px] font-normal text-lf-muted">98107</span>
        </p>
        <p className="mt-1 flex flex-wrap gap-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-lf-muted">
          <span>6,200 sqft</span>
          <span>800 sf ADU</span>
          <span>Compliant</span>
        </p>
        <p className="mt-2 lf-money-md text-lf-forest">
          $2,500
          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-muted">
            /mo rent potential
          </span>
        </p>
        <p className="mt-3 border-t border-dashed border-lf-hairline pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-lf-muted">
          Owner contact unlocks for {formatUnlockPrice()} — once you have real leads
        </p>
      </article>
    </div>
  );
}

function CreditShop() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buyPack(pack: number) {
    if (!user) return;
    setLoading(pack);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pack }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate checkout");
      }
      if (data.url) {
        window.location.assign(data.url);
      } else if (data.demo) {
        // Reload to show the new credits and ledger
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border border-lf-hairline bg-lf-card p-5">
      <h3 className="lf-card-heading text-lf-espresso">Credit Shop</h3>
      <p className="mt-1 text-sm text-lf-muted">
        Unlock leads instantly with credits. Save up to 25% by buying in bulk.
      </p>
      {error && (
        <div className="mt-3 bg-lf-brick/10 p-2 text-xs text-lf-brick border border-lf-brick/20">
          {error}
        </div>
      )}
      <div className="mt-4 space-y-3">
        <button
          onClick={() => buyPack(5)}
          disabled={loading !== null}
          className="w-full flex items-center justify-between border border-lf-hairline p-3 hover:bg-lf-sand-2 disabled:opacity-50 transition"
        >
          <div className="text-left">
            <div className="font-semibold text-lf-espresso">5-Lead Pack</div>
            <div className="text-xs text-lf-muted">$35 / lead</div>
          </div>
          <div className="font-mono text-sm text-lf-money-on-dark font-semibold">
            $175
          </div>
        </button>
        <button
          onClick={() => buyPack(10)}
          disabled={loading !== null}
          className="w-full flex items-center justify-between border border-lf-hairline bg-lf-espresso p-3 hover:bg-lf-espresso/90 disabled:opacity-50 transition"
        >
          <div className="text-left">
            <div className="font-semibold text-lf-sand">10-Lead Pack</div>
            <div className="text-xs text-lf-taupe">$30 / lead (Best Value)</div>
          </div>
          <div className="font-mono text-sm text-lf-money font-semibold">
            $300
          </div>
        </button>
      </div>
    </div>
  );
}

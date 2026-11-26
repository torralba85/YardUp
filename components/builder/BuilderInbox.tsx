"use client";

import { AdvisorIntakeSummary } from "@/components/studio/AdvisorIntakeSummary";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useBuilderInboxView } from "@/lib/use-builder-inbox-view";
import { useAuth } from "@/lib/auth-context";
import { computeBuilderMetrics } from "@/lib/builder-metrics";
import { startLeadUnlock, reportBadLead } from "@/lib/lead-unlock-api";
import { useStorePrice } from "@/lib/commerce/store-price";
import { fetchUnlockedContact } from "@/lib/marketplace-firestore";
import { detectPurchaseChannel } from "@/lib/commerce/purchase-channel";
import { LEAD_UNLOCK_PRICE_CENTS } from "@/lib/lead-unlock-pricing";
import { startCreditPackCheckout } from "@/lib/credit-pack-checkout";
import type { CreditPackSize } from "@/lib/credit-packs";
import {
  trackBuilderLeadPreviewViewed,
  trackBuilderUnlockCheckoutStarted,
  getProjectValueBucket,
  getMatchReasonCountBucket,
  mapPurchaseChannel,
} from "@/lib/analytics/events";
import {
  recordPendingLeadUnlockAttempt,
  recordInPlaceLeadUnlock,
  clearPendingLeadUnlock,
} from "@/lib/analytics/lead-unlock-tracking";
import { useRadioGroup } from "@/components/ui/useRadioGroup";
import type {
  BuilderInboxItem,
  BuilderLedgerEntry,
  BuilderProfile,
  UnlockedLeadContact,
} from "@/lib/marketplace-types";
import BuilderMoneyBand from "./BuilderMoneyBand";
import LeadCard, { type LeadAccess } from "./LeadCard";
import UnlockSlip from "./UnlockSlip";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { PanelHeader } from "@/components/ui/Panel";
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  Mail,
  Phone,
  Unlock,
} from "lucide-react";
import { buildReportHtml, buildReportCsv, downloadBlob } from "@/lib/report";
import { finishLabels, roofLabels, formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import { formatNumber, formatUtcDate } from "@/lib/intl-format";

const TABS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "interested", label: "Interested" },
  { key: "archived", label: "Archived" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const ACCESS_LABEL: Record<LeadAccess, string> = {
  locked: "Locked",
  confirming: "Confirming",
  unlocked: "Unlocked",
};

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
  ledger: initialLedger = [],
  onRespond,
}: {
  profile: BuilderProfile;
  items: BuilderInboxItem[];
  ledger?: BuilderLedgerEntry[];
  onRespond: (requestId: string, status: "interested" | "not-a-fit") => Promise<void>;
}) {
  const { user } = useAuth();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { tab, setTab, viewMode, setViewMode, selectedItemId, setSelectedItemId, page, setPage } = useBuilderInboxView();

  const [credits, setCredits] = useState(profile.credits ?? 0);
  // A re-read profile (e.g. after a credit pack lands from Stripe) replaces
  // the in-session balance; in-session spends update `credits` directly.
  const [syncedProfileCredits, setSyncedProfileCredits] = useState(profile.credits ?? 0);
  if ((profile.credits ?? 0) !== syncedProfileCredits) {
    setSyncedProfileCredits(profile.credits ?? 0);
    setCredits(profile.credits ?? 0);
  }
  const [sessionLedger, setSessionLedger] = useState<BuilderLedgerEntry[]>([]);
  const ledger = useMemo(() => [...initialLedger, ...sessionLedger], [initialLedger, sessionLedger]);
  const [access, setAccess] = useState<Record<string, LeadAccess>>({});
  const [contacts, setContacts] = useState<Record<string, UnlockedLeadContact>>({});
  const [demoGrants, setDemoGrants] = useState<Record<string, boolean>>({});
  const [reportedLeads, setReportedLeads] = useState<Set<string>>(new Set());
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [slipId, setSlipId] = useState<string | null>(null);
  const [slipPending, setSlipPending] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  // Store shells are charged Play's own localized amount, not the Stripe one.
  const unlockPrice = useStorePrice("builder1");

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

  const metrics = computeBuilderMetrics(items, ledger);
  const filtered = items.filter((item) => inTab(item, tab));
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const previewedLeadsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const item of visibleItems) {
      if (!previewedLeadsRef.current.has(item.request.id)) {
        previewedLeadsRef.current.add(item.request.id);
        trackBuilderLeadPreviewViewed({
          triage_status: item.response.status,
          access_status: item.unlocked ? "unlocked" : "locked",
          project_value_bucket: getProjectValueBucket(item.request.preview?.buildBandLow),
          match_reason_count_bucket: getMatchReasonCountBucket(
            item.request.preview?.matchReasons?.length ?? 0,
          ),
        });
      }
    }
  }, [visibleItems]);

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
        setError("Could not update this request. Check your connection and try again.");
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
        if (!res.ok) {
          throw new Error(
            data.error || "Could not unlock this lead. Check your connection and try again.",
          );
        }

        setCredits(data.newCredits);
        setSessionLedger((current) => [
          ...current,
          {
            id: `${profile.id}_${requestId}_use`,
            builderId: profile.id,
            type: "unlock",
            creditsChange: -1,
            amountPaid: 0,
            referenceId: requestId,
            description: `Unlocked Lead ${requestId}`,
            createdAt: new Date().toISOString(),
          },
        ]);

        recordInPlaceLeadUnlock({
          requestId,
          unlockMode: "credit",
          triageStatus: slipItem.response.status,
        });

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

      const channel = mapPurchaseChannel(detectPurchaseChannel());
      trackBuilderUnlockCheckoutStarted({
        value: LEAD_UNLOCK_PRICE_CENTS / 100,
        currency: "USD",
        purchase_channel: channel,
      });
      recordPendingLeadUnlockAttempt({
        requestId,
        triageStatus: slipItem.response.status,
      });

      const outcome = await startLeadUnlock(requestId, idToken);

      if (outcome.kind === "redirect") {
        window.location.assign(outcome.url);
        return;
      }

      // Demo / already-granted: record, then reveal in place (never a flip).
      recordInPlaceLeadUnlock({
        requestId,
        unlockMode: outcome.demo ? "demo" : "paid",
        triageStatus: slipItem.response.status,
      });

      setSlipId(null);
      setAccess((current) => ({ ...current, [requestId]: "confirming" }));
      setAnnounce(`Lead ${serial}: payment received, recording unlock.`);

      if (outcome.demo) {
        setSessionLedger((current) => [
          ...current,
          {
            id: `demo_${requestId}_${Date.now()}`,
            builderId: profile.id,
            type: "unlock",
            creditsChange: 0,
            amountPaid: 49,
            referenceId: requestId,
            description: `Unlocked Lead ${requestId}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      const contact = await fetchUnlockedContact(requestId);
      if (contact) {
        setContacts((current) => ({ ...current, [requestId]: contact }));
      }
      setDemoGrants((current) => ({ ...current, [requestId]: outcome.demo }));
      setAccess((current) => ({ ...current, [requestId]: "unlocked" }));
      setAnnounce(`Lead ${serial} unlocked. Owner contact is now visible.`);
    } catch (err) {
      clearPendingLeadUnlock();
      setSlipError(
        err instanceof Error
          ? err.message
          : "Could not unlock this lead. Check your connection and try again.",
      );
    } finally {
      setSlipPending(false);
    }
  }

  async function handleReportLead(requestId: string, serial: string) {
    if (reportingId || reportedLeads.has(requestId)) return;
    const confirmed = typeof window !== "undefined" && window.confirm
      ? window.confirm(
          `Report lead ${serial}? If the homeowner contact info is disconnected or bounced, 1 unlock credit will be refunded to your account immediately.`,
        )
      : true;
    if (!confirmed) return;

    setError(null);
    setReportingId(requestId);
    try {
      const idToken = user ? await user.getIdToken() : undefined;
      const res = await reportBadLead(requestId, { idToken });
      setReportedLeads((prev) => new Set(prev).add(requestId));
      setCredits(res.newCredits);
      setSessionLedger((prev) => [
        {
          id: `${profile.id}_${requestId}_credit`,
          builderId: profile.id,
          type: "credit",
          creditsChange: 1,
          amountPaid: 0,
          referenceId: requestId,
          description: `Bad-lead credit for lead ${serial}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setAnnounce(`Lead ${serial} reported. 1 unlock credit added to your account.`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not report this lead. Check your connection and try again.";
      setError(msg);
      setAnnounce(`Could not report lead ${serial}: ${msg}`);
    } finally {
      setReportingId(null);
    }
  }

  const { groupProps: viewModeGroupProps, getRadioProps: getViewModeRadioProps } = useRadioGroup({
    value: viewMode,
    onChange: setViewMode,
    values: ["cards", "table"] as const,
  });

  return (
    <section className="mt-6" aria-label="Leads">
      <BuilderMoneyBand metrics={metrics} credits={credits} />

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      {error && (
        <div role="alert" className="mt-4 border border-status-blocked/20 bg-status-blocked-soft p-3 text-sm text-status-blocked">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <ZeroEverEmptyState />
      ) : (
        <div className="mt-8 flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-lot-line pb-4">
              <div role="group" aria-label="Filter leads by status" className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                  <Button
                    key={t.key}
                    type="button"
                    aria-pressed={tab === t.key}
                    size="sm"
                    variant={tab === t.key ? "selected" : "secondary"}
                    onClick={() => {
                      setTab(t.key);
                    }}
                  >
                    {t.label} ·{" "}
                    <span className={`tabular-nums ${tab === t.key ? "" : "text-lot-stone"}`}>{tabCounts[t.key]}</span>
                  </Button>
                ))}
              </div>

              {/* Cards vs Table View Mode Segment Toggle */}
              <div aria-label="View mode" className="flex rounded-control border border-lot-line p-0.5 self-start md:self-auto bg-lot-chalk" {...viewModeGroupProps}>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "cards" ? "selected" : "ghost"}
                  {...getViewModeRadioProps("cards")}
                  className="aria-[checked=false]:text-lot-stone aria-[checked=false]:hover:bg-lot-surface"
                >
                  Cards
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "table" ? "selected" : "ghost"}
                  {...getViewModeRadioProps("table")}
                  className="aria-[checked=false]:text-lot-stone aria-[checked=false]:hover:bg-lot-surface"
                >
                  Table
                </Button>
              </div>
            </div>

            {pageCount > 1 && (
              <nav aria-label="Inbox pages" className="mt-4 flex items-center justify-between gap-3">
                <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous page</Button>
                <span role="status" className="text-sm text-lot-stone">Page {currentPage} of {pageCount}</span>
                <Button variant="secondary" size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next page</Button>
              </nav>
            )}
            {filtered.length === 0 ? (
              <div className="mt-4 border border-lot-line bg-lot-chalk p-6 text-sm text-lot-stone">
                {tab === "archived"
                  ? "Nothing archived yet."
                  : `No ${tab} leads right now.`}
              </div>
            ) : viewMode === "cards" ? (
              <div className="mt-4 grid gap-4">
                {visibleItems.map((item) => (
                  <LeadCard
                    key={item.request.id}
                    item={item}
                    access={access[item.request.id] ?? (item.unlocked ? "unlocked" : "locked")}
                    contact={contacts[item.request.id] ?? null}
                    demo={demoGrants[item.request.id]}
                    hasCredits={credits > 0}
                    responding={isPending && pendingId === item.request.id}
                    reported={reportedLeads.has(item.request.id)}
                    onUnlockClick={() => {
                      setSlipId(item.request.id);
                      setSlipError(null);
                    }}
                    onRespond={(status) => respond(item.request.id, status)}
                    onReport={() =>
                      handleReportLead(
                        item.request.id,
                        item.request.preview.previewSerial,
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className={`mt-4 ${selectedItemId ? "hidden xl:block" : "block"} overflow-x-auto border border-lot-line bg-lot-chalk`}>
                <table className="w-full text-left border-collapse" aria-label="Inbox Leads Ledger">
                  <thead>
                    <tr className="border-b border-lot-line bg-lot-surface">
                      <th scope="col" className="px-3 py-3 lf-kicker-dense text-lot-stone">Lead / Recorded</th>
                      <th scope="col" className="px-3 py-3 lf-kicker-dense text-lot-stone">Location</th>
                      <th scope="col" className="px-3 py-3 lf-kicker-dense text-lot-stone text-right">Rent Potential</th>
                      <th scope="col" className="px-3 py-3 lf-kicker-dense text-lot-stone xl:hidden">Specs</th>
                      <th scope="col" className="px-3 py-3 lf-kicker-dense text-lot-stone">Economics</th>
                      <th scope="col" className="px-3 py-3 lf-kicker-dense text-lot-stone">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => {
                      const itemAccess = access[item.request.id] ?? (item.unlocked ? "unlocked" : "locked");
                      const itemContact = contacts[item.request.id] ?? null;
                      const hasAccess = itemAccess === "unlocked";
                      const createdAtDate = item.request.createdAt ? new Date(item.request.createdAt) : null;
                      const dateStr =
                        createdAtDate && !Number.isNaN(createdAtDate.getTime())
                          ? formatUtcDate(createdAtDate, "monthDayShort").toUpperCase()
                          : "PENDING";
                      const isSelected = selectedItemId === item.request.id;

                      return (
                        <tr
                          key={item.request.id}
                          tabIndex={0}
                          aria-selected={isSelected}
                          onClick={() => setSelectedItemId(item.request.id)}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedItemId(item.request.id);
                            }
                          }}
                          className={`group cursor-pointer border-b border-lot-line motion-safe:transition-colors hover:bg-lot-surface/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink ${
                            isSelected ? "bg-lot-surface border-l-[3px] border-l-lot-orange" : ""
                          }`}
                        >
                          <td className="px-3 py-4 whitespace-nowrap">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-pressed={isSelected}
                              aria-label={`Inspect lead ${item.request.preview.previewSerial}`}
                              onClick={() => setSelectedItemId(item.request.id)}
                              className="-ml-2 px-2 text-left text-sm font-semibold tabular-nums text-lot-ink group-hover:text-lot-orange-ink"
                            >
                              <span translate="no">{item.request.preview.previewSerial}</span>
                            </Button>
                            <div className="lf-kicker-dense mt-1 text-lot-stone">{dateStr}</div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="max-w-[170px] truncate text-sm font-semibold text-lot-ink">
                              {hasAccess && itemContact ? itemContact.streetAddress : item.request.preview.neighborhood}
                            </div>
                            <div className="lf-caption mt-0.5 tabular-nums text-lot-stone">{item.request.preview.zip}</div>
                          </td>
                          <td className="px-3 py-4 text-right whitespace-nowrap">
                            <span className="lf-money-sm text-lot-ink">{formatCurrency(item.request.preview.rentBand)}</span>
                            <span className="lf-caption ml-1 text-lot-stone">/mo</span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap xl:hidden">
                            <div className="text-sm tabular-nums text-lot-ink">
                              {formatNumber(item.request.preview.aduSqft)} sf ADU
                            </div>
                            <div className="lf-caption mt-0.5 tabular-nums text-lot-stone">
                              {formatNumber(item.request.preview.lotSqft)} sf lot
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm tabular-nums text-lot-ink">
                              Build {formatCompactCurrency(item.request.preview.buildBandLow)}–{formatCompactCurrency(item.request.preview.buildBandHigh)}
                            </div>
                            <div className="lf-caption mt-0.5 tabular-nums text-lot-stone">
                              Payback {item.request.preview.paybackYears} yrs
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 text-sm text-lot-ink">
                              {itemAccess === "locked" && <Lock size={14} aria-hidden className="text-lot-stone" />}
                              {itemAccess === "unlocked" && <Unlock size={14} aria-hidden className="text-status-eligible" />}
                              {itemAccess === "confirming" && (
                                <span aria-hidden className="h-2 w-2 rounded-full bg-status-review" />
                              )}
                              <span className="sr-only">{ACCESS_LABEL[itemAccess]}, </span>
                              {item.response.status === "interested" ? "Interested" : item.response.status === "not-a-fit" ? "Archived" : "New"}
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
          <aside className={`w-full shrink-0 space-y-4 ${viewMode === 'cards' ? 'xl:w-80' : 'xl:w-[450px]'}`}>
            {viewMode === "table" && (
              <div className={`${selectedItemId ? "block" : "hidden xl:block"} xl:sticky xl:top-4 h-fit`}>
                {selectedItemId === null ? (
                  /* No Selection State */
                  <div className="flex flex-col items-center justify-center border border-dashed border-lot-stone bg-lot-chalk/50 p-8 text-center min-h-[350px]">
                    <FileText size={36} aria-hidden="true" className="text-lot-stone" />
                    <h2 className="lf-card-heading mt-3 text-sm font-semibold text-lot-ink">No lead selected</h2>
                    <p className="lf-body-sm mt-1.5 max-w-xs text-lot-stone">
                      Select a lead from the ledger table on the left to inspect its feasibility details and contact information.
                    </p>
                  </div>
                ) : (
                  /* Lead Inspection Pane Container (defined in Task 3) */
                  <div id="lead-inspection-pane" className="border border-lot-line bg-lot-chalk p-5">
                    {(() => {
                      const selectedItem = items.find((i) => i.request.id === selectedItemId);
                      if (!selectedItem) return null;

                      const itemAccess = access[selectedItem.request.id] ?? (selectedItem.unlocked ? "unlocked" : "locked");
                      const itemContact = contacts[selectedItem.request.id] ?? null;
                      const demo = demoGrants[selectedItem.request.id];
                      const responding = isPending && pendingId === selectedItem.request.id;

                      const recordedAtDate = selectedItem.request.createdAt
                        ? new Date(selectedItem.request.createdAt)
                        : null;
                      const recordedDate =
                        recordedAtDate && !Number.isNaN(recordedAtDate.getTime())
                          ? formatUtcDate(recordedAtDate, "short").toUpperCase()
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="self-start xl:hidden"
                            onClick={() => setSelectedItemId(null)}
                            leftIcon={<ArrowLeft size={14} />}
                          >
                            Back to inbox list
                          </Button>

                          <div className="flex items-center justify-between border-b border-lot-line pb-3">
                            <span className="lf-kicker-dense text-lot-stone">
                              NO. {selectedItem.request.preview.previewSerial}
                              {recordedDate ? ` · RECORDED ${recordedDate}` : ""}
                            </span>
                            <StatusChip
                              status={
                                itemAccess === "unlocked"
                                  ? "clear"
                                  : itemAccess === "confirming"
                                  ? "review"
                                  : "info"
                              }
                              label={
                                itemAccess === "unlocked"
                                  ? "Unlocked"
                                  : itemAccess === "confirming"
                                  ? "Confirming"
                                  : "Locked"
                              }
                              size="sm"
                            />
                          </div>

                          {/* 1. Locked State Panel */}
                          {itemAccess === "locked" && (
                            <div className="space-y-4">
                              <div>
                                <p className="lf-money-md text-lot-ink">
                                  {formatCurrency(selectedItem.request.preview.rentBand)}
                                  <span className="ml-1.5 lf-kicker-dense text-lot-stone">
                                    /mo rent potential
                                  </span>
                                </p>
                                <p className="mt-2 font-semibold text-lot-ink text-sm">
                                  {selectedItem.request.preview.neighborhood}
                                </p>
                                <p className="mt-1 flex flex-wrap gap-2.5 lf-kicker-dense text-lot-stone">
                                  <span>{formatNumber(selectedItem.request.preview.lotSqft)} sqft lot</span>
                                  <span>{formatNumber(selectedItem.request.preview.aduSqft)} sf ADU</span>
                                  <span>{finishLabels[selectedItem.request.preview.config.finish]}</span>
                                </p>
                              </div>

                              <div className="space-y-3 rounded-none border border-dashed border-lot-stone bg-lot-surface/30 p-5 text-center">
                                <Lock size={24} aria-hidden className="mx-auto text-lot-stone" />
                                <h2 className="lf-kicker text-lot-ink">
                                  Feasibility Certificate Locked
                                </h2>
                                <p className="lf-body-sm mx-auto max-w-xs text-lot-stone">
                                  Unlock this lead to reveal the exact street address, parcel boundaries, zoning calculations, detailed finances ledger, and direct homeowner contact info.
                                </p>
                                <Button
                                  variant="commit"
                                  size="sm"
                                  fullWidth
                                  onClick={() => {
                                    setSlipId(selectedItem.request.id);
                                    setSlipError(null);
                                  }}
                                >
                                  Unlock lead
                                  <span className="font-display text-sm font-semibold">{unlockPrice.amountCompact}</span>
                                </Button>
                              </div>

                              <ResponseTriage
                                status={selectedItem.response.status}
                                responding={responding}
                                onRespond={(status) => respond(selectedItem.request.id, status)}
                              />
                            </div>
                          )}

                          {/* 2. Confirming State Panel */}
                          {itemAccess === "confirming" && (
                            <div className="border border-status-review/35 bg-status-review-soft px-3.5 py-3 rounded-none">
                              <div className="lf-kicker flex items-center gap-2 text-status-review">
                                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-status-review" />
                                Recording lead unlock…
                              </div>
                              <p className="mt-1.5 text-sm text-lot-ink">
                                Usually a few seconds. The owner contact and certificate will appear right here.
                              </p>
                            </div>
                          )}

                          {/* 3. Unlocked State Panel */}
                          {itemAccess === "unlocked" && itemContact && (
                            <div className="space-y-4 lf-stamp">
                              {/* Homeowner Info Block */}
                              <div className="border border-status-eligible bg-status-eligible-soft p-4 rounded-none">
                                <div className="flex items-center gap-1.5 lf-kicker-dense text-status-eligible">
                                  <CheckCircle2 size={12} aria-hidden />
                                  <span>Owner Contact Unlocked{demo ? " · Demo" : ""}</span>
                                </div>
                                <address className="mt-2 font-sans text-sm not-italic leading-relaxed text-lot-ink">
                                  <span className="block font-display text-lg font-medium">{itemContact.ownerContact.name}</span>
                                  <span className="mt-1 flex items-center gap-1.5 break-all">
                                    <Mail size={14} aria-hidden className="shrink-0 text-lot-stone" />
                                    {itemContact.ownerContact.email}
                                  </span>
                                  {itemContact.ownerContact.phone && (
                                    <span className="mt-0.5 flex items-center gap-1.5 tabular-nums">
                                      <Phone size={14} aria-hidden className="shrink-0 text-lot-stone" />
                                      {itemContact.ownerContact.phone}
                                    </span>
                                  )}
                                </address>
                                {itemContact.ownerContact.message && (
                                  <div className="mt-3 border-t border-dashed border-lot-line pt-2">
                                    <span className="lf-kicker-dense text-lot-stone">Homeowner Message</span>
                                    <p className="mt-1 break-words border-l border-lot-stone bg-lot-chalk/60 p-2 text-sm italic leading-relaxed text-lot-ink">
                                      &ldquo;{itemContact.ownerContact.message}&rdquo;
                                    </p>
                                  </div>
                                )}
                              </div>

                              {itemContact.snapshot?.advisorIntake && <AdvisorIntakeSummary intake={itemContact.snapshot.advisorIntake} />}
                              {itemContact.snapshot?.studioScenarioJson && (
                                <a
                                  className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-ink underline motion-safe:transition-colors hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
                                  href={`/studio?lead=${encodeURIComponent(selectedItem.request.id)}`}
                                >
                                  Open shared 3D layout
                                </a>
                              )}

                              {/* Visual Certificate Section — single frame (no nested rounded cards). */}
                              <div className="space-y-3">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-lot-ink">
                                  Feasibility Certificate
                                </h2>

                                {(!itemContact.snapshot?.result || !itemContact.snapshot?.parcel || !itemContact.snapshot?.config) ? (
                                  /* Defensively Fallback to Plain Text Report if structure is not present (e.g. tests) */
                                  <div className="max-h-[300px] overflow-y-auto border border-lot-line bg-lot-chalk/60 p-3.5">
                                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-lot-ink">
                                      {itemContact.snapshot?.reportText || "Feasibility certificate data unavailable."}
                                    </pre>
                                  </div>
                                ) : (
                                  /* Full styled inline certificate — one instrument frame, not card-in-card. */
                                  <div className="space-y-4 border-[1.5px] border-lot-ink bg-lot-chalk p-4">
                                      {/* Monogram / Header */}
                                      <div className="border-b border-lot-line pb-2 text-center">
                                        <div translate="no" className="lf-dataprint text-lot-orange-ink">LotFoundry</div>
                                        <h3 className="mt-0.5 font-display text-base font-medium leading-tight text-lot-ink">Certificate of Feasibility</h3>
                                        <p className="lf-caption mt-1 truncate text-lot-stone">
                                          No. {selectedItem.request.preview.previewSerial} · {itemContact.streetAddress}
                                        </p>
                                      </div>

                                      {/* Annual Ledger T-Account */}
                                      <div className="space-y-1">
                                        <div className="lf-dataprint text-lot-orange-ink">Ledger Balance</div>
                                        <div className="border border-lot-line text-xs tabular-nums divide-y divide-lot-line bg-lot-surface/20">
                                          <div className="grid grid-cols-2 px-2.5 py-2">
                                            <div>
                                              <span className="font-semibold block text-lot-ink">Gross Rent (annual)</span>
                                              <span className="text-lot-stone">ADU rent potential</span>
                                            </div>
                                            <div className="text-right font-sans font-semibold text-lot-ink">
                                              {formatCurrency(itemContact.snapshot.result.monthlyRent * 12)}
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 px-2.5 py-2">
                                            <div>
                                              <span className="font-semibold block text-lot-ink">Allowance</span>
                                              <span className="text-lot-stone">Maint, vacancy, taxes</span>
                                            </div>
                                            <div className="text-right font-sans text-lot-stone">
                                              -{formatCurrency((itemContact.snapshot.result.monthlyRent * 12) - itemContact.snapshot.result.annualNoi)}
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 px-2.5 py-2 bg-lot-surface text-lot-ink font-semibold">
                                            <div>Net Income (NOI)</div>
                                            <div className="text-right font-sans">
                                              {formatCurrency(itemContact.snapshot.result.annualNoi)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Technical details table */}
                                      <div className="text-xs tabular-nums space-y-1 border-t border-dashed border-lot-line pt-3">
                                        <div className="flex justify-between py-1">
                                          <span className="lf-kicker-dense text-lot-stone">ADU Size</span>
                                          <span className="font-semibold text-lot-ink">{formatNumber(itemContact.snapshot.result.aduSqft)} sf</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="lf-kicker-dense text-lot-stone">Roof Style</span>
                                          <span className="font-semibold text-lot-ink">{roofLabels[itemContact.snapshot.config.roof]}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                          <span className="lf-kicker-dense text-lot-stone">Zoning Status</span>
                                          <StatusChip
                                            status={itemContact.snapshot.result.zoningStatus === "Compliant" ? "clear" : "review"}
                                            label={itemContact.snapshot.result.zoningStatus}
                                          />
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="lf-kicker-dense text-lot-stone">Build cost range</span>
                                          <span className="font-semibold text-lot-ink">
                                            {formatCurrency(itemContact.snapshot.result.costLow)} - {formatCurrency(itemContact.snapshot.result.costHigh)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                          <span className="lf-kicker-dense text-lot-stone">Payback Estimate</span>
                                          <span className="font-semibold text-lot-ink">{itemContact.snapshot.result.paybackYears} yrs</span>
                                        </div>
                                      </div>

                                      <div className="lf-dataprint rotate-[-2deg] border-2 border-lot-ink py-1 text-center font-bold text-lot-ink">
                                        Concept &middot; Not a Permit
                                      </div>
                                  </div>
                                )}
                              </div>

                              {/* Report Actions */}
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="xs"
                                  className="flex-1"
                                  onClick={handleDownloadHtml}
                                  disabled={!itemContact.snapshot?.result}
                                  leftIcon={<Download size={11} />}
                                >
                                  Download HTML
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="xs"
                                  className="flex-1"
                                  onClick={handleDownloadCsv}
                                  disabled={!itemContact.snapshot?.result}
                                  leftIcon={<FileSpreadsheet size={11} />}
                                >
                                  CSV Export
                                </Button>
                              </div>

                              <ResponseTriage
                                status={selectedItem.response.status}
                                responding={responding}
                                onRespond={(status) => respond(selectedItem.request.id, status)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            
            <CreditShop credits={credits} />
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
  // Sample card, but the price it names is the one the builder will be charged.
  const unlockPrice = useStorePrice("builder1");
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
      <div className="border-t-[1.5px] border-lot-ink pt-5">
        <h2 className="lf-card-heading text-lot-ink">No matched leads yet</h2>
        <p className="lf-body-sm mt-2 max-w-prose text-lot-stone">
          A lead lands here when a homeowner in one of your service areas submits a feasibility
          report. Complete your profile and add every area you build in — complete profiles get
          matched first.
        </p>
      </div>

      <div>
        <p className="lf-kicker-dense text-lot-stone">
          Example · this is what a lead looks like
        </p>
        <article
          aria-label="Example lead"
          className="mt-2 border border-dashed border-lot-stone bg-lot-chalk/70 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <span className="lf-kicker-dense text-lot-stone">
              NO. LF-EXAMPLE
            </span>
            <span className="rounded-none bg-lot-stone-soft px-2.5 py-1 lf-kicker-dense text-lot-stone">
              Example
            </span>
          </div>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="lf-money-lg text-lot-ink">$2,500</span>
            <span className="lf-caption text-lot-stone">/mo rent potential</span>
          </p>
          <p className="mt-3 font-display text-xl font-medium tracking-[-0.02em] text-lot-ink">
            Ballard, WA
            <span className="ml-2 font-sans text-sm font-normal tabular-nums tracking-normal text-lot-stone">98107</span>
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-px border border-lot-line bg-lot-line">
            {[
              ["Lot", "6,200 sqft"],
              ["ADU", "800 sf"],
              ["Zoning", "Compliant"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 bg-lot-chalk px-3 py-2.5">
                <dt className="lf-kicker-dense text-lot-stone">{label}</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-lot-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="lf-caption mt-4 border-t border-dashed border-lot-line pt-3 text-lot-stone">
            Owner contact unlocks for {unlockPrice.amountCompact} — once you have real leads
          </p>
        </article>
      </div>
    </div>
  );
}

/** Compact interested / not-a-fit controls shared by locked + unlocked detail panes. */
function ResponseTriage({
  status,
  responding,
  onRespond,
}: {
  status: BuilderInboxItem["response"]["status"];
  responding: boolean;
  onRespond: (status: "interested" | "not-a-fit") => void;
}) {
  const label =
    status === "interested" ? "Interested" : status === "not-a-fit" ? "Archived" : "New";

  return (
    <div className="flex items-center justify-between border-t border-lot-line pt-3">
      <span className="lf-dataprint text-lot-stone">
        Response: {label}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="xs"
          variant={status === "interested" ? "selected" : "secondary"}
          disabled={responding}
          aria-pressed={status === "interested"}
          onClick={() => onRespond("interested")}
          leftIcon={<CheckCircle2 size={12} />}
        >
          Interested
        </Button>
        <Button
          type="button"
          size="xs"
          variant={status === "not-a-fit" ? "selected" : "secondary"}
          disabled={responding}
          aria-pressed={status === "not-a-fit"}
          onClick={() => onRespond("not-a-fit")}
          leftIcon={<CircleSlash size={12} />}
        >
          Not a fit
        </Button>
      </div>
    </div>
  );
}

function CreditShop({ credits }: { credits: number }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Each pack quotes its own channel's amount; on Play that is the localized,
  // price-charmed total Play will charge, never the Stripe catalog figure.
  const fivePack = useStorePrice("builder5");
  const tenPack = useStorePrice("builder10");
  const priceError = fivePack.error ?? tenPack.error;
  // Buying is fine while the App Store defers its quote to its own sheet; it is
  // not fine while a Play price is still loading or failed to load.
  const priceBlocked =
    fivePack.loading || tenPack.loading || priceError !== null;
  const prices = {
    5: {
      total: fivePack.amountCompact,
      perLead: fivePack.exact ? `${fivePack.unitAmount} / lead` : fivePack.unitAmount,
    },
    10: {
      total: tenPack.amountCompact,
      perLead: tenPack.exact ? `${tenPack.unitAmount} / lead` : tenPack.unitAmount,
    },
  } as const;

  async function buyPack(pack: CreditPackSize) {
    if (!user) return;
    setLoading(pack);
    setError(null);
    try {
      const token = await user.getIdToken();
      const { detectPurchaseChannel, requiresStoreBilling } = await import(
        "@/lib/commerce/purchase-channel"
      );
      const channel = detectPurchaseChannel();
      if (requiresStoreBilling(channel)) {
        const { createPurchaseClient } = await import("@/lib/commerce/purchase-client");
        const { STORE_PRODUCTS } = await import("@/lib/commerce/products");
        const productId =
          pack === 10 ? STORE_PRODUCTS.builder10.id : STORE_PRODUCTS.builder5.id;
        const client = createPurchaseClient({
          getIdToken: async () => token,
        });
        await client.purchase(productId);
        window.location.reload();
        return;
      }

      const outcome = await startCreditPackCheckout(pack, token);
      if (outcome.kind === "redirect") {
        window.location.assign(outcome.url);
      } else {
        // Reload to show the new credits and ledger
        window.location.reload();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start credit pack checkout. Check your connection and try again.",
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border border-lot-line bg-lot-chalk">
      <PanelHeader
        as="h2"
        title="Credit Shop"
        sub="Unlock leads instantly with credits."
        actions={
          <p className="text-right">
            <span className="lf-money-sm block text-lot-ink">{credits}</span>
            <span className="lf-kicker-dense text-lot-stone">{credits === 1 ? "credit" : "credits"}</span>
          </p>
        }
      />
      <div className="p-5">
        {(error || priceError) && (
          <div role="alert" className="mb-3 border border-status-blocked/30 bg-status-blocked-soft p-2 text-xs text-status-blocked">
            {error ?? priceError}
          </div>
        )}
        <div className="space-y-3">
          {/* Product rows are purchase instruments (ledger cards), not pill CTAs. */}
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => buyPack(5)}
            disabled={loading !== null || priceBlocked}
            aria-busy={loading === 5}
            className="min-h-16 justify-between text-left"
          >
            <span>
              <span className="block text-sm font-bold text-lot-ink">5-Lead Pack</span>
              <span className="block text-xs font-medium text-lot-stone">
                {loading === 5 ? "Starting checkout…" : prices[5].perLead}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 lf-money-md text-lot-ink">
              {loading === 5 ? (
                <Loader2 size={16} aria-hidden="true" className="motion-safe:animate-spin" />
              ) : (
                prices[5].total
              )}
            </span>
          </Button>
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={() => buyPack(10)}
            disabled={loading !== null || priceBlocked}
            aria-busy={loading === 10}
            className="min-h-16 justify-between text-left"
          >
            <span>
              <span className="block text-sm font-bold">10-Lead Pack</span>
              <span className="block text-xs font-medium">
                {loading === 10 ? "Starting checkout…" : prices[10].perLead}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 lf-money-md">
              {loading === 10 ? (
                <Loader2 size={16} aria-hidden="true" className="motion-safe:animate-spin" />
              ) : (
                prices[10].total
              )}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

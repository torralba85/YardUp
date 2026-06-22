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
            <h2 className="font-display text-xl font-bold">{profile.companyName}</h2>
            <p className="mt-1 text-sm text-lf-muted">
              {profile.serviceAreas.map((area) => `${area.city}, ${area.state}`).join(" | ")}
            </p>
          </div>
          <span className="rounded-full border border-lf-hairline px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
            {profile.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="mt-4 border border-lf-hairline">
        <BuilderMoneyBand metrics={metrics} />
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
        <>
          <div role="tablist" aria-label="Filter leads by status" className="mt-5 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
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

          {filtered.length === 0 ? (
            <div className="mt-4 border border-lf-hairline bg-lf-card p-6 text-sm text-lf-muted">
              {tab === "archived"
                ? "Nothing archived yet."
                : `No ${tab} leads right now.`}
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {filtered.map((item) => (
                <LeadCard
                  key={item.request.id}
                  item={item}
                  access={access[item.request.id] ?? (item.unlocked ? "unlocked" : "locked")}
                  contact={contacts[item.request.id] ?? null}
                  demo={demoGrants[item.request.id]}
                  responding={isPending && pendingId === item.request.id}
                  onUnlockClick={() => {
                    setSlipId(item.request.id);
                    setSlipError(null);
                  }}
                  onRespond={(status) => respond(item.request.id, status)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {slipItem && (
        <UnlockSlip
          item={slipItem}
          companyName={profile.companyName}
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
        <h3 className="font-display text-xl font-semibold text-lf-espresso">No matched leads yet</h3>
        <p className="mt-1.5 max-w-prose text-sm text-lf-muted">
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
        <p className="mt-2 font-display text-[26px] font-semibold leading-none text-lf-forest tabular-nums">
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

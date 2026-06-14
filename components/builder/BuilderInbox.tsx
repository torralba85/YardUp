"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth-context";
import { startLeadUnlock } from "@/lib/lead-unlock-api";
import { fetchUnlockedContact } from "@/lib/marketplace-firestore";
import type {
  BuilderInboxItem,
  BuilderProfile,
  UnlockedLeadContact,
} from "@/lib/marketplace-types";
import LeadCard, { type LeadAccess } from "./LeadCard";
import UnlockSlip from "./UnlockSlip";

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

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      {error && (
        <div role="alert" className="mt-4 border border-lf-brick/20 bg-lf-brick/5 p-3 text-sm text-lf-brick">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-4 border border-lf-hairline bg-lf-card p-6 text-sm text-lf-muted">
          No matched snapshots yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {items.map((item) => (
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

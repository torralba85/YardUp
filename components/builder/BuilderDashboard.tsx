"use client";

import { BrandLockup } from "@/components/ui/BrandLockup";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  fetchBuilderInbox,
  fetchBuilderLedger,
  fetchBuilderProfile,
  saveBuilderProfile,
  updateBuilderResponse,
} from "@/lib/marketplace-firestore";
import type {
  BuilderInboxItem,
  BuilderLedgerEntry,
  BuilderProfile,
} from "@/lib/marketplace-types";
import BuilderInbox from "./BuilderInbox";
import BuilderProfileForm from "./BuilderProfileForm";
import BillingLedger from "./BillingLedger";
import { Skeleton } from "@/components/ui/Skeleton";
import { AccountMenu } from "@/components/account/AccountMenu";
import { reconcilePendingLeadUnlock } from "@/lib/analytics/lead-unlock-tracking";

/**
 * Top-level builder dashboard. Loads the signed-in builder's profile and lead
 * inbox from Firestore, then renders either the {@link BuilderProfileForm}
 * (until a profile exists) or the {@link BuilderInbox}, handling loading and
 * error states.
 *
 * @param props.uid - The builder account's uid.
 * @param props.email - The builder's email (prefills the profile form).
 * @param props.displayName - The builder's display name, or `null`.
 */
export default function BuilderDashboard({
  uid,
  email,
  displayName,
}: {
  uid: string;
  email: string;
  displayName: string | null;
}) {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<BuilderProfile | null>(null);
  const [items, setItems] = useState<BuilderInboxItem[]>([]);
  const [ledger, setLedger] = useState<BuilderLedgerEntry[]>([]);
  const [activeView, setActiveView] = useState<"inbox" | "billing">("inbox");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const loadedProfile = await fetchBuilderProfile(uid);
        const [loadedItems, loadedLedger] = loadedProfile
          ? await Promise.all([fetchBuilderInbox(uid), fetchBuilderLedger(uid)])
          : [[], []];
        if (!cancelled) {
          setProfile(loadedProfile);
          setItems(loadedItems);
          setLedger(loadedLedger);
          setLoadError(null);
          reconcilePendingLeadUnlock(loadedItems);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load the builder dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-lf-sand text-lf-espresso">
        <BuilderHeader
          identity={displayName || email}
          displayName={displayName || email}
          onSignOut={() => void logout()}
        />
        <main id="main-content" tabIndex={-1} className="p-4 lg:p-8" aria-busy="true">
          <div
            role="status"
            aria-label="Loading the builder dashboard"
            className="mx-auto max-w-6xl"
          >
            <Skeleton className="h-9 w-64 max-w-full" />
            <Skeleton className="mt-3 h-4 w-[28rem] max-w-full" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-40" />
              ))}
            </div>
            <span className="sr-only">Loading…</span>
          </div>
        </main>
      </div>
    );
  }

  async function handleSaveProfile(input: Parameters<typeof saveBuilderProfile>[1]) {
    const saved = await saveBuilderProfile(uid, input);
    setProfile(saved);
    const [loadedItems, loadedLedger] = await Promise.all([
      fetchBuilderInbox(uid),
      fetchBuilderLedger(uid),
    ]);
    setItems(loadedItems);
    setLedger(loadedLedger);
    reconcilePendingLeadUnlock(loadedItems);
  }

  async function handleRespond(
    requestId: string,
    status: "interested" | "not-a-fit",
  ) {
    await updateBuilderResponse(requestId, uid, status);
    setItems((current) =>
      current.map((item) =>
        item.request.id === requestId
          ? { ...item, response: { ...item.response, status } }
          : item,
      ),
    );
  }

  return (
    <div className="min-h-dvh bg-lf-sand text-lf-espresso">
      <BuilderHeader
        identity={displayName || email}
        displayName={displayName || email}
        onSignOut={() => void logout()}
      />
      <main id="main-content" tabIndex={-1} className="p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="lf-section-heading">Builder dashboard</h1>
        <p className="lf-body-sm mt-2 text-lf-muted">
          Review consented ADU feasibility snapshots matched to your service area.
        </p>
        {loadError && (
          <div role="alert" className="mt-4 rounded-none border border-lf-brick/20 bg-lf-brick-soft p-3 text-sm text-lf-brick">
            {loadError}
          </div>
        )}
          {!profile ? (
            <BuilderProfileForm
              defaults={{ companyName: displayName || "", contactEmail: email }}
              onSave={handleSaveProfile}
            />
          ) : (
            <div className="mt-6 space-y-6">
              <nav aria-label="Dashboard views" className="flex border-b border-lf-hairline">
                <button
                  type="button"
                  onClick={() => setActiveView("inbox")}
                  className={`border-b-2 px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.08em] motion-safe:transition-colors ${
                    activeView === "inbox"
                      ? "border-lf-commit text-lf-espresso"
                      : "border-transparent text-lf-muted hover:text-lf-espresso"
                  }`}
                >
                  Leads Inbox ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("billing")}
                  className={`border-b-2 px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.08em] motion-safe:transition-colors ${
                    activeView === "billing"
                      ? "border-lf-commit text-lf-espresso"
                      : "border-transparent text-lf-muted hover:text-lf-espresso"
                  }`}
                >
                  Billing & Credits
                </button>
              </nav>

              {activeView === "inbox" ? (
                <BuilderInbox
                  profile={profile}
                  items={items}
                  ledger={ledger}
                  onRespond={handleRespond}
                />
              ) : (
                <BillingLedger
                  ledger={ledger}
                  credits={profile.credits}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Slim app header for the builder desk: brand lockup home link plus the
 * signed-in identity and sign-out. Mirrors the studio's account affordance
 * (StudioShell / MobileHeader) so a builder is never stranded on /builder.
 */
function BuilderHeader({
  identity,
  displayName,
  onSignOut,
}: {
  identity: string;
  displayName: string;
  onSignOut: () => void;
}) {
  return (
    <header className="border-b border-lf-hairline bg-lf-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
        <Link
          href="/"
          aria-label="LotFoundry home"
          className="shrink-0 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink"
        >
          <BrandLockup className="h-7 w-auto" />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden min-w-0 truncate text-sm text-lf-muted sm:block">{identity}</span>
          <AccountMenu
            displayName={displayName}
            roleLabel="Builder"
            onSignOut={onSignOut}
            tone="light"
          />
        </div>
      </div>
    </header>
  );
}

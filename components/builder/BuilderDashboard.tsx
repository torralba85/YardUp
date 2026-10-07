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
import {
  type BuilderCheckoutReturn,
  hasBuilderCheckoutReturnMarkers,
  isBuilderCheckoutConfirmed,
  readBuilderCheckoutReturn,
  stripBuilderCheckoutReturnMarkers,
} from "@/lib/builder-checkout-return";
import { clearCreditPackCheckoutAttempts } from "@/lib/credit-pack-checkout";
import { CheckCircle2, Clock } from "lucide-react";

/** How often, and how many times, to re-read the dashboard after a Stripe return. */
const CHECKOUT_CONFIRM_INTERVAL_MS = 2000;
const CHECKOUT_CONFIRM_ATTEMPTS = 6;

type CheckoutReturnState = {
  target: BuilderCheckoutReturn;
  status: "confirming" | "confirmed" | "delayed";
};

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
  const [checkoutReturn, setCheckoutReturn] = useState<CheckoutReturnState | null>(null);

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
          consumeCheckoutReturn(loadedItems, loadedLedger);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load the builder dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // A Stripe success redirect lands here before the webhook may have written
    // the grant. Strip the one-shot markers so a reload never re-arms this,
    // then wait for the grant when the first read does not show it yet.
    function consumeCheckoutReturn(
      loadedItems: BuilderInboxItem[],
      loadedLedger: BuilderLedgerEntry[],
    ) {
      const search = window.location.search;
      if (!hasBuilderCheckoutReturnMarkers(search)) return;
      const target = readBuilderCheckoutReturn(search);
      if (new URLSearchParams(search).has("credits_added")) {
        clearCreditPackCheckoutAttempts([5, 10]);
      }
      const next = stripBuilderCheckoutReturnMarkers(search);
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`,
      );
      if (!target) return;
      setCheckoutReturn({
        target,
        status: isBuilderCheckoutConfirmed(target, loadedItems, loadedLedger)
          ? "confirmed"
          : "confirming",
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (checkoutReturn?.status !== "confirming") return;
    const { target } = checkoutReturn;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      attempts += 1;
      try {
        const [loadedProfile, loadedItems, loadedLedger] = await Promise.all([
          fetchBuilderProfile(uid),
          fetchBuilderInbox(uid),
          fetchBuilderLedger(uid),
        ]);
        if (cancelled) return;
        if (loadedProfile) setProfile(loadedProfile);
        setItems(loadedItems);
        setLedger(loadedLedger);
        if (isBuilderCheckoutConfirmed(target, loadedItems, loadedLedger)) {
          reconcilePendingLeadUnlock(loadedItems);
          setCheckoutReturn({ target, status: "confirmed" });
          return;
        }
      } catch {
        // A transient read failure just spends one attempt.
        if (cancelled) return;
      }
      if (attempts >= CHECKOUT_CONFIRM_ATTEMPTS) {
        setCheckoutReturn({ target, status: "delayed" });
        return;
      }
      timer = setTimeout(poll, CHECKOUT_CONFIRM_INTERVAL_MS);
    }

    timer = setTimeout(poll, CHECKOUT_CONFIRM_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkoutReturn, uid]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-lot-chalk text-lot-ink">
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
    <div className="min-h-dvh bg-lot-chalk text-lot-ink">
      <BuilderHeader
        identity={displayName || email}
        displayName={displayName || email}
        onSignOut={() => void logout()}
      />
      <main id="main-content" tabIndex={-1} className="p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="lf-section-heading">Builder dashboard</h1>
        <p className="lf-body-sm mt-2 text-lot-stone">
          Review consented ADU feasibility snapshots matched to your service area.
        </p>
        {loadError && (
          <div role="alert" className="mt-4 rounded-none border border-status-blocked/20 bg-status-blocked-soft p-3 text-sm text-status-blocked">
            {loadError}
          </div>
        )}
          {checkoutReturn && <CheckoutReturnNotice state={checkoutReturn} />}
          {!profile ? (
            <BuilderProfileForm
              defaults={{ companyName: displayName || "", contactEmail: email }}
              onSave={handleSaveProfile}
            />
          ) : (
            <div className="mt-6 space-y-6">
              <nav aria-label="Dashboard views" className="flex border-b border-lot-line">
                <button
                  type="button"
                  onClick={() => setActiveView("inbox")}
                  className={`border-b-2 px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.08em] motion-safe:transition-colors ${
                    activeView === "inbox"
                      ? "border-lot-ink text-lot-ink"
                      : "border-transparent text-lot-stone hover:text-lot-ink"
                  }`}
                >
                  Leads Inbox ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("billing")}
                  className={`border-b-2 px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.08em] motion-safe:transition-colors ${
                    activeView === "billing"
                      ? "border-lot-ink text-lot-ink"
                      : "border-transparent text-lot-stone hover:text-lot-ink"
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
    <header className="border-b border-lot-line bg-lot-chalk">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
        <Link
          href="/"
          aria-label="LotFoundry home"
          className="shrink-0 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
        >
          <BrandLockup className="h-7 w-auto" />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden min-w-0 truncate text-sm text-lot-stone sm:block">{identity}</span>
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

const CHECKOUT_RETURN_COPY: Record<
  BuilderCheckoutReturn["kind"],
  Record<CheckoutReturnState["status"], string>
> = {
  lead_unlock: {
    confirming: "Payment received. Confirming your unlock with Stripe…",
    confirmed: "Payment confirmed. The lead is unlocked and the owner contact is visible.",
    delayed:
      "Stripe has your payment, but the unlock has not reached your dashboard yet. Refresh in a minute, or select Unlock on the lead again. You will not be charged twice.",
  },
  credit_pack: {
    confirming: "Payment received. Adding your credits…",
    confirmed: "Payment confirmed. Your credits have been added.",
    delayed:
      "Stripe has your payment, but the credits have not reached your dashboard yet. Refresh in a minute. You will not be charged again.",
  },
};

/**
 * The status line shown after a Stripe success redirect while the webhook's
 * grant is confirmed. Status is always carried by an icon and words, never by
 * colour alone.
 */
function CheckoutReturnNotice({ state }: { state: CheckoutReturnState }) {
  const message = CHECKOUT_RETURN_COPY[state.target.kind][state.status];
  const tone =
    state.status === "confirmed"
      ? "border-status-eligible/30 bg-status-eligible-soft text-status-eligible"
      : state.status === "delayed"
        ? "border-status-review/30 bg-status-review-soft text-status-review"
        : "border-lot-line bg-lot-surface text-lot-ink";
  const Icon = state.status === "confirmed" ? CheckCircle2 : Clock;
  return (
    <p
      role="status"
      className={`mt-4 flex items-start gap-2 rounded-none border p-3 text-sm ${tone}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

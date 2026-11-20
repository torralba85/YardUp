"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import FeasibilityStudio from "@/components/FeasibilityStudio";
import AppStudioOnboarding from "@/components/studio/AppStudioOnboarding";
import SignedInStudioGate from "@/components/studio/SignedInStudioGate";
import { useAuth } from "@/lib/auth-context";
import { useWebBuilderAccess } from "@/lib/commerce/use-web-builder-access";
import { isNativeAppShell } from "@/lib/commerce/purchase-channel";
import { TYPICAL_MARKET } from "@/lib/typical-market";
import { parseScenarioParams, validLayoutToken } from "@/lib/scenario-url";
import { hasPendingStudioHandoff } from "@/lib/studio-handoff";import { trackStudioOpened } from "@/lib/analytics/events";
import LeadScenarioEntry from "@/components/studio/LeadScenarioEntry";
import EmailedScenarioEntry from "@/components/studio/EmailedScenarioEntry";
import { consumeEntrySource } from "@/lib/analytics/entry-source";
import { AGENT_PASS_PARAM, rememberAgentPass } from "@/lib/agent-pass";

// The native shell is fixed for the life of the page; there is nothing to observe.
const subscribeToNothing = () => () => {};

/**
 * Studio route (`/studio`). Waits for auth to resolve, redirects builders to
 * their dashboard, gives signed-in lot owners an empty address-first workspace,
 * and opens valid shared/example parcels for both guests and owners. Inside the native
 * app only, {@link AppStudioOnboarding} runs first: sign-in is required for a
 * real property, and demo cities stay open to guests.
 */
export default function StudioPage() {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const buildersAllowed = useWebBuilderAccess();
  const inNativeApp = useSyncExternalStore(subscribeToNothing, () => isNativeAppShell(), () => false);
  const [demoEntry, setDemoEntry] = useState<boolean | null>(null);
  const [studioEntryRecorded, setStudioEntryRecorded] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [layoutToken, setLayoutToken] = useState<string | null>(null);
  const initialDemoEntry = useRef<boolean | null>(null);
  const studioOpenedSent = useRef(false);

  useEffect(() => {
    // Resolve once after hydration. Studio rewrites its scenario URL during
    // editing; those updates must not remount an active workspace. A pending
    // real-property handoff takes precedence over an old sample URL.
    if (initialDemoEntry.current === null) {
      const search = new URLSearchParams(window.location.search);
      // An agent's link carries their pass code; keep it before Studio rewrites the URL.
      rememberAgentPass(search.get(AGENT_PASS_PARAM));
      const isCert = search.has("cert");
      const lead = search.get("lead");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (lead && /^[A-Za-z0-9_-]{1,128}$/.test(lead)) setLeadId(lead);
      const token = search.get("layout");
      const hasLayout = Boolean(token && validLayoutToken(token));
      if (hasLayout && token) setLayoutToken(token);
      const scenario = parseScenarioParams(search);
      initialDemoEntry.current = Boolean(
        !hasLayout && (isCert || (scenario.parcelId && !hasPendingStudioHandoff())),
      );
    }
    setDemoEntry(initialDemoEntry.current);
  }, []);

  useEffect(() => {
    if (loading || demoEntry === null || studioOpenedSent.current) return;
    studioOpenedSent.current = true;
    const entrySource = consumeEntrySource();
    const deviceMode =
      typeof window !== "undefined" && window.innerWidth < 800
        ? "mobile"
        : "desktop";
    trackStudioOpened({
      device_mode: deviceMode,
      auth_state: user ? "signed_in" : "guest",
      entry_source: entrySource,
      parcel_mode: demoEntry ? "preset" : (layoutToken ? "live" : undefined),
    });
    setStudioEntryRecorded(true);
  }, [loading, user, demoEntry, layoutToken]);

  useEffect(() => {
    const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const token = search?.get("layout");
    const hasLayout = Boolean(token && validLayoutToken(token));
    if (buildersAllowed && !loading && profile?.role === "builder" && !layoutToken && !hasLayout && !/^[A-Za-z0-9_-]{1,128}$/.test(search?.get("lead") ?? "")) {
      router.replace("/builder");
    }
  }, [buildersAllowed, loading, profile, router, layoutToken]);

  // AuthProvider re-enters `loading` on every auth event (sign-in, token
  // refresh, sign-out), not just the first. Swapping in the arrival plate then
  // would unmount the app onboarding mid-flow, so after the first resolution
  // it stays mounted. Builder accounts also use the homeowner Studio in the app.
  const [authSettled, setAuthSettled] = useState(false);
  if (!loading && !authSettled) setAuthSettled(true);
  // Keep the restored study mounted during auth/token updates, including any edits made since opening it.
  if (leadId && authSettled && studioEntryRecorded) return <LeadScenarioEntry requestId={leadId} />;
  if (layoutToken && authSettled && studioEntryRecorded) {
    return <EmailedScenarioEntry token={layoutToken} />;
  }
  if (inNativeApp && authSettled && studioEntryRecorded) {
    return <AppStudioOnboarding user={user} />;
  }

  // Dawn arrival plate: auth resolution is the first thing a landing visitor
  // sees after the ramp, so it must keep the money moment alive (DESIGN.md
  // seam rule: money-green figure within 3s, no spinner-on-white). Parchment
  // ground so the landing's 520ms dawn ramp lands on a continuous surface.
  if (
    loading ||
    !studioEntryRecorded ||
    (!layoutToken && buildersAllowed && profile?.role === "builder") ||
    (user && demoEntry === null)
  ) {
    return (
      <div role="status" className="flex h-[100dvh] items-center justify-center bg-lot-chalk">
        <div className="px-6 text-center">
          <p className="lf-kicker-dense text-lot-stone">
            Opening studio · typical supported markets
          </p>
          <p data-money className="lf-money-lg mt-3 text-lot-ink">
            {TYPICAL_MARKET.rentBand}
            <span className="ml-1 font-sans text-sm font-normal text-lot-stone">/mo</span>
          </p>
          <p className="lf-caption mt-3 text-lot-stone">Estimates, not guarantees.</p>
        </div>
      </div>
    );
  }

  // A sample URL gets the same studio a guest gets, so its own URL restore
  // decides the mobile starting step (default scenario -> Find, shared -> Earn).
  return user && !demoEntry ? <SignedInStudioGate user={user} /> : <FeasibilityStudio />;
}

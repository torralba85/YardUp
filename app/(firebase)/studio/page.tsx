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
import { parseScenarioParams } from "@/lib/scenario-url";
import { peekAddressQuery } from "@/lib/address-handoff";
import { peekInitialParcel } from "@/lib/parcel-handoff";
import { trackStudioOpened } from "@/lib/analytics/events";
import EmailedScenarioEntry from "@/components/studio/EmailedScenarioEntry";
import { validLayoutToken } from "@/lib/scenario-share-url";
import { consumeEntrySource } from "@/lib/analytics/entry-source";

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
  const [layoutToken, setLayoutToken] = useState<string | null>(null);
  const initialDemoEntry = useRef<boolean | null>(null);
  const studioOpenedSent = useRef(false);

  useEffect(() => {
    // Resolve once after hydration. Studio rewrites its scenario URL during
    // editing; those updates must not remount an active workspace. A pending
    // real-property handoff takes precedence over an old sample URL.
    if (initialDemoEntry.current === null) {
      const search = new URLSearchParams(window.location.search);
      const isCert = search.has("cert");
      const token = search.get("layout");
      // Freeze the external URL at hydration; later Studio URL edits must not remount the study.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (token && validLayoutToken(token)) setLayoutToken(token);
      const scenario = parseScenarioParams(search);
      initialDemoEntry.current = Boolean(
        isCert || (token && validLayoutToken(token)) || (scenario.parcelId && !peekAddressQuery() && !peekInitialParcel()),
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
      parcel_mode: demoEntry ? "preset" : undefined,
    });
    setStudioEntryRecorded(true);
  }, [loading, user, demoEntry]);

  useEffect(() => {
    if (buildersAllowed && !loading && profile?.role === "builder") {
      router.replace("/builder");
    }
  }, [buildersAllowed, loading, profile, router]);

  // AuthProvider re-enters `loading` on every auth event (sign-in, token
  // refresh, sign-out), not just the first. Swapping in the arrival plate then
  // would unmount the app onboarding mid-flow, so after the first resolution
  // it stays mounted. Builder accounts also use the homeowner Studio in the app.
  const [authSettled, setAuthSettled] = useState(false);
  if (!loading && !authSettled) setAuthSettled(true);
  // Keep the restored study mounted during auth/token updates, including any edits made since opening it.
  if (layoutToken && authSettled && studioEntryRecorded && !(buildersAllowed && profile?.role === "builder")) {
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
    (buildersAllowed && profile?.role === "builder") ||
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

"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { User } from "firebase/auth";
import { ArrowLeft, ArrowRight } from "lucide-react";
import FeasibilityStudio from "@/components/FeasibilityStudio";
import { AuthModal, type AuthModalCloseReason } from "@/components/auth/AuthModal";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { parcelPresets } from "@/lib/feasibility";
import { parseScenarioParams } from "@/lib/scenario-url";
import SignedInStudioGate from "./SignedInStudioGate";

type Step = "welcome" | "sign-in" | "guide" | "studio";
type Destination = { kind: "property" } | { kind: "demo"; parcelId: string };
type OnboardingEntry = { step: Step; destination: Destination };

const STEPS: readonly Step[] = ["welcome", "sign-in", "guide", "studio"];
/** Set once the visitor has read the guide, so returning members open straight into the Studio. */
export const APP_GUIDE_SEEN_KEY = "lf:app-guide-seen";
/** `history.state` keys: the step and a demo preset id only, never an address. */
const STEP_STATE_KEY = "lfAppOnboardingStep";
const DEMO_STATE_KEY = "lfAppOnboardingDemo";

function readEntry(state: unknown): OnboardingEntry | null {
  const record = state as Record<string, unknown> | null;
  const step = record?.[STEP_STATE_KEY];
  if (!STEPS.includes(step as Step)) return null;
  const demo = record?.[DEMO_STATE_KEY];
  const isPreset = typeof demo === "string" && parcelPresets.some((preset) => preset.id === demo);
  return { step: step as Step, destination: isPreset ? { kind: "demo", parcelId: demo } : { kind: "property" } };
}

/** Merge an entry into existing history state so the router's and journey's keys survive. */
function withEntry(state: unknown, { step, destination }: OnboardingEntry) {
  const { [DEMO_STATE_KEY]: _previousDemo, ...rest } = (state ?? {}) as Record<string, unknown>;
  void _previousDemo;
  return {
    ...rest,
    [STEP_STATE_KEY]: step,
    ...(destination.kind === "demo" ? { [DEMO_STATE_KEY]: destination.parcelId } : {}),
  };
}

const primaryButton =
  "flex min-h-12 w-full items-center justify-between gap-[18px] rounded-[3px] bg-lot-orange px-[19px] py-3 text-left text-sm font-bold text-lot-ink hover:bg-lot-orange-hover focus-visible:outline-2 focus-visible:outline-offset-[5px] focus-visible:outline-lot-orange-ink motion-safe:transition-colors motion-safe:duration-[180ms]";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-[5px] focus-visible:outline-lot-orange-ink";

function readGuideSeen(): boolean {
  try {
    return window.localStorage.getItem(APP_GUIDE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberGuideSeen() {
  try {
    window.localStorage.setItem(APP_GUIDE_SEEN_KEY, "1");
  } catch {
    // Storage blocked: the guide simply shows again next launch.
  }
}

function cityLabel(city: string) {
  return city.replace(/\s+\d{5}(-\d{4})?$/, "");
}

/**
 * Native-app entry to the Studio (Android TWA and iOS shell only; the web keeps
 * its direct Studio). Welcome → quick guide → address-first workspace uses
 * the same one-lookup guest allowance as the web. Demo cities need no account.
 * Each screen gets a history entry so the Android back
 * gesture steps back through onboarding instead of leaving the app.
 */
export default function AppStudioOnboarding({ user }: { user: User | null }) {
  // A remount (an auth refresh, a reload, a restored tab) resumes from the
  // current history entry instead of dropping the visitor back on Welcome.
  const [initialEntry] = useState<OnboardingEntry>(
    () =>
      readEntry(window.history.state) ?? {
        step: user ? (readGuideSeen() ? "studio" : "guide") : "welcome",
        destination: { kind: "property" },
      },
  );
  const [{ step, destination }, setEntry] = useState<OnboardingEntry>(initialEntry);
  const [authOpen, setAuthOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousView = useRef<Step | null>(null);

  // A signed-in visitor has nothing to do on the legacy sign-in screen.
  // Guest property studies use FeasibilityStudio, never the private gate.
  let view = step;
  if (view === "sign-in" && user) view = "guide";

  useEffect(() => {
    window.history.replaceState(withEntry(window.history.state, initialEntry), "", window.location.href);
  }, [initialEntry]);

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      // Entries without the key belong to someone else (the Studio journey).
      const restored = readEntry(event.state);
      if (restored) setEntry(restored);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Move focus and scroll to the new screen's heading so each screen change is
  // announced, but leave the first render's focus alone.
  useEffect(() => {
    if (previousView.current !== null && previousView.current !== view && view !== "studio") {
      window.scrollTo(0, 0);
      headingRef.current?.focus();
    }
    previousView.current = view;
  }, [view]);

  function go(
    next: Step,
    { replace = false, url = window.location.href, to = destination }: { replace?: boolean; url?: string; to?: Destination } = {},
  ) {
    const entry = { step: next, destination: to };
    const state = withEntry(window.history.state, entry);
    if (replace) window.history.replaceState(state, "", url);
    else window.history.pushState(state, "", url);
    setEntry(entry);
  }

  function exploreProperty() {
    go("guide", { to: { kind: "property" } });
  }

  function chooseDemo(parcelId: string) {
    go("guide", { to: { kind: "demo", parcelId } });
  }

  function openStudio() {
    rememberGuideSeen();
    if (destination.kind === "demo") {
      // The Studio reads its lot from the URL on mount, so write it first. A
      // shared link for the same lot keeps its design parameters.
      const current = parseScenarioParams(new URLSearchParams(window.location.search));
      const url =
        current.parcelId === destination.parcelId
          ? window.location.href
          : `${window.location.pathname}?parcel=${encodeURIComponent(destination.parcelId)}`;
      go("studio", { url });
    } else {
      go("studio");
    }
  }

  function handleAuthClose(reason: AuthModalCloseReason) {
    setAuthOpen(false);
    // Signing in finishes the sign-in screen: replace it so Back from the guide
    // returns to the welcome, not to a form the visitor has already completed.
    if (reason === "signed-in") go("guide", { replace: true });
  }

  if (view === "studio") {
    if (destination.kind === "demo") return <FeasibilityStudio demoChosen nativeShell />;
    return <PropertyStudio user={user} />;
  }

  if (view === "welcome") {
    return (
      <Screen testId="app-welcome">
        <figure className="-mx-[6%] mt-2">
          {/* Existing compressed concept artwork also used on the landing page. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/a-lot-more/parcel-after-mobile.webp"
            width={768}
            height={512}
            fetchPriority="high"
            alt="Illustrative model of a family home with a small orange backyard home and garden"
            className="h-[clamp(150px,26dvh,250px)] w-full object-contain"
          />
          <figcaption className="text-center text-[11px] text-lot-stone">
            Illustrative concept. Your property will be different.
          </figcaption>
        </figure>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-lot-stone">Welcome to LotFoundry</p>
        <Heading headingRef={headingRef}>A little more room for life.</Heading>
        <p className="mt-3 text-[15px] leading-relaxed text-lot-stone">
          See what a backyard home could add to your property — for family, for income, or for what&rsquo;s next.
        </p>

        <button type="button" onClick={exploreProperty} className={`${primaryButton} mt-7`}>
          Explore my property <ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <p className="mt-2 text-xs leading-relaxed text-lot-stone">
          {user ? "Signed in. Your studies save to your account." : "Your first address lookup is free. Create an account to save studies or explore another address."}
        </p>

        <section aria-labelledby="app-demo-heading" className="mt-8 border-t border-lot-line pt-6">
          <h2 id="app-demo-heading" className="font-display text-[22px] font-medium tracking-[-0.035em]">
            Or try a demo city
          </h2>
          <p className="mt-1 text-sm text-lot-stone">No account needed. Sample lots with typical local rules.</p>
          <ul className="mt-4 space-y-2">
            {parcelPresets.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => chooseDemo(preset.id)}
                  className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-[3px] border-[1.5px] border-lot-ink px-4 py-2 text-left hover:bg-lot-line motion-safe:transition-colors motion-safe:duration-[180ms] ${focusRing}`}
                >
                  <span>
                    <span className="block text-sm font-bold">{cityLabel(preset.city)}</span>
                    <span className="block text-xs text-lot-stone">{preset.name}</span>
                  </span>
                  <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </Screen>
    );
  }

  if (view === "sign-in") {
    return (
      <Screen testId="app-sign-in" onBack={() => go("welcome")}>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-lot-stone">Your property</p>
        <Heading headingRef={headingRef}>Keep exploring your property.</Heading>
        <p className="mt-3 text-[15px] leading-relaxed text-lot-stone">
          Your first address lookup is free. Sign in to save studies and explore more addresses.
        </p>
        <ul className="mt-6 space-y-3 text-sm leading-relaxed">
          <li className="border-l-2 border-lot-ink pl-3">Explore another address with available parcel and market data.</li>
          <li className="border-l-2 border-lot-ink pl-3">Save studies and reports to your account.</li>
        </ul>
        <button type="button" onClick={() => setAuthOpen(true)} className={`${primaryButton} mt-8`}>
          Sign in or create account <ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go("welcome")}
          className={`mt-3 min-h-11 w-full rounded-[3px] text-sm font-semibold underline underline-offset-4 ${focusRing}`}
        >
          Try a demo city instead
        </button>
        <AuthModal isOpen={authOpen} onClose={handleAuthClose} />
      </Screen>
    );
  }

  const demo = destination.kind === "demo" ? parcelPresets.find((preset) => preset.id === destination.parcelId) : undefined;
  const guide = [
    demo
      ? { title: `Start in ${cityLabel(demo.city)}`, copy: "A sample lot with typical local rules and rents. Estimates are labelled as demo data." }
      : { title: "Find your lot", copy: "Search your address. Review available parcel and market data, with missing facts and planning assumptions clearly labelled." },
    { title: "Shape your backyard home", copy: "Choose a size and roof style, then see it placed on the lot in 3D." },
    { title: "Check the numbers", copy: "Review estimated cost and rent, and what to confirm with your city." },
  ];

  return (
    <Screen testId="app-guide" onBack={() => go("welcome")}>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-lot-stone">Quick guide</p>
      <Heading headingRef={headingRef}>How the Studio works.</Heading>
      <ol aria-label="How the Studio works" className="mt-7 space-y-5">
        {guide.map((item, index) => (
          <li key={item.title} className="grid grid-cols-[28px_1fr] gap-3">
            <span aria-hidden="true" className="font-display text-lg leading-6 font-medium tabular-nums">
              {index + 1}
            </span>
            <div>
              <h2 className="text-[15px] font-bold leading-6">{item.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-lot-stone">{item.copy}</p>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={openStudio} className={`${primaryButton} mt-9`}>
        Open the Studio <ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <p className="mt-4 text-xs leading-relaxed text-lot-stone">
        Early planning estimates, not permit approval or a guarantee of income.
      </p>
    </Screen>
  );
}

function PropertyStudio({ user }: { user: User | null }) {
  const [guestStudioStarted, setGuestStudioStarted] = useState(() => !user);
  // Latch only a mounted guest workspace, not the welcome/guide. Switching
  // component types on sign-in would discard its unsaved design and the
  // ParcelProvider lookup queued for auth. A signed-in entry keeps the private
  // gate; sign-out removes that gate before opening a fresh guest workspace.
  if (!user && !guestStudioStarted) setGuestStudioStarted(true);
  if (user && !guestStudioStarted) return <SignedInStudioGate user={user} />;
  return <FeasibilityStudio nativeShell />;
}

function Screen({ testId, onBack, children }: { testId: string; onBack?: () => void; children: ReactNode }) {
  return (
    <div data-testid={testId} className="min-h-dvh bg-lot-chalk text-lot-ink">
      <header className="mx-auto flex min-h-16 max-w-xl items-center justify-between gap-4 px-[6%] pt-[env(safe-area-inset-top)]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`-ml-2 inline-flex min-h-11 items-center gap-2 rounded-[3px] px-2 text-sm font-semibold ${focusRing}`}
          >
            <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" /> Back
          </button>
        ) : (
          <BrandLockup className="h-7" />
        )}
      </header>
      <main id="main-content" className="mx-auto max-w-xl px-[6%] pb-[max(28px,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}

function Heading({ headingRef, children }: { headingRef: RefObject<HTMLHeadingElement | null>; children: ReactNode }) {
  return (
    <h1
      ref={headingRef}
      tabIndex={-1}
      className="mt-2 max-w-[14ch] font-display text-[clamp(34px,9vw,46px)] leading-[1.06] font-medium tracking-[-0.055em] focus:outline-none"
    >
      {children}
    </h1>
  );
}

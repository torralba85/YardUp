"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type MouseEvent,
} from "react";
import dynamic from "next/dynamic";
import { WebBuilderOnly } from "@/components/builder/WebBuilderOnly";
import { PRIMARY_CTA_LABEL, SITE_NAV_LINKS } from "@/lib/site-nav";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Facebook,
  Instagram,
  Linkedin,
  MapPin,
  Menu,
  Plus,
  X,
  Youtube,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Field";
import { useRadioGroup } from "@/components/ui/useRadioGroup";
import { ParcelMark } from "@/components/ui/BrandLockup";
import { HERO_PHOTO, PARCEL_AFTER, PARCEL_BEFORE, STUDIO_DEMO } from "./landing-images";
import {
  calculateFeasibility,
  configForFootprint,
  defaultFinancialAssumptions,
  getParcelById,
} from "@/lib/feasibility";
import { formatPercent } from "@/lib/intl-format";
import { stashAddressQuery } from "@/lib/address-handoff";
import { stashEntrySource } from "@/lib/analytics/entry-source";
import { GOOGLE_PLAY_URL } from "@/lib/app-store-links";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { canGuestLookup } from "@/lib/guest-lookup";
import {
  hasMemberSessionHint,
  subscribeMemberSession,
} from "@/lib/member-session-hint";
import { useStorePrice } from "@/lib/commerce/store-price";
import { defaultScenarioState, serializeScenarioParams } from "@/lib/scenario-url";
import styles from "./LotMoreLanding.module.css";
import { COLOR } from "@/lib/design-tokens";
import { SampleCertificateDialog } from "./SampleCertificateDialog";
import { CostStack } from "./CostStack";
import { LotAnswerCard } from "@/components/adu/LotAnswerCard";
import { landingDemos, type LandingDemo, type LandingCity } from "@/lib/landing-demo";
import { constructionBudgetRows, type ConstructionBudget } from "@/lib/finance";


const LandingAuthGate = dynamic(() => import("../LandingAuthGate"), {
  ssr: false,
});
// Mounted only for a browser that has signed in before. The island carries the
// Firebase client SDK (~680 KB), and rendering it unconditionally would bill
// that download to every signed-out landing visit, which is the reason `/` sits
// outside the `(firebase)` route group in the first place.
const LandingMemberNav = dynamic(() => import("../LandingMemberNav"), {
  ssr: false,
});

export interface LandingScenario {
  costBreakdown?: ConstructionBudget;
  id: "conservative" | "market" | "optimistic";
  costLow: number;
  costHigh: number;
  rent: number;
  noi: number;
  payback: number;
  expenseRatio: number;
}

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function Eyebrow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className={styles.eyebrow}>
      {children}
    </p>
  );
}

// lucide-react ships no X brand mark (its `X` is the close glyph), so the
// filled logo is drawn inline at the optical size of the stroked rail icons.
function XLogo() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface LandingAddressStore {
  get: () => string;
  set: (next: string) => void;
  subscribe: (listener: () => void) => () => void;
}

function createLandingAddressStore(): LandingAddressStore {
  let value = "";
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: string) => {
      if (value === next) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Isolated address form so typing syncs hero + closing forms without re-rendering the full landing page. */
function LandingAddressForm({
  id,
  store,
  busy,
  busyLabel,
  onSubmitAddress,
}: {
  id: string;
  store: LandingAddressStore;
  busy: boolean;
  busyLabel?: string;
  onSubmitAddress: (trimmed: string, submitBtn: HTMLButtonElement | null) => void;
}) {
  const value = useSyncExternalStore(store.subscribe, store.get, store.get);
  const [hasError, setHasError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setHasError(true);
      (event.currentTarget.elements.namedItem("address") as HTMLInputElement | null)?.focus();
      return;
    }
    setHasError(false);
    onSubmitAddress(
      trimmed,
      event.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]'),
    );
  }

  return (
    <form className={styles.addressForm} onSubmit={handleSubmit} noValidate>
      <label className={styles.fieldLabel} htmlFor={`${id}-address`}>
        Property address
      </label>
      <div className={styles.inputRow}>
        <MapPin size={19} aria-hidden="true" />
        <input
          id={`${id}-address`}
          name="address"
          autoComplete="street-address"
          type="text"
          value={value}
          placeholder="1234 Coyote Brush Ct, San Diego"
          aria-invalid={hasError}
          aria-describedby={`${id}-note${hasError ? ` ${id}-error` : ""}`}
          onChange={(event) => {
            store.set(event.target.value);
            if (hasError) setHasError(false);
          }}
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={busy}
          className={styles.primaryButton}
        >
          {busy ? (busyLabel ?? "Opening…") : PRIMARY_CTA_LABEL}
          {!busy && <ArrowRight size={19} aria-hidden="true" />}
        </Button>
      </div>
      {hasError && (
        <p id={`${id}-error`} className={styles.formError} role="alert">
          Enter an address to explore your lot.
        </p>
      )}
      <p id={`${id}-note`} className={styles.formNote}>
        Free to explore. Search up to three addresses without an account.
      </p>
    </form>
  );
}

const DEFAULT_COPYRIGHT_YEAR = 2026;
const subscribeNoop = () => () => {};
const getClientCopyrightYear = () => new Date().getFullYear();
const getServerCopyrightYear = () => DEFAULT_COPYRIGHT_YEAR;

const landingUrlListeners = new Set<() => void>();
function subscribeLandingUrl(listener: () => void): () => void {
  landingUrlListeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("popstate", listener);
  }
  return () => {
    landingUrlListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", listener);
    }
  };
}
function getLandingUrlSnapshot(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}
function getServerLandingUrlSnapshot(): string {
  return "";
}
function syncLandingQuery(updates: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(updates)) {
    url.searchParams.set(k, v);
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  landingUrlListeners.forEach((listener) => listener());
}

export function LotMoreLanding({
  scenarios,
  city = "san-diego",
  demo = landingDemos[city],
}: {
  scenarios: LandingScenario[];
  city?: LandingCity;
  demo?: LandingDemo;
}) {
  // The certificate price is resolved per commerce channel rather than passed
  // in, so the Android shell quotes Play's own charged amount instead of the
  // Stripe catalog figure. Falls back to naming no figure at all.
  const certPrice = useStorePrice("certificate");
  const certificatePrice = certPrice.exact ? certPrice.amountCompact : null;
  const [addressStore] = useState(createLandingAddressStore);
  const [authOpen, setAuthOpen] = useState(false);
  const [entering, setEntering] = useState(false);
  const copyrightYear = useSyncExternalStore(
    subscribeNoop,
    getClientCopyrightYear,
    getServerCopyrightYear,
  );
  const urlSearch = useSyncExternalStore(
    subscribeLandingUrl,
    getLandingUrlSnapshot,
    getServerLandingUrlSnapshot,
  );
  const searchParams = useMemo(() => new URLSearchParams(urlSearch), [urlSearch]);
  const [scene, setScene] = useState(2);
  const [intention, setIntention] = useState(0);
  const defaultScenarioIndex = Math.max(0, scenarios.findIndex((item) => item.id === "market"));
  const paramScenario = searchParams.get("scenario");
  const scenarioIdxFromUrl = paramScenario
    ? scenarios.findIndex((item) => item.id === paramScenario)
    : -1;
  const scenarioIndex = scenarioIdxFromUrl >= 0 ? scenarioIdxFromUrl : defaultScenarioIndex;
  const rawReport = searchParams.get("report");
  const reportTab = rawReport === "0" ? 0 : rawReport === "2" ? 2 : 1;
  const [sampleOpen, setSampleOpen] = useState(false);
  const [mobileCta, setMobileCta] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const rawFootprint = searchParams.get("footprint");
  const explorerFootprint: 450 | 600 | 800 =
    rawFootprint === "450" ? 450 : rawFootprint === "800" ? 800 : 600;
  const rawRoof = searchParams.get("roof");
  const explorerRoof: "shed" | "gable" | "flat" =
    rawRoof === "gable" || rawRoof === "flat" ? rawRoof : "shed";
  // The server snapshot is always false, so the prerendered header carries the
  // plain `Sign in` link and a signed-out visit never reaches the auth island.
  const hasMemberSession = useSyncExternalStore(
    subscribeMemberSession,
    hasMemberSessionHint,
    () => false,
  );
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const closingRef = useRef<HTMLElement>(null);
  const manualSceneAtRef = useRef(0);
  const pendingAddress = useRef("");
  const submitButton = useRef<HTMLButtonElement | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const scenario = scenarios[scenarioIndex];
  const sample = scenarios.find((item) => item.id === "market") ?? scenarios[0];

  const hotspots = [
    {
      id: "01",
      title: "Proposed 600 sq ft ADU",
      metric: "24′ × 25′ footprint · 1 bed",
      detail: "Positioned in the rear yard envelope with full-height southern glazing and private deck access.",
      x: "66%",
      y: "54%",
    },
    {
      id: "02",
      title: "Modeled Setback Buffer",
      metric: "5′ rear · 5′ side clearance",
      detail: "Automated boundary offset checks rear, side, and house-to-ADU separation rules in real time.",
      x: "80%",
      y: "42%",
    },
    {
      id: "03",
      title: "Primary Residence Context",
      metric: "1,420 sq ft existing · 32% lot coverage",
      detail: "Preserves existing yard sightlines and calculates remaining allowable impervious coverage.",
      x: "34%",
      y: "46%",
    },
  ];
  // One inspection point at a time: a radio group, so the pins announce as a
  // choice and the arrow keys move between them.
  const hotspotGroup = useRadioGroup({
    value: activeHotspot,
    onChange: setActiveHotspot,
    values: hotspots.map((_, index) => index),
  });

  // One chapter per parcel scene; scroll (or the scene picker) advances them.
  const storyChapters = [
    {
      title: "Start with what’s there.",
      detail: "Your house, your yard, and the lines local rules draw around them.",
    },
    {
      title: "Find what fits.",
      detail: "Setbacks, separation and lot coverage, checked as you place a backyard home.",
    },
    {
      title: "See the possibility.",
      detail: "A 600 sq ft backyard home placed inside the modeled setbacks. The numbers section prices it.",
    },
  ];

  const explorerConfig = useMemo(
    () =>
      explorerFootprint === 600 && explorerRoof === "shed"
        ? defaultScenarioState.config
        : configForFootprint(explorerFootprint, {
            ...defaultScenarioState.config,
            roof: explorerRoof,
          }),
    [explorerFootprint, explorerRoof],
  );
  const explorerResult = useMemo(
    () =>
      calculateFeasibility(
        getParcelById(demo.parcelId),
        explorerConfig,
        { ...defaultFinancialAssumptions, rentScenario: sample.id },
      ),
    [demo.parcelId, explorerConfig, sample.id],
  );
  const explorerCoverage = Math.round(explorerResult.coveragePercent);

  const intentions = [
    {
      label: "For family",
      lead: "A 600 sq ft, 1-bedroom concept.",
      copy: "Keep the people you love nearby, with a little more independence for everyone.",
    },
    {
      label: "For income",
      lead: `${money(sample.rent)}/mo estimated market rent in this demo.`,
      copy: "Explore what a small home could earn, and what it might take to bring it to life.",
    },
    {
      label: "For what’s next",
      lead: "One concept, many uses over time.",
      copy: "A home for grown children, future plans, or the life you haven’t quite imagined yet.",
    },
  ];
  const reportScenario = scenario;
  const sampleHref = `/studio?${serializeScenarioParams({
    ...defaultScenarioState,
    parcelId: demo.parcelId,
    pose: undefined,
    assumptions: { ...defaultScenarioState.assumptions, rentScenario: sample.id },
  })}`;
  const explorerSampleHref = `/studio?${serializeScenarioParams({
    ...defaultScenarioState,
    parcelId: demo.parcelId,
    config: explorerConfig,
    pose: undefined,
    assumptions: { ...defaultScenarioState.assumptions, rentScenario: sample.id },
  })}`;

  useEffect(() => {
    const update = () => {
      const hero = heroRef.current?.getBoundingClientRect();
      const closing = closingRef.current?.getBoundingClientRect();
      setMobileCta(
        Boolean(
          hero &&
          hero.bottom < 0 &&
          closing &&
          closing.top > window.innerHeight,
        ),
      );
    };
    const observer = new IntersectionObserver(update);
    if (heroRef.current) observer.observe(heroRef.current);
    if (closingRef.current) observer.observe(closingRef.current);
    update();
    return () => observer.disconnect();
  }, []);

  // The model section pins its stage and lets scroll walk the parcel from
  // today to the possibility. Only with motion allowed and room for the
  // stage: otherwise the section stays in normal flow and the scene picker
  // alone drives it. Crossing a third of the travel changes the scene, so a
  // scene picked by hand holds until the visitor scrolls into another band.
  useEffect(() => {
    const section = storyRef.current;
    if (!section || typeof window.matchMedia !== "function") return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-width: 801px) and (min-height: 700px)");
    let frame = 0;
    let band = -1;
    let isPinned = false;
    const update = () => {
      frame = 0;
      if (!motionQuery.matches) {
        if (isPinned) {
          delete section.dataset.pinned;
          section.style.removeProperty("--story-progress");
          isPinned = false;
        }
        band = -1;
        return;
      }
      if (!isPinned) {
        section.dataset.pinned = "true";
        isPinned = true;
      }
      // Read geometry cleanly without mutating DOM attributes on every scroll frame.
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      section.style.setProperty("--story-progress", progress.toFixed(4));
      const next = progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2;
      if (next !== band) {
        band = next;
        // Guard against a focus-triggered scroll rAF overwriting an immediate keyboard/pointer pick.
        if (performance.now() - manualSceneAtRef.current > 300) {
          setScene(next);
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motionQuery.addEventListener("change", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motionQuery.removeEventListener("change", schedule);
      delete section.dataset.pinned;
      section.style.removeProperty("--story-progress");
    };
  }, []);

  // Sections below the model rise into place once, as they enter the view.
  // The hidden state is only applied after this runs, so a page without
  // JavaScript, or with reduced motion, shows everything at rest.
  useEffect(() => {
    const page = pageRef.current;
    if (!page || typeof window.matchMedia !== "function" || typeof IntersectionObserver !== "function") return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    const targets = Array.from(
      page.querySelectorAll<HTMLElement>(
        [styles.howSection, styles.numbersSection, styles.reportSection, styles.faqSection, styles.closing]
          .map((name) => `.${name} > *`)
          .join(", "),
      ),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add(styles.revealIn);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    for (const target of targets) {
      target.classList.add(styles.reveal);
      observer.observe(target);
    }
    return () => {
      observer.disconnect();
      for (const target of targets) target.classList.remove(styles.reveal, styles.revealIn);
    };
  }, []);

  const handleClosingSubmit = useCallback(
    (trimmed: string, submitBtn: HTMLButtonElement | null) => {
      submitButton.current = submitBtn;
      pendingAddress.current = trimmed;
      if (canGuestLookup()) {
        stashAddressQuery(pendingAddress.current);
        stashEntrySource("landing_cta");
        setEntering(true);
        router.push("/studio");
        return;
      }
      setAuthOpen(true);
    },
    [router],
  );

  function focusHeroAddress(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const input = document.getElementById("hero-address");
    input?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: no-preference)").matches ? "smooth" : "instant",
    });
    input?.focus({ preventScroll: true });
  }

  function heroLotAnswer() {
    return (
      <LotAnswerCard
        surface="landing"
        onAuthGateRequired={(trimmed) => {
          pendingAddress.current = trimmed;
          setAuthOpen(true);
        }}
        renderForm={({ submit: runHeroLookup, loading: answerLoading }) => (
          <LandingAddressForm
            id="hero"
            store={addressStore}
            busy={authOpen || entering || answerLoading}
            busyLabel={answerLoading ? "Checking…" : "Opening…"}
            onSubmitAddress={(trimmed, submitBtn) => {
              submitButton.current = submitBtn;
              void runHeroLookup(trimmed);
            }}
          />
        )}
      />
    );
  }

  return (
    <>
      <div ref={pageRef} className={styles.page} data-theme="a-lot-more">
        <header
          className={styles.header}
          onKeyDown={(event) => {
            if (event.key === "Escape" && menuOpen) {
              setMenuOpen(false);
              menuButton.current?.focus();
            }
          }}
        >
          <Link href="/" translate="no" className={styles.brand} aria-label="LotFoundry home">
            <ParcelMark />
            LotFoundry
            <span className={styles.brandDot} aria-hidden="true" />
          </Link>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            {SITE_NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <WebBuilderOnly>
              <Link href="/signup?role=builder" prefetch={false}>
                Register as a builder
              </Link>
            </WebBuilderOnly>
          </nav>
          <div className={styles.headerActions}>
            {hasMemberSession ? (
              <LandingMemberNav />
            ) : (
              <Link href="/login" prefetch={false} className={styles.signIn}>
                Sign in
              </Link>
            )}
            <a className={styles.headerCta} href="#start" onClick={focusHeroAddress}>
              {PRIMARY_CTA_LABEL}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <button
              ref={menuButton}
              type="button"
              className={styles.menuButton}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X aria-hidden="true" />
              ) : (
                <Menu aria-hidden="true" />
              )}
            </button>
          </div>
          {menuOpen && (
            <nav
              id="landing-mobile-menu"
              aria-label="Mobile navigation"
              className={styles.mobileMenu}
            >
              {SITE_NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                  {link.label}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ))}
              <WebBuilderOnly>
                <Link
                  href="/signup?role=builder"
                  prefetch={false}
                  onClick={() => setMenuOpen(false)}
                >
                  Register as a builder
                </Link>
              </WebBuilderOnly>
            </nav>
          )}
        </header>

        <main id="main-content">
          <section
            ref={heroRef}
            className={styles.hero}
            aria-label="Explore your lot"
            id="start"
          >
            <div className={styles.heroMedia}>
              {/* Full-bleed photograph under a carbon scrim. It paints on the
                  first frame (only its transform animates), so it stays a
                  fast LCP element. */}
              <picture className={styles.pictureContents}>
                <source type="image/avif" srcSet={HERO_PHOTO.avifSrcSet} sizes="(max-width: 640px) 384px, 100vw" />
                <img
                  className={styles.heroPhoto}
                  src={HERO_PHOTO.src}
                  srcSet={HERO_PHOTO.srcSet}
                  sizes="(max-width: 640px) 384px, 100vw"
                  width={1536}
                  height={1024}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  alt="Illustrative concept of an orange backyard home with full-height glazing and a timber deck in a planted garden"
                />
              </picture>
            </div>
            <div className={styles.heroCopy}>
              <p className={styles.heroKicker}>
                <span />
                {city === "seattle" ? "Small homes. Big possibility." : `${demo.city} ADU feasibility · see what fits your lot`}
              </p>
              {/* Each line rises out of its own mask, in reading order. */}
              <p className={styles.heroDisplay}>
                <span className={styles.displayLine}>
                  <span>A LOT</span>
                </span>{" "}
                <span className={styles.displayLine}>
                  <span>
                    MORE<span className={styles.orange}>.</span>
                  </span>
                </span>
              </p>
              <h1 className={styles.heroLead}>Explore an ADU on your lot in 3D.</h1>
              <p className={styles.heroDescription}>
                {city === "san-diego"
                  ? "Enter a California address to explore a backyard-home layout and see an estimated rent range where data is available."
                  : "Explore a backyard-home layout and see an estimated rent range where data is available."}
              </p>
              {heroLotAnswer()}
            </div>
            <div className={styles.heroAside}>
              {/* A real engine result, one tap from the address box. A cold
                  visitor who is not ready to type an address can still see
                  what the studio produces, which the photograph alone
                  does not show. Its visible text is its accessible name
                  (WCAG 2.5.3), so "See a sample result" works for voice
                  control and the CTA line names the demo and city. */}
              <Link
                className={styles.sampleResult}
                href={sampleHref}
                prefetch={false}
                data-ui
                onClick={() => {
                  stashAddressQuery("");
                  stashEntrySource("landing_cta");
                }}
              >
                <span className={styles.sampleKicker}>
                  Just looking? See a sample result
                </span>
                <dl className={styles.sampleFigures}>
                  <div>
                    <dt>Est. rent</dt>
                    <dd>
                      {money(sample.rent)}
                      <small>/mo</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Simple payback</dt>
                    <dd>
                      {sample.payback}
                      <small> yrs</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Build cost</dt>
                    <dd>
                      {money(sample.costLow / 1000)}K–
                      {money(sample.costHigh / 1000)}K
                    </dd>
                  </div>
                </dl>
                <span className={styles.sampleCta}>
                  {demo.name} demo, {demo.city} · {sample.id} rent · open it in 3D
                  <ArrowRight size={17} aria-hidden="true" />
                </span>
              </Link>
              <p className={styles.heroCredit}>Illustrative backyard home concept</p>
            </div>
          </section>

          <section
            ref={storyRef}
            className={styles.story}
            id="the-model"
            aria-labelledby="story-title"
          >
            <div className={styles.storyStage}>
              <div className={styles.storyCopy}>
                <p className={styles.heroKicker}>
                  <span />
                  The model
                </p>
                <h2 id="story-title">
                  Watch a yard
                  <br />
                  become a home.
                </h2>
                <ol className={styles.storyChapters}>
                  {storyChapters.map((chapter, index) => (
                    <li
                      key={chapter.title}
                      aria-current={scene === index ? "step" : undefined}
                    >
                      <div>
                        <h3>{chapter.title}</h3>
                        <p>{chapter.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className={styles.storyRail} aria-hidden="true">
                  <span />
                </div>
              </div>
              <figure className={styles.heroVisual} data-ui>
                <div className={styles.artHeader}>
                  <span>ILLUSTRATIVE CONCEPT · SCALE 1:100</span>
                  <span>ORTHOGRAPHIC SITE MODEL</span>
                </div>
                <div className={styles.parcelCanvas} data-scene={scene}>
                  {/* Pre-sized local AVIF/WebP variants keep the hero useful before JS. */}
                  <picture className={styles.pictureContents}>
                    <source
                      type="image/avif"
                      srcSet={PARCEL_AFTER.avifSrcSet}
                      sizes="(max-width: 800px) 100vw, 60vw"
                    />
                    <img
                      className={styles.parcelImage}
                      src={PARCEL_AFTER.src}
                      srcSet={PARCEL_AFTER.srcSet}
                      sizes="(max-width: 800px) 100vw, 60vw"
                      width={1536}
                      height={1024}
                      fetchPriority="low"
                      loading="lazy"
                      decoding="async"
                      alt="Illustrative miniature lot with an existing house and an orange backyard home"
                    />
                  </picture>
                  {/* Each layer describes its own picture (Bing flags an empty alt);
                      the live figcaption announces which scene is showing. */}
                  <picture className={styles.pictureContents}>
                    <source
                      type="image/avif"
                      srcSet={PARCEL_BEFORE.avifSrcSet}
                      sizes="(max-width: 800px) 100vw, 60vw"
                    />
                    <img
                      className={`${styles.parcelImage} ${styles.beforeImage}`}
                      src={PARCEL_BEFORE.src}
                      srcSet={PARCEL_BEFORE.srcSet}
                      sizes="(max-width: 800px) 100vw, 60vw"
                      width={1536}
                      height={1024}
                      loading="lazy"
                      alt="Illustrative miniature lot with an existing house and an empty yard"
                    />
                  </picture>
                  <svg
                    className={styles.cadGridOverlay}
                    viewBox="0 0 1536 1024"
                    fill="none"
                    aria-hidden="true"
                  >
                    {/* Precision corner registration ticks */}
                    <path
                      d="M64 96V64H96 M1472 96V64H1440 M64 928V960H96 M1472 928V960H1440"
                      stroke={COLOR["lot-stone"]}
                      strokeWidth="2"
                      strokeOpacity="0.55"
                    />
                    {/* Subtle parcel survey boundary */}
                    <path
                      d="M270 560 L785 375 L1295 620 L765 865 Z"
                      stroke={COLOR["lot-stone"]}
                      strokeWidth="1.5"
                      strokeDasharray="6 8"
                      strokeOpacity="0.45"
                    />
                  </svg>
                  <svg
                    className={styles.footprintOverlay}
                    viewBox="0 0 1536 1024"
                    fill="none"
                    aria-hidden="true"
                  >
                    {/* Outer setback clearance envelope */}
                    <path
                      d="m745 568 295-84 202 114-275 130Z"
                      stroke={COLOR["lot-ink"]}
                      strokeWidth="2"
                      strokeDasharray="6 6"
                      strokeOpacity="0.65"
                    />
                    {/* Proposed ADU footprint with animated stroke */}
                    <path
                      className={styles.footprintPolygon}
                      d="m800 578 250-70 166 94-231 110Z"
                      fill={COLOR["lot-orange"]}
                      fillOpacity={0.22}
                      stroke={COLOR["lot-orange"]}
                      strokeWidth="5"
                      strokeDasharray="14 10"
                    />
                    {/* Architectural dimension ticks */}
                    <line
                      x1="800"
                      y1="556"
                      x2="1050"
                      y2="486"
                      stroke={COLOR["lot-ink"]}
                      strokeWidth="2"
                    />
                    <circle cx="800" cy="578" r="7" fill={COLOR["lot-orange"]} stroke={COLOR["lot-ink"]} strokeWidth="2" />
                    <circle cx="1050" cy="508" r="7" fill={COLOR["lot-orange"]} stroke={COLOR["lot-ink"]} strokeWidth="2" />
                    <circle cx="1216" cy="602" r="7" fill={COLOR["lot-orange"]} stroke={COLOR["lot-ink"]} strokeWidth="2" />
                    <circle cx="985" cy="712" r="7" fill={COLOR["lot-orange"]} stroke={COLOR["lot-ink"]} strokeWidth="2" />
                  </svg>
                  <div className={styles.sceneTag}>
                    <span className={styles.tagDot} />
                    {
                      [
                        "Your starting point",
                        "Imagine a footprint",
                        "A little more possibility",
                      ][scene]
                    }
                    <span className={styles.tagLine} />
                  </div>
                  {scene === 2 && (
                    <div
                      className={styles.hotspotLayer}
                      {...hotspotGroup.groupProps}
                      aria-label="Maquette inspection points"
                    >
                      {hotspots.map((point, index) => (
                        <button
                          key={point.id}
                          type="button"
                          className={styles.hotspotPin}
                          style={{ left: point.x, top: point.y }}
                          aria-label={`Inspect ${point.title}`}
                          {...hotspotGroup.getRadioProps(index)}
                        >
                          <span>{point.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={styles.northMark} aria-hidden="true">
                    N<ArrowUpRight size={24} strokeWidth={1.5} />
                  </div>
                </div>
                {/* The slot keeps its height while the readout comes and goes,
                    so the pinned stage does not jump between scenes. */}
                <div className={styles.readoutSlot}>
                  {scene === 2 && (
                    <div className={styles.maquetteReadout} aria-live="polite">
                      <div className={styles.maquetteReadoutTop}>
                        <span className={styles.maquetteReadoutIndex}>
                          POINT {hotspots[activeHotspot].id} / 03
                        </span>
                        <span className={styles.maquetteReadoutMetric}>
                          {hotspots[activeHotspot].metric}
                        </span>
                      </div>
                      <p className={styles.maquetteReadoutBody}>
                        <strong>{hotspots[activeHotspot].title}.</strong>{" "}
                        {hotspots[activeHotspot].detail}
                      </p>
                    </div>
                  )}
                </div>
                <Segmented
                  className={styles.sceneControls}
                  aria-label="Property illustration view"
                  value={String(scene)}
                  onChange={(value) => {
                    manualSceneAtRef.current = performance.now();
                    setScene(Number(value));
                  }}
                  options={["Today", "The footprint", "The possibility"].map(
                    (label, index) => ({
                      value: String(index),
                      label,
                    }),
                  )}
                />
                <figcaption className={styles.artCaption}>
                  <span aria-live="polite">
                    {
                      [
                        "Existing yard",
                        "Illustrative footprint",
                        "Backyard home concept",
                      ][scene]
                    }
                  </span>
                  <span>Illustrative parcel model</span>
                </figcaption>
              </figure>
            </div>
          </section>

          <section
            className={styles.howSection}
            id="how-it-works"
            aria-labelledby="how-title"
          >
            <div className={styles.demoHeading}>
              <div>
                <Eyebrow>INSIDE THE STUDIO</Eyebrow>
                <h2 id="how-title">
                  See the Studio.
                  <br />
                  Try the same lot.
                </h2>
              </div>
              <div className={styles.demoIntro}>
                <p>
                  Explore the same {explorerFootprint}&nbsp;sq&nbsp;ft {demo.name} demo in 3D. The Studio
                  shows its free rent range; the numbers below are the demo’s full estimate.
                </p>
                <Link
                  href={explorerSampleHref}
                  prefetch={false}
                  className={styles.darkButton}
                  onClick={() => {
                    stashAddressQuery("");
                    stashEntrySource("landing_cta");
                  }}
                >
                  Try the {demo.name} demo{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className={styles.demoLayout}>
              <figure className={styles.studioDemo} data-ui>
                <div className={styles.demoLabel}>
                  <span>Studio preview</span>
                  <span>{demo.name} demo, {demo.city}</span>
                </div>
                <picture>
                  <source
                    media="(max-width: 800px)"
                    srcSet={STUDIO_DEMO.mobile}
                    width={780}
                    height={1078}
                  />
                  {/* Pre-sized local captures preserve the actual demo UI. */}
                  <img
                    src={STUDIO_DEMO.desktop}
                    width={1200}
                    height={1069}
                    loading="lazy"
                    alt={`${demo.name} demo in the LotFoundry 3D studio, showing an existing home and a proposed backyard home`}
                  />
                </picture>
                <div role="region" className={styles.interactiveSandbox} aria-label="Interactive massing preview">
                  <div className={styles.sandboxControlsRow}>
                    <div className={styles.sandboxControlGroup}>
                      <span className={styles.sandboxControlLabel}>FOOTPRINT</span>
                      <Segmented
                        aria-label="Preview footprint"
                        className={styles.sandboxToggleBar}
                        value={String(explorerFootprint)}
                        onChange={(value) => {
                          syncLandingQuery({ footprint: value });
                        }}
                        options={([450, 600, 800] as const).map((sqft) => ({
                          value: String(sqft),
                          label: `${sqft}\u00A0sq\u00A0ft`,
                        }))}
                      />
                    </div>
                    <div className={styles.sandboxControlGroup}>
                      <span className={styles.sandboxControlLabel}>ROOF PROFILE</span>
                      <Segmented
                        aria-label="Preview roof profile"
                        className={styles.sandboxToggleBar}
                        value={explorerRoof}
                        onChange={(value) => {
                          syncLandingQuery({ roof: value });
                        }}
                        options={(
                          [
                            ["shed", "Shed"],
                            ["gable", "Gable"],
                            ["flat", "Flat"],
                          ] as const
                        ).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                      />
                    </div>
                  </div>
                  <div className={styles.sandboxReadoutGrid} aria-live="polite">
                    <div>
                      <span>MODELED COVERAGE</span>
                      <strong>{explorerCoverage}% of lot</strong>
                    </div>
                  </div>
                </div>
                <figcaption>
                  Explore placement, design choices, and the {demo.city} assumptions behind this demo.
                </figcaption>
              </figure>
              <div className={styles.demoSteps}>
                <ol>
                  <li
                    className={activeStep === 0 ? styles.demoStepActive : undefined}
                    onMouseEnter={() => setActiveStep(0)}
                    onFocusCapture={() => setActiveStep(0)}
                  >
                    <div>
                      <h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          aria-pressed={activeStep === 0}
                          onClick={() => setActiveStep(0)}
                          className="!min-h-11 !justify-start !px-0 !font-display !text-[inherit] !font-medium hover:!bg-transparent hover:underline"
                        >
                          Place a backyard home.
                        </Button>
                      </h3>
                      <p>
                        Explore size, roof, and placement alongside your
                        existing home and modeled setbacks.
                      </p>
                    </div>
                  </li>
                  <li
                    className={activeStep === 1 ? styles.demoStepActive : undefined}
                    onMouseEnter={() => setActiveStep(1)}
                    onFocusCapture={() => setActiveStep(1)}
                  >
                    <div>
                      <h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          aria-pressed={activeStep === 1}
                          onClick={() => setActiveStep(1)}
                          className="!min-h-11 !justify-start !px-0 !font-display !text-[inherit] !font-medium hover:!bg-transparent hover:underline"
                        >
                          Compare the estimates.
                        </Button>
                      </h3>
                      <p>
                        See the demo’s build cost, rent and payback below. Your own
                        lot’s figures come in the Certificate.
                      </p>
                      <a href="#numbers" className={styles.textLink}>
                        See the demo numbers{" "}
                        <ArrowRight size={17} aria-hidden="true" />
                      </a>
                    </div>
                  </li>
                  <li
                    className={activeStep === 2 ? styles.demoStepActive : undefined}
                    onMouseEnter={() => setActiveStep(2)}
                    onFocusCapture={() => setActiveStep(2)}
                  >
                    <div>
                      <h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          aria-pressed={activeStep === 2}
                          onClick={() => setActiveStep(2)}
                          className="!min-h-11 !justify-start !px-0 !font-display !text-[inherit] !font-medium hover:!bg-transparent hover:underline"
                        >
                          Plan your next questions.
                        </Button>
                      </h3>
                      <p>
                        Review what needs local confirmation and what the
                        complete certificate includes.
                      </p>
                      <a href="#report" className={styles.textLink}>
                        See what’s included{" "}
                        <ArrowRight size={17} aria-hidden="true" />
                      </a>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
            <div className={styles.intentBand}>
              <div>
                <h3>What would you make room for?</h3>
                <Segmented
                  className={styles.intentControls}
                  aria-label="What would your backyard home be for?"
                  value={String(intention)}
                  onChange={(value) => setIntention(Number(value))}
                  options={intentions.map((item, index) => ({
                    value: String(index),
                    label: item.label,
                  }))}
                />
              </div>
              <p aria-live="polite"><strong>{intentions[intention].lead}</strong> {intentions[intention].copy}</p>
            </div>
          </section>

          <section
            className={styles.numbersSection}
            id="numbers"
            aria-labelledby="numbers-title"
          >
            <div className={styles.numbersHeading}>
              <div>
                <Eyebrow>THE DEMO ESTIMATES</Eyebrow>
                <h2 id="numbers-title">
                  Price the
                  <br />
                  <span>possibility.</span>
                </h2>
              </div>
              <p>
                Change the demo’s rent assumption
                <br />
                to see how the estimate responds.
              </p>
            </div>
            <div className={styles.scenarioBar}>
              <span>
                <span className={styles.orangeDot} />
                {demo.name.toUpperCase()} DEMO, {demo.city.toUpperCase()} · 600 SQ FT · 1 BED CONCEPT
              </span>
              <Segmented
                aria-label="Demo rent assumption"
                className={styles.scenarioControls}
                value={String(scenarioIndex)}
                onChange={(value) => {
                  const chosen = scenarios[Number(value)];
                  if (chosen) syncLandingQuery({ scenario: chosen.id });
                }}
                options={scenarios.map((item, index) => ({
                  value: String(index),
                  label: item.id,
                }))}
              />
            </div>
            <div
              className={styles.metrics}
              aria-live="polite"
              aria-atomic="true"
            >
              <div>
                <p>Estimated build cost</p>
                <strong>
                  {money(scenario.costLow / 1000)}K<span>–</span>
                  {money(scenario.costHigh / 1000)}K
                </strong>
                <small>One-time project estimate</small>
              </div>
              <div>
                <p>Estimated rental income</p>
                <strong>
                  {money(scenario.rent)}
                  <small>/mo</small>
                </strong>
                <small>Before expenses and financing</small>
              </div>
              <div>
                <p>Estimated simple payback</p>
                <strong>
                  {scenario.payback}
                  <small>years</small>
                </strong>
                <small>Based on operating income</small>
              </div>
            </div>
            <div role="region" className={styles.telemetryStrip} aria-label="Operating cash flow breakdown">
              <div className={styles.telemetryItem}>
                <span>ANNUAL OPERATING INCOME</span>
                <strong>{money(scenario.noi)}/yr</strong>
              </div>
              <div className={styles.telemetryItem}>
                <span>NET OPERATING MARGIN</span>
                <strong>{formatPercent(1 - scenario.expenseRatio, { digits: 1 })}</strong>
              </div>
              <div className={styles.telemetryItem}>
                <span>MODELED EXPENSE ALLOWANCE</span>
                <strong>{formatPercent(scenario.expenseRatio, { digits: 1 })} of gross</strong>
              </div>
            </div>
            {scenario.costBreakdown && (
              <CostStack budget={scenario.costBreakdown} />
            )}
            <div className={styles.numberNotes}>
              <details>
                <summary>
                  What’s behind these numbers?
                  <Plus size={17} aria-hidden="true" />
                </summary>
                <p>
                  The curated {demo.name} demo in {demo.city}, calculated by the Studio engine: 600&nbsp;sq&nbsp;ft, cedar finish, shed roof, openings included. Base
                  construction is $340/sq&nbsp;ft, with an 18% soft-cost allowance.
                  Operating expenses use{" "}
                  {formatPercent(scenario.expenseRatio, { digits: 1 })} of gross rent;
                  estimated annual net operating income is {money(scenario.noi)}{" "}
                  before financing and income tax. Simple payback uses the
                  central project estimate divided by this operating income.{" "}
                  {demo.note ?? "Demo rent bands are curated assumptions."} Artwork is illustrative.
                </p>
              </details>
              <a href="#start" className={styles.textLink} onClick={focusHeroAddress}>
                {PRIMARY_CTA_LABEL}
                <ArrowRight size={19} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.estimateNote}>
              Calculated with the Studio engine. Compare 3 rent assumptions before planning your next step.
            </p>
          </section>

          <section
            className={styles.reportSection}
            id="report"
            aria-labelledby="report-title"
          >
            <div className={styles.reportCopy}>
              <Eyebrow>WHAT’S INCLUDED</Eyebrow>
              <h2 id="report-title">
                Explore for free.
                <br />
                Prepare your brief.
              </h2>
              <p>
                Take a clear project brief to your partner, builder, or lender.
                The Certificate of Feasibility helps you test financing assumptions,
                surface site questions, and compare construction scopes.
              </p>
              <dl className={styles.offerComparison}>
                <div>
                  <dt>
                    <span>Explore in the Studio</span>
                    <strong>Free</strong>
                  </dt>
                  <dd>
                    Try a 3D layout and see an estimated monthly rent range where data is available.
                    Search up to three addresses without an account.
                  </dd>
                </div>
                <div>
                  <dt>
                    <span>Certificate of Feasibility</span>
                    <strong>
                      {certificatePrice ?? "Price at checkout"}
                      {certificatePrice && <small> one-time</small>}
                    </strong>
                  </dt>
                  <dd>
                    See property-specific build-cost estimates, payback, financing scenarios,
                    fee and permit checks to confirm locally, and a checklist for comparing
                    builder quotes. Print or save as PDF, export CSV, or share a link.
                  </dd>
                </div>
              </dl>
              <ul className={styles.offerBenefits}>
                <li><strong>Test monthly cash flow.</strong> Compare a HELOC and a construction-to-permanent loan after the operating allowance and loan payments.</li>
                <li><strong>Spot questions before requesting quotes.</strong> Review modeled setbacks, coverage, utility scope, and fee checks.</li>
                <li><strong>Give builders the same brief.</strong> Bring a 12-item scope checklist and a printable PDF to your next conversation.</li>
              </ul>
            </div>
            <div className={styles.reportPreview} data-ui>
              <Segmented
                className={styles.reportTabs}
                aria-label="Sample report pages"
                value={String(reportTab)}
                onChange={(value) => {
                  syncLandingQuery({ report: value });
                }}
                options={["The overview", "The estimates", "Next steps"].map(
                  (label, index) => ({ value: String(index), label }),
                )}
              />
              <article
                className={styles.paper}
                aria-label="Sample feasibility report"
              >
                <div className={styles.paperTop}>
                  <span translate="no">
                    <ParcelMark />
                    LotFoundry
                  </span>
                  <span>
                    SAMPLE REPORT
                  </span>
                </div>
                <div className={styles.paperContent} aria-live="polite">
                  {reportTab === 0 && (
                    <>
                      <p className={styles.paperKicker}>
                        A FIRST LOOK AT THE POSSIBILITIES
                      </p>
                      <h3>
                        Your lot.
                        <br />A new perspective.
                      </h3>
                      <div className={styles.reportDiagram}>
                        <svg
                          viewBox="0 0 400 180"
                          role="img"
                          aria-label="Illustrative overhead diagram of an existing house and proposed backyard home"
                        >
                          <path
                            d="M20 20h360v140H20Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeDasharray="5 5"
                          />
                          <path d="M45 45h145v95H45Z" fill={COLOR["lot-line"]} />
                          <path d="M250 65h100v65H250Z" fill={COLOR["lot-orange"]} />
                          <path
                            d="M195 95h50"
                            stroke="currentColor"
                            strokeDasharray="4 4"
                          />
                          <text
                            x="117"
                            y="98"
                            textAnchor="middle"
                            fontSize="13"
                          >
                            EXISTING HOME
                          </text>
                          <text
                            x="300"
                            y="100"
                            textAnchor="middle"
                            fontSize="13"
                          >
                            CONCEPT
                          </text>
                        </svg>
                      </div>
                      <div className={styles.paperFacts}>
                        <div>
                          <span>Demo location</span>
                          <strong>{demo.city}, {demo.region}</strong>
                        </div>
                        <div>
                          <span>Proposed size</span>
                          <strong>600&nbsp;sq&nbsp;ft</strong>
                        </div>
                      </div>
                    </>
                  )}
                  {reportTab === 1 && (
                    <>
                      <p className={styles.paperKicker}>
                        {reportScenario.id.toUpperCase()} DEMO ASSUMPTIONS
                      </p>
                      <h3>
                        A clearer
                        <br />
                        financial picture.
                      </h3>
                      <dl className={styles.reportEstimates}>
                        {reportScenario.costBreakdown && constructionBudgetRows(reportScenario.costBreakdown).filter(([, value]) => value !== 0).map(([label, value]) => (
                          <div key={label}><dt>{label}</dt><dd>{money(value)}</dd></div>
                        ))}
                        <div>
                          <dt>Estimated build cost</dt>
                          <dd>
                            {money(reportScenario.costLow)}–
                            {money(reportScenario.costHigh)}
                          </dd>
                        </div>
                        <div>
                          <dt>Estimated monthly rent</dt>
                          <dd>{money(reportScenario.rent)}</dd>
                        </div>
                        <div>
                          <dt>Annual operating income</dt>
                          <dd>{money(reportScenario.noi)}</dd>
                        </div>
                        <div>
                          <dt>Simple payback</dt>
                          <dd>{reportScenario.payback} years</dd>
                        </div>
                      </dl>
                      <p className={styles.paperDetail}>
                        Same 600&nbsp;sq&nbsp;ft {demo.name} demo, {demo.city}, and selected
                        rent assumption as above. The full sample adds the financing comparison.
                      </p>
                    </>
                  )}
                  {reportTab === 2 && (
                    <>
                      <p className={styles.paperKicker}>
                        BRING THESE QUESTIONS WITH YOU
                      </p>
                      <h3>
                        A good place
                        <br />
                        to start.
                      </h3>
                      <ol className={styles.reportQuestions}>
                        <li>
                          Confirm property boundaries, setbacks, and local
                          requirements.
                        </li>
                        <li>
                          Review access, utilities, and the proposed location
                          with a professional.
                        </li>
                        <li>
                          Request project-specific construction quotes and local
                          rent comparisons.
                        </li>
                      </ol>
                      <p className={styles.paperDetail}>
                        Local review is still required before design,
                        permitting, financing, or investment decisions.
                      </p>
                    </>
                  )}
                </div>
                <div className={styles.paperBottom}>
                  <span>PRE-CONSTRUCTION FEASIBILITY BRIEF</span>
                  <ParcelMark />
                </div>
              </article>
              <p className={styles.previewNote}>
                Sample Certificate of Feasibility summary. Create yours in the Studio.
              </p>
            </div>
            <div className={styles.reportActions}>
              <div className={styles.offerActions}>
              <button type="button" className={styles.textLink} onClick={() => setSampleOpen(true)}>
                View full sample / save PDF <ArrowRight size={18} aria-hidden="true" />
              </button>
              <a href="#start" className={styles.darkButton} onClick={focusHeroAddress}>
                {PRIMARY_CTA_LABEL} <ArrowRight size={18} aria-hidden="true" />
              </a>
              </div>
              <p className={styles.reportPrice}>
                The complete Certificate is an optional one-time purchase.
                Review it in the Studio before checkout.
              </p>
            </div>
          </section>

          <section
            className={styles.faqSection}
            id="questions"
            aria-labelledby="faq-title"
          >
            <div>
              <Eyebrow>BEFORE YOU START</Eyebrow>
              <h2 id="faq-title">
                Good questions.
                <br />
                Straight answers.
              </h2>
              <Link className={styles.textLink} href="/help">
                A little more help
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.faqList}>
              {[
                [
                  "What is a backyard home?",
                  "An accessory dwelling unit, or ADU, is a smaller home on the same property as a primary residence. It can offer independent living space for family or potential rental income, subject to local requirements.",
                ],
                [
                  "Can I check my address?",
                  "Search up to three addresses without an account. Create a free account to look up more. Available parcel and market detail varies by location. The Studio shows its assumptions and flags missing information. Seattle, Portland, Austin, and San Diego demo lots are always open.",
                ],
                [
                  "How are the estimates calculated?",
                  "The Studio combines the proposed size and finish with construction assumptions, rent inputs, and operating expenses. Live-address results show their market basis when available. Demo figures use curated assumptions, and all results need local confirmation.",
                ],
                [
                  "Does this mean I can build?",
                  "No. LotFoundry helps you explore an early concept. It does not grant a permit or guarantee a buildable design. A local professional and your jurisdiction must confirm property conditions and applicable requirements.",
                ],
                [
                  "What is free, and what costs extra?",
                  `Exploring the 3D concept and viewing the estimated monthly rent range where available are free. The complete Certificate of Feasibility is a one-time${certificatePrice ? ` ${certificatePrice}` : ""} purchase. You can review what is included before checkout.`,
                ],
              ].map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <Plus size={19} aria-hidden="true" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section
            ref={closingRef}
            className={styles.closing}
            aria-labelledby="closing-title"
          >
            <ParcelMark className={styles.closingMark} />
            <div>
              <p className={styles.closingKicker}>
                A LITTLE LAND. A LOT OF POSSIBILITY.
              </p>
              <h2 id="closing-title">
                It starts with
                <br />
                your address.
              </h2>
              <p>See what more could look like on your lot.</p>
              <LandingAddressForm
                id="closing"
                store={addressStore}
                busy={authOpen || entering}
                onSubmitAddress={handleClosingSubmit}
              />
              <div className={styles.appDownload}>
                <span>Also on Android</span>
                <a className={styles.appStoreLink} href={GOOGLE_PLAY_URL}>
                  {/* Official badge from Google's Partner Marketing Hub:
                      partnermarketinghub.withgoogle.com/brands/google-play/google-play/lockups-icons-badges/ */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/landing/google-play-badge.svg"
                    alt="Get it on Google Play"
                    width={239}
                    height={71}
                    loading="lazy"
                  />
                </a>
              </div>
            </div>
            <span className={styles.closingSerial}>
              YOUR NEXT CHAPTER / LOTFOUNDRY
            </span>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerTop}>
            <p className={styles.footerTagline}>
              Early possibilities.
              <br />
              Informed next steps.
            </p>
            <nav aria-label="Footer">
              <div className={styles.footerGroup}>
                <h3>Explore</h3>
                <ul>
                  <li><Link href="/can-i-build-a-backyard-home">Can I build a backyard home?</Link></li>
                  <li><Link href="/studio" prefetch={false} onClick={() => stashEntrySource("landing_cta")}>The Studio</Link></li>
                  <li><Link href="/adu-cost-calculator">ADU cost calculator</Link></li>
                  <li><a href={GOOGLE_PLAY_URL} rel="noopener" aria-label="Android app on Google Play">Google Play</a></li>
                </ul>
              </div>
              <div className={styles.footerGroup}>
                <h3>Planning guides</h3>
                <ul>
                  <li><Link href="/adu/ca/can-i-build-an-adu">Can I build an ADU?</Link></li>
                  <li><Link href="/adu/ca">California ADU rules</Link></li>
                  <li><Link href="/adu/ca/cost">California ADU costs</Link></li>
                  <li><Link href="/adu/ca/san-diego/cost">San Diego ADU costs</Link></li>
                  <li><Link href="/adu/ca/san-diego">City of San Diego ADU rules</Link></li>
                  <li><Link href="/adu/ca/san-diego/permits">San Diego ADU permits by neighborhood</Link></li>
                </ul>
              </div>
              <div className={styles.footerGroup}>
                <h3>Demo lots</h3>
                <ul>
                  <li><Link href="/san-diego">{landingDemos["san-diego"].name} demo, {landingDemos["san-diego"].city}</Link></li>
                  <li><Link href="/seattle">{landingDemos.seattle.name} demo, {landingDemos.seattle.city}</Link></li>
                  <li><Link href="/portland">{landingDemos.portland.name} demo, {landingDemos.portland.city}</Link></li>
                  <li><Link href="/austin">{landingDemos.austin.name} demo, {landingDemos.austin.city}</Link></li>
                </ul>
              </div>
              <div className={styles.footerGroup}>
                <h3>LotFoundry</h3>
                <ul>
                  <li><Link href="/about">About us</Link></li>
                  <WebBuilderOnly><li><Link href="/signup?role=builder" prefetch={false}>Register as a builder</Link></li></WebBuilderOnly>
                  <li><Link href="/help">Get in touch</Link></li>
                </ul>
              </div>
            </nav>
            <a
              href="#start"
              className={styles.backTop}
              aria-label="Back to top"
            >
              <ArrowUp size={27} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.footerNote}>
            <p className={styles.footerDisclaimer}>
              <strong>Planning estimates only.</strong> Demo lots and imagery are illustrative; local data and
              assumptions need confirmation. A Certificate is a project brief, not a permit,
              appraisal, loan approval, or guarantee of cost or income. Verify site conditions
              and requirements with local authorities and licensed professionals.
            </p>
          </div>
          <div className={styles.footerWordmark} aria-hidden="true" translate="no">
            LotFoundry
          </div>
          <div className={styles.footerBottom}>
            <span translate="no">© {copyrightYear} LotFoundry</span>
            <nav className={styles.socialRail} aria-label="Social media">
              <a
                href={SOCIAL_LINKS.youtube}
                rel="noopener noreferrer"
                target="_blank"
                aria-label="YouTube"
                className={styles.socialIconLink}
              >
                <Youtube size={18} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Instagram"
                className={styles.socialIconLink}
              >
                <Instagram size={18} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                rel="noopener noreferrer"
                target="_blank"
                aria-label="Facebook"
                className={styles.socialIconLink}
              >
                <Facebook size={18} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <a
                href={SOCIAL_LINKS.x}
                rel="noopener noreferrer"
                target="_blank"
                aria-label="X"
                className={styles.socialIconLink}
              >
                <XLogo />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                rel="noopener noreferrer"
                target="_blank"
                aria-label="LinkedIn"
                className={styles.socialIconLink}
              >
                <Linkedin size={18} strokeWidth={1.5} aria-hidden="true" />
              </a>
            </nav>
            <div className={styles.footerLegal}>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </footer>

        {sampleOpen && <SampleCertificateDialog city={city} onClose={() => setSampleOpen(false)} />}
        {mobileCta && (
          <a className={styles.stickyCta} href="#start" onClick={focusHeroAddress}>
            {PRIMARY_CTA_LABEL}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        )}
        {entering && (
          <div className={styles.entering} role="status">
            <ParcelMark />
            <p>Bringing your lot into focus…</p>
          </div>
        )}
      </div>
      {authOpen && (
        <LandingAuthGate
          initialMode={hasMemberSession ? "sign-in" : "sign-up"}
          analyticsSource={hasMemberSession ? "account_control" : "guest_limit"}
          onAuthenticated={() => {
            stashAddressQuery(pendingAddress.current);
            stashEntrySource("landing_cta");
            setEntering(true);
            setAuthOpen(false);
            router.push("/studio");
          }}
          onDismiss={() => {
            setAuthOpen(false);
            requestAnimationFrame(() => submitButton.current?.focus());
          }}
        />
      )}
    </>
  );
}

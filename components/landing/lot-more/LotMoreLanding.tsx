"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type MouseEvent,
} from "react";
import dynamic from "next/dynamic";
import { WebBuilderOnly } from "@/components/builder/WebBuilderOnly";
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
import { Segmented } from "@/components/ui/Field";
import { useRadioGroup } from "@/components/ui/useRadioGroup";
import { ParcelMark } from "@/components/ui/BrandLockup";
import { HERO_PHOTO, PARCEL_AFTER, PARCEL_BEFORE, STUDIO_DEMO } from "./landing-images";
import { configForFootprint } from "@/lib/feasibility";
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
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <p className={styles.eyebrow}>
      <span>{number}</span>
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

export function LotMoreLanding({
  scenarios,
  city = "seattle",
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
  const [query, setQuery] = useState("");
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [entering, setEntering] = useState(false);
  const [scene, setScene] = useState(2);
  const [intention, setIntention] = useState(0);
  const [scenarioIndex, setScenarioIndex] = useState(() => Math.max(0, scenarios.findIndex((item) => item.id === "market")));
  const [reportTab, setReportTab] = useState(1);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [mobileCta, setMobileCta] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [explorerFootprint, setExplorerFootprint] = useState<450 | 600 | 800>(600);
  const [explorerRoof, setExplorerRoof] = useState<"shed" | "gable" | "flat">("shed");
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
      title: "Price the possibility.",
      detail: "Build cost, rent and payback for a 600 sq ft concept, with every assumption in view.",
    },
  ];

  const explorerScale = explorerFootprint / 600;
  const explorerRoofMultiplier = explorerRoof === "gable" ? 1.04 : explorerRoof === "flat" ? 0.98 : 1;
  const explorerRent = Math.round(sample.rent * (explorerFootprint === 450 ? 0.82 : explorerFootprint === 800 ? 1.24 : 1));
  const explorerCostLow = Math.round((sample.costLow / 1000) * explorerScale * explorerRoofMultiplier);
  const explorerCostHigh = Math.round((sample.costHigh / 1000) * explorerScale * explorerRoofMultiplier);
  const explorerCoverage = explorerFootprint === 450 ? 29 : explorerFootprint === 600 ? 32 : 36;

  const intentions = [
    {
      label: "For family",
      lead: "A 600 sq ft, one-bedroom concept.",
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
  const explorerConfig =
    explorerFootprint === 600 && explorerRoof === "shed"
      ? defaultScenarioState.config
      : configForFootprint(explorerFootprint, {
          ...defaultScenarioState.config,
          roof: explorerRoof,
        });
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
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-height: 700px)");
    let frame = 0;
    let band = -1;
    const update = () => {
      frame = 0;
      if (!motionQuery.matches) {
        delete section.dataset.pinned;
        section.style.removeProperty("--story-progress");
        band = -1;
        return;
      }
      section.dataset.pinned = "true";
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      section.style.setProperty("--story-progress", progress.toFixed(4));
      const next = progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2;
      if (next !== band) {
        band = next;
        setScene(next);
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

  function submit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!query.trim()) {
      setErrorForm(id);
      (
        event.currentTarget.elements.namedItem("address") as HTMLInputElement
      ).focus();
      return;
    }
    submitButton.current = event.currentTarget.querySelector(
      'button[type="submit"]',
    );
    pendingAddress.current = query.trim();
    // A visitor with a free lookup left goes straight to the studio. Asking a
    // stranger to create an account before they have seen anything is the
    // single most expensive step in this funnel, and it also pulls the Firebase
    // client bundle onto the critical path. The account ask comes after they
    // have seen their own lot, not before. A remembered member marker can be
    // expired; it must not put an eligible guest behind the landing auth gate.
    // Studio resolves the actual session before selecting parcel providers.
    if (canGuestLookup()) {
      stashAddressQuery(pendingAddress.current);
      stashEntrySource("landing_cta");
      setEntering(true);
      router.push("/studio");
      return;
    }
    setAuthOpen(true);
  }

  function focusHeroAddress(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const input = document.getElementById("hero-address");
    input?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: no-preference)").matches ? "smooth" : "instant",
    });
    input?.focus({ preventScroll: true });
  }

  function addressForm(id: string) {
    return (
      <form
        className={styles.addressForm}
        onSubmit={(event) => submit(event, id)}
        noValidate
      >
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
            value={query}
            placeholder="Enter your property address"
            aria-invalid={errorForm === id}
            aria-describedby={`${id}-note${errorForm === id ? ` ${id}-error` : ""}`}
            onChange={(event) => {
              setQuery(event.target.value);
              setErrorForm(null);
            }}
          />
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={authOpen || entering}
          >
            {authOpen || entering ? "Opening…" : "Explore my lot"}
            <ArrowUpRight size={19} aria-hidden="true" />
          </button>
        </div>
        {errorForm === id && (
          <p id={`${id}-error`} className={styles.formError} role="alert">
            Enter an address to explore your lot.
          </p>
        )}
        <p id={`${id}-note`} className={styles.formNote}>
          Free to explore. No account needed for your first address.
        </p>
      </form>
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
          <Link href="/" className={styles.brand} aria-label="LotFoundry home">
            <ParcelMark />
            LotFoundry
            <span className={styles.brandDot} aria-hidden="true" />
          </Link>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#report">What’s included</a>
            <a href="#questions">Good questions</a>
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
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
            <a className={styles.headerCta} href="#start" onClick={focusHeroAddress}>
              Explore my lot
              <ArrowUpRight size={16} aria-hidden="true" />
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
              {[
                ["#how-it-works", "How it works"],
                ["#report", "What’s included"],
                ["#questions", "Good questions"],
              ].map(([href, text]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                  {text}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
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
                <source type="image/avif" srcSet={HERO_PHOTO.avifSrcSet} sizes="100vw" />
                <img
                  className={styles.heroPhoto}
                  src={HERO_PHOTO.src}
                  srcSet={HERO_PHOTO.srcSet}
                  sizes="100vw"
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
                See what could fit, compare estimated build costs, and explore
                rental potential.
              </p>
              {addressForm("hero")}
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
                      {money(sample.costLow / 1000)}k–
                      {money(sample.costHigh / 1000)}k
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
                      <span>0{index + 1}</span>
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
                  <span>LOT — 001 / ORTHO 3D</span>
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
                      fetchPriority="high"
                      loading="eager"
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
                  onChange={(value) => setScene(Number(value))}
                  options={["Today", "The footprint", "The possibility"].map(
                    (label, index) => ({
                      value: String(index),
                      label: (
                        <>
                          <span>0{index + 1}</span>
                          {label}
                        </>
                      ),
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
                <Eyebrow number="01">INSIDE THE STUDIO</Eyebrow>
                <h2 id="how-title">
                  See the studio.
                  <br />
                  Try the same lot.
                </h2>
              </div>
              <div className={styles.demoIntro}>
                <p>
                  Explore the same {explorerFootprint} sq ft {demo.name} demo shown above, with
                  the {money(explorerRent)}/mo market rent assumption.
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
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className={styles.demoLayout}>
              <figure className={styles.studioDemo} data-ui>
                <div className={styles.demoLabel}>
                  <span>Studio preview</span>
                  <span>{landingDemos.seattle.name} demo, {landingDemos.seattle.city}</span>
                </div>
                <picture>
                  <source
                    media="(max-width: 800px)"
                    srcSet={STUDIO_DEMO.mobile}
                    width={780}
                    height={1046}
                  />
                  {/* Pre-sized local captures preserve the actual demo UI. */}
                  <img
                    src={STUDIO_DEMO.desktop}
                    width={1200}
                    height={1202}
                    loading="lazy"
                    alt="Oak Street demo in the LotFoundry 3D studio, showing an existing home and a proposed backyard home"
                  />
                </picture>
                <div className={styles.interactiveSandbox} aria-label="Interactive massing preview">
                  <div className={styles.sandboxControlsRow}>
                    <div className={styles.sandboxControlGroup}>
                      <span className={styles.sandboxControlLabel}>FOOTPRINT</span>
                      <Segmented
                        aria-label="Preview footprint"
                        className={styles.sandboxToggleBar}
                        value={String(explorerFootprint)}
                        onChange={(value) => setExplorerFootprint(Number(value) as 450 | 600 | 800)}
                        options={([450, 600, 800] as const).map((sqft) => ({
                          value: String(sqft),
                          label: `${sqft} sq ft`,
                        }))}
                      />
                    </div>
                    <div className={styles.sandboxControlGroup}>
                      <span className={styles.sandboxControlLabel}>ROOF PROFILE</span>
                      <Segmented
                        aria-label="Preview roof profile"
                        className={styles.sandboxToggleBar}
                        value={explorerRoof}
                        onChange={(value) => setExplorerRoof(value)}
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
                    <div>
                      <span>EST. BUILD BAND</span>
                      <strong>
                        {money(explorerCostLow)}k–{money(explorerCostHigh)}k
                      </strong>
                    </div>
                    <div>
                      <span>EST. MARKET RENT</span>
                      <strong>
                        {money(explorerRent)}
                        <small>/mo</small>
                      </strong>
                    </div>
                  </div>
                </div>
                <figcaption>
                  {city === "seattle"
                    ? "Explore placement, design choices, and the assumptions behind this demo."
                    : `Seattle Studio preview shown. Open the ${demo.name} demo to explore ${demo.city} assumptions.`}
                </figcaption>
              </figure>
              <div className={styles.demoSteps}>
                <ol>
                  <li
                    className={activeStep === 0 ? styles.demoStepActive : undefined}
                    onMouseEnter={() => setActiveStep(0)}
                    onFocusCapture={() => setActiveStep(0)}
                    onClick={() => setActiveStep(0)}
                  >
                    <span>01</span>
                    <div>
                      <h3>Place a backyard home.</h3>
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
                    onClick={() => setActiveStep(1)}
                  >
                    <span>02</span>
                    <div>
                      <h3>Compare the estimates.</h3>
                      <p>
                        See build costs, rental potential, and payback with the
                        assumptions behind them.
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
                    onClick={() => setActiveStep(2)}
                  >
                    <span>03</span>
                    <div>
                      <h3>Plan your next questions.</h3>
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
                <Eyebrow number="02">THE DEMO ESTIMATES</Eyebrow>
                <h2 id="numbers-title">
                  Build costs.
                  <br />
                  <span>Rental potential.</span>
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
                onChange={(value) => setScenarioIndex(Number(value))}
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
                  {money(scenario.costLow / 1000)}k<span>–</span>
                  {money(scenario.costHigh / 1000)}k
                </strong>
                <small>One-time project estimate</small>
                <div className={styles.metricMeter} aria-hidden="true">
                  <span style={{ width: "78%" }} />
                </div>
              </div>
              <div>
                <p>Estimated rental income</p>
                <strong>
                  {money(scenario.rent)}
                  <small>/mo</small>
                </strong>
                <small>Before expenses and financing</small>
                <div className={styles.metricMeter} aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.min(100, Math.round((scenario.rent / (scenarios[2]?.rent || scenario.rent)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <p>Estimated simple payback</p>
                <strong>
                  {scenario.payback}
                  <small>years</small>
                </strong>
                <small>Based on operating income</small>
                <div className={styles.metricMeter} aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.max(35, Math.min(100, Math.round((18 / scenario.payback) * 75)))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className={styles.telemetryStrip} aria-label="Operating cash flow breakdown">
              <div className={styles.telemetryItem}>
                <span>ANNUAL OPERATING INCOME</span>
                <strong>{money(scenario.noi)}/yr</strong>
              </div>
              <div className={styles.telemetryItem}>
                <span>NET OPERATING MARGIN</span>
                <strong>{((1 - scenario.expenseRatio) * 100).toFixed(1)}%</strong>
              </div>
              <div className={styles.telemetryItem}>
                <span>MODELED EXPENSE ALLOWANCE</span>
                <strong>{(scenario.expenseRatio * 100).toFixed(1)}% of gross</strong>
              </div>
            </div>
            <div className={styles.numberNotes}>
              <details>
                <summary>
                  What’s behind these numbers?
                  <Plus size={17} aria-hidden="true" />
                </summary>
                <p>
                  The curated {demo.name} demo in {demo.city}, calculated by the studio engine: 600
                  sq ft, cedar finish, shed roof, openings included. Base
                  construction is $340/sq ft, with an 18% soft-cost allowance.
                  Operating expenses use{" "}
                  {(scenario.expenseRatio * 100).toFixed(1)}% of gross rent;
                  estimated annual net operating income is {money(scenario.noi)}{" "}
                  before financing and income tax. Simple payback uses the
                  central project estimate divided by this operating income.{" "}
                  {demo.note ?? "Demo rent bands are curated assumptions."} Artwork is illustrative.
                </p>
              </details>
              <a href="#start" className={styles.textLink} onClick={focusHeroAddress}>
                Explore your own numbers
                <ArrowUpRight size={19} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.estimateNote}>
              Calculated with the Studio engine. Compare three rent assumptions before planning your next step.
            </p>
          </section>

          <section
            className={styles.reportSection}
            id="report"
            aria-labelledby="report-title"
          >
            <div className={styles.reportCopy}>
              <Eyebrow number="03">WHAT’S INCLUDED</Eyebrow>
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
                    <span>Explore in the studio</span>
                    <strong>Free</strong>
                  </dt>
                  <dd>
                    3D layout exploration and an estimated monthly rent range.
                    Your first address needs no account.
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
                    A property-specific packet: build costs, net income, payback,
                    financing scenarios, a fee and permit audit for its size, and a
                    bid-leveling checklist for three builders. Print or save
                    as PDF, export CSV, or share a permanent link.
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
                onChange={(value) => setReportTab(Number(value))}
                options={["The overview", "The estimates", "Next steps"].map(
                  (label, index) => ({ value: String(index), label }),
                )}
              />
              <article
                className={styles.paper}
                aria-label="Sample feasibility report"
              >
                <div className={styles.paperTop}>
                  <span>
                    <ParcelMark />
                    LotFoundry
                  </span>
                  <span>
                    SAMPLE REPORT
                    <br />0{reportTab + 1} / 03
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
                          <strong>600 sq ft</strong>
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
                        {reportScenario.costBreakdown && constructionBudgetRows(reportScenario.costBreakdown).map(([label, value]) => (
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
                        Same 600 sq ft {demo.name} demo, {demo.city}, and selected
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
                Sample Certificate of Feasibility summary. Create yours in the
                studio.
              </p>
            </div>
            <div className={styles.reportActions}>
              <div className={styles.offerActions}>
              <button type="button" className={styles.textLink} onClick={() => setSampleOpen(true)}>
                View full sample / save PDF <ArrowUpRight size={18} aria-hidden="true" />
              </button>
              <a href="#start" className={styles.darkButton} onClick={focusHeroAddress}>
                Start with my lot <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              </div>
              <p className={styles.reportPrice}>
                The complete certificate is an optional one-time purchase.
                Review it in the studio before checkout.
              </p>
            </div>
          </section>

          <section
            className={styles.faqSection}
            id="questions"
            aria-labelledby="faq-title"
          >
            <div>
              <Eyebrow number="04">BEFORE YOU START</Eyebrow>
              <h2 id="faq-title">
                Good questions.
                <br />
                Straight answers.
              </h2>
              <Link className={styles.textLink} href="/help">
                A little more help
                <ArrowUpRight size={18} aria-hidden="true" />
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
                  "Yes. Your first address lookup needs no account — enter it above and the studio opens on your own lot. Create a free account to look up more. Available parcel and market detail varies by location, and the studio identifies its assumptions and anything missing. Seattle, Portland, Austin, and San Diego demo lots are always open.",
                ],
                [
                  "How are the estimates calculated?",
                  "The studio combines the proposed size and finish with construction assumptions, rent inputs, and operating expenses. Live-address results show their market basis when available. Demo figures use curated assumptions, and all results need local confirmation.",
                ],
                [
                  "Does this mean I can build?",
                  "No. LotFoundry helps you explore an early concept. It does not grant a permit or guarantee a buildable design. A local professional and your jurisdiction must confirm property conditions and applicable requirements.",
                ],
                [
                  "What is free, and what costs extra?",
                  `Exploring the 3D concept and monthly rent range is free. The complete Certificate of Feasibility is a one-time${certificatePrice ? ` ${certificatePrice}` : ""} purchase. You can review what is included before checkout.`,
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
              {addressForm("closing")}
              <div className={styles.appDownload}>
                <span>Also on Android</span>
                <a className={styles.appStoreLink} href={GOOGLE_PLAY_URL}>
                  {/* Official badge from Google's Partner Marketing Hub:
                      partnermarketinghub.withgoogle.com/brands/google-play/google-play/lockups-icons-badges/ */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/landing/google-play-badge.svg"
                    alt="Get it on Google Play"
                    width={238.96}
                    height={70.87}
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
                  <li><Link href="/studio" prefetch={false} onClick={() => stashEntrySource("landing_cta")}>The studio</Link></li>
                  <li><Link href="/adu-cost-calculator">ADU cost calculator</Link></li>
                  <li><a href={GOOGLE_PLAY_URL} rel="noopener" aria-label="Android app on Google Play">Google Play</a></li>
                </ul>
              </div>
              <div className={styles.footerGroup}>
                <h3>Planning guides</h3>
                <ul>
                  <li><Link href="/adu/ca">ADU rules by city</Link></li>
                  <li><Link href="/adu/ca/san-diego/cost">San Diego ADU costs</Link></li>
                </ul>
              </div>
              <div className={styles.footerGroup}>
                <h3>Demo lots</h3>
                <ul>
                  <li><Link href="/seattle">{landingDemos.seattle.name} demo, {landingDemos.seattle.city}</Link></li>
                  <li><Link href="/portland">{landingDemos.portland.name} demo, {landingDemos.portland.city}</Link></li>
                  <li><Link href="/austin">{landingDemos.austin.name} demo, {landingDemos.austin.city}</Link></li>
                  <li><Link href="/san-diego">{landingDemos["san-diego"].name} demo, {landingDemos["san-diego"].city}</Link></li>
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
          <div className={styles.footerWordmark} aria-hidden="true">
            LotFoundry<span aria-hidden="true">↗</span>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} LotFoundry</span>
            <div className={styles.socialRail} aria-label="Social media">
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
            </div>
            <div className={styles.footerLegal}>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </footer>

        {sampleOpen && <SampleCertificateDialog city={city} onClose={() => setSampleOpen(false)} />}
        {mobileCta && (
          <a className={styles.stickyCta} href="#start" onClick={focusHeroAddress}>
            Explore my lot
            <ArrowUpRight size={18} aria-hidden="true" />
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

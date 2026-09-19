"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Plus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { stashAddressQuery } from "@/lib/address-handoff";
import { GOOGLE_PLAY_URL } from "@/lib/app-store-links";
import { canGuestLookup } from "@/lib/guest-lookup";
import {
  hasMemberSessionHint,
  subscribeMemberSession,
} from "@/lib/member-session-hint";
import { useStorePrice } from "@/lib/commerce/store-price";
import styles from "./LotMoreLanding.module.css";

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

const intentions = [
  {
    label: "For family",
    title: "Closer. With a door of their own.",
    copy: "Keep the people you love nearby, with a little more independence for everyone.",
    note: "A place to be together. Space to be yourself.",
  },
  {
    label: "For income",
    title: "A backyard with earning potential.",
    copy: "Explore what a small home could earn, and what it might take to bring it to life.",
    note: "Explore the rent. Understand the investment.",
  },
  {
    label: "For what’s next",
    title: "Space for your next chapter.",
    copy: "A home for grown children, future plans, or the life you haven’t quite imagined yet.",
    note: "A little room for life to change.",
  },
];

function ParcelMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 6H6v28h28V16M21 19 34 6M24 6h10v10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
    </svg>
  );
}

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

function handleSegmentArrowKey(
  event: React.KeyboardEvent<HTMLElement>,
  currentIndex: number,
  total: number,
  onSelect: (index: number) => void,
) {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    const next = (currentIndex + 1) % total;
    onSelect(next);
    const buttons = event.currentTarget.querySelectorAll("button");
    buttons[next]?.focus();
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    const prev = (currentIndex - 1 + total) % total;
    onSelect(prev);
    const buttons = event.currentTarget.querySelectorAll("button");
    buttons[prev]?.focus();
  }
}

export function LotMoreLanding({
  scenarios,
}: {
  scenarios: LandingScenario[];
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
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [reportTab, setReportTab] = useState(0);
  const [mobileCta, setMobileCta] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The server snapshot is always false, so the prerendered header carries the
  // plain `Sign in` link and a signed-out visit never reaches the auth island.
  const hasMemberSession = useSyncExternalStore(
    subscribeMemberSession,
    hasMemberSessionHint,
    () => false,
  );
  const heroRef = useRef<HTMLElement>(null);
  const closingRef = useRef<HTMLElement>(null);
  const pendingAddress = useRef("");
  const submitButton = useRef<HTMLButtonElement | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const scenario = scenarios[scenarioIndex];
  const reportScenario = scenarios[0];

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
    // have seen their own lot, not before.
    if (!hasMemberSession && canGuestLookup()) {
      stashAddressQuery(pendingAddress.current);
      setEntering(true);
      router.push("/studio");
      return;
    }
    setAuthOpen(true);
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
      <div className={styles.page} data-theme="a-lot-more">
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
            <a href="#report">The report</a>
            <a href="#questions">Good questions</a>
            <Link href="/signup?role=builder" prefetch={false}>Register as a builder</Link>
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
            <a className={styles.headerCta} href="#start">
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
                <Plus aria-hidden="true" />
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
                ["#report", "The report"],
                ["#questions", "Good questions"],
              ].map(([href, text]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                  {text}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              ))}
              <Link href="/signup?role=builder" prefetch={false} onClick={() => setMenuOpen(false)}>
                Register as a builder
              </Link>
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
            <div className={styles.heroCopy}>
              <p className={styles.heroKicker}>
                <span />
                Small homes. Big possibility.
              </p>
              <h1>
                A LOT
                <br />
                MORE<span className={styles.orange}>.</span>
              </h1>
              <p className={styles.heroLead}>
                Discover what your
                <br className={styles.desktopBreak} /> backyard could become.
              </p>
              <p className={styles.heroDescription}>
                Room for family. Potential for income. A place for what’s next.
                Explore a backyard home on the land you already own.
              </p>
              {addressForm("hero")}
              <Link
                className={styles.textLink}
                href="/studio?parcel=oak-street"
                prefetch={false}
                onClick={() => stashAddressQuery("")}
              >
                Just looking? Try an example
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a
                className={`${styles.textLink} ${styles.appStoreLink}`}
                href={GOOGLE_PLAY_URL}
              >
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
            <figure className={styles.heroVisual}>
              <div className={styles.artHeader}>
                <span>THE POSSIBILITY SERIES</span>
                <span>LOT — 001</span>
              </div>
              <div className={styles.parcelCanvas} data-scene={scene}>
                {/* Pre-sized local WebP variants keep the hero useful before JS. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.parcelImage}
                  src="/landing/a-lot-more/parcel-after.webp"
                  srcSet="/landing/a-lot-more/parcel-after-mobile.webp 768w, /landing/a-lot-more/parcel-after.webp 1536w"
                  sizes="(max-width: 800px) 100vw, 60vw"
                  width={1536}
                  height={1024}
                  fetchPriority="high"
                  alt={
                    [
                      "Illustrative miniature lot with an existing house and an empty yard",
                      "Illustrative miniature lot with a proposed footprint outlined in the yard",
                      "Illustrative miniature lot with an existing house and an orange backyard home",
                    ][scene]
                  }
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={`${styles.parcelImage} ${styles.beforeImage}`}
                  src="/landing/a-lot-more/parcel-before.webp"
                  srcSet="/landing/a-lot-more/parcel-before-mobile.webp 768w, /landing/a-lot-more/parcel-before.webp 1536w"
                  sizes="(max-width: 800px) 100vw, 60vw"
                  width={1536}
                  height={1024}
                  loading="lazy"
                  alt=""
                  aria-hidden="true"
                />
                <svg
                  className={styles.footprintOverlay}
                  viewBox="0 0 1536 1024"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m800 578 250-70 166 94-231 110Z"
                    fill="#FF5B2433"
                    stroke="#FF5B24"
                    strokeWidth="5"
                    strokeDasharray="14 10"
                  />
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
                <div className={styles.northMark} aria-hidden="true">
                  N<ArrowUpRight size={24} strokeWidth={1.5} />
                </div>
              </div>
              <div
                className={styles.sceneControls}
                role="group"
                aria-label="Property illustration view"
                onKeyDown={(e) => handleSegmentArrowKey(e, scene, 3, setScene)}
              >
                {["Today", "The footprint", "The possibility"].map(
                  (label, index) => (
                    <button
                      type="button"
                      key={label}
                      aria-pressed={scene === index}
                      onClick={() => setScene(index)}
                    >
                      <span>0{index + 1}</span>
                      {label}
                    </button>
                  ),
                )}
              </div>
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
                <span>Concept imagery · not a surveyed property</span>
              </figcaption>
            </figure>
          </section>

          <div className={styles.heroBottom}>
            <span>More life per square foot.</span>
            <a href="#how-it-works">
              A little land. A new perspective.
              <ArrowDown size={16} aria-hidden="true" />
            </a>
            <span>Built around your possibilities.</span>
          </div>

          <section
            className={styles.howSection}
            id="how-it-works"
            aria-labelledby="how-title"
          >
            <div className={styles.sectionHeading}>
              <Eyebrow number="01">A NEW WAY TO SEE YOUR LOT</Eyebrow>
              <h2 id="how-title">
                You have the land.
                <br />
                Let’s find the possibility.
              </h2>
              <p>
                From the first “what if” to a clearer next step.
                <br />A little perspective goes a long way.
              </p>
            </div>
            <div className={styles.steps}>
              {[
                [
                  "01",
                  "Start with your address.",
                  "Bring your lot into focus. Explore property details and the space around your existing home.",
                ],
                [
                  "02",
                  "See what could fit.",
                  "Explore a backyard home in the 3D studio, with setbacks, size, and placement in view.",
                ],
                [
                  "03",
                  "Make a more informed move.",
                  "Compare estimated costs and rental potential. Take your questions and a shareable report to a professional.",
                ],
              ].map(([number, title, copy]) => (
                <article key={number}>
                  <span className={styles.stepNumber}>
                    {number}
                    <ArrowUpRight
                      size={24}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.lifeSection} aria-labelledby="life-title">
            <div className={styles.lifeImage}>
              {/* Pre-sized local WebP variants keep phones off the 1536w file,
                  which the layout only ever paints into a ~363px-wide slot. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/a-lot-more/backyard-life.webp"
                srcSet="/landing/a-lot-more/backyard-life-mobile.webp 768w, /landing/a-lot-more/backyard-life.webp 1536w"
                sizes="(max-width: 800px) 88vw, 48vw"
                width={1536}
                height={1024}
                alt="Illustrative orange backyard home opening onto a timber deck and leafy garden"
                loading="lazy"
              />
              <span className={styles.imageCaption}>
                A SMALL HOME. A WHOLE NEW CHAPTER.
              </span>
              <span className={styles.conceptBadge}>Concept image</span>
            </div>
            <div className={styles.lifeCopy}>
              <Eyebrow number="02">MADE FOR REAL LIFE</Eyebrow>
              <h2 id="life-title">
                More room
                <br />
                for what matters.
              </h2>
              <div
                className={styles.intentControls}
                role="group"
                aria-label="What would your backyard home be for?"
                onKeyDown={(e) =>
                  handleSegmentArrowKey(
                    e,
                    intention,
                    intentions.length,
                    setIntention,
                  )
                }
              >
                {intentions.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    aria-pressed={intention === index}
                    onClick={() => setIntention(index)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className={styles.intentionCopy} aria-live="polite">
                <h3>{intentions[intention].title}</h3>
                <p>{intentions[intention].copy}</p>
              </div>
              <a className={styles.textLink} href="#start">
                Find your possibility
                <ArrowUpRight size={19} aria-hidden="true" />
              </a>
              <p className={styles.lifeFootnote}>
                {intentions[intention].note}
              </p>
            </div>
          </section>

          <section
            className={styles.numbersSection}
            id="numbers"
            aria-labelledby="numbers-title"
          >
            <div className={styles.numbersHeading}>
              <div>
                <Eyebrow number="03">THE BIG PICTURE, IN NUMBERS</Eyebrow>
                <h2 id="numbers-title">
                  Big possibility.
                  <br />
                  <span>Clearer numbers.</span>
                </h2>
              </div>
              <p>
                Let the idea take shape.
                <br />
                Then see how the numbers add up.
              </p>
            </div>
            <div className={styles.scenarioBar}>
              <span>
                <span className={styles.orangeDot} />
                SEATTLE DEMO · 600 SQ FT · 1 BED CONCEPT
              </span>
              <div
                role="group"
                aria-label="Demo rent assumption"
                className={styles.scenarioControls}
                onKeyDown={(e) =>
                  handleSegmentArrowKey(
                    e,
                    scenarioIndex,
                    scenarios.length,
                    setScenarioIndex,
                  )
                }
              >
                {scenarios.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={scenarioIndex === index}
                    onClick={() => setScenarioIndex(index)}
                  >
                    {item.id}
                  </button>
                ))}
              </div>
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
            <div className={styles.numberNotes}>
              <details>
                <summary>
                  What’s behind these numbers?
                  <Plus size={17} aria-hidden="true" />
                </summary>
                <p>
                  A curated Seattle demo, calculated by the studio engine: 600
                  sq ft, cedar finish, shed roof, openings included. Base
                  construction is $340/sq ft, with an 18% soft-cost allowance.
                  Operating expenses use{" "}
                  {(scenario.expenseRatio * 100).toFixed(1)}% of gross rent;
                  estimated annual net operating income is {money(scenario.noi)}{" "}
                  before financing and income tax. Simple payback uses the
                  central project estimate divided by this operating income.
                  These are demo assumptions, not verified local quotes or
                  rental comparables. Artwork illustrates the idea, not this
                  parcel or design.
                </p>
              </details>
              <a href="#start" className={styles.textLink}>
                Explore your own numbers
                <ArrowUpRight size={19} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.estimateNote}>
              Illustrative estimates, not guarantees. Your property, local
              requirements, and project costs will differ.
            </p>
          </section>

          <section
            className={styles.reportSection}
            id="report"
            aria-labelledby="report-title"
          >
            <div className={styles.reportCopy}>
              <Eyebrow number="04">SOMETHING TO BUILD ON</Eyebrow>
              <h2 id="report-title">
                From “what if”
                <br />
                to what’s next.
              </h2>
              <p>
                A clearer idea deserves more than a screenshot. Take your lot,
                concept, estimates, and next questions into the conversation.
              </p>
              <ul>
                <li>
                  Your lot and proposed layout
                  <ArrowUpRight size={17} aria-hidden="true" />
                </li>
                <li>
                  Costs, rent, and the assumptions behind them
                  <ArrowUpRight size={17} aria-hidden="true" />
                </li>
                <li>
                  A shared starting point for a professional
                  <ArrowUpRight size={17} aria-hidden="true" />
                </li>
              </ul>
              <Link
                href="/studio"
                prefetch={false}
                className={styles.darkButton}
              >
                Create my report
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <p className={styles.reportPrice}>
                Explore free · Complete certificate
                {certificatePrice ? ` ${certificatePrice}` : ""} one-time
              </p>
            </div>
            <div className={styles.reportPreview}>
              <div
                className={styles.reportTabs}
                role="group"
                aria-label="Sample report pages"
                onKeyDown={(e) =>
                  handleSegmentArrowKey(e, reportTab, 3, setReportTab)
                }
              >
                {["The overview", "The estimates", "Next steps"].map(
                  (label, index) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={reportTab === index}
                      onClick={() => setReportTab(index)}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
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
                          <path d="M45 45h145v95H45Z" fill="#DADAD3" />
                          <path d="M250 65h100v65H250Z" fill="#FF5B24" />
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
                          <strong>Seattle, WA</strong>
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
                        CONSERVATIVE DEMO ASSUMPTIONS
                      </p>
                      <h3>
                        A clearer
                        <br />
                        financial picture.
                      </h3>
                      <dl className={styles.reportEstimates}>
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
                        Same 600 sq ft Seattle demo as the conservative numbers
                        above. Financing and income taxes are excluded.
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
                  <span>CONCEPT · NOT A PERMIT</span>
                  <ParcelMark />
                </div>
              </article>
              <p className={styles.previewNote}>
                Sample summary · Your complete certificate is created in the
                studio.
              </p>
            </div>
          </section>

          <section
            className={styles.faqSection}
            id="questions"
            aria-labelledby="faq-title"
          >
            <div>
              <Eyebrow number="05">A LITTLE MORE CLARITY</Eyebrow>
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
                  "Yes. Your first address lookup needs no account — enter it above and the studio opens on your own lot. Create a free account to look up more. Available parcel and market detail varies by location, and the studio identifies its assumptions and anything missing. Seattle, Portland, and Austin demo lots are always open.",
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
                  `Exploring the studio and its initial estimates is free. The complete Certificate of Feasibility is a one-time${certificatePrice ? ` ${certificatePrice}` : ""} purchase. You can review what is included before checkout.`,
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
            </div>
            <span className={styles.closingSerial}>
              YOUR NEXT CHAPTER / LOTFOUNDRY
            </span>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerTop}>
            <p>
              Find the possibility
              <br />
              in your lot.
            </p>
            <nav aria-label="Footer">
              <Link href="/studio" prefetch={false}>
                The studio
              </Link>
              <Link href="/signup?role=builder" prefetch={false}>
                Register as a builder
              </Link>
              <Link href="/about">About us</Link>
              <Link href="/adu/ca">ADU rules by city</Link>
              <Link href="/help">Get in touch</Link>
              <a href={GOOGLE_PLAY_URL} rel="noopener">
                Android app on Google Play
              </a>
            </nav>
            <a
              href="#start"
              className={styles.backTop}
              aria-label="Back to top"
            >
              <ArrowUpRight size={27} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.footerWordmark} aria-hidden="true">
            LotFoundry<span aria-hidden="true">↗</span>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} LotFoundry</span>
            <span>Early possibilities. Informed next steps.</span>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </footer>

        {mobileCta && (
          <a className={styles.stickyCta} href="#start">
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
          onAuthenticated={() => {
            stashAddressQuery(pendingAddress.current);
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

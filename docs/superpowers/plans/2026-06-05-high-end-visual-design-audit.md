# High-End Visual Design Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine LotFoundry's visual execution to align with an Editorial Luxury aesthetic by updating the container styling, section spacing, CTA button styles, feature bento grid layout, and staggering entrance animations.

**Architecture:** Create/enhance visual primitive components (`Bezel`, `CTAButton`) and apply them universally across the landing, auth, and studio inspector pages. Integrate staggered animation sequences via `motion` (Framer Motion).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, `motion` (Framer Motion).

---

### Task 1: Refine the `<Bezel>` Primitive Component

**Files:**
- Modify: `components/ui/Bezel.tsx`
- Test: Run Vitest to verify all components compile correctly.

- [ ] **Step 1: Write the updated implementation for Bezel**
  Modify `components/ui/Bezel.tsx` to add concentric styling, warm highlights, and allow optional custom class names on both the outer and inner containers (e.g., to override padding or background colors).

  ```tsx
  export function Bezel({
    children,
    className,
    innerClassName,
  }: {
    children: React.ReactNode;
    className?: string;
    innerClassName?: string;
  }) {
    return (
      <div
        className={`rounded-[2rem] border border-lf-hairline/25 bg-lf-taupe-soft p-1.5 ${className ?? ""}`}
      >
        <div 
          className={`rounded-[calc(2rem-6px)] bg-lf-card shadow-[inset_0_1px_2px_rgba(255,250,240,0.95),0_1px_3px_rgba(38,19,7,0.05)] ${innerClassName ?? ""}`}
        >
          {children}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Run build to verify type safety**
  Run: `npx tsc --noEmit`
  Expected: Successful exit with no errors.

- [ ] **Step 3: Run existing unit tests**
  Run: `npm run test`
  Expected: All 92 tests pass.

- [ ] **Step 4: Commit the changes**
  ```bash
  git add components/ui/Bezel.tsx
  git commit -m "style(ui): update Bezel primitive with warm top highlights and outer/inner class overrides"
  ```

---

### Task 2: Expose and Upgrade `CTAButton` Component

**Files:**
- Modify: `components/landing/CTAButton.tsx`
- Test: Create/verify tests for `CTAButton` in `components/landing/LandingHero.test.tsx` (which is already testing its behavior in context).

- [ ] **Step 1: Update the CTAButton implementation**
  In `components/landing/CTAButton.tsx`, import `motion` from `"motion/react"` to support spring-based press physics and magnetic hover states. Ensure the trailing `ArrowRight` is nested inside a circular background that reacts kinetic-slide on hover.

  ```tsx
  import Link from "next/link";
  import { ArrowRight } from "lucide-react";
  import { motion, useReducedMotion } from "motion/react";

  interface CTAButtonProps {
    href: string;
    children: React.ReactNode;
    size?: "md" | "lg";
    className?: string;
  }

  export function CTAButton({ href, children, size = "md", className }: CTAButtonProps) {
    const reducedMotion = useReducedMotion();
    const sizeClasses =
      size === "lg"
        ? "min-h-14 gap-3 pl-7 pr-2.5 text-lg"
        : "min-h-12 gap-3 pl-5 pr-2 text-base";

    return (
      <Link href={href} className="group inline-block focus-visible:outline-none">
        <motion.div
          whileHover={reducedMotion ? undefined : { scale: 1.02 }}
          whileTap={reducedMotion ? undefined : { scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className={`group flex items-center justify-between gap-4 rounded-full bg-lf-mahogany font-semibold text-lf-sand border border-lf-sand/15 transition-colors duration-300 hover:bg-lf-clay ${sizeClasses} ${className ?? ""}`}
        >
          <span>{children}</span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lf-sand/15 transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight className="h-4.5 w-4.5" />
          </span>
        </motion.div>
      </Link>
    );
  }
  ```

- [ ] **Step 2: Run tests to verify the update**
  Run: `npm run test`
  Expected: All 92 tests pass, confirming no regression on the Link rendering within LandingHero.

- [ ] **Step 3: Commit the changes**
  ```bash
  git add components/landing/CTAButton.tsx
  git commit -m "style(landing): upgrade CTAButton to premium pill design with spring hover/press motion"
  ```

---

### Task 3: Refactor steps to Bento Grid in `FeatureBand.tsx`

**Files:**
- Modify: `components/landing/FeatureBand.tsx`
- Test: Verify Vitest tests for the landing pages pass.

- [ ] **Step 1: Implement the Bento Grid layout and `<Bezel>` wrapper in `FeatureBand.tsx`**
  Modify `components/landing/FeatureBand.tsx` to:
  1. Increase section padding to `py-32 md:py-40` for editorial breathing room.
  2. Implement the asymmetric bento grid. Promote the second step (`See what fits — and what doesn't` / 3D Visualizer) to a 2-column wide block (`md:col-span-2`) with an embedded visual placeholder block representing the 3D scene.
  3. Wrap each of the three steps in the `<Bezel>` component.
  4. Use the new standard `<CTAButton>` instead of raw button wrappers.
  5. Include eyebrow tags styled using Outfit/mono-space Uppercase rules.

  ```tsx
  "use client";

  import { motion, useReducedMotion } from "motion/react";
  import { FileText, MapPinned, Ruler, ShieldCheck, Users } from "lucide-react";
  import Link from "next/link";
  import { CTAButton } from "./CTAButton";
  import { Bezel } from "@/components/ui/Bezel";

  const PROOF = [
    ["$2,350/mo", "sample rent estimate"],
    ["31%", "lot coverage model"],
    ["9.8 yrs", "sample payback view"],
  ];

  const REPORT = [
    "Your ADU's size, style, and placement",
    "Estimated rent, income, payback, and lot coverage",
    "Honest fine print instead of empty promises",
    "Notes to share with your builder or contractor",
  ];

  export function FeatureBand() {
    const reducedMotion = useReducedMotion();

    const cardVariants = {
      hidden: { opacity: 0, y: 16 },
      visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.8,
          ease: [0.32, 0.72, 0, 1],
          delay: i * 0.08,
        },
      }),
    };

    return (
      <>
        {/* Why owners use it */}
        <section className="border-y border-lf-hairline/50 bg-lf-card/35">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:py-24 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-lf-muted">Why owners use it</p>
              <h2 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight text-lf-espresso md:text-5xl">
                Make the ADU conversation specific before money changes hands.
              </h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-lf-hairline border-y border-lf-hairline py-5 text-center">
              {PROOF.map(([value, label]) => (
                <div key={label} className="px-3">
                  <strong className="block font-display text-2xl text-lf-espresso md:text-3xl">{value}</strong>
                  <span className="mt-1 block text-sm leading-5 text-lf-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works: Bento Grid */}
        <section id="how-it-works">
          <div className="mx-auto max-w-7xl px-6 py-32 md:py-40">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-lf-muted">How it works</p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-lf-espresso md:text-5xl">
                A complete owner flow, not a pretty rendering with no next step.
              </h2>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {/* Card 1: Start with address */}
              <motion.div
                custom={0}
                initial={reducedMotion ? false : "hidden"}
                whileInView={reducedMotion ? undefined : "visible"}
                viewport={{ once: true, margin: "-60px" }}
                variants={cardVariants}
                className="col-span-1"
              >
                <Bezel className="h-full" innerClassName="h-full p-8 flex flex-col justify-between min-h-[280px]">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-lf-clay">01</span>
                      <MapPinned className="h-7 w-7 text-lf-clay" />
                    </div>
                    <h3 className="mt-6 font-display text-2xl font-bold text-lf-espresso">Start with your address</h3>
                    <p className="mt-4 leading-7 text-lf-muted text-sm">
                      Everything is based on your actual property — not a one-size-fits-all unit someone pulled from a catalog.
                    </p>
                  </div>
                </Bezel>
              </motion.div>

              {/* Card 2: Wide Bento Hero - 3D Visualizer */}
              <motion.div
                custom={1}
                initial={reducedMotion ? false : "hidden"}
                whileInView={reducedMotion ? undefined : "visible"}
                viewport={{ once: true, margin: "-60px" }}
                variants={cardVariants}
                className="col-span-1 md:col-span-2"
              >
                <Bezel className="h-full" innerClassName="h-full p-8 flex flex-col justify-between min-h-[280px]">
                  <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-lf-clay">02</span>
                        <Ruler className="h-7 w-7 text-lf-clay" />
                      </div>
                      <h3 className="mt-6 font-display text-2xl font-bold text-lf-espresso">See what fits — and what doesn't</h3>
                      <p className="mt-4 leading-7 text-lf-muted text-sm">
                        Yard setbacks, size limits, and your ADU design stay on screen together in a 3D lot builder so nothing catches you off guard.
                      </p>
                    </div>
                    <div className="relative h-36 overflow-hidden rounded-xl border border-lf-hairline/60 bg-lf-sand-2/50 flex flex-col justify-center items-center text-center p-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-lf-mahogany/5 to-lf-espresso/10 pointer-events-none" />
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-clay font-bold">3D Visual Studio</div>
                      <div className="mt-2 text-xs text-lf-muted max-w-[18ch]">Dashed setbacks, driveways & landscape elements live visualizers</div>
                    </div>
                  </div>
                </Bezel>
              </motion.div>

              {/* Card 3: Get report */}
              <motion.div
                custom={2}
                initial={reducedMotion ? false : "hidden"}
                whileInView={reducedMotion ? undefined : "visible"}
                viewport={{ once: true, margin: "-60px" }}
                variants={cardVariants}
                className="col-span-1 md:col-span-3"
              >
                <Bezel innerClassName="p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-lf-clay">03</span>
                      <FileText className="h-7 w-7 text-lf-clay" />
                    </div>
                    <h3 className="mt-6 font-display text-2xl font-bold text-lf-espresso">Get a report you can actually use</h3>
                    <p className="mt-3 leading-7 text-lf-muted text-sm">
                      Save your rent estimate, build cost range, and key regulatory assumptions in one tidy concept report you can share with contractors or lenders.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <CTAButton href="/signup" size="md">
                      Generate report
                    </CTAButton>
                  </div>
                </Bezel>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Owner report list */}
        <section className="bg-lf-espresso text-lf-sand">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-32 md:grid-cols-[0.92fr_1.08fr] md:items-center md:py-40">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-lf-taupe">Owner report</p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
                The output is built for the next conversation.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-lf-taupe">
                This is not a permit or a promise. It is a starting point, specific enough to have a real conversation with a builder, planner, or your family.
              </p>
            </div>
            <div className="grid gap-4">
              {REPORT.map((item) => (
                <div key={item} className="flex items-start gap-4 border-t border-lf-taupe/25 pt-4">
                  <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-lf-amber" aria-hidden="true" />
                  <span className="text-lg leading-7 text-lf-sand">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action section */}
        <section id="start">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-32 md:grid-cols-[1fr_auto] md:items-center md:py-40">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-lf-muted">Ready when the owner is</p>
              <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight text-lf-espresso md:text-5xl">
                Find out what your backyard is worth.
              </h2>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row md:flex-col items-center">
              <CTAButton href="/signup" size="lg">
                Estimate my lot
              </CTAButton>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-lf-hairline bg-lf-card/65 px-8 font-semibold text-lf-espresso transition-colors duration-300 hover:bg-lf-card hover:border-lf-taupe active:scale-[0.98]"
              >
                <Users className="h-5 w-5" aria-hidden="true" />
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Run TypeScript validation**
  Run: `npx tsc --noEmit`
  Expected: Successful exit.

- [ ] **Step 3: Run Vitest tests**
  Run: `npm run test`
  Expected: All tests pass.

- [ ] **Step 4: Commit changes**
  ```bash
  git add components/landing/FeatureBand.tsx
  git commit -m "feat(landing): implement asymmetric bento layout and Bezel wrappers in FeatureBand"
  ```

---

### Task 4: Standardize CTAButton Usage in StageCaptions and FeasibilityInspector

**Files:**
- Modify: `components/landing/StageCaptions.tsx`
- Modify: `components/studio/FeasibilityInspector.tsx`
- Test: Verify Vitest suite passes.

- [ ] **Step 1: Upgrade StageCaptions to use standard CTAButton**
  In `components/landing/StageCaptions.tsx`, import `CTAButton` from `./CTAButton` and replace raw link CTAs with `<CTAButton href="/signup">Estimate my lot</CTAButton>`.

  ```tsx
  // Add import:
  import { CTAButton } from "./CTAButton";
  ```

  Replace the links (e.g. lines 55-61 and 116-123) with `<CTAButton>`:
  ```tsx
  {/* First Instance: */}
  <div className="pointer-events-auto mt-7 flex flex-col gap-3 sm:flex-row">
    <CTAButton href="/signup">
      Estimate my lot
    </CTAButton>
    <a
      href="#how-it-works"
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-lf-hairline bg-lf-card px-6 text-base font-semibold text-lf-espresso transition-colors hover:bg-lf-sand-2"
    >
      See the flow
    </a>
  </div>
  ```

  ```tsx
  {/* Second Instance: */}
  <CTAButton href="/signup">
    Estimate my lot
  </CTAButton>
  ```

- [ ] **Step 2: Upgrade FeasibilityInspector "Create my ADU report" button**
  In `components/studio/FeasibilityInspector.tsx`, let's make the primary action button use the upgraded spring-based CTA button style. Add `Sparkles` icon within a circle or inside the button text. Let's make sure it styled identically to a primary CTA with a nested circle for the Sparkles/arrow icon.

  Modify lines 373-380:
  ```tsx
  <button
    type="button"
    onClick={onGenerateReport}
    className="group flex h-12 w-full items-center justify-between gap-4 rounded-full bg-lf-mahogany pl-6 pr-2.5 text-sm font-semibold text-lf-sand-2 shadow-sm transition hover:bg-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 active:scale-[0.98]"
  >
    <span>Create my ADU report</span>
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lf-sand/15 transition-transform duration-300 group-hover:translate-x-0.5">
      <Sparkles size={16} />
    </span>
  </button>
  ```

- [ ] **Step 3: Run TypeScript compiler validation**
  Run: `npx tsc --noEmit`
  Expected: Successful compile.

- [ ] **Step 4: Run all unit tests**
  Run: `npm run test`
  Expected: All tests pass.

- [ ] **Step 5: Commit changes**
  ```bash
  git add components/landing/StageCaptions.tsx components/studio/FeasibilityInspector.tsx
  git commit -m "style(landing, studio): standardize on kinetic CTA button layout in inspector and stages"
  ```

---

### Task 5: Upgrade LandingHero to use Upgraded CTAButton and motion reveals

**Files:**
- Modify: `components/landing/LandingHero.tsx`
- Test: Verify `LandingHero.test.tsx` passes.

- [ ] **Step 1: Update LandingHero implementation**
  In `components/landing/LandingHero.tsx`, import `motion` from `"motion/react"` to animate the text reveals (from-lot-to-income and headline). Update the layout to use staggered reveals.

  ```tsx
  import { motion, useReducedMotion } from "motion/react";
  ```

  Animate the text content container:
  ```tsx
  const reducedMotion = useReducedMotion();
  const transition = { duration: 0.8, ease: [0.32, 0.72, 0, 1] };

  // Wrap hero details in motion elements:
  <motion.div
    initial={reducedMotion ? false : { opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={transition}
    className="max-w-xl"
  >
    <motion.p
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 0.85 }}
      transition={{ ...transition, delay: 0.1 }}
      className="font-mono text-xs uppercase tracking-[0.2em] text-lf-sand/85"
    >
      From lot to income
    </motion.p>
    <motion.h1
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition, delay: 0.2 }}
      className="mt-3 max-w-[11ch] font-display text-4xl font-bold leading-[0.95] tracking-[-0.03em] text-lf-sand sm:text-5xl md:text-7xl"
      style={{ textShadow: "0 2px 24px rgba(38,19,7,0.45)" }}
    >
      See the rent your backyard is hiding.
    </motion.h1>
    
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition, delay: 0.35 }}
    >
      <CTAButton href="/signup" className="mt-7">
        Estimate my lot
      </CTAButton>
    </motion.div>
    
    <motion.dl
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition, delay: 0.5 }}
      className="mt-6 grid gap-3 rounded-2xl border border-lf-sand/20 bg-[#f8f0e41f] px-4 py-4 text-lf-sand shadow-[0_18px_40px_rgba(38,19,7,0.14)] backdrop-blur-sm sm:grid-cols-3 sm:gap-4 sm:px-5"
    >
      {HERO_PROOF.map(({ value, label }) => (
        <div key={label} className="min-w-0">
          <dt className="font-display text-2xl font-bold leading-none text-lf-sand sm:text-[1.75rem]">
            {value}
          </dt>
          <dd className="mt-1 text-[10px] uppercase tracking-[0.2em] text-lf-sand/75">
            {label}
          </dd>
        </div>
      ))}
    </motion.dl>
  </motion.div>
  ```

- [ ] **Step 2: Run Vitest unit tests**
  Run: `npm run test`
  Expected: All 92 tests pass, including `LandingHero.test.tsx` (which tests matching headings and link hrefs).

- [ ] **Step 3: Commit changes**
  ```bash
  git add components/landing/LandingHero.tsx
  git commit -m "style(landing): integrate Framer Motion reveals and upgraded CTAButton into LandingHero"
  ```

---

### Task 6: Final Verification & Smoke Test

**Files:**
- Test: Run full release checklist sequence.

- [ ] **Step 1: Check lint, type-check, tests, and build**
  Run: `npm run lint && npm run test && npx tsc --noEmit && npm run build`
  Expected: Clear outputs, zero warnings/errors, successful production build.

- [ ] **Step 2: Run end-to-end tests**
  Run: `npm run test:e2e`
  Expected: All Playwright E2E tests pass.

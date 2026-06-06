# Design Spec — High-End Visual Design Audit

**Date:** 2026-06-05  
**Topic:** High-End Visual Design Audit & Brand Alignment  
**Status:** Under Review  
**Project:** LotFoundry (yardup)

---

## 1. Overview
The goal of this task is to elevate the visual execution of LotFoundry's landing page, authentication screens, and key call-to-actions to match an **Editorial Luxury** brand archetype (warm creams, deep mahogany, high-contrast typography, and organic depth). We will implement a custom Concentric Double-Bezel component, integrate declarative React motion via the pre-installed `motion` package, refine CTA button kinetics, reorganize features into an Asymmetric Bento grid, and adjust global spacing/radii parameters.

---

## 2. Architecture & Component Spec

### A. `<Bezel>` Primitive
- **File:** [Bezel.tsx](file:///C:/Users/torra/Downloads/Repos/AR%20ADU/urbanlens-landing/components/ui/Bezel.tsx)
- **Role:** Wrap content with double-bezel concentric depth.
- **Styling:**
  - **Outer Frame:** `rounded-[2rem] border border-lf-hairline/25 bg-lf-taupe-soft p-1.5`
  - **Inner Core:** `rounded-[calc(2rem-6px)] bg-lf-card shadow-[inset_0_1px_2px_rgba(255,250,240,0.95),0_1px_3px_rgba(38,19,7,0.05)]`
- **Application:** Wrap the landing page `FeatureCard` list items, the final CTA band card, and the auth card inside [AuthLayout.tsx](file:///C:/Users/torra/Downloads/Repos/AR%20ADU/urbanlens-landing/components/auth/AuthLayout.tsx).

### B. Motion Choreography
- **Library:** Use the installed `motion` package.
- **Timing:** Custom cubic-bezier transition curves `[0.32, 0.72, 0, 1]` with `duration: 0.8` (or `0.5` depending on scale).
- **Entrance reveals:**
  - Standardize staggered fade-ups using `whileInView` reveals on features and sections.
  - Apply `initial={{ opacity: 0, y: 16 }}` to `whileInView={{ opacity: 1, y: 0 }}`.
- **Accessibility:** Conditionally disable motion or fall back to instant transitions when system `prefers-reduced-motion` is active.

### C. Premium CTA Buttons
- **Component:** Refactor [CTAButton.tsx](file:///C:/Users/torra/Downloads/Repos/AR%20ADU/urbanlens-landing/components/landing/CTAButton.tsx) and export it for general use.
- **Styling:**
  - **Shape:** `rounded-full` pill structure.
  - **Inner Layout:** Left-aligned text, right-aligned nested icon wrapper.
  - **Icon wrapper:** `w-8 h-8 rounded-full bg-lf-sand/15 grid place-items-center` for the ArrowRight icon.
  - **Kinetic physics:** Hover triggers `scale: 1.02` and slides the inner icon circle right (`x: 2`); press triggers `scale: 0.98` using spring-based motion curves.
- **Application:** Use this component across:
  - [LandingHero.tsx](file:///C:/Users/torra/Downloads/Repos/AR%20ADU/urbanlens-landing/components/landing/LandingHero.tsx)
  - [StageCaptions.tsx](file:///C:/Users/torra/Downloads/Repos/AR%20ADU/urbanlens-landing/components/landing/StageCaptions.tsx)
  - [FeatureBand.tsx](file:///C:/Users/torra/Downloads/Repos/AR%20ADU/urbanlens-landing/components/landing/FeatureBand.tsx) (start section)
  - [FeasibilityInspector.tsx](file:///C:/Users/torra/Downloads/Repos/AR%20ADU/urbanlens-landing/components/studio/FeasibilityInspector.tsx) (for "Create my ADU report").

### D. Asymmetric Bento Grid
- **File:** [FeatureBand.tsx](file:///C:/Users/torra/Downloads/Repos/AR%20ADU/urbanlens-landing/components/landing/FeatureBand.tsx)
- **Grid Layout:**
  - Replace the symmetric `md:grid-cols-3` layout with a 3-column asymmetric layout.
  - **Step 2 (3D Visualizer / See what fits):** Set to `md:col-span-2`. Embed a simulated 3D lot/ADU visual element at the bottom of the card.
  - **Steps 1 & 3:** Stack vertically in a single column (`col-span-1`) next to the hero tile.
  - On mobile below `md:`, reset all spans to standard `col-span-1` stacks.

### E. Macro-Whitespace & Radii
- **Vertical Padding:** Increase landing page section padding from `py-20 md:py-28` to `py-32 md:py-40`.
- **Radii:** Standardize on `rounded-[2rem]` for main section components/heros, maintaining concentric `rounded-[calc(2rem-X)]` inner divisions.

---

## 3. Testing & Verification Plan

1. **Typecheck & Lint:**
   - Execute `npx tsc --noEmit` and `npm run lint` to verify compilation safety.
2. **Unit Tests:**
   - Run `npm run test` to ensure all existing vitest tests (including `LandingHero.test.tsx` and `FeasibilityStudio.test.tsx`) are passing.
   - Adjust tests to mock `motion` as needed if it interferes with render hooks.
3. **E2E Visual Breakpoints:**
   - Run `npm run test:e2e` to verify Playwright E2E tests, verifying that buttons are clickable and accessible.

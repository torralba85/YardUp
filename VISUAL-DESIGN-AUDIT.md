# LotFoundry — High-End Visual Design Audit

**Scope:** Marketing landing, auth shell, studio chrome, studio content surfaces.
**Files reviewed:** `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/auth/AuthLayout.tsx`, `components/studio/AppShell.tsx`, `components/studio/FeasibilityInspector.tsx`, plus pattern grep across `components/**`.
**Stack:** Next.js 16 · React 19 · Tailwind v4 (`@theme`) · Three.js · Firebase. `motion` (Framer Motion) is installed.

---

## Archetype verdict

By the skill's own Section 3, this is — correctly — **Editorial Luxury**: warm creams (`#F2E5D5`/`#FBF6EE`), deep espresso/mahogany ink, a film-grain overlay (`.lf-grain`), and a display Grotesk (Outfit) over a humanist sans (Manrope). For a financial/feasibility tool, this is the *right* lane. Ethereal-Glass tropes (OLED black, glowing mesh orbs, heavy `backdrop-blur-2xl` cards) would be actively wrong here, so the audit grades **execution within Editorial Luxury**, not against a checklist that doesn't fit the product.

**Overall:** This is a genuinely competent, accessible, coherent product build — not "template with nice fonts," but not yet "$150k agency" either. The *foundation* (tokens, type pairing, grain, reduced-motion handling, print styles, focus-visible discipline, mobile bottom-tab nav, safe-area insets) is strong and in many places exemplary. The *surface craft* is conservative: flat single-layer cards, uniform small radii, instant color transitions, and no motion choreography. The gap between this and elite is almost entirely in **depth (nesting), motion, and macro-rhythm** — not in palette or type.

---

## What it already nails (keep)

- **Token system** — `@theme` palette with semantic + soft variants (`--color-lf-forest-soft`, etc.). Clean, extensible.
- **Type pairing** — Outfit (display, weights to 900) + Manrope + Geist Mono. None banned. `tabular-nums` globally — correct for a numbers-dense tool.
- **Grain overlay** done right — `pointer-events-none`, `::after`, `mix-blend-mode: multiply`, `opacity 0.05`, `isolation`. Matches the performance guardrail exactly.
- **`backdrop-blur` discipline** — every instance is on a `fixed` or `pointer-events-none absolute` overlay (mobile nav, scene HUDs), never on scrolling content. Textbook.
- **Accessibility** — consistent `focus-visible:ring` with offset, `aria-pressed`/`aria-current`/`role="alert"`, real `<label htmlFor>`. Above typical agency output.
- **`prefers-reduced-motion`** honored, plus dedicated `@media print` rules. Real engineering maturity.
- **Studio sidebar** (`AppShell`) uses `border-white/10` hairlines on dark mahogany — the *correct* hairline technique, and the one surface already close to elite.

---

## Genuine craft gaps (lift it inside Editorial Luxury)

### 1. No Double-Bezel — every card is a single flat layer · **HIGH**
Every container is one box: `rounded-xl border border-lf-hairline bg-lf-card p-6`. Section 4A's nested "machined hardware" look (outer shell `bg-lf-taupe-soft` + hairline ring + `p-1.5` → inner core with its own bg and `shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]` highlight + concentric radius) is absent everywhere — landing `FeatureCard` (`app/page.tsx:166`), CTA panel, `AuthLayout` card (`AuthLayout.tsx:26`), inspector sections.
**Fix:** Introduce one `<Bezel>` primitive and apply it to the landing feature grid, the CTA block, and the auth card. Inner highlight should be warm (`rgba(255,250,240,0.5)`), not the cold white the spec defaults to.

### 2. Zero motion choreography — `motion` installed but never imported · **HIGH**
`motion` is in `package.json` but **not imported anywhere** (verified — no `motion.`, `whileInView`, `AnimatePresence`). Every transition is `transition-colors`/`transition` with no curve. The only entry animation is `.lf-entrance` = `200ms ease-out translateY(4px)` (`globals.css:124`) — and it isn't applied to landing/auth at all. Section 5 wants `IntersectionObserver`/`whileInView` heavy fade-ups (`translate-y-16 blur-md opacity-0` → resolved over 800ms) on custom cubic-beziers.
**Fix:** Either use the installed `motion` for `whileInView` reveals on landing sections + feature cards (stagger), or drop the dead dep. Replace bare `transition` with `transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`. Honor the existing reduced-motion guard.

### 3. CTAs use naked trailing arrows — no Button-in-Button · **MEDIUM**
Primary CTAs put `<ArrowRight>` flush next to the label (`app/page.tsx:30,59,130`). Section 4B wants the arrow nested in its own circular wrapper (`w-8 h-8 rounded-full bg-lf-sand/15 grid place-items-center`) with `group-hover:translate-x-0.5` kinetic tension and `active:scale-[0.98]` press physics. The buttons also aren't `rounded-full` pills.
**Fix:** Build one `<CTAButton>` with the nested-icon pattern + magnetic hover; use on landing and `Generate Concept Report` (`FeasibilityInspector.tsx:355`).

### 4. No eyebrow micro-tags · **MEDIUM**
The hero badge (`app/page.tsx:39`) is `text-xs` with an icon — close, but section H2s ("Everything you need…", "Ready to explore…") have no eyebrow. Section 4C wants `rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]` micro-labels preceding major headings. The studio *already does this well* (`AppShell.tsx:58`, `FeasibilityInspector` `font-mono uppercase tracking-[0.16em]`) — the pattern just hasn't reached the marketing page.
**Fix:** Add eyebrow tags above the Features and CTA headings; reuse the studio's tracking treatment.

### 5. Landing layout is a symmetrical 3-col grid · **MEDIUM**
`app/page.tsx:80` is `lg:grid-cols-3` of six identical equal-weight cards — exactly Section 2's banned "symmetrical Bootstrap grid." Section 3B wants an asymmetrical Bento (a `col-span-8 row-span-2` hero tile beside stacked smaller cards) collapsing to single-column on mobile.
**Fix:** Promote one feature (3D visualization — the product's hook) to a large bento tile; let the others stack asymmetrically. Reset all spans to `col-span-1` below `md:`.

### 6. Conservative macro-whitespace & uniform radii · **LOW**
Sections sit at `py-20 md:py-28` — at the floor, not the `py-24`→`py-40` "breathe heavily" range. Radii are uniformly `rounded-md/lg/xl/2xl`; no exaggerated `rounded-[2rem]` squircles anywhere (verified — zero `rounded-[`).
**Fix:** Push hero/feature/CTA sections toward `py-32`/`py-40`. Bump hero and primary cards to `rounded-[2rem]` (with concentric inner radii once bezels land); keep dense studio controls at current radii.

---

## Deliberate restraints — flag as taste, NOT failures

These trip Section 2's lint but are *defensible* (often correct) for a numbers-dense feasibility tool. Do not "fix" mechanically:

- **1px hairline borders** (`border-lf-hairline`) — warm and tonal, not the banned cold gray. In the studio's dense forms, crisp dividers beat soft shadows. Keep in studio; only the *marketing* cards benefit from bezel depth.
- **Default Lucide icons** (2px stroke) — the skill bans thick Lucide. At the small sizes used here (14–22px) the weight reads fine and they're consistent. Optional upgrade to a lighter set (Phosphor Light) is cosmetic, low priority.
- **Fast `transition` timings** — instant feedback is *good* on form controls (footprint/roof/finish toggles). Reserve heavy 700–800ms motion for marketing/entry surfaces, not inspector inputs.
- **`tabular-nums` + mono facts** — exactly right for a financial tool. Keep.
- **Modest radii in the studio** — dense control clusters would look toy-like at `rounded-[2rem]`. The restraint is correct here.

---

## Priority order

1. **`<Bezel>` primitive** → apply to landing feature grid + CTA + auth card. (Highest visual lift, contained blast radius.)
2. **Motion**: decide — wire `motion` for `whileInView` reveals + cubic-bezier transitions on marketing, or remove the dead dep.
3. **`<CTAButton>`** with nested-icon + magnetic hover.
4. **Eyebrow tags** on landing section headings.
5. **Asymmetric bento** for the landing feature section.
6. Macro-whitespace + hero radius bump.

Leave the studio inspector and app-shell largely alone — they're the strongest surfaces and their restraint is earned. The marketing landing and auth card are where elite polish pays off most.

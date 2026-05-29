# UrbanLens AR Design System

UrbanLens AR is a feasibility desk for ADU investment decisions. The product should feel practical, spatial, and financially serious: a user opens it, changes a parcel or ADU assumption, and immediately understands the income potential, payback, site fit, and reportable next step.

The one thing people should remember after first use: this shows the money an ADU could make and whether the site can plausibly support it.

## Product Posture

- **Primary user:** property investors, owners, and advisors evaluating an ADU concept before paying for deeper professional work.
- **Product type:** local-first analytical web app with a 3D parcel workspace, assumptions panel, feasibility metrics, and exportable report.
- **Promise:** fast deterministic feasibility evidence, not live permitting or construction certainty.
- **Tone:** precise, grounded, investor-readable. Avoid speculative, magical, or design-studio-first language.

## Visual Thesis

Use an **industrial feasibility desk** aesthetic: dark navigational shell, bright parcel evidence, quiet white controls, and revenue-green signals. The interface should look like serious software used to make a property decision, not a marketing page or generic SaaS dashboard.

The 3D parcel scene is the product's proof surface. The financial lens is the product's memory hook. Controls and reports exist to support those two things.

## Safe Choices

These are category expectations and should remain stable:

- **Dashboard density:** show controls, 3D scene, and financial metrics in the first viewport on desktop.
- **Financial hierarchy:** rent, annual NOI, payback, build range, coverage, and zoning status must stay visible without deep navigation.
- **Semantic status colors:** green for compliant/value-positive states, amber for review/risk states, red only for destructive or blocking states.
- **Report affordance:** export and print actions should feel utilitarian and trustworthy, not promotional.
- **Compact controls:** segmented footprint, roof, finish, and rent controls should remain tight and scannable.

## Design Risks

These are deliberate departures that make UrbanLens feel ownable:

- **The 3D scene leads, not a hero banner.** The first impression is the working parcel, not brand copy. This costs some marketing polish but makes the demo feel real.
- **Financial overlay over spatial evidence.** The income lens floats directly on the parcel, linking money to physical feasibility. This risks visual density, so contrast and spacing must be controlled.
- **Restrained color, high signal.** The app uses green sparingly for value and status instead of a broad multi-accent palette. It may feel quieter, but it keeps attention on numbers.

## Typography

Preferred stack:

- **Display and large numbers:** `Fraunces` for major revenue, NOI, and payback figures when a font import is available. Use high optical contrast sparingly.
- **UI and body:** `Instrument Sans` for labels, controls, panel headers, and report text.
- **Tabular data:** `IBM Plex Mono` for small numeric readouts, ranges, dimensions, and scenario ids.

Fallback stack:

```css
font-family: Instrument Sans, ui-sans-serif, system-ui, sans-serif;
font-variant-numeric: tabular-nums;
```

Do not use oversized hero type inside compact panels. Data cards should use tight headings, clear labels, and strong numeric contrast. Letter spacing should stay at `0` for normal text; use uppercase tracking only for short eyebrow labels.

Avoid `Inter`, `Roboto`, `Arial`, `Helvetica`, `Poppins`, and `Space Grotesk` as the primary design decision. They are acceptable only as system fallbacks.

## Color System

Core tokens:

```css
:root {
  --ul-ink: #07111a;
  --ul-ink-2: #0f172a;
  --ul-panel: #ffffff;
  --ul-paper: #f5f7f4;
  --ul-line: #d8e0da;
  --ul-muted: #64748b;
  --ul-revenue: #047857;
  --ul-revenue-strong: #006b4a;
  --ul-revenue-soft: #ecfdf5;
  --ul-parcel: #386a39;
  --ul-parcel-dark: #13221c;
  --ul-permit: #d97706;
  --ul-risk-soft: #fffbeb;
  --ul-blueprint: #2563eb;
}
```

Usage rules:

- Dark shell: `--ul-ink` and `--ul-ink-2` only.
- Main canvas: parcel greens with enough contrast for setbacks and labels.
- App surface: `--ul-paper` background with white panels.
- Primary action: revenue green.
- Warning state: permit amber.
- Blue is reserved for blueprint/share/technical evidence, not primary CTAs.

Avoid purple gradients, decorative blobs, broad beige palettes, and one-note green-on-green pages. Green should signal value and feasibility; it should not wash the whole app.

## Layout

Desktop layout:

- Fixed dark left navigation.
- Main 3D parcel scene takes the dominant width.
- Right inspector panel is a persistent workbench.
- Bottom metrics strip anchors financial and zoning outcomes.
- Report preview appears as a docked document surface, not a modal unless mobile requires it.

Mobile layout:

- Use a compact top bar, then stack the financial lens, 3D scene, controls, metrics, and report.
- Keep the first remembered number visible early.
- Controls may stack, but fixed-format button groups need stable heights so labels cannot resize the layout.

Spacing:

- Base unit: `4px`.
- Panel padding: `20px` to `24px`.
- Control height: `40px` to `44px`.
- Border radius: `6px` to `8px`; use `4px` for tiny swatches and preview thumbnails.
- Do not put cards inside cards. Panels can be bounded, but page sections should remain full-width tool surfaces.

## Components

### Income Lens

The income lens is the most important UI object. It must show:

- Rent per month.
- Annual NOI.
- Payback in years.
- Build cost range.
- Current zoning status.

Use dark glass only when it sits on top of the parcel scene. On light surfaces, convert it to a white panel with ink text and green accents.

### Parcel Scene

The scene should feel inspectable and useful:

- Lot boundary must remain high contrast.
- Setbacks must be visible but lower-priority than the ADU and boundary.
- Labels should never obscure the ADU mass.
- Camera framing should keep the proposed ADU, existing structure, and setback envelope visible at first paint.

Do not add purely decorative 3D objects. Every visual object should help the feasibility read.

### Inspector

Controls are decision levers, not form fields. Use:

- Segmented controls for footprint, roof, finish, and rent scenario.
- Swatches for material choices.
- Sliders for numeric dimensions.
- Select menus for parcel presets.
- Icon plus text buttons for report, save, reset, and export actions.

### Metrics Strip

The metrics strip is the quick investor readout. It should stay compact, high contrast, and scannable. Keep numeric values larger than labels. Use semantic coloring only for status.

### Report Preview

The report preview should feel like a document artifact generated from the model. It should be plain, printable, and confidence-building. Include estimate disclaimers without making the interface feel afraid of itself.

## Motion

Motion should be minimal and functional:

- Use subtle transitions for button state, report reveal, and saved/share notices.
- Use 3D camera damping for inspectability.
- Respect `prefers-reduced-motion`.
- Do not choreograph scroll, add decorative loops, or animate financial numbers in a way that makes them feel less trustworthy.

## Copy Rules

- Lead with money, feasibility, and reportability.
- Say "estimate", "concept", "scenario", and "feasibility" when the output is deterministic demo data.
- Do not imply live GIS, permitting approval, builder outreach, financing approval, or construction certainty.
- Prefer "income potential", "payback", "build range", "coverage", and "review needed" over design-heavy language.

Good:

- "ADU income potential"
- "Live concept assumptions and investor-grade outputs."
- "Estimate updates as you change parcel, size, finish, and rent assumptions."
- "Confirm local zoning, utility constraints, financing, tax treatment, and market rents before investment decisions."

Avoid:

- "Approved"
- "Guaranteed"
- "Instant permit"
- "AI-powered builder marketplace"
- "Dream backyard transformation"

## Accessibility

- Maintain visible focus rings on all interactive controls.
- Keep contrast high on scene overlays.
- Preserve keyboard access for all report and control actions.
- Keep print styles plain and complete.
- Never encode status by color alone; pair it with text.

## Implementation Notes

- Current files using this system:
  - `app/globals.css`
  - `components/FeasibilityStudio.tsx`
  - `components/ParcelScene.tsx`
  - `components/studio/AppShell.tsx`
  - `components/studio/FeasibilityInspector.tsx`
  - `components/studio/MetricsSummary.tsx`
  - `components/studio/ReportPreview.tsx`
- Use CSS variables for future broad color changes instead of scattering raw hex values.
- Keep lucide icons for controls and status affordances.
- Validate meaningful UI changes with desktop and mobile screenshots.

## Quality Bar

A design change is done when:

- The first viewport still communicates income potential, site fit, and next action.
- The 3D parcel is visible, nonblank, and framed around the ADU decision.
- Text fits on desktop and mobile without overlap.
- Primary controls are reachable and have stable dimensions.
- The report remains printable and includes scope disclaimers.
- The app does not drift toward a generic SaaS landing page.

# Building with A LOT MORE (LotFoundry)

LotFoundry is an ADU feasibility studio. A LOT MORE is its whole visual system: chalk paper, carbon ink,
one signal-orange action, square surfaces with hard offset shadows. Space Grotesk for display, Manrope for body.

## Setup

- No provider or theme wrapper. Link `styles.css` and load `_ds_bundle.js`; everything is on `window.LotFoundryUI`.
- Set the page ground once: `<div className="min-h-screen bg-lot-chalk font-sans text-lot-ink">`. Use `font-display` for display type.
- The Lucide icons the product uses ship on the same global (`ArrowRight`, `Check`, `Lock`, `MapPin`, `Search`, `X`, ...). Pass `size` and `strokeWidth={1.5}`.
- `Dialog` portals to `body` and dims the whole page. Render it only while it's open, and pass `onClose` unless it must block. It's the only modal; never hand-roll a `fixed inset-0` scrim.

## Styling: precompiled Tailwind 4 plus tokens

`_ds_bundle.css` is the product's compiled Tailwind. **It isn't a Tailwind runtime: only classes the product
already uses exist.** Before relying on a utility, search `_ds_bundle.css` for it. Breakpoints are sparse (for
example, `sm:grid-cols-2`, `md:grid-cols-2` and `lg:grid-cols-3` exist, but most `md:`/`xl:` variants don't).
When a class is missing, use an inline `style` with the tokens: `var(--color-lot-line)`, `var(--shadow-paper)`.

| Role | Classes |
|---|---|
| Ground / ink | `bg-lot-chalk`, `text-lot-ink`; dark panels `bg-lot-ink` + `text-lot-chalk` |
| Muted text | `text-lot-stone` on chalk, `text-lot-stone-on-dark` on carbon |
| Hairlines | `border-lot-line`, `border-lot-line-dark` |
| Raised fill | `bg-lot-surface`, `bg-lot-surface-dark`, `bg-lot-paper` |
| Action | `bg-lot-orange` (fill only); orange *text* on chalk is `text-lot-orange-ink` |
| Status | `text-status-eligible` / `-review` / `-blocked`, `bg-status-*-soft`, `text-status-eligible-on-dark` |
| Type | `lf-display-hero`, `lf-section-heading`, `lf-card-heading`, `lf-panel-heading`, `lf-body-lg`, `lf-body`, `lf-body-sm`, `lf-caption`, `lf-kicker`, `lf-kicker-dense`, `lf-dataprint` |
| Money | `lf-money-sm` / `-md` / `-lg` / `-xl` (tabular, carbon), or `MoneyFigure` |
| Shape | `rounded-none` for surfaces and cards, `rounded-control` (3px) for controls |
| Elevation | hard offset only: `shadow-paper`, `shadow-paper-sm`, `shadow-card`, `shadow-callout`, `shadow-overlay` |

Rules the product enforces:
- An `lf-*` type class sets size, weight and family. Don't add `text-*` size utilities beside it, because the `lf-*` heading and body classes win.
- Use one orange action per panel; step everything else down with `Button` `variant="commit"`, `"secondary"` or `"ghost"`.
- Money is carbon and typographic, never green. Green means eligible/verified.
- Status always shows an icon plus a label (`StatusChip`), never colour alone.
- Touch targets are at least 44px (`min-h-11`). Never draw blur shadows, pill radii or a serif or mono face.
- Use `Input`, `Select`, `Textarea`, `Checkbox`, `Segmented` and `Slider` for fields, never raw form controls. Use `Button` for actions.

## Where the truth lives

- `guidelines/design-system.md`: the full A LOT MORE spec (palette and contrast §2, type §3, component rows §6).
- `components/<group>/<Name>/<Name>.prompt.md`: the props and real usage for each component.
- `_ds_bundle.css`: which classes and `--color-lot-*` / `--color-status-*` tokens exist.

## Example

```jsx
const { Bezel, Button, MoneyFigure, StatusChip, ArrowRight } = window.LotFoundryUI;

<div className="min-h-screen bg-lot-chalk px-6 py-10 font-sans text-lot-ink">
  <p className="lf-kicker text-lot-stone">1234 Oak Street, San Diego</p>
  <h1 className="lf-section-heading mt-2">A backyard home fits this lot</h1>
  <div className="mt-6 grid gap-4 sm:grid-cols-2">
    <Bezel innerClassName="gap-3 p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="lf-kicker text-lot-stone">Estimated rent</p>
        <StatusChip status="clear" label="ADU allowed" />
      </div>
      <MoneyFigure value={2050} size="band" />
      <p className="lf-caption text-lot-stone">Early planning estimate for a 600 sf one-bedroom.</p>
    </Bezel>
  </div>
  <Button className="mt-6" rightIcon={<ArrowRight size={18} strokeWidth={1.5} />}>Check this address</Button>
</div>
```

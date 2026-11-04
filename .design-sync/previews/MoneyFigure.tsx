import { MoneyFigure } from "@lotfoundry/ui";

// Money is typographic: Space Grotesk tabular numerals in carbon, never green.
export const Sizes = () => (
  <div className="flex flex-col items-start gap-4">
    <MoneyFigure value={2050} size="hero" />
    <MoneyFigure value={2050} size="band" />
    <MoneyFigure value={2050} size="inline" />
    <MoneyFigure value={2050} size="sm" />
  </div>
);

export const Units = () => (
  <div className="flex flex-col items-start gap-3">
    <MoneyFigure value={2050} unit="/mo" size="inline" />
    <MoneyFigure value={24600} unit="/yr" size="inline" />
    <MoneyFigure value={186000} unit="" size="inline" />
  </div>
);

export const OnDark = () => (
  <div className="flex w-80 flex-col gap-2 bg-lot-ink p-6">
    <p className="lf-kicker text-lot-stone-on-dark">Estimated rent</p>
    <MoneyFigure value={2050} size="band" tone="onDark" />
  </div>
);

export const InContext = () => (
  <div className="flex w-80 flex-col gap-1 border border-lot-line bg-lot-chalk p-5">
    <p className="lf-kicker text-lot-stone">Build cost estimate</p>
    <MoneyFigure value={186000} unit="" size="band" />
    <p className="lf-caption text-lot-stone">600 sf at $310/sf, soft costs included.</p>
  </div>
);

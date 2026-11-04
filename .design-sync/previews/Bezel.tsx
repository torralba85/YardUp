import { Bezel, MoneyFigure, StatusChip } from "@lotfoundry/ui";

// The square paper surface with the hard offset shadow (shadow-paper).
export const Default = () => (
  <div className="p-4">
    <Bezel className="w-80" innerClassName="gap-2 p-6">
      <p className="lf-kicker text-lot-orange-ink">1234 Oak Street</p>
      <h3 className="lf-card-heading text-lot-ink">Likely feasible</h3>
      <p className="lf-body-sm text-lot-stone">4 of 6 checks clear, with 2 to confirm before permitting.</p>
    </Bezel>
  </div>
);

export const WithFigure = () => (
  <div className="p-4">
    <Bezel className="w-80" innerClassName="gap-3 p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="lf-kicker text-lot-stone">Estimated rent</p>
        <StatusChip status="info" label="Demo data" />
      </div>
      <MoneyFigure value={2050} size="band" />
      <p className="lf-caption text-lot-stone">Early planning estimate for a 600 sf one-bedroom.</p>
    </Bezel>
  </div>
);

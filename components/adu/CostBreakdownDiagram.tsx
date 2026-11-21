import {
  defaultAduConfig,
  defaultFinancialAssumptions,
} from "@/lib/feasibility";
import { calculateFinance } from "@/lib/finance";
import { formatCompactDollars } from "@/lib/intl-format";

/**
 * Inline SVG breakdown of the modeled 600 sq ft detached ADU budget,
 * computed directly from `calculateFinance` with Studio defaults.
 */
export function CostBreakdownDiagram() {
  const finance = calculateFinance(
    600,
    { ...defaultAduConfig, footprint: 600 },
    defaultFinancialAssumptions,
    { conservative: 0, market: 0, optimistic: 0 },
  );
  const { baseConstruction, openings, softCosts, total } = finance.costBreakdown;

  const segments = [
    {
      label: "Base construction",
      value: baseConstruction,
      detail: "$340/sq ft",
      barFill: "var(--ink)",
    },
    {
      label: "Windows & doors",
      value: openings,
      detail: "Openings allowance",
      barFill: "var(--stone)",
    },
    {
      label: "Design & permits",
      value: softCosts,
      detail: "18% soft-cost allowance",
      barFill: "var(--orange)",
    },
  ] as const;

  const chartWidth = 420;
  const chartX = 20;
  let runningX = chartX;
  const bars = segments.map((seg) => {
    const width = Math.max(8, Math.round((seg.value / total) * chartWidth));
    const x = runningX;
    runningX += width;
    return { ...seg, x, width };
  });

  const titleId = "adu-cost-breakdown-title";
  const descId = "adu-cost-breakdown-desc";

  return (
    <figure className="my-8 border border-lot-line bg-lot-surface p-6">
      <svg
        viewBox="0 0 460 156"
        className="h-auto w-full text-lot-ink"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>
          {`Modeled 600 sq ft ADU cost breakdown (${formatCompactDollars(total, 1)} midpoint)`}
        </title>
        <desc id={descId}>
          Stacked budget bar showing base construction ({formatCompactDollars(baseConstruction, 1)}),
          windows and doors ({formatCompactDollars(openings, 1)}), and design and permit soft costs
          ({formatCompactDollars(softCosts, 1)}), summing to a {formatCompactDollars(total, 1)} midpoint
          (range {formatCompactDollars(finance.costLow, 1)} to {formatCompactDollars(finance.costHigh, 1)}).
        </desc>

        <text x="20" y="22" fontSize="13" fontWeight="700" fill="currentColor">
          600 sq ft detached ADU midpoint: {formatCompactDollars(total, 1)} (range{" "}
          {formatCompactDollars(finance.costLow, 1)}–{formatCompactDollars(finance.costHigh, 1)})
        </text>

        <g>
          {bars.map((bar) => (
            <rect
              key={bar.label}
              x={bar.x}
              y="38"
              width={bar.width}
              height="30"
              fill={bar.barFill}
              stroke="var(--chalk)"
              strokeWidth="1.5"
            />
          ))}
        </g>

        {bars.map((seg, index) => {
          const y = 94 + index * 20;
          return (
            <g key={seg.label}>
              <rect
                x="20"
                y={y - 10}
                width="10"
                height="10"
                fill={seg.barFill}
              />
              <text x="38" y={y} fontSize="12" fontWeight="600" fill="currentColor">
                {seg.label}
              </text>
              <text
                x="440"
                y={y}
                textAnchor="end"
                fontSize="12"
                className="text-lot-stone"
                fill="currentColor"
              >
                {formatCompactDollars(seg.value, 1)} · {seg.detail}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="lf-body mt-2 text-sm text-lot-stone">
        Studio defaults (cedar siding, shed roof). Site grading, utility trenching,
        land, and agency fees above the 18% soft-cost allowance are outside this bar.
      </figcaption>
    </figure>
  );
}

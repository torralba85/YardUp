import { marketProvenanceLine } from "@/lib/market/market-basis";
import { cityMarketAggregate } from "@/lib/adu/market-aggregate";
import type { JurisdictionContent } from "@/lib/adu/types";

function formatDollars(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString("en-US")}`;
}

/**
 * Build-cost bands at 400 / 600 / 800 / 1,200 sqft, computed by the Studio
 * cost engine from the city's county rent anchor — never from a static
 * file. Renders nothing for a city with no market anchor.
 */
export function CostBands({ content }: { content: JurisdictionContent }) {
  const aggregate = cityMarketAggregate(content.slug);
  if (!aggregate) return null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Estimated ADU build cost in {content.city} by unit size
          </caption>
          <thead>
            <tr className="border-b border-lot-line">
              <th scope="col" className="py-3 pr-4 font-semibold text-lot-ink">
                Unit size
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold text-lot-ink">
                Estimated build cost
              </th>
            </tr>
          </thead>
          <tbody>
            {aggregate.rows.map((row) => (
              <tr key={row.size} className="border-t border-lot-line">
                <th scope="row" className="py-3 pr-4 align-top font-semibold text-lot-ink">
                  {row.size.toLocaleString("en-US")} sq ft
                </th>
                <td className="py-3 text-lot-stone">
                  {formatDollars(row.costLow)}–{formatDollars(row.costHigh)}{" "}
                  <span className="mt-1 block text-xs leading-relaxed">estimate</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lf-body mt-3 text-sm text-lot-stone">
        Citywide estimates from the LotFoundry cost engine, not {content.city}
        &rsquo;s fee schedule — confirm permit fees against the city&rsquo;s
        current bulletin before budgeting. {marketProvenanceLine(aggregate.provenance)}.
      </p>
    </div>
  );
}

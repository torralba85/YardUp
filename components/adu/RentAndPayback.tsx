import { marketProvenanceLine } from "@/lib/market/market-basis";
import { cityMarketAggregate } from "@/lib/adu/market-aggregate";
import type { JurisdictionContent } from "@/lib/adu/types";

/**
 * Projected rent and simple payback by unit size, computed by the Studio
 * finance engine from the city's county rent anchor — never from a static
 * file. Renders nothing for a city with no market anchor.
 */
export function RentAndPayback({ content }: { content: JurisdictionContent }) {
  const aggregate = cityMarketAggregate(content.slug);
  if (!aggregate) return null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Projected monthly rent and payback period in {content.city} by unit size
          </caption>
          <thead>
            <tr className="border-b border-lot-line">
              <th scope="col" className="py-3 pr-4 font-semibold text-lot-ink">
                Unit size
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold text-lot-ink">
                Projected rent/mo
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold text-lot-ink">
                Simple payback
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
                  ${row.monthlyRent.toLocaleString("en-US")}{" "}
                  <span className="mt-1 block text-xs leading-relaxed">estimate</span>
                </td>
                <td className="py-3 text-lot-stone">
                  {row.paybackYears.toFixed(1)} years{" "}
                  <span className="mt-1 block text-xs leading-relaxed">estimate</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lf-body mt-3 text-sm text-lot-stone">
        Citywide estimates — payback on your lot depends on your buildable
        envelope, your build size, and your neighborhood rent.{" "}
        {marketProvenanceLine(aggregate.provenance)}.
      </p>
    </div>
  );
}

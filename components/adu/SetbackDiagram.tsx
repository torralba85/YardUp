import type { JurisdictionContent } from "@/lib/adu/types";

/**
 * Visual of the short-ADU versus tall-ADU setback split (e.g. San
 * Diego's under-16-ft zero setback against the 4-ft rule at 16 ft and
 * over). Inline SVG — no image fetch, no layout shift — drawn in
 * `currentColor` so it stays legible in dark mode, and wrapping to one
 * column below 375px via a stacked viewBox.
 */
export function SetbackDiagram({ content }: { content: JurisdictionContent }) {
  const diagram = content.setbackDiagram;
  if (!diagram) return null;

  return (
    <figure
      aria-label={`Setback diagram for ${content.city}`}
      className="mt-6 text-lot-ink dark:text-lot-chalk"
    >
      <svg
        viewBox="0 0 360 240"
        role="img"
        aria-labelledby="setback-diagram-title setback-diagram-desc"
        className="h-auto w-full"
      >
        <title id="setback-diagram-title">
          {`${content.city} side and rear setbacks by ADU height`}
        </title>
        <desc id="setback-diagram-desc">
          {`${diagram.shortLabel}: ${diagram.shortRule}. ${diagram.tallLabel}: ${diagram.tallRule}.`}
        </desc>

        {/* Short ADU: hugs the side and rear lines. */}
        <g>
          <text x="10" y="18" fontSize="13" fontWeight="700" fill="currentColor">
            {diagram.shortLabel}
          </text>
          <rect
            x="10"
            y="28"
            width="150"
            height="150"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <rect
            x="60"
            y="118"
            width="100"
            height="60"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text x="10" y="198" fontSize="12" fill="currentColor">
            {diagram.shortRule}
          </text>
        </g>

        {/* Tall ADU: stands off the side and rear lines. */}
        <g>
          <text x="200" y="18" fontSize="13" fontWeight="700" fill="currentColor">
            {diagram.tallLabel}
          </text>
          <rect
            x="200"
            y="28"
            width="150"
            height="150"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <rect
            x="232"
            y="90"
            width="86"
            height="56"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="2"
          />
          {/* Stand-off arrows on the rear and side gaps. */}
          <line x1="232" y1="160" x2="232" y2="178" stroke="currentColor" strokeWidth="1.5" />
          <line x1="200" y1="118" x2="218" y2="118" stroke="currentColor" strokeWidth="1.5" />
          <text x="200" y="198" fontSize="12" fill="currentColor">
            {diagram.tallRule}
          </text>
        </g>
      </svg>
      <figcaption className="lf-body mt-2 text-sm text-lot-stone">
        Dashed lines are the property lines. On a narrow lot the short design
        can yield more usable square footage than the taller one — model both
        in the Studio before talking to a designer.
      </figcaption>
    </figure>
  );
}

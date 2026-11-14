/**
 * Inline SVG schematic comparing a Junior ADU (<= 500 sq ft inside the main
 * home or attached garage) with a detached ADU (<= 1,200 sq ft in the yard).
 */
export function JaduComparisonDiagram() {
  const titleId = "jadu-vs-adu-title";
  const descId = "jadu-vs-adu-desc";

  return (
    <figure className="my-8 border border-lot-line bg-lot-surface p-6">
      <svg
        viewBox="0 0 420 236"
        className="h-auto w-full text-lot-ink"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>
          Junior ADU (JADU) vs. detached ADU placement and requirements
        </title>
        <desc id={descId}>
          Side-by-side lot schematic: a JADU up to 500 sq ft fits inside the existing
          house or attached garage with an efficiency kitchen and optional shared
          bathroom, while a detached ADU up to 1,200 sq ft stands separately in the
          yard with 4-foot side and rear setbacks and a full kitchen and bath.
        </desc>

        {/* Left: JADU inside existing home / attached garage */}
        <g>
          <text x="12" y="20" fontSize="13" fontWeight="700" fill="currentColor">
            Junior ADU (JADU) · up to 500 sq ft
          </text>
          <rect
            x="12"
            y="32"
            width="180"
            height="140"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          {/* Main house */}
          <rect
            x="32"
            y="64"
            width="140"
            height="82"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text x="44" y="88" fontSize="11" fill="currentColor">
            Main house
          </text>
          {/* Carve-out JADU inside */}
          <rect
            x="104"
            y="64"
            width="68"
            height="82"
            fill="var(--orange)"
            fillOpacity="0.22"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text x="112" y="98" fontSize="11" fontWeight="700" fill="currentColor">
            JADU
          </text>
          <text x="112" y="114" fontSize="10" fill="currentColor">
            &lt;= 500 sf
          </text>
          {/* Separate exterior door arrow */}
          <line x1="172" y1="106" x2="188" y2="106" stroke="currentColor" strokeWidth="1.5" />
          <text x="12" y="192" fontSize="11" fill="currentColor">
            <tspan x="12" dy="0">Inside house or attached garage;</tspan>
            <tspan x="12" dy="15">efficiency kitchen; separate entrance;</tspan>
            <tspan x="12" dy="15">can share house bath (owner on site)</tspan>
          </text>
        </g>

        {/* Right: Detached ADU */}
        <g>
          <text x="224" y="20" fontSize="13" fontWeight="700" fill="currentColor">
            Detached ADU · up to 1,200 sq ft
          </text>
          <rect
            x="224"
            y="32"
            width="180"
            height="140"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          {/* Main house */}
          <rect
            x="244"
            y="46"
            width="112"
            height="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text x="254" y="76" fontSize="11" fill="currentColor">
            Main house
          </text>
          {/* Detached ADU in rear yard */}
          <rect
            x="284"
            y="112"
            width="104"
            height="46"
            className="text-lot-ink"
            fill="currentColor"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text x="294" y="138" fontSize="11" fontWeight="700" fill="currentColor">
            Detached ADU
          </text>
          <text x="224" y="192" fontSize="11" fill="currentColor">
            <tspan x="224" dy="0">Separate structure in the yard;</tspan>
            <tspan x="224" dy="15">4 ft side and rear setbacks;</tspan>
            <tspan x="224" dy="15">full kitchen and bath; no owner rule</tspan>
          </text>
        </g>
      </svg>
      <figcaption className="lf-body mt-2 text-sm text-lot-stone">
        Dashed lines show lot boundaries. A single-family lot can combine a JADU
        inside the house and a detached ADU in the yard (Gov. Code §66323).
      </figcaption>
    </figure>
  );
}

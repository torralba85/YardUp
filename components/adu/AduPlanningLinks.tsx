import Link from "next/link";

const resources = [
  { href: "/can-i-build-a-backyard-home", label: "Can I build a backyard home? (60-second ADU quiz)", detail: "Answer 5 yes/no questions to check ADU eligibility and jump into your lot in 3D." },
  { href: "/adu/ca/can-i-build-an-adu", label: "Can I build an ADU on my property?", detail: "California eligibility rules and a 5-point parcel checklist." },
  { href: "/adu/ca", label: "California ADU rules by city", detail: "Find the right jurisdiction and its source documents." },
  { href: "/adu/ca/cost", label: "California ADU cost guide", detail: "Budget by unit size, understand fees, and compare complete quotes." },
  { href: "/adu/ca/san-diego", label: "City of San Diego ADU rules and handbook", detail: "Check City rules, overlays, fees and permit steps." },
  { href: "/adu/ca/san-diego/cost", label: "San Diego ADU cost, rent and payback", detail: "See build cost and rent by unit size for San Diego County." },
  { href: "/adu/ca/san-jose", label: "San José ADU rules and permit guide", detail: "Choose City or State standards, then check sizes, heights and permit steps." },
  { href: "/adu/ca/sacramento", label: "Sacramento ADU rules and permit guide", detail: "Compare the local and state options for size, setbacks and unit count." },
  { href: "/adu/ca/jadu", label: "Junior ADU (JADU) rules in California", detail: "What a JADU is, how it differs from an ADU, and the state rules." },
  { href: "/adu/ca/rent", label: "California ADU rent by county", detail: "HUD's latest rent benchmarks for 12 counties, by bedroom count." },
  { href: "/adu/ca/san-diego/permits", label: "San Diego ADU permits by neighborhood", detail: "How many backyard homes the City has permitted, and where." },
  { href: "/adu-cost-calculator", label: "Free ADU cost, rent and payback calculator", detail: "Compare sizes and assumptions before checking your lot." },
  { href: "/adu/how-we-estimate", label: "How we estimate cost, rent and payback", detail: "The formulas, data sources and limits behind every figure." },
];

/** Server-rendered paths between the California planning resources. */
export function AduPlanningLinks({ current }: { current: string }) {
  return (
    <nav aria-label="California ADU planning resources" className="border-y border-lot-line py-5">
      <h2 className="lf-card-heading text-lot-ink">Plan your next step</h2>
      <ul className="mt-3 space-y-3">
        {resources.filter((resource) =>
          resource.href !== current &&
          !(current === "/adu/ca/san-diego" && resource.href === "/adu/ca/san-diego/permits")
        ).map((resource) => (
          <li key={resource.href}>
            <Link href={resource.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-ink underline underline-offset-4 hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink">
              {resource.label}
            </Link>
            <p className="lf-body text-sm text-lot-stone">{resource.detail}</p>
          </li>
        ))}
      </ul>
    </nav>
  );
}

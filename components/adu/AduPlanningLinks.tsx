import Link from "next/link";

const resources = [
  { href: "/adu/ca", label: "California ADU rules by city", detail: "Find the right jurisdiction and its source documents." },
  { href: "/adu/ca/san-diego", label: "San Diego ADU cost and permit guide", detail: "Check city rules, overlays, fees and permit steps." },
  { href: "/adu-cost-calculator", label: "Free ADU cost, rent and payback calculator", detail: "Compare sizes and assumptions before checking your lot." },
];

/** Server-rendered paths between the three California planning resources. */
export function AduPlanningLinks({ current }: { current: string }) {
  return (
    <nav aria-label="California ADU planning resources" className="border-y border-lot-line py-5">
      <h2 className="lf-card-heading text-lot-ink">Plan your next step</h2>
      <ul className="mt-3 space-y-3">
        {resources.filter((resource) => resource.href !== current).map((resource) => (
          <li key={resource.href}>
            <Link href={resource.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink">
              {resource.label}
            </Link>
            <p className="lf-body text-sm text-lot-stone">{resource.detail}</p>
          </li>
        ))}
      </ul>
    </nav>
  );
}

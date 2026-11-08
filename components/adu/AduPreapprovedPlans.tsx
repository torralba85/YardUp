import {
  guidePlanCatalog,
  planFacts,
  planFootprintLabel,
} from "@/lib/preapproved-plans";
import type { JurisdictionContent } from "@/lib/adu/types";

const linkClass =
  "inline-flex min-h-11 items-center text-sm font-semibold text-lot-ink underline underline-offset-4 hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink";

/**
 * Official pre-approved plans for a jurisdiction guide, read from the same
 * curated catalog the Studio uses (`lib/preapproved-plans-data.ts`), so the
 * public page and the 3D study can never disagree about which plans exist,
 * their published sizes, or when the listing was checked.
 *
 * Server-rendered, no client JavaScript. Renders nothing unless the program
 * is verified and has curated plans; a footprint is shown only where the
 * plan's own floor-plan sheet was read. The address CTA that follows the
 * section is the path to trying a plan on a real lot.
 */
export function AduPreapprovedPlans({ content }: { content: JurisdictionContent }) {
  const catalog = guidePlanCatalog(content.state, content.slug);
  if (!catalog) return null;
  const { program, plans } = catalog;
  const checked = program.verifiedAt ?? program.reviewedAt;

  return (
    <section aria-labelledby="adu-plans" className="mt-12">
      <h2 id="adu-plans" className="lf-card-heading text-lot-ink">
        Official pre-approved ADU plans for {content.city}
      </h2>
      <p className="lf-body mt-3 text-lot-stone">{program.notes}</p>
      <p className="lf-body mt-3 text-lot-stone">
        A pre-approved plan is an approved building design, not an approval
        for a particular lot. You still need a permit, a site plan for your
        property and the documents the authority lists below.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className="flex flex-col rounded-none border border-lot-line bg-lot-surface px-4 py-4"
          >
            <h3 className="font-semibold text-lot-ink">{plan.name}</h3>
            <p className="mt-1 text-sm font-semibold tabular-nums text-lot-ink">
              {planFacts(plan)}
            </p>
            <p className="mt-1 text-xs text-lot-stone">{plan.provider}</p>
            {plan.footprint ? (
              <p className="mt-1 text-xs text-lot-stone">
                {plan.footprint.shape === "irregular" ? "Not rectangular; outer bounds " : "Footprint "}
                <span className="tabular-nums">{planFootprintLabel(plan.footprint)}</span>{" "}
                outside walls, from the plan&apos;s floor-plan sheet
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-relaxed text-lot-stone">
              {plan.restrictions}
            </p>
            <div className="mt-auto flex flex-wrap gap-x-5 pt-2">
              <a href={plan.sourceUrl} rel="noopener" className={linkClass}>
                Official listing
              </a>
              {plan.documentUrl ? (
                <a href={plan.documentUrl} rel="noopener" className={linkClass}>
                  {plan.documentLabel ?? "Plan documents"}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-lot-stone">
        Official listing checked {checked}. Documents stay on the publisher&apos;s
        site under its own terms. To see whether a plan&apos;s footprint fits
        your lot&apos;s modeled setbacks, enter your address below and open
        Pre-approved plans in the Studio&apos;s Design step (Shape on mobile).
      </p>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { pageOpenGraph } from "@/lib/og-images";

const title = "About LotFoundry | Explore a Backyard Home in 3D";
const description =
  "LotFoundry, made by VeriShare LLC in San Diego, helps homeowners explore a backyard-home concept in 3D and compare early planning estimates.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: pageOpenGraph({ title, description, url: "/about" }),
};

export default function AboutPage() {
  return (
    <LegalPageShell title="About LotFoundry" kicker="ADU planning for homeowners" layout="editorial">
      <LegalSection title="What we do">
        <p>
          LotFoundry helps you explore a backyard home, also called an accessory dwelling unit (ADU).
          In the Studio, try a 3D layout and see an estimated rent range where data is available.
          The optional Certificate of Feasibility adds property-specific build-cost, payback,
          and financing estimates.
        </p>
      </LegalSection>
      {/* Same facts as the JSON-LD legalName and the public Crunchbase profile,
          with the founder line Andrew approved on 2026-10-20. The founding date
          is left out until he confirms it. */}
      <LegalSection title="Who makes LotFoundry">
        <p>
          LotFoundry is made by VeriShare LLC, a small software company based in San Diego,
          California. Andrew Torralba founded VeriShare and is CEO of LotFoundry.
        </p>
      </LegalSection>
      <LegalSection title="Who it is for">
        <p>
          Homeowners exploring space for family, rental income, or future needs, and{" "}
          <Link href="/builder" prefetch={false} className="font-medium text-lot-orange-ink underline motion-safe:transition-colors hover:text-lot-ink">
            ADU builders and designers
          </Link>{" "}
          who want to review planning snapshots that homeowners choose to share.
        </p>
      </LegalSection>
      <LegalSection title="How the Studio works">
        <p>
          Start with an address or sample lot. LotFoundry brings the first questions homeowners
          usually ask into one place: what may fit, what it could cost, what it could rent for, and
          how long the investment may take to pay back. The Studio combines parcel context,
          configurable ADU dimensions, local-rule signals, and financial assumptions so you can
          compare a scenario before paying for detailed design work.
        </p>
        <p>
          Change the size or layout to review modeled lot coverage and setbacks. The Certificate
          adds build-cost and financing estimates you can discuss with a designer, contractor,
          lender, or city planner.
        </p>
      </LegalSection>
      <LegalSection title="How we research and verify our guides">
        <p>
          Every state and city ADU guide follows a primary-source hierarchy: California Legislative
          Information statutory text (Gov. Code §§66314–66342 and Civil Code §4751), the California
          HCD ADU Handbook, and each jurisdiction&apos;s municipal code and Development Services
          information bulletins.
        </p>
        <p>
          Every guide publishes an explicit as-of review date synchronized with XML sitemaps and
          structured Article schema. We enforce a 90-day re-verification gate in automated tests,
          re-check local ordinances when cities adopt amendments, and accept source-backed corrections
          through{" "}
          <Link href="/feedback" prefetch={false} className="font-medium text-lot-orange-ink underline motion-safe:transition-colors hover:text-lot-ink">
            feedback
          </Link>
          . Full cost, rent, and payback formulas are documented on{" "}
          <Link href="/adu/how-we-estimate" className="font-medium text-lot-orange-ink underline motion-safe:transition-colors hover:text-lot-ink">
            how we estimate ADU feasibility
          </Link>
          .
        </p>
      </LegalSection>
      <LegalSection title="Honest estimates">
        <p>
          Every rent, cost, and timeline figure is an estimate, not a guarantee and not professional
          engineering, legal, or financial advice. Local zoning, utilities, and permitting still
          need verification with your city and licensed professionals.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          Questions? Visit{" "}
          <Link href="/help" className="font-medium text-lot-orange-ink underline">
            Help
          </Link>
          , send{" "}
          <Link href="/feedback" prefetch={false} className="font-medium text-lot-orange-ink underline motion-safe:transition-colors hover:text-lot-ink">
            feedback
          </Link>
          , or email{" "}
          <a href="mailto:support@lotfoundry.net" className="font-medium text-lot-orange-ink underline">
            support@lotfoundry.net
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

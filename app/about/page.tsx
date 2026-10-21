import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { pageOpenGraph } from "@/lib/og-images";

const title = "About LotFoundry: Free ADU Feasibility Check";
const description =
  "LotFoundry helps homeowners see ADU rent, build cost, and payback estimates for the land they already own.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: pageOpenGraph({ title, description, url: "/about" }),
};

export default function AboutPage() {
  return (
    <LegalPageShell title="About LotFoundry" kicker="ADU planning for homeowners">
      <LegalSection title="What we do">
        <p>
          LotFoundry is an ADU feasibility studio. Enter an address to explore estimated rent
          potential, build cost ranges, and payback for an accessory dwelling unit on a lot you
          already own — then connect with builders when you are ready.
        </p>
      </LegalSection>
      {/* Same facts as the JSON-LD legalName and the public Crunchbase profile,
          with the founder line Andrew approved on 2026-10-20. The founding date
          is left out until he confirms it. */}
      <LegalSection title="Who makes LotFoundry">
        <p>
          LotFoundry is made by VeriShare, a small software company based in San Diego,
          California. Andrew Torralba founded VeriShare and is CEO of LotFoundry.
        </p>
      </LegalSection>
      <LegalSection title="Who it is for">
        <p>
          Homeowners deciding whether their backyard can earn, and builders who want consented
          feasibility snapshots matched to their service areas.
        </p>
      </LegalSection>
      <LegalSection title="How the studio works">
        <p>
          Start with an address or sample lot. LotFoundry brings the first questions homeowners
          usually ask into one place: what may fit, what it could cost, what it could rent for, and
          how long the investment may take to pay back. The studio combines parcel context,
          configurable ADU dimensions, local-rule signals, and financial assumptions so you can
          compare a scenario before paying for detailed design work.
        </p>
        <p>
          As you change the ADU size or assumptions, the feasibility and financial estimates update
          with the scenario. You can review lot coverage and setback signals, compare the projected
          rent and build-cost range, and save or share an early snapshot when you have a direction
          worth discussing with a designer, contractor, lender, or city planner.
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
          <Link href="/feedback" className="font-medium text-lot-orange-ink underline">
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

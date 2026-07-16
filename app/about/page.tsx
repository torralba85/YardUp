import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "About | LotFoundry",
  description:
    "LotFoundry helps homeowners see ADU rent, build cost, and payback estimates for the land they already own.",
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
      <LegalSection title="Who it is for">
        <p>
          Homeowners deciding whether their backyard can earn, and builders who want consented
          feasibility snapshots matched to their service areas.
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
          <Link href="/help" className="font-medium text-lf-clay underline">
            Help
          </Link>
          , send{" "}
          <Link href="/feedback" className="font-medium text-lf-clay underline">
            feedback
          </Link>
          , or email{" "}
          <a href="mailto:support@lotfoundry.com" className="font-medium text-lf-clay underline">
            support@lotfoundry.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

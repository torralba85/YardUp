import Link from "next/link";
import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

/** Page metadata for the about route. */
export const metadata: Metadata = {
  title: "About | LotFoundry",
  description:
    "LotFoundry is an ADU feasibility studio: see what your backyard can earn.",
};

const LINK_CLASS =
  "font-medium text-lf-clay underline decoration-lf-clay/40 underline-offset-4 hover:text-lf-mahogany";

/** Static about page (`/about`). */
export default function AboutPage() {
  return (
    <LegalPageShell title="About LotFoundry" kicker="ADU planning for homeowners">
      <LegalSection title="What LotFoundry is">
        <p>
          LotFoundry is a browser-based ADU (Accessory Dwelling Unit) feasibility
          studio. Search your address or start from a sample lot, see your parcel in
          3D, shape an ADU concept, and get instant estimates: what it could rent
          for, what it might cost to build, and how the local rules apply. When a
          concept looks worth pursuing, you can save it, share it as a feasibility
          report, and connect with builders who work in your area.
        </p>
      </LegalSection>

      <LegalSection title="Who it's for">
        <p>
          Homeowners in supported US markets deciding whether the land they already
          own can earn — and, secondarily, the builders they bring that decision to.
          No real-estate expertise is assumed; the studio walks you from address to
          answer.
        </p>
      </LegalSection>

      <LegalSection title="What the numbers mean">
        <p>
          Every figure LotFoundry shows is an estimate built from public parcel
          records, local market data, and standard cost assumptions. Estimates are a
          starting point for a conversation with licensed professionals — not a
          quote, an appraisal, or a permit. A Certificate of Feasibility records a
          concept; it does not approve one.
        </p>
      </LegalSection>

      <LegalSection title="Get in touch">
        <p>
          Questions or ideas? Visit the{" "}
          <Link href="/help" className={LINK_CLASS}>
            help center
          </Link>
          , send us{" "}
          <Link href="/feedback" className={LINK_CLASS}>
            feedback
          </Link>
          , or email{" "}
          <a href="mailto:support@lotfoundry.com" className={LINK_CLASS}>
            support@lotfoundry.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

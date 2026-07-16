import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/feedback", label: "Feedback" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy" },
  { href: "/delete-account", label: "Delete account" },
] as const;

/**
 * The shared Golden Hour site footer for public legal/support/marketing
 * surfaces: brand line, the launch-required navigation set (About, Help,
 * Feedback, Terms & Conditions, Privacy, Delete account), and the
 * estimate-honest tagline. One component so footers never drift per-page.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-lf-hairline/60 bg-lf-sand">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <nav aria-label="Site" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
          {FOOTER_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="lf-body-sm inline-flex min-h-11 items-center text-lf-muted transition-colors hover:text-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-sand"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="lf-caption mt-4 text-center text-lf-muted">
          <Link href="/" className="hover:text-lf-espresso">
            LotFoundry
          </Link>{" "}
          · ADU planning for homeowners. Estimates only—not guarantees.
        </p>
      </div>
    </footer>
  );
}

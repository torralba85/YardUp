import Link from "next/link";

// `firebase: true` marks a route inside the `(firebase)` group. This footer
// renders on Firebase-free pages, so those links opt out of Next's automatic
// prefetch of visible links — otherwise reading /about or /privacy would pull
// down the ~479 KB Firebase client SDK nobody on the page needs.
const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/adu/ca", label: "ADU rules" },
  { href: "/adu-cost-calculator", label: "ADU cost calculator" },
  { href: "/help", label: "Help" },
  { href: "/feedback", label: "Feedback", firebase: true },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy" },
  { href: "/delete-account", label: "Delete account", firebase: true },
] as const;

/**
 * Shared public footer: About, ADU rules, ADU cost calculator, Help,
 * Feedback, Terms, Privacy, Delete account.
 * Used on legal/support surfaces and any public shell that needs consistent nav.
 *
 * These are product surfaces, so they keep the warm studio palette documented
 * in `docs/design/product-surfaces.md`. The marketing landing (`/`) ships its
 * own scoped footer in `components/landing/lot-more/` and does not use this.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-lot-line bg-lot-chalk">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-8 text-sm text-lot-stone sm:px-6">
        <Link
          href="/"
          translate="no"
          className="inline-flex min-h-11 items-center font-display text-base font-semibold tracking-[-0.03em] text-lot-ink hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
        >
          LotFoundry
        </Link>
        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={"firebase" in link ? false : undefined}
              className="inline-flex min-h-11 items-center text-xs font-medium text-lot-stone hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export { FOOTER_LINKS };

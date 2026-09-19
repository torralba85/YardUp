import Link from "next/link";

// `firebase: true` marks a route inside the `(firebase)` group. This footer
// renders on Firebase-free pages, so those links opt out of Next's automatic
// prefetch of visible links — otherwise reading /about or /privacy would pull
// down the ~479 KB Firebase client SDK nobody on the page needs.
const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/adu/ca", label: "ADU rules" },
  { href: "/help", label: "Help" },
  { href: "/feedback", label: "Feedback", firebase: true },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy" },
  { href: "/delete-account", label: "Delete account", firebase: true },
] as const;

/**
 * Shared public footer: About, ADU rules, Help, Feedback, Terms, Privacy,
 * Delete account.
 * Used on legal/support surfaces and any public shell that needs consistent nav.
 *
 * These are product surfaces, so they keep the warm studio palette documented
 * in `docs/design/product-surfaces.md`. The marketing landing (`/`) ships its
 * own scoped footer in `components/landing/lot-more/` and does not use this.
 */
export function SiteFooter() {
  const muted = "text-lf-muted";
  const hover = "hover:text-lf-espresso";
  const border = "border-lf-hairline/50";

  return (
    <footer className={`border-t ${border}`}>
      <div
        className={`lf-caption mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-6 py-8 ${muted}`}
      >
        <Link href="/" className={hover}>
          LotFoundry
        </Link>
        {FOOTER_LINKS.map((link) => (
          <span key={link.href} className="contents">
            <span aria-hidden className="text-lf-taupe/50">
              ·
            </span>
            <Link
              href={link.href}
              prefetch={"firebase" in link ? false : undefined}
              className={`inline-flex min-h-11 items-center ${hover}`}
            >
              {link.label}
            </Link>
          </span>
        ))}
      </div>
    </footer>
  );
}

export { FOOTER_LINKS };

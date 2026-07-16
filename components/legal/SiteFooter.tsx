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
 * Shared public footer: About, Help, Feedback, Terms, Privacy, Delete account.
 * Used on legal/support surfaces and any public shell that needs consistent nav.
 */
export function SiteFooter({
  tone = "light",
}: {
  /** `light` for Golden Hour sand pages; `dark` for Blue Hour landing. */
  tone?: "light" | "dark";
}) {
  const muted = tone === "dark" ? "text-ln-slate" : "text-lf-muted";
  const hover = tone === "dark" ? "hover:text-ln-mist" : "hover:text-lf-espresso";
  const border = tone === "dark" ? "border-ln-hairline/60" : "border-lf-hairline/50";

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

import Link from "next/link";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lf-sand px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lf-mahogany font-display font-black text-lg text-lf-sand">
            LF
          </div>
          <span className="font-display font-bold tracking-tight text-xl text-lf-mahogany">
            LotFoundry
          </span>
        </Link>

        {/* Card */}
        <div className="rounded-xl border border-lf-hairline bg-lf-card p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-lf-espresso">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-lf-muted">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-lf-muted">
          Estimates, not guarantees.
        </p>
      </div>
    </div>
  );
}

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lotfoundry-lockup-horizontal.svg"
            alt="LotFoundry"
            className="h-9 w-auto"
          />
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

        {/* Footer links */}
        <div className="mt-6 flex justify-center gap-4 text-xs text-lf-muted">
          <Link href="/terms" className="hover:text-lf-espresso transition-colors">
            Terms
          </Link>
          <span>/</span>
          <Link href="/privacy" className="hover:text-lf-espresso transition-colors">
            Privacy
          </Link>
          <span>/</span>
          <span>Estimates, not guarantees.</span>
        </div>
      </div>
    </div>
  );
}

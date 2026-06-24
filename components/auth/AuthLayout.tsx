import Link from "next/link";
import { Bezel } from "@/components/ui/Bezel";

/**
 * Shared chrome for the auth pages (login, signup, forgot password): centered
 * card with the LotFoundry logo, a title, and an optional subtitle.
 *
 * @param props.children - The form content.
 * @param props.title - The heading shown above the form.
 * @param props.subtitle - Optional supporting line under the title.
 */
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
    <div className="lf-backdrop lf-grain flex min-h-[100dvh] items-center justify-center px-4 py-12">
      <div className="lf-entrance w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lotfoundry-lockup-horizontal.svg"
            alt="LotFoundry"
            className="h-8 w-auto sm:h-9"
          />
        </Link>

        {/* Card */}
        <Bezel>
          <div className="p-8">
            <h1 className="lf-panel-heading text-lf-espresso">
              {title}
            </h1>
            {subtitle && (
              <p className="lf-body-sm mt-2 text-lf-muted">{subtitle}</p>
            )}
            <div className="mt-6">{children}</div>
          </div>
        </Bezel>

        {/* Footer links */}
        <div className="lf-caption mt-6 flex justify-center gap-4 text-lf-muted">
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

import { BrandLockup } from "@/components/ui/BrandLockup";
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
          <BrandLockup className="h-8 w-auto sm:h-9" />
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

        {/* Footer links — 44px touch targets on auth secondary links */}
        <div className="lf-caption mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-lf-muted">
          <Link
            href="/terms"
            className="inline-flex min-h-11 items-center motion-safe:transition-colors hover:text-lf-espresso"
          >
            Terms &amp; Conditions
          </Link>
          <span aria-hidden>/</span>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center motion-safe:transition-colors hover:text-lf-espresso"
          >
            Privacy
          </Link>
          <span aria-hidden>/</span>
          <Link
            href="/help"
            className="inline-flex min-h-11 items-center motion-safe:transition-colors hover:text-lf-espresso"
          >
            Help
          </Link>
          <span aria-hidden>/</span>
          <span>Estimates, not guarantees.</span>
        </div>
      </div>
    </div>
  );
}

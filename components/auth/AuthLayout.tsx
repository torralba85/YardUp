import Link from "next/link";
import { Bezel } from "@/components/ui/Bezel";
import { SiteHeader } from "@/components/legal/SiteHeader";

/**
 * Shared chrome for the auth pages (login, signup, forgot password): the
 * site header (home link and main menu) over a centered card with a title
 * and an optional subtitle.
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
    <div className="flex min-h-[100dvh] flex-col bg-lot-chalk">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="lf-backdrop lf-grain flex flex-1 items-center justify-center px-4 py-12">
        <div className="lf-entrance w-full max-w-md">
          {/* Card */}
          <Bezel className="shadow-none">
            <div className="p-6 sm:p-8">
              <h1 className="lf-panel-heading text-lot-ink">
                {title}
              </h1>
              {subtitle && (
                <p className="lf-body-sm mt-2 text-lot-stone">{subtitle}</p>
              )}
              <div className="mt-6">{children}</div>
            </div>
          </Bezel>

          {/* Footer links — 44px touch targets on auth secondary links */}
          <div className="lf-caption mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-lot-stone">
            <Link
              href="/terms"
              className="inline-flex min-h-11 items-center motion-safe:transition-colors hover:text-lot-ink"
            >
              Terms &amp; Conditions
            </Link>
            <span aria-hidden>/</span>
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center motion-safe:transition-colors hover:text-lot-ink"
            >
              Privacy
            </Link>
            <span aria-hidden>/</span>
            <Link
              href="/help"
              className="inline-flex min-h-11 items-center motion-safe:transition-colors hover:text-lot-ink"
            >
              Help
            </Link>
            <span aria-hidden>/</span>
            <span>Estimates, not guarantees.</span>
          </div>
        </div>
      </main>
    </div>
  );
}

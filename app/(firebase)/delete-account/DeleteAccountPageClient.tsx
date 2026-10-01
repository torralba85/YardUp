"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { DeleteAccountButton } from "@/components/studio/DeleteAccountButton";

/**
 * Public web deletion resource: explains retention, offers in-page deletion for
 * signed-in users, and login/reset paths for others.
 */
export function DeleteAccountPageClient() {
  const { user, profile, loading } = useAuth();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="lf-card-heading">What LotFoundry deletes</h2>
        <ul className="lf-body list-disc space-y-2 pl-5 text-lf-muted">
          <li>Your Firebase Auth identity and profile (name, email, role)</li>
          <li>Saved studio concepts and builder company profile fields</li>
          <li>Homeowner private contact details on marketplace leads you created</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="lf-card-heading">What may be retained</h2>
        <ul className="lf-body list-disc space-y-2 pl-5 text-lf-muted">
          <li>
            Redacted lead roots and transaction records (IDs, amounts, fraud/accounting signals)
            without direct contact PII
          </li>
          <li>Aggregated analytics that cannot identify you</li>
        </ul>
        <p className="lf-body-sm text-lf-muted">
          Full details are in our{" "}
          <Link href="/privacy" className="font-medium text-lf-clay-ink underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      {loading ? (
        <p className="lf-body-sm text-lf-muted">Checking sign-in…</p>
      ) : user ? (
        <section className="space-y-3 rounded-none border border-lf-brick/30 bg-lf-brick-soft p-5">
          <h2 className="lf-card-heading">Delete now</h2>
          <p className="lf-body-sm text-lf-muted">
            Signed in as{" "}
            <strong className="text-lf-espresso">
              {profile?.email || user.email || "this account"}
            </strong>
            . Confirm twice to permanently delete.
          </p>
          <DeleteAccountButton tone="light" />
        </section>
      ) : (
        <section className="space-y-4 rounded-none border border-lf-hairline bg-lf-card p-5">
          <h2 className="lf-card-heading">Sign in to delete</h2>
          <p className="lf-body-sm text-lf-muted">
            Use the same email or Apple/Google account you registered with. You do not need to
            reinstall the mobile app.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login?next=/delete-account"
              className="inline-flex h-11 items-center justify-center rounded-control bg-lf-clay px-5 text-sm font-semibold text-lf-sand"
            >
              Sign in
            </Link>
            <Link
              href="/forgot-password"
              className="inline-flex h-11 items-center justify-center rounded-control border border-lf-hairline px-5 text-sm font-semibold text-lf-espresso"
            >
              Reset password
            </Link>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="lf-card-heading">Need help?</h2>
        <p className="lf-body-sm text-lf-muted">
          If you cannot access your account, email{" "}
          <a href="mailto:support@lotfoundry.net" className="font-medium text-lf-clay-ink underline">
            support@lotfoundry.net
          </a>{" "}
          from the address on the account. Support is a fallback — most users can complete
          deletion above without waiting.
        </p>
        <Link href="/help" className="inline-flex min-h-11 items-center text-sm font-semibold text-lf-clay-ink">
          Visit Help center
        </Link>
      </section>
    </div>
  );
}

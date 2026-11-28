"use client";

import { useWebBuilderAccess } from "@/lib/commerce/use-web-builder-access";
import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAccountCapabilities } from "@/lib/account-settings";
import { Button } from "@/components/ui/Button";
import { Bezel } from "@/components/ui/Bezel";
import { ProfileForm } from "./ProfileForm";
import { SecurityPanel } from "./SecurityPanel";
import { DataExportButton } from "./DataExportButton";
import { DeleteAccountButton } from "@/components/studio/DeleteAccountButton";
import { SiteFooter } from "@/components/legal/SiteFooter";
import { SiteHeader } from "@/components/legal/SiteHeader";

/**
 * Authenticated settings destination: profile, security, data export, help,
 * legal, and danger zone. Guests see a sign-in prompt.
 */
export function SettingsClient() {
  const buildersAllowed = useWebBuilderAccess();
  const {
    user,
    profile,
    loading,
    logout,
    updateAccountName,
    changeAccountEmail,
    changeAccountPassword,
    sendVerification,
  } = useAuth();

  const capabilities = useMemo(
    () =>
      getAccountCapabilities(
        user?.providerData?.map((provider) => ({ providerId: provider.providerId })) ?? [],
      ),
    [user],
  );

  if (loading) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-16" aria-busy="true">
          <p className="lf-body-sm text-lot-stone">Loading account…</p>
        </main>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="lf-section-heading">Account settings</h1>
          <p className="lf-body-sm mt-3 text-lot-stone">
            Sign in to manage your profile, security, and data.
          </p>
          <Link
            href="/login?next=/settings"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-control bg-lot-orange px-5 text-sm font-semibold text-lot-ink motion-safe:transition-colors hover:bg-lot-orange-hover"
          >
            Sign in
          </Link>
          <div className="mt-4">
            <Link href="/signup?next=/settings" className="inline-flex min-h-11 items-center text-sm font-medium text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink">
              Create account
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const displayName = profile.displayName || profile.email?.split("@")[0] || "Member";

  return (
    <div className="min-h-dvh">
      <SiteHeader
        actions={
          <Link
            href={buildersAllowed && profile.role === "builder" ? "/builder" : "/studio"}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink motion-safe:transition-colors hover:text-lot-ink hover:underline"
          >
            Back to {buildersAllowed && profile.role === "builder" ? "dashboard" : "studio"}
          </Link>
        }
      />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl space-y-8 px-4 py-10">
        <div>
          <h1 className="lf-section-heading">Settings</h1>
          <p className="lf-body-sm mt-2 text-lot-stone">
            {displayName}
            {buildersAllowed && profile.role === "builder" ? " · Builder" : " · Lot owner"}
          </p>
        </div>

        <Bezel>
          <section className="space-y-4 p-6">
            <h2 className="lf-card-heading">Profile</h2>
            <ProfileForm
              initialName={profile.displayName || ""}
              email={profile.email}
              emailVerified={Boolean(user.emailVerified)}
              onSaveName={updateAccountName}
              onSendVerification={sendVerification}
            />
          </section>
        </Bezel>

        <Bezel>
          <section className="space-y-4 p-6">
            <h2 className="lf-card-heading">Security</h2>
            <SecurityPanel
              capabilities={capabilities}
              onChangeEmail={changeAccountEmail}
              onChangePassword={changeAccountPassword}
            />
          </section>
        </Bezel>

        {buildersAllowed && profile.role === "builder" ? (
          <Bezel>
            <section className="space-y-3 p-6">
              <h2 className="lf-card-heading">Builder profile</h2>
              <p className="lf-body-sm text-lot-stone">
                Update company details and service areas from the builder dashboard.
              </p>
              <Link
                href="/builder"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink"
              >
                Open builder dashboard
              </Link>
            </section>
          </Bezel>
        ) : null}

        <Bezel>
          <section className="space-y-3 p-6">
            <h2 className="lf-card-heading">Certificates of Feasibility</h2>
            <p className="lf-body-sm text-lot-stone">
              View, download, or open previously unlocked feasibility certificates for your properties.
            </p>
            <div>
              <Link
                href="/certificates"
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-lot-orange px-5 text-sm font-semibold text-lot-ink motion-safe:transition-colors hover:bg-lot-orange-hover"
              >
                View your certificates
              </Link>
            </div>
          </section>
        </Bezel>

        <Bezel>
          <section className="space-y-4 p-6">
            <h2 className="lf-card-heading">Your data</h2>
            <p className="lf-body-sm text-lot-stone">
              Download a portable JSON export of your profile, saved concepts, and
              purchase ledger. Other users&rsquo; information is never included.
            </p>
            <DataExportButton />
          </section>
        </Bezel>

        <Bezel>
          <section className="space-y-3 p-6">
            <h2 className="lf-card-heading">Help &amp; feedback</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/help"
                className="inline-flex min-h-11 items-center rounded-control border border-lot-line bg-lot-chalk px-4 text-sm font-semibold text-lot-ink motion-safe:transition-colors hover:border-lot-ink hover:bg-lot-surface"
              >
                Get help
              </Link>
              <Link
                href="/feedback"
                className="inline-flex min-h-11 items-center rounded-control border border-lot-line bg-lot-chalk px-4 text-sm font-semibold text-lot-ink motion-safe:transition-colors hover:border-lot-ink hover:bg-lot-surface"
              >
                Send feedback
              </Link>
            </div>
          </section>
        </Bezel>

        <Bezel>
          <section className="space-y-3 p-6">
            <h2 className="lf-card-heading">Legal</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/terms"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                href="/privacy"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink"
              >
                Privacy Policy
              </Link>
            </div>
          </section>
        </Bezel>

        <Bezel>
          <section className="space-y-4 p-6">
            <h2 className="lf-card-heading">Danger zone</h2>
            <p className="lf-body-sm text-lot-stone">
              Deleting your account removes saved concepts and profile data. Redacted
              marketplace and payment ledgers may be retained without contact PII.
            </p>
            <DeleteAccountButton tone="light" />
            <Button type="button" variant="ghost" onClick={() => void logout()}>
              Sign out
            </Button>
          </section>
        </Bezel>
      </main>

      <SiteFooter />
    </div>
  );
}

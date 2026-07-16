"use client";

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

/**
 * Authenticated settings destination: profile, security, data export, help,
 * legal, and danger zone. Guests see a sign-in prompt.
 */
export function SettingsClient() {
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
      <div className="mx-auto max-w-2xl px-4 py-16" aria-busy="true">
        <p className="lf-body-sm text-lf-muted">Loading account…</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="lf-section-heading">Account settings</h1>
        <p className="lf-body-sm mt-3 text-lf-muted">
          Sign in to manage your profile, security, and data.
        </p>
        <Link
          href="/login?next=/settings"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-lf-forest px-5 text-sm font-semibold text-lf-sand"
        >
          Sign in
        </Link>
        <div className="mt-4">
          <Link href="/signup?next=/settings" className="text-sm font-medium text-lf-clay">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.displayName || profile.email?.split("@")[0] || "Member";

  return (
    <div className="min-h-dvh">
      <header className="border-b border-lf-hairline bg-lf-card">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-4 px-4">
          <Link href="/" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lotfoundry-lockup-horizontal.svg"
              alt="LotFoundry"
              className="h-7 w-auto"
            />
          </Link>
          <Link
            href={profile.role === "builder" ? "/builder" : "/studio"}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-lf-clay"
          >
            Back to {profile.role === "builder" ? "dashboard" : "studio"}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
        <div>
          <h1 className="lf-section-heading">Settings</h1>
          <p className="lf-body-sm mt-2 text-lf-muted">
            {displayName}
            {profile.role === "builder" ? " · Builder" : " · Lot owner"}
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

        {profile.role === "builder" ? (
          <Bezel>
            <section className="space-y-3 p-6">
              <h2 className="lf-card-heading">Builder profile</h2>
              <p className="lf-body-sm text-lf-muted">
                Update company details and service areas from the builder dashboard.
              </p>
              <Link
                href="/builder"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-lf-clay"
              >
                Open builder dashboard
              </Link>
            </section>
          </Bezel>
        ) : null}

        <Bezel>
          <section className="space-y-4 p-6">
            <h2 className="lf-card-heading">Your data</h2>
            <p className="lf-body-sm text-lf-muted">
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
                className="inline-flex min-h-11 items-center rounded-full border border-lf-hairline bg-lf-card px-4 text-sm font-semibold text-lf-espresso"
              >
                Get help
              </Link>
              <Link
                href="/feedback"
                className="inline-flex min-h-11 items-center rounded-full border border-lf-hairline bg-lf-card px-4 text-sm font-semibold text-lf-espresso"
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
                className="inline-flex min-h-11 items-center text-sm font-semibold text-lf-clay"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                href="/privacy"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-lf-clay"
              >
                Privacy Policy
              </Link>
            </div>
          </section>
        </Bezel>

        <Bezel>
          <section className="space-y-4 p-6">
            <h2 className="lf-card-heading">Danger zone</h2>
            <p className="lf-body-sm text-lf-muted">
              Deleting your account removes saved concepts and profile data. Redacted
              marketplace and payment ledgers may be retained without contact PII.
            </p>
            <DeleteAccountButton tone="light" />
            <Button type="button" variant="ghost" onClick={() => void logout()}>
              Sign out
            </Button>
          </section>
        </Bezel>
      </div>

      <SiteFooter />
    </div>
  );
}

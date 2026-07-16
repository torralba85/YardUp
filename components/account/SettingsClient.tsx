"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { AuthModal } from "@/components/auth/AuthModal";
import { DeleteAccountButton } from "@/components/studio/DeleteAccountButton";
import { ProfileForm } from "./ProfileForm";
import { SecurityPanel } from "./SecurityPanel";
import { DataExportButton } from "./DataExportButton";

const SETTINGS_LINK_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 text-sm text-lf-clay transition-colors hover:text-lf-mahogany focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-card";

/**
 * The member settings destination (`/settings`, Golden Hour): profile,
 * security, builder shortcut, data export, help & feedback, legal, and the
 * danger zone. Signed-out visitors get a sign-in action and land back here
 * once authenticated (the modal keeps them on this page).
 */
export function SettingsClient() {
  const { user, profile, loading, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading account settings"
        className="mx-auto w-full max-w-3xl px-4 py-16"
      >
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="mt-6 h-40 rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <p className="lf-kicker text-lf-clay">Account</p>
        <h1 className="lf-section-heading mt-1 text-lf-espresso">Sign in to manage your account</h1>
        <p className="lf-body mt-3 max-w-prose text-lf-muted">
          Settings cover your profile, security, saved data, and account deletion.
          Sign in and you&rsquo;ll return right here.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
          <Link href="/" className={SETTINGS_LINK_CLASS}>
            <ArrowLeft size={14} aria-hidden /> Back to LotFoundry
          </Link>
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  const isBuilder = profile?.role === "builder";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <div>
        <Link href={isBuilder ? "/builder" : "/studio"} className={SETTINGS_LINK_CLASS}>
          <ArrowLeft size={14} aria-hidden /> Back to {isBuilder ? "builder dashboard" : "studio"}
        </Link>
        <p className="lf-kicker mt-4 text-lf-clay">Account</p>
        <h1 className="lf-section-heading mt-1 text-lf-espresso">Settings</h1>
      </div>

      <Panel aria-labelledby="settings-profile-heading">
        <PanelHeader
          id="settings-profile-heading"
          title="Profile"
          sub="Your name and the email on your account."
        />
        <ProfileForm />
      </Panel>

      <Panel aria-labelledby="settings-security-heading">
        <PanelHeader
          id="settings-security-heading"
          title="Security"
          sub="Password and sign-in management."
        />
        <SecurityPanel />
      </Panel>

      {isBuilder && (
        <Panel aria-labelledby="settings-builder-heading">
          <PanelHeader
            id="settings-builder-heading"
            title="Builder profile"
            sub="Company details, service areas, and lead credits."
          />
          <div className="px-6 py-5">
            <Link href="/builder" className={SETTINGS_LINK_CLASS}>
              Open the builder dashboard <ExternalLink size={13} aria-hidden />
            </Link>
          </div>
        </Panel>
      )}

      <Panel aria-labelledby="settings-data-heading">
        <PanelHeader
          id="settings-data-heading"
          title="Your data"
          sub="Download a portable copy of your account data as JSON."
        />
        <div className="px-6 py-5">
          <DataExportButton />
        </div>
      </Panel>

      <Panel aria-labelledby="settings-help-heading">
        <PanelHeader
          id="settings-help-heading"
          title="Help & feedback"
          sub="Support, questions, and ideas."
        />
        <div className="flex flex-wrap gap-x-8 gap-y-1 px-6 py-5">
          <Link href="/help" className={SETTINGS_LINK_CLASS}>
            Get help
          </Link>
          <Link href="/feedback" className={SETTINGS_LINK_CLASS}>
            Send feedback
          </Link>
        </div>
      </Panel>

      <Panel aria-labelledby="settings-legal-heading">
        <PanelHeader
          id="settings-legal-heading"
          title="Legal"
          sub="The agreements that govern your account."
        />
        <div className="flex flex-wrap gap-x-8 gap-y-1 px-6 py-5">
          <Link href="/terms" className={SETTINGS_LINK_CLASS}>
            Terms &amp; Conditions
          </Link>
          <Link href="/privacy" className={SETTINGS_LINK_CLASS}>
            Privacy Policy
          </Link>
        </div>
      </Panel>

      <Panel aria-labelledby="settings-danger-heading" className="border-lf-brick/30">
        <PanelHeader
          id="settings-danger-heading"
          title="Danger zone"
          sub="Sign out everywhere or permanently delete your account."
        />
        <div className="space-y-4 px-6 py-5">
          <Button variant="secondary" onClick={() => void logout()}>
            Sign out
          </Button>
          <DeleteAccountButton surface="light" />
        </div>
      </Panel>
    </div>
  );
}

import type { Metadata } from "next";
import { SettingsClient } from "@/components/account/SettingsClient";

export const metadata: Metadata = {
  title: "Settings | LotFoundry",
  description: "Manage your LotFoundry profile, security, and data.",
};

/** Authenticated member settings route (`/settings`). */
export default function SettingsPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-lf-sand text-lf-espresso">
      <SettingsClient />
    </main>
  );
}

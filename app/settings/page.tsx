import type { Metadata } from "next";
import { SettingsClient } from "@/components/account/SettingsClient";

export const metadata: Metadata = {
  title: "Account settings | LotFoundry",
  description: "Manage your LotFoundry profile, security, data, and account.",
};

/** Authenticated member settings destination (Golden Hour). */
export default function SettingsPage() {
  return (
    <main id="main-content" className="lf-grain min-h-dvh bg-lf-sand text-lf-espresso">
      <SettingsClient />
    </main>
  );
}

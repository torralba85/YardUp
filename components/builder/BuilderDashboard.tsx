"use client";

import { useEffect, useState } from "react";
import {
  fetchBuilderInbox,
  fetchBuilderProfile,
  saveBuilderProfile,
  updateBuilderResponse,
} from "@/lib/marketplace-firestore";
import type { BuilderInboxItem, BuilderProfile } from "@/lib/marketplace-types";
import BuilderInbox from "./BuilderInbox";
import BuilderProfileForm from "./BuilderProfileForm";

export default function BuilderDashboard({
  uid,
  email,
  displayName,
}: {
  uid: string;
  email: string;
  displayName: string | null;
}) {
  const [profile, setProfile] = useState<BuilderProfile | null>(null);
  const [items, setItems] = useState<BuilderInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const loadedProfile = await fetchBuilderProfile(uid);
        const loadedItems = loadedProfile ? await fetchBuilderInbox(uid) : [];
        if (!cancelled) {
          setProfile(loadedProfile);
          setItems(loadedItems);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load the builder dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (loading) {
    return <main className="min-h-dvh bg-lf-sand p-6">Loading...</main>;
  }

  async function handleSaveProfile(input: Parameters<typeof saveBuilderProfile>[1]) {
    const saved = await saveBuilderProfile(uid, input);
    setProfile(saved);
    setItems(await fetchBuilderInbox(uid));
  }

  async function handleRespond(
    requestId: string,
    status: "interested" | "not-a-fit",
  ) {
    await updateBuilderResponse(requestId, uid, status);
    setItems((current) =>
      current.map((item) =>
        item.request.id === requestId
          ? { ...item, response: { ...item.response, status } }
          : item,
      ),
    );
  }

  return (
    <main className="min-h-dvh bg-lf-sand p-4 text-lf-espresso lg:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl font-black">Builder dashboard</h1>
        <p className="mt-2 text-sm text-lf-muted">
          Review consented ADU feasibility snapshots matched to your service area.
        </p>
        {loadError && (
          <div role="alert" className="mt-4 rounded-md border border-lf-brick/20 bg-lf-brick/5 p-3 text-sm text-lf-brick">
            {loadError}
          </div>
        )}
        {!profile ? (
          <BuilderProfileForm
            defaults={{ companyName: displayName || "", contactEmail: email }}
            onSave={handleSaveProfile}
          />
        ) : (
          <BuilderInbox profile={profile} items={items} onRespond={handleRespond} />
        )}
      </div>
    </main>
  );
}

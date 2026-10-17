"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { parseEmailScenario, validLayoutToken } from "@/lib/scenario-email";
import { stashInitialParcel } from "@/lib/parcel-handoff";
import { serializeScenarioParams } from "@/lib/scenario-url";

export default function OpenEmailedLayout() {
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        if (!validLayoutToken(token)) throw new Error("Layout not found or expired.");
        const response = await fetch(`/api/scenario-email/${token}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not open this layout.");
        const scenario = parseEmailScenario(data.scenario);
        if (!scenario) throw new Error("This layout cannot be restored.");
        if (controller.signal.aborted) return;
        if (scenario.liveParcel) stashInitialParcel(scenario.liveParcel);
        window.location.replace(`/studio?${serializeScenarioParams(scenario)}`);
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not open this layout."); }
    })();
    return () => controller.abort();
  }, [token]);
  return <main className="mx-auto max-w-lg px-6 py-16"><h1 className="lf-section-heading">Your 3D lot layout</h1><p className="lf-body mt-3" role={error ? "alert" : "status"}>{error ?? "Opening your lot, design, and placement…"}</p>{error && <Link href="/studio" className="mt-4 inline-block underline">Open Studio</Link>}</main>;
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GOOGLE_PLAY_URL } from "@/lib/app-store-links";
import { getAppPlatform, trackEvent } from "@/lib/analytics/gtag";

/** Offered after a successful save, without rating gates or incentives. */
export function StudyFeedbackInvite() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <aside aria-label="Share your experience" className="border-b border-lot-line bg-lot-chalk px-5 py-4 text-lot-ink">
      <p className="text-sm">Your study is saved. Tell us what worked and what needs improving.</p>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
        <a href="/feedback" target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-lot-orange-ink underline underline-offset-4"
          onClick={() => trackEvent("study_feedback_clicked", { feedback_destination: "feedback_form" })}>
          Send feedback (opens a new tab)
        </a>
        {getAppPlatform() === "android" && (
          <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-lot-orange-ink underline underline-offset-4"
            onClick={() => trackEvent("study_feedback_clicked", { feedback_destination: "google_play" })}>
            Review on Google Play
          </a>
        )}
        <Button variant="secondary" size="sm" onClick={() => setDismissed(true)}>Dismiss</Button>
      </div>
    </aside>
  );
}

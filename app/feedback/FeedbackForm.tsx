"use client";

import { useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from "@/lib/feedback";
import { Button } from "@/components/ui/Button";

const INPUT_CLASS =
  "w-full rounded-lg border border-lf-taupe/30 bg-lf-sand px-3.5 py-3 text-sm text-lf-espresso placeholder-lf-muted/60 transition-colors focus:border-lf-clay focus:outline-none focus:ring-2 focus:ring-lf-clay/20";

/**
 * The public feedback form: category, message, optional reply email, and a
 * hidden honeypot field. Signed-in users' submissions carry their ID token so
 * support can follow up without asking who they are. Success shows the ticket
 * ID (a recorded fact, so it renders in mono).
 */
export function FeedbackForm() {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (user) {
        headers.authorization = `Bearer ${await user.getIdToken()}`;
      }
      const referrer =
        typeof document !== "undefined" && document.referrer.startsWith(window.location.origin)
          ? new URL(document.referrer).pathname
          : null;
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({ category, message, email, page: referrer, company }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ticketId?: string; error?: string }
        | null;
      if (!res.ok || !data?.ticketId) {
        throw new Error(data?.error || "Could not send feedback. Please try again.");
      }
      setTicketId(data.ticketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setPending(false);
    }
  }

  if (ticketId) {
    return (
      <div role="status" className="rounded-lg border border-lf-hairline bg-lf-card p-5">
        <p className="lf-body text-lf-espresso">
          Thank you — your note is in. We read every submission.
        </p>
        <p className="lf-body-sm mt-3 text-lf-muted">
          Ticket ID{" "}
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-lf-espresso">
            {ticketId}
          </span>
          {email ? " — we'll reply to the email you provided if follow-up is needed." : ""}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="feedback-category" className="lf-body-sm mb-1.5 block font-medium text-lf-espresso">
          Category
        </label>
        <select
          id="feedback-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          className={INPUT_CLASS}
        >
          {FEEDBACK_CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="feedback-message" className="lf-body-sm mb-1.5 block font-medium text-lf-espresso">
          What happened, or what should we build?
        </label>
        <textarea
          id="feedback-message"
          required
          minLength={10}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={INPUT_CLASS}
          placeholder="The more specific, the faster we can act on it."
        />
      </div>

      <div>
        <label htmlFor="feedback-email" className="lf-body-sm mb-1.5 block font-medium text-lf-espresso">
          Reply email <span className="font-normal text-lf-muted">(optional)</span>
        </label>
        <input
          id="feedback-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT_CLASS}
          placeholder="you@example.com"
        />
      </div>

      {/* Honeypot: humans never see or fill this; bots that do get a generic
          success with nothing persisted. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="feedback-company">Company</label>
        <input
          id="feedback-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <Button type="submit" loading={pending} disabled={message.trim().length < 10}>
        Send feedback
      </Button>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-lf-brick">
          <TriangleAlert size={12} aria-hidden /> {error}
        </p>
      )}
    </form>
  );
}

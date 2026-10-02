"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from "@/lib/feedback";
import { validateEmail } from "@/lib/account-settings";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";

/**
 * The public feedback form: category, message, optional reply email, and a
 * hidden honeypot field. Signed-in users' submissions carry their ID token so
 * support can follow up without asking who they are. Success shows the ticket
 * ID (a recorded fact, so it renders in mono).
 */
export function FeedbackForm() {
  const { user } = useAuth();
  return <FeedbackFields key={user?.uid ?? "guest"} />;
}

function FeedbackFields() {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const [invalidField, setInvalidField] = useState<"message" | "email" | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const draftKey = `lotfoundry.feedback-draft:${user?.uid ?? "guest"}`;

  useEffect(() => {
    // Hydrate tab-local drafts only after the server-matching first render.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const draft = sessionStorage.getItem(draftKey);
      if (draft) setMessage(draft);
      setDraftAvailable(true);
    } catch { /* Storage can be disabled; retain the form in memory. */ }
    setDraftReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady) return;
    try {
      if (ticketId || !message) sessionStorage.removeItem(draftKey);
      else sessionStorage.setItem(draftKey, message);
    } catch {
      // If quota/access changes, arm the unsaved-navigation safeguard.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftAvailable(false);
    }
  }, [draftKey, draftReady, message, ticketId]);

  useEffect(() => {
    if (ticketId) successRef.current?.focus();
  }, [ticketId]);

  useEffect(() => {
    if (draftAvailable || !message || ticketId) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftAvailable, message, ticketId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (message.trim().length < 10) {
      setInvalidField("message");
      setError("Enter at least 10 characters so we can understand your feedback.");
      messageRef.current?.focus();
      return;
    }
    if (email && validateEmail(email)) {
      setInvalidField("email");
      setError("Enter a valid reply email, or leave it empty.");
      emailRef.current?.focus();
      return;
    }
    setInvalidField(null);
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
      <div ref={successRef} tabIndex={-1} role="status" className="rounded-none border border-lot-line bg-lot-chalk p-5">
        <p className="lf-body text-lot-ink">
          Thank you — your note is in. We read every submission.
        </p>
        <p className="lf-body-sm mt-3 text-lot-stone">
          Ticket ID{" "}
          <span className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-lot-ink">
            {ticketId}
          </span>
          {email ? " — we'll reply to the email you provided if follow-up is needed." : ""}
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="feedback-category" className="lf-body-sm mb-1.5 block font-medium text-lot-ink">
          Category
        </label>
        <Select
          id="feedback-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
        >
          {FEEDBACK_CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="feedback-message" className="lf-body-sm mb-1.5 block font-medium text-lot-ink">
          What happened, or what should we build?
        </label>
        <Textarea
          id="feedback-message"
          name="message"
          ref={messageRef}
          aria-invalid={invalidField === "message"}
          aria-describedby={invalidField === "message" ? "feedback-message-help feedback-message-error" : "feedback-message-help"}
          required
          minLength={10}
          rows={5}
          value={message}
          onChange={(e) => { setMessage(e.target.value); if (invalidField === "message") { setInvalidField(null); setError(null); } }}
          placeholder="For example, the map does not load…"
        />
        <p id="feedback-message-help" className="mt-1 text-xs text-lot-stone">
          At least 10 characters.{draftAvailable ? " Your message draft stays in this tab until you send it." : ""}
        </p>
        {invalidField === "message" && <p id="feedback-message-error" role="alert" className="mt-1 text-sm text-status-blocked">{error}</p>}
      </div>

      <div>
        <label htmlFor="feedback-email" className="lf-body-sm mb-1.5 block font-medium text-lot-ink">
          Reply email <span className="font-normal text-lot-stone">(optional)</span>
        </label>
        <Input
          id="feedback-email"
          name="email"
          ref={emailRef}
          spellCheck={false}
          aria-invalid={invalidField === "email"}
          aria-describedby={invalidField === "email" ? "feedback-email-error" : undefined}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com…"
        />
        {invalidField === "email" && <p id="feedback-email-error" role="alert" className="mt-1 text-sm text-status-blocked">{error}</p>}
      </div>

      {/* Honeypot: humans never see or fill this; bots that do get a generic
          success with nothing persisted. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="feedback-company">Company</label>
        <Input
          id="feedback-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <Button type="submit" loading={pending}>
        Send feedback
      </Button>

      {error && !invalidField && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-status-blocked">
          <TriangleAlert size={12} aria-hidden /> {error}
        </p>
      )}
    </form>
  );
}

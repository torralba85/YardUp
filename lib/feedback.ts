/** The feedback categories offered on `/feedback`. */
export const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "data", label: "Data issue" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" },
] as const;

/** A valid feedback category value. */
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];

/** The validated, normalized feedback payload the server persists. */
export interface FeedbackValue {
  category: FeedbackCategory;
  message: string;
  email: string | null;
  page: string | null;
}

/** Result of {@link validateFeedback}. */
export type FeedbackValidation =
  | { ok: true; value: FeedbackValue }
  | { ok: false; error: string };

const CATEGORY_VALUES = new Set<string>(FEEDBACK_CATEGORIES.map((c) => c.value));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate and normalize a raw feedback submission. The hidden `company`
 * honeypot field is not part of the value — check it with
 * {@link isFeedbackHoneypotTripped} before validating.
 */
export function validateFeedback(input: unknown): FeedbackValidation {
  const body = (input ?? {}) as Record<string, unknown>;

  const category = typeof body.category === "string" ? body.category : "";
  if (!CATEGORY_VALUES.has(category)) {
    return { ok: false, error: "Pick a feedback category." };
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 10) {
    return { ok: false, error: "Tell us a little more (at least 10 characters)." };
  }
  if (message.length > 5000) {
    return { ok: false, error: "Keep feedback under 5,000 characters." };
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  if (rawEmail && (!EMAIL_PATTERN.test(rawEmail) || rawEmail.length > 254)) {
    return { ok: false, error: "Enter a valid email address, or leave it blank." };
  }

  const rawPage = typeof body.page === "string" ? body.page.trim() : "";

  return {
    ok: true,
    value: {
      category: category as FeedbackCategory,
      message,
      email: rawEmail || null,
      page: rawPage ? rawPage.slice(0, 200) : null,
    },
  };
}

/**
 * Whether the hidden `company` honeypot field was filled — a bot signature.
 * Callers should return a generic success without persisting anything.
 */
export function isFeedbackHoneypotTripped(input: unknown): boolean {
  const body = (input ?? {}) as Record<string, unknown>;
  return typeof body.company === "string" && body.company.trim().length > 0;
}

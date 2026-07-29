"use client";

/**
 * Haptic feedback for the installed Android app.
 *
 * `navigator.vibrate` is Android/Chrome only — iOS Safari and iOS PWAs do not
 * implement it, so every call is a silent no-op there. Haptics are a
 * progressive enhancement: never gate behavior, feedback, or state on them.
 *
 * Call sites name intent (`haptic("commit")`) rather than durations so the
 * physical vocabulary stays tunable in one place.
 */

/** The tactile vocabulary. Every member needs a pattern in HAPTIC_PATTERNS. */
export type HapticEvent =
  /** A light tick under an ordinary primary control. */
  | "tap"
  /** The action that pays — commit CTAs. */
  | "commit"
  /** The money landing on the Earn reveal: the journey's peak moment. */
  | "reveal";

/**
 * Vibration patterns in milliseconds, following the `navigator.vibrate`
 * contract: a bare number is one buzz; an array alternates
 * vibrate/pause/vibrate.
 *
 * Keep these short and few. Over-vibration is the fastest way to make haptics
 * feel cheap, and `ActStep.tsx:32` already commits the product to restraint —
 * "a settle, not a confetti cannon".
 */
export const HAPTIC_PATTERNS: Record<HapticEvent, number | number[]> = {
  tap: 10,
  commit: [14, 44, 22],
  reveal: [0, 26, 70, 18],
};

/** Whether the current browser exposes the Vibration API at all. */
export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(prefers-reduced-motion: reduce)")?.matches ?? false)
  );
}

/**
 * Fire the haptic registered for `event`, if the platform supports it and the
 * user has not asked for reduced motion.
 *
 * There is no `prefers-reduced-haptics` query. Reduced-motion is the closest
 * available signal and is honored here as the conservative default; if the
 * product decides haptics should survive it, delete the condition below.
 */
export function haptic(event: HapticEvent): void {
  // Structural "never throw": haptics are a decorative progressive
  // enhancement (see file doc comment), and callers such as Button's
  // onClick run their real action immediately after this call — a throw
  // here would abort that handler and turn a missing buzz into a missing
  // click. `canVibrate()`/the matchMedia guard above already cover the
  // known "unsupported" shapes, but `navigator.vibrate(...)` can still
  // throw synchronously when *called* (permission errors, buggy WebView
  // shims), and `window.matchMedia(...)` can throw when called instead of
  // returning `undefined` (sandboxed/restricted contexts). Swallowing those
  // is deliberate and correct here: the failure must stay unobservable to
  // the caller, and there is no recovery worth attempting for a vibration
  // that didn't fire. This is defense in depth on top of the guards above,
  // not a replacement for them.
  try {
    if (!canVibrate() || prefersReducedMotion()) return;
    navigator.vibrate(HAPTIC_PATTERNS[event]);
  } catch {
    // Intentionally empty — see comment above.
  }
}

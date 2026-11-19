export const CURRENT_LEGAL_CONSENT = {
  termsVersion: "2026-11-19",
  privacyVersion: "2026-11-19",
  adultConfirmed: true,
} as const;

export type LegalConsent = typeof CURRENT_LEGAL_CONSENT;

/**
 * Validate that an untrusted payload matches the active legal consent receipt.
 */
export function isValidCurrentLegalConsent(value: unknown): value is LegalConsent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<LegalConsent>;
  return (
    candidate.termsVersion === CURRENT_LEGAL_CONSENT.termsVersion &&
    candidate.privacyVersion === CURRENT_LEGAL_CONSENT.privacyVersion &&
    candidate.adultConfirmed === true
  );
}

export const CURRENT_LEGAL_CONSENT = {
  termsVersion: "2026-08-26",
  privacyVersion: "2026-08-26",
  adultConfirmed: true,
} as const;

export type LegalConsent = typeof CURRENT_LEGAL_CONSENT;

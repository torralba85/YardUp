export const CURRENT_LEGAL_CONSENT = {
  termsVersion: "2026-11-10",
  privacyVersion: "2026-11-10",
  adultConfirmed: true,
} as const;

export type LegalConsent = typeof CURRENT_LEGAL_CONSENT;

export const CURRENT_LEGAL_CONSENT = {
  termsVersion: "2026-10-30",
  privacyVersion: "2026-10-30",
  adultConfirmed: true,
} as const;

export type LegalConsent = typeof CURRENT_LEGAL_CONSENT;

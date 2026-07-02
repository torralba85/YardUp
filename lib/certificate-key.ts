/**
 * A certificate is bought once per property, so the purchase is keyed by a
 * stable slug of the lot's identity rather than the (mutable) ADU config. The
 * same module is used by the client (to check purchase status and label the
 * paywall) and the checkout route (to stamp the Stripe metadata), so the key can
 * never drift between where it's charged and where it's read.
 */

/** The minimal parcel identity a certificate key is derived from. */
export interface CertificateKeyParcel {
  address: string;
  city: string;
}

/**
 * Derive a stable, URL- and Firestore-id-safe slug for a lot. Lowercased,
 * punctuation collapsed to single hyphens, trimmed of leading/trailing
 * separators. Falls back to `"lot"` when the parcel has no usable address so the
 * key is never empty (an empty Firestore doc id is invalid).
 */
export function certificateKey(parcel: CertificateKeyParcel): string {
  const raw = `${parcel.address ?? ""} ${parcel.city ?? ""}`;
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "lot";
}

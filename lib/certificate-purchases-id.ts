/**
 * The deterministic certificate-purchase grant id, `{uid}_{certKey}`. Kept in a
 * client-safe module (no firebase-admin import) so both the server grant/lookup
 * and the client access hook derive the same doc id.
 */
export function purchaseId(uid: string, certKey: string): string {
  return `${uid}_${certKey}`;
}

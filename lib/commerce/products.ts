/**
 * Canonical store product catalog. IDs are immutable once published to App Store
 * Connect / Play Console; entitlement mapping is the only server-trusted source
 * of credit counts (never trust client-supplied amounts).
 */

export const STORE_PRODUCTS = {
  certificate: {
    id: "com.lotfoundry.certificate.credit1",
    certificateCredits: 1,
    leadCredits: 0,
    label: "Certificate of Feasibility",
  },
  /** Single lead-unlock credit — used when a store-channel builder unlocks with zero balance. */
  builder1: {
    id: "com.lotfoundry.builder.credit1",
    certificateCredits: 0,
    leadCredits: 1,
    label: "1 lead unlock credit",
  },
  builder5: {
    id: "com.lotfoundry.builder.credits5",
    certificateCredits: 0,
    leadCredits: 5,
    label: "5 lead unlock credits",
  },
  builder10: {
    id: "com.lotfoundry.builder.credits10",
    certificateCredits: 0,
    leadCredits: 10,
    label: "10 lead unlock credits",
  },
} as const;

export type StoreProductKey = keyof typeof STORE_PRODUCTS;
export type StoreProductId = (typeof STORE_PRODUCTS)[StoreProductKey]["id"];

const BY_ID = new Map(
  Object.values(STORE_PRODUCTS).map((product) => [product.id, product] as const),
);

/** Look up a product by its store product id, or `null` if unknown. */
export function getStoreProduct(productId: string) {
  return BY_ID.get(productId as StoreProductId) ?? null;
}

/** All known product ids (for store configuration and tests). */
export function listStoreProductIds(): StoreProductId[] {
  return Object.values(STORE_PRODUCTS).map((product) => product.id);
}

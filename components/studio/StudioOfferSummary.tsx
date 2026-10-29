"use client";

import { useStorePrice } from "@/lib/commerce/store-price";

/** Keep this public explanation on the same price as the purchase surface. */
export function StudioOfferSummary() {
  const price = useStorePrice("certificate");
  return (
    <p className="mt-2">
      Explore a lot and adjust the planning scenario in Studio for free. The optional paid
      Certificate of Feasibility{price.exact ? ` (${price.amountCompact})` : ""} packages
      the address-specific scenario for review and sharing; checkout shows the price before purchase.
      It does not replace a survey, stamped plans, a lender decision or a permit.
    </p>
  );
}

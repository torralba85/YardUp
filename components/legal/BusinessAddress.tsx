import { BUSINESS, BUSINESS_ADDRESS_LINE, BUSINESS_PHONE_HREF } from "@/lib/business-identity";

/**
 * Business name, street address and phone, printed in both site footers.
 * The Organization JSON-LD on the homepage and /about states the same facts,
 * so keep every change in `lib/business-identity.ts`.
 */
export function BusinessAddress({
  className,
  phoneClassName,
}: {
  className?: string;
  phoneClassName?: string;
}) {
  return (
    <address className={className}>
      {BUSINESS.name}, {BUSINESS_ADDRESS_LINE},{" "}
      <a href={BUSINESS_PHONE_HREF} className={phoneClassName}>
        {BUSINESS.phone}
      </a>
    </address>
  );
}

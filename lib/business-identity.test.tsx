import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BUSINESS, BUSINESS_PHONE_HREF, ORGANIZATION_ID, organizationJsonLd } from "./business-identity";
import { SOCIAL_URLS } from "./social-links";
import { SiteFooter } from "@/components/legal/SiteFooter";

const digits = (value: string) => value.replace(/\D/g, "");

describe("business identity", () => {
  it("prints the same name, address and phone in the footer as in the JSON-LD", () => {
    render(<SiteFooter />);
    const footer = screen.getByRole("contentinfo");
    const { address } = organizationJsonLd;
    expect(footer).toHaveTextContent(
      `${organizationJsonLd.name}, ${address.streetAddress}, ${address.addressLocality}, ${address.addressRegion} ${address.postalCode}, ${BUSINESS.phone}`,
    );
    expect(screen.getByRole("link", { name: BUSINESS.phone })).toHaveAttribute("href", BUSINESS_PHONE_HREF);
    expect(digits(BUSINESS_PHONE_HREF)).toBe(digits(organizationJsonLd.telephone));
    expect(digits(organizationJsonLd.telephone)).toBe(`1${digits(BUSINESS.phone)}`);
  });

  it("describes one Organization with an absolute logo, the social profiles and no ratings", () => {
    expect(organizationJsonLd).toMatchObject({
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      url: "https://lotfoundry.net/",
      logo: "https://lotfoundry.net/icon-512-transparent.png",
      address: { "@type": "PostalAddress", addressCountry: "US" },
    });
    expect(organizationJsonLd.sameAs).toEqual(SOCIAL_URLS);
    expect(JSON.stringify(organizationJsonLd)).not.toMatch(/rating|review/i);
  });
});

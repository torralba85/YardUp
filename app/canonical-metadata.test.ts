import { describe, expect, it, vi } from "vitest";
import { Children, isValidElement } from "react";

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "mock-space-grotesk" }),
  Manrope: () => ({ variable: "mock-manrope" }),
}));
import LandingPage, { metadata as homeMetadata } from "./page";
import { metadata as rootMetadata } from "./layout";
import { metadata as studioMetadata } from "./(firebase)/studio/layout";
import { metadata as aboutMetadata } from "./about/page";
import { metadata as helpMetadata } from "./help/page";
import { metadata as feedbackMetadata } from "./(firebase)/feedback/page";
import { metadata as privacyMetadata } from "./privacy/page";
import { metadata as termsMetadata } from "./terms/page";
import { metadata as loginMetadata } from "./(firebase)/login/page";
import { metadata as signupMetadata } from "./(firebase)/signup/layout";
import { metadata as certificatesMetadata } from "./(firebase)/certificates/page";
import { metadata as aduCaMetadata } from "./adu/ca/page";
import { metadata as aduCaCostMetadata } from "./adu/ca/cost/page";
import { metadata as aduCostCalculatorMetadata } from "./adu-cost-calculator/page";
import { metadata as aduCaRentMetadata } from "./adu/ca/rent/page";
import { metadata as aduCaJaduMetadata } from "./adu/ca/jadu/page";
import { metadata as sanDiegoPermitsMetadata } from "./adu/ca/san-diego/permits/page";
import { chulaVista } from "@/content/adu/ca/chula-vista";
import { buildCityMetadata } from "@/lib/adu/content";
import { cityLandingMetadata } from "@/components/landing/lot-more/CityLandingPage";
import { landingDemos, type LandingCity } from "@/lib/landing-demo";

describe("canonical metadata", () => {
  it("pins the metadata base and supplies a pathname-relative fallback", () => {
    expect(rootMetadata.metadataBase?.toString()).toBe("https://lotfoundry.net/");
    expect(rootMetadata.alternates?.canonical).toBe("./");
  });
  const routes = [
    { name: "/studio", metadata: studioMetadata, expectedCanonical: "/studio" },
    { name: "/about", metadata: aboutMetadata, expectedCanonical: "/about" },
    { name: "/help", metadata: helpMetadata, expectedCanonical: "/help" },
    { name: "/feedback", metadata: feedbackMetadata, expectedCanonical: "/feedback" },
    { name: "/privacy", metadata: privacyMetadata, expectedCanonical: "/privacy" },
    { name: "/terms", metadata: termsMetadata, expectedCanonical: "/terms" },
    { name: "/login", metadata: loginMetadata, expectedCanonical: "/login" },
    { name: "/signup", metadata: signupMetadata, expectedCanonical: "/signup" },
    { name: "/certificates", metadata: certificatesMetadata, expectedCanonical: "/certificates" },
    { name: "/adu/ca", metadata: aduCaMetadata, expectedCanonical: "https://lotfoundry.net/adu/ca" },
    {
      name: "/adu/ca/cost",
      metadata: aduCaCostMetadata,
      expectedCanonical: "https://lotfoundry.net/adu/ca/cost",
    },
    {
      name: "/adu-cost-calculator",
      metadata: aduCostCalculatorMetadata,
      expectedCanonical: "https://lotfoundry.net/adu-cost-calculator",
    },
    {
      name: "/adu/ca/rent",
      metadata: aduCaRentMetadata,
      expectedCanonical: "https://lotfoundry.net/adu/ca/rent",
    },
    {
      name: "/adu/ca/jadu",
      metadata: aduCaJaduMetadata,
      expectedCanonical: "https://lotfoundry.net/adu/ca/jadu",
    },
    {
      name: "/adu/ca/san-diego/permits",
      metadata: sanDiegoPermitsMetadata,
      expectedCanonical: "https://lotfoundry.net/adu/ca/san-diego/permits",
    },
  ];

  for (const { name, metadata, expectedCanonical } of routes) {
    it(`sets alternates.canonical to "${expectedCanonical}" for ${name}`, () => {
      expect(metadata.alternates?.canonical).toBe(expectedCanonical);
    });
  }

  it("renders the slash-form apex canonical itself instead of through metadata", () => {
    // Metadata would print the bare origin; e2e/growth-audit.spec.ts checks the HTML.
    expect(homeMetadata.alternates?.canonical).toBeNull();
    const canonical = Children.toArray(LandingPage().props.children).find(
      (child) => isValidElement<{ rel?: string }>(child) && child.type === "link" && child.props.rel === "canonical",
    );
    expect(canonical).toMatchObject({ props: { href: "https://lotfoundry.net/" } });
    expect(homeMetadata.openGraph?.url).toBe("https://lotfoundry.net/");
  });
});


describe("SEO audit metadata constraints", () => {
  const descriptions = [
    { name: "/feedback", metadata: feedbackMetadata },
    { name: "/privacy", metadata: privacyMetadata },
    { name: "/terms", metadata: termsMetadata },
    { name: "/adu/ca/cost", metadata: aduCaCostMetadata },
    { name: "/adu-cost-calculator", metadata: aduCostCalculatorMetadata },
  ];

  for (const { name, metadata } of descriptions) {
    it(`keeps ${name} meta description between 70 and 160 characters`, () => {
      expect(typeof metadata.description).toBe("string");
      const description = metadata.description as string;
      expect(description.length).toBeGreaterThanOrEqual(70);
      expect(description.length).toBeLessThanOrEqual(160);
    });
  }

  for (const { name, metadata } of [
    { name: "/adu/ca", metadata: aduCaMetadata },
    { name: "/adu/ca/cost", metadata: aduCaCostMetadata },
    { name: "/adu-cost-calculator", metadata: aduCostCalculatorMetadata },
  ]) {
    it(`keeps the ${name} title at 60 characters or fewer`, () => {
      expect(typeof metadata.title).toBe("string");
      expect((metadata.title as string).length).toBeLessThanOrEqual(60);
    });
  }

  it("keeps the Chula Vista title at 60 characters or fewer", () => {
    const title = buildCityMetadata(chulaVista).title;
    expect(typeof title).toBe("string");
    expect((title as string).length).toBeLessThanOrEqual(60);
  });
});

describe("share previews", () => {
  for (const { name, metadata } of [
    { name: "/adu/ca", metadata: aduCaMetadata },
    { name: "/adu-cost-calculator", metadata: aduCostCalculatorMetadata },
    ...(Object.keys(landingDemos) as LandingCity[]).map((city) => ({ name: `/${city}`, metadata: cityLandingMetadata(city) })),
  ]) {
    it(`gives ${name} an Open Graph image, because its own openGraph block replaces the layout's`, () => {
      expect(metadata.openGraph?.images).toBeTruthy();
    });
  }

  for (const { name, metadata } of [
    { name: "/about", metadata: aboutMetadata },
    { name: "/help", metadata: helpMetadata },
    { name: "/feedback", metadata: feedbackMetadata },
    { name: "/privacy", metadata: privacyMetadata },
    { name: "/terms", metadata: termsMetadata },
  ]) {
    it(`shares ${name} under its own URL and title rather than the homepage's`, () => {
      expect(metadata.openGraph?.url).toBe(name);
      expect(metadata.openGraph?.title).toBe(metadata.title);
      expect(metadata.openGraph?.images).toBeTruthy();
    });
  }
});

describe("demo landings", () => {
  for (const city of Object.keys(landingDemos) as LandingCity[]) {
    it(`keeps /${city} out of search, because it repeats the homepage with a different sample lot`, () => {
      const metadata = cityLandingMetadata(city);
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(metadata.alternates?.canonical).toBe(`https://lotfoundry.net/${city}`);
    });
  }
});

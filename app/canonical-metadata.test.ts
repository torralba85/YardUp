import { describe, expect, it, vi } from "vitest";
import { Children, isValidElement } from "react";

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "mock-space-grotesk" }),
  Manrope: () => ({ variable: "mock-manrope" }),
}));
import LandingPage, { metadata as homeMetadata } from "./page";
import RootLayout, { metadata as rootMetadata } from "./layout";
import { metadata as studioMetadata } from "./(firebase)/studio/layout";
import { metadata as aboutMetadata } from "./about/page";
import { metadata as helpMetadata } from "./help/page";
import { metadata as feedbackMetadata } from "./(firebase)/feedback/page";
import { metadata as privacyMetadata } from "./privacy/page";
import { metadata as termsMetadata } from "./terms/page";
import { metadata as loginMetadata } from "./(firebase)/login/page";
import { metadata as signupMetadata } from "./(firebase)/signup/layout";
import { metadata as forgotPasswordMetadata } from "./(firebase)/forgot-password/layout";
import { metadata as certificatesMetadata } from "./(firebase)/certificates/page";
import { metadata as deleteAccountMetadata } from "./(firebase)/delete-account/page";
import { metadata as settingsMetadata } from "./(firebase)/settings/page";
import { metadata as builderMetadata } from "./(firebase)/builder/layout";
import { metadata as aduCaMetadata } from "./adu/ca/page";
import { metadata as aduCaCostMetadata } from "./adu/ca/cost/page";
import { metadata as aduCostCalculatorMetadata } from "./adu-cost-calculator/page";
import { metadata as aduCaRentMetadata } from "./adu/ca/rent/page";
import { metadata as aduCaJaduMetadata } from "./adu/ca/jadu/page";
import { metadata as sanDiegoPermitsMetadata } from "./adu/ca/san-diego/permits/page";
import { metadata as methodologyMetadata } from "./adu/how-we-estimate/page";
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
    { name: "/forgot-password", metadata: forgotPasswordMetadata, expectedCanonical: "/forgot-password" },
    { name: "/certificates", metadata: certificatesMetadata, expectedCanonical: "/certificates" },
    { name: "/delete-account", metadata: deleteAccountMetadata, expectedCanonical: "/delete-account" },
    { name: "/settings", metadata: settingsMetadata, expectedCanonical: "/settings" },
    { name: "/builder", metadata: builderMetadata, expectedCanonical: "/builder" },
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
  });

  it("renders the slash-form og:url itself, since metadata would strip the slash there too", () => {
    expect(homeMetadata.openGraph?.url).toBeUndefined();
    const ogUrl = Children.toArray(LandingPage().props.children).find(
      (child) => isValidElement<{ property?: string }>(child) && child.type === "meta" && child.props.property === "og:url",
    );
    expect(ogUrl).toMatchObject({ props: { content: "https://lotfoundry.net/" } });
  });
});

describe("site JSON-LD", () => {
  const jsonLd = () => {
    const body = Children.toArray(RootLayout({ children: null }).props.children)[0];
    const script = Children.toArray(isValidElement<{ children?: React.ReactNode }>(body) ? body.props.children : []).find(
      (child) => isValidElement<{ type?: string }>(child) && child.type === "script" && child.props.type === "application/ld+json",
    );
    if (!isValidElement<{ dangerouslySetInnerHTML: { __html: string } }>(script)) throw new Error("no JSON-LD script");
    return JSON.parse(script.props.dangerouslySetInnerHTML.__html);
  };

  it("names the company as the Terms do and the founder the About page names", () => {
    const { publisher } = jsonLd();
    expect(publisher.legalName).toBe("VeriShare LLC");
    expect(publisher.founder).toEqual({ "@type": "Person", name: "Andrew Torralba", jobTitle: "CEO" });
    expect(publisher.contactPoint.email).toBe("support@lotfoundry.net");
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
    it(`keeps ${name} meta description between 70 and 155 characters`, () => {
      expect(typeof metadata.description).toBe("string");
      const description = metadata.description as string;
      expect(description.length).toBeGreaterThanOrEqual(70);
      expect(description.length).toBeLessThanOrEqual(155);
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
    { name: "/adu/how-we-estimate", metadata: methodologyMetadata },
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

describe("de-indexed utility routes", () => {
  const deindexed = [
    { name: "/login", metadata: loginMetadata },
    { name: "/signup", metadata: signupMetadata },
    { name: "/forgot-password", metadata: forgotPasswordMetadata },
    { name: "/certificates", metadata: certificatesMetadata },
    { name: "/delete-account", metadata: deleteAccountMetadata },
    { name: "/settings", metadata: settingsMetadata },
    { name: "/builder", metadata: builderMetadata },
  ];

  for (const { name, metadata } of deindexed) {
    it(`keeps ${name} out of search with robots noindex`, () => {
      expect(metadata.robots).toEqual({ index: false, follow: true });
    });
  }
});


import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "mock-space-grotesk" }),
  Manrope: () => ({ variable: "mock-manrope" }),
}));
import { canonicalUrl, metadata as homeMetadata } from "./page";
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
import { metadata as aduCostCalculatorMetadata } from "./adu-cost-calculator/page";
import { chulaVista } from "@/content/adu/ca/chula-vista";
import { buildCityMetadata } from "@/lib/adu/content";

describe("canonical metadata", () => {
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
      name: "/adu-cost-calculator",
      metadata: aduCostCalculatorMetadata,
      expectedCanonical: "https://lotfoundry.net/adu-cost-calculator",
    },
  ];

  for (const { name, metadata, expectedCanonical } of routes) {
    it(`sets alternates.canonical to "${expectedCanonical}" for ${name}`, () => {
      expect(metadata.alternates?.canonical).toBe(expectedCanonical);
    });
  }

  it("uses the slash-form apex for the homepage canonical", () => {
    expect(canonicalUrl).toBe("https://lotfoundry.net/");
    expect(homeMetadata.openGraph?.url).toBe("https://lotfoundry.net/");
  });
});


describe("SEO audit metadata constraints", () => {
  const descriptions = [
    { name: "/feedback", metadata: feedbackMetadata },
    { name: "/privacy", metadata: privacyMetadata },
    { name: "/terms", metadata: termsMetadata },
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

import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "mock-space-grotesk" }),
  Manrope: () => ({ variable: "mock-manrope" }),
}));
import { metadata as homeMetadata } from "./page";
import { metadata as studioMetadata } from "./(firebase)/studio/layout";
import { metadata as aboutMetadata } from "./about/page";
import { metadata as helpMetadata } from "./help/page";
import { metadata as feedbackMetadata } from "./(firebase)/feedback/page";
import { metadata as privacyMetadata } from "./privacy/page";
import { metadata as termsMetadata } from "./terms/page";
import { metadata as loginMetadata } from "./(firebase)/login/page";
import { metadata as signupMetadata } from "./(firebase)/signup/layout";

describe("canonical metadata", () => {
  const routes = [
    { name: "/", metadata: homeMetadata, expectedCanonical: "/" },
    { name: "/studio", metadata: studioMetadata, expectedCanonical: "/studio" },
    { name: "/about", metadata: aboutMetadata, expectedCanonical: "/about" },
    { name: "/help", metadata: helpMetadata, expectedCanonical: "/help" },
    { name: "/feedback", metadata: feedbackMetadata, expectedCanonical: "/feedback" },
    { name: "/privacy", metadata: privacyMetadata, expectedCanonical: "/privacy" },
    { name: "/terms", metadata: termsMetadata, expectedCanonical: "/terms" },
    { name: "/login", metadata: loginMetadata, expectedCanonical: "/login" },
    { name: "/signup", metadata: signupMetadata, expectedCanonical: "/signup" },
  ];

  for (const { name, metadata, expectedCanonical } of routes) {
    it(`sets alternates.canonical to "${expectedCanonical}" for ${name}`, () => {
      expect(metadata.alternates?.canonical).toBe(expectedCanonical);
    });
  }
});

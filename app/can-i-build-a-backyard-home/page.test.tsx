import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, stashAddressQueryMock, stashEntrySourceMock, trackEventMock, acquireMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    stashAddressQueryMock: vi.fn(),
    stashEntrySourceMock: vi.fn(),
    trackEventMock: vi.fn(),
    acquireMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/address-handoff", () => ({
  stashAddressQuery: stashAddressQueryMock,
}));

vi.mock("@/lib/analytics/entry-source", () => ({
  stashEntrySource: stashEntrySourceMock,
}));

vi.mock("@/lib/analytics/gtag", () => ({
  trackEvent: trackEventMock,
}));

vi.mock("@/lib/live-parcel-acquisition", () => ({
  acquireLiveParcel: acquireMock,
}));

vi.mock("@/lib/guest-lookup", () => ({
  canGuestLookup: () => true,
  consumeGuestLookup: vi.fn(),
  resetGuestLookups: vi.fn(),
}));

import CanIBuildABackyardHomePage, {
  metadata,
} from "@/app/can-i-build-a-backyard-home/page";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";
import { clearInitialParcel, peekInitialParcel } from "@/lib/parcel-handoff";

describe("/can-i-build-a-backyard-home", () => {
  beforeEach(() => {
    pushMock.mockReset();
    stashAddressQueryMock.mockReset();
    stashEntrySourceMock.mockReset();
    trackEventMock.mockReset();
    acquireMock.mockReset();
    acquireMock.mockResolvedValue({ ...SAMPLE_LIVE_PARCEL });
    clearInitialParcel();
  });

  afterEach(() => {
    cleanup();
  });

  it("exports bounded SEO metadata targeting backyard home, San Diego, and California ADU queries", () => {
    const title = String(metadata.title);
    const description = String(metadata.description);

    expect(title).toMatch(/backyard home/i);
    expect(title).toMatch(/san diego/i);
    expect(title).toMatch(/\bADU\b/);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThanOrEqual(70);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(metadata.alternates?.canonical).toBe("/can-i-build-a-backyard-home");
  });

  it("renders the H1, San Diego rules, California cost guide, and JSON-LD schemas", () => {
    const { container } = render(<CanIBuildABackyardHomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Can I build a backyard home?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "What are the ADU rules in San Diego?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "How much does an ADU cost in California?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Read full San Diego ADU rules/i,
      }),
    ).toHaveAttribute("href", "/adu/ca/san-diego");

    const jsonLdNode = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(jsonLdNode?.textContent).toContain("BreadcrumbList");
    expect(jsonLdNode?.textContent).toContain("WebApplication");
    expect(jsonLdNode?.textContent).toContain('"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}');
    expect(jsonLdNode?.textContent).not.toContain("FAQPage");
  });

  it("walks through 5 yes/no questions, shows inline answer, and hands off parcel to /studio", async () => {
    render(<CanIBuildABackyardHomePage />);

    fireEvent.click(screen.getByRole("button", { name: /Yes, residential lot/i }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, open yard space/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Yes, clearance looks open/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Yes, flat and clear/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Yes, housing or family/i }),
    );

    expect(screen.getByText("Likely eligible")).toBeInTheDocument();
    expect(trackEventMock).toHaveBeenCalledWith("eligibility_quiz_completed", {
      verdict: "clear",
      yes_count: 5,
      recommended_sq_ft: 600,
    });

    const sampleLink = screen.getByRole("link", {
      name: /Explore sample 600 sq ft lot/i,
    });
    expect(sampleLink).toHaveAttribute(
      "href",
      "/studio?parcel=coyote-brush&size=600",
    );

    const addressInput = screen.getByLabelText(
      /Check your exact address in the 3D studio/i,
    );
    fireEvent.change(addressInput, {
      target: { value: "1420 Coyote Brush Ct, San Diego, CA" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Check my lot/i }));

    const answer = await screen.findByRole("region", {
      name: "Inline lot feasibility answer",
    });
    expect(answer).toHaveTextContent("500 Cedar Ave, San Jose, CA");

    fireEvent.click(screen.getByRole("button", { name: /Open in 3D/i }));
    expect(peekInitialParcel()).toEqual(SAMPLE_LIVE_PARCEL);
    expect(stashAddressQueryMock).toHaveBeenCalledWith("");
    expect(stashEntrySourceMock).toHaveBeenCalledWith("landing_cta");
    expect(pushMock).toHaveBeenCalledWith("/studio");
  });

  it("recommends 400 sq ft when backyard space is tight", () => {
    render(<CanIBuildABackyardHomePage />);

    fireEvent.click(screen.getByRole("button", { name: /Yes, residential lot/i }));
    fireEvent.click(screen.getByRole("button", { name: /No, yard is tight/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Yes, clearance looks open/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Yes, flat and clear/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Yes, housing or family/i }),
    );

    expect(screen.getByText("Needs parcel check")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Explore sample 400 sq ft lot/i }),
    ).toHaveAttribute("href", "/studio?parcel=coyote-brush&size=400");
  });
});

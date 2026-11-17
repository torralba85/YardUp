import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AduStudioCta } from "./AduStudioCta";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";
import { resetGuestLookups } from "@/lib/guest-lookup";
import { clearInitialParcel, peekInitialParcel } from "@/lib/parcel-handoff";

const { pushMock, acquireMock, trackEventMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  acquireMock: vi.fn(),
  trackEventMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/live-parcel-acquisition", () => ({
  acquireLiveParcel: acquireMock,
}));

vi.mock("@/lib/analytics/gtag", () => ({
  trackEvent: trackEventMock,
}));

describe("AduStudioCta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetGuestLookups();
    clearInitialParcel();
    acquireMock.mockResolvedValue({ ...SAMPLE_LIVE_PARCEL });
  });

  it("advertises free build cost & payback and up to 3 guest addresses, then resolves inline", async () => {
    render(
      <AduStudioCta
        city="San Diego"
        slug="san-diego-cost"
        placement="mid"
        heading="Test your San Diego lot"
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Test your San Diego lot" })).toBeVisible();
    expect(screen.getByText(/Free: lot fit, 3D concept, build cost, rent range, and payback/)).toBeVisible();
    expect(screen.getByText(/up to 3 addresses/i)).toBeVisible();

    fireEvent.change(screen.getByLabelText("Your San Diego street address"), {
      target: { value: "500 Cedar Ave, San Jose, CA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));

    expect(trackEventMock).toHaveBeenCalledWith("adu_cta_mid", {
      city_slug: "san-diego-cost",
    });

    const answer = await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    expect(answer).toHaveTextContent("500 Cedar Ave, San Jose, CA");

    fireEvent.click(screen.getByRole("button", { name: "Open in 3D" }));
    expect(peekInitialParcel()).toEqual(SAMPLE_LIVE_PARCEL);
    expect(pushMock).toHaveBeenCalledExactlyOnceWith("/studio");
  });
});

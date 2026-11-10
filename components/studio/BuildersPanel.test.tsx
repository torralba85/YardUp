import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BuilderDirectoryProfile } from "@/lib/marketplace-types";

const mocks = vi.hoisted(() => ({
  fetchActiveBuilders: vi.fn<() => Promise<BuilderDirectoryProfile[]>>(),
  user: null as { uid: string } | null,
}));

vi.mock("@/lib/marketplace-firestore", () => ({
  fetchActiveBuilders: () => mocks.fetchActiveBuilders(),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog">auth-modal</div> : null,
}));

import BuildersPanel from "./BuildersPanel";

function builder(
  overrides: Partial<BuilderDirectoryProfile> = {},
): BuilderDirectoryProfile {
  return {
    id: "b1",
    companyName: "Cascade ADU Co",
    serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
    active: true,
    licensed: true,
    ...overrides,
  };
}

describe("BuildersPanel", () => {
  beforeEach(() => {
    mocks.fetchActiveBuilders.mockReset();
    mocks.user = null;
  });

  it("asks a guest to sign in before showing matched builders", () => {
    render(<BuildersPanel parcelCity="Seattle, WA" onConnect={() => {}} />);
    expect(screen.getByRole("button", { name: /sign in to see matched builders/i })).toBeInTheDocument();
    expect(mocks.fetchActiveBuilders).not.toHaveBeenCalled();
  });

  it("lists matched builders for the parcel's city without exposing contact info", async () => {
    mocks.user = { uid: "u1" };
    mocks.fetchActiveBuilders.mockResolvedValue([
      builder(),
      builder({ id: "b2", companyName: "Out of Area LLC", serviceAreas: [{ city: "Austin", state: "TX", key: "austin-tx" }] }),
    ]);

    render(<BuildersPanel parcelCity="Seattle, WA" onConnect={() => {}} />);

    expect(await screen.findByText("Cascade ADU Co")).toBeInTheDocument();
    expect(screen.queryByText("Out of Area LLC")).not.toBeInTheDocument();
    // The referral cannot be bypassed: no builder contact details pre-connect.
    expect(screen.queryByText(/cascadeadu.example/)).not.toBeInTheDocument();
    expect(screen.queryByText(/555-0100/)).not.toBeInTheDocument();
    // Self-reported license information is labeled without implying verification.
    expect(screen.getByText(/license provided/i)).toBeInTheDocument();
    expect(screen.getByText(/not guarantees of licensing/i)).toBeInTheDocument();
  });

  it("enables connecting when builders match", async () => {
    const onConnect = vi.fn();
    mocks.user = { uid: "u1" };
    mocks.fetchActiveBuilders.mockResolvedValue([builder()]);

    render(<BuildersPanel parcelCity="Seattle, WA" onConnect={onConnect} />);
    const cta = await screen.findByRole("button", { name: /connect with builders/i });
    await userEvent.click(cta);
    expect(onConnect).toHaveBeenCalled();
  });

  it("shows an honest zero-state and disables connect when no builders serve the area", async () => {
    mocks.user = { uid: "u1" };
    mocks.fetchActiveBuilders.mockResolvedValue([
      builder({ serviceAreas: [{ city: "Austin", state: "TX", key: "austin-tx" }] }),
    ]);

    render(<BuildersPanel parcelCity="Seattle, WA" onConnect={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/no builders are registered for Seattle, WA yet/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /connect with builders/i })).toBeDisabled();
  });

  it("keeps connect open and points to the partner when it serves a lot no builder does", async () => {
    const onConnect = vi.fn();
    mocks.user = { uid: "u1" };
    mocks.fetchActiveBuilders.mockResolvedValue([]);

    render(<BuildersPanel parcelCity="Pasadena, CA" partnerName="GreatBuildz" onConnect={onConnect} />);

    expect(await screen.findByText(/no LotFoundry builders are registered for Pasadena, CA yet/i)).toBeInTheDocument();
    expect(screen.getByText(/send your project to GreatBuildz, an independent contractor-matching service/i)).toBeInTheDocument();
    // One caption: the partner sentence follows the disclaimer with a space.
    expect(screen.getByText(/work quality\. Your contact details are only shared with the builders or partner you choose; GreatBuildz may pay LotFoundry a referral fee/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /connect with builders/i }));
    expect(onConnect).toHaveBeenCalled();
  });

  it("states that builders pay for the referral, not the homeowner", async () => {
    mocks.user = { uid: "u1" };
    mocks.fetchActiveBuilders.mockResolvedValue([builder()]);
    render(<BuildersPanel parcelCity="Seattle, WA" onConnect={() => {}} />);
    expect(await screen.findByText(/builders pay LotFoundry for the introduction/i)).toBeInTheDocument();
  });
});

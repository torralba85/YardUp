import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as null | { uid: string; getIdToken: () => Promise<string> },
    profile: null,
    loading: false,
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mocks.authState,
}));

// AddressSearch loads the Google Maps SDK — replace with a deterministic stub.
vi.mock("@/components/studio/AddressSearch", () => ({
  default: function MockAddressSearch({
    onSelect,
    onSubmitText,
  }: {
    onSelect: (r: { lat: number; lng: number; formattedAddress: string }) => void;
    onSubmitText?: (query: string) => void;
  }) {
    return (
      <>
        <button
          type="button"
          onClick={() =>
            onSelect({ lat: 47.68, lng: -122.3, formattedAddress: "123 Maple St, Seattle, WA 98115, USA" })
          }
        >
          mock-address-select
        </button>
        <button type="button" onClick={() => onSubmitText?.("123 Maple St")}>
          mock-address-submit
        </button>
      </>
    );
  },
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>mock-auth-modal</div> : null),
}));

import WizardFlow from "./WizardFlow";
import { ParcelProvider } from "@/lib/parcel-context";
import { parcelPresets } from "@/lib/feasibility";

function renderWizard(onComplete = vi.fn()) {
  const view = render(
    <ParcelProvider initialPreset={parcelPresets[0]}>
      <WizardFlow onComplete={onComplete} />
    </ParcelProvider>,
  );
  return { onComplete, ...view };
}

describe("WizardFlow", () => {
  beforeEach(() => {
    mocks.authState.user = null;
  });

  it("starts on the address step with demo chips and skip", () => {
    renderWizard();
    expect(screen.getByText(/could your backyard pay you rent/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /seattle/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip — explore the demo lot/i })).toBeInTheDocument();
  });

  it("demo chip completes immediately", async () => {
    const user = userEvent.setup();
    const { onComplete } = renderWizard();

    await user.click(screen.getByRole("button", { name: /portland/i }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("free-text submit as a guest opens the auth modal instead of a lookup", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByText("mock-address-submit"));

    expect(screen.getByText("mock-auth-modal")).toBeInTheDocument();
    expect(screen.queryByText(/pick a suggestion/i)).not.toBeInTheDocument();
  });

  it("free-text submit while signed in shows the pick-a-suggestion hint", async () => {
    mocks.authState.user = { uid: "u1", getIdToken: async () => "token" };
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByText("mock-address-submit"));

    expect(screen.getByText(/pick a suggestion/i)).toBeInTheDocument();
    expect(screen.queryByText("mock-auth-modal")).not.toBeInTheDocument();
  });

  it("address select advances to the size step", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByText("mock-address-select"));
    expect(screen.getByText(/what size adu/i)).toBeInTheDocument();
    expect(screen.getByText(/123 Maple St/)).toBeInTheDocument();
  });

  it("size choice leads to a teaser with rounded rent and a locked unlock CTA", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByText("mock-address-select"));
    await user.click(screen.getByRole("radio", { name: /1 bedroom/i }));
    await user.click(screen.getByRole("button", { name: /see my results/i }));

    expect(screen.getByText(/~\$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create free account/i })).toBeInTheDocument();
    expect(screen.getByText(/estimated/i)).toBeInTheDocument();
  });

  it("skip from results completes with the estimated scenario", async () => {
    const user = userEvent.setup();
    const { onComplete } = renderWizard();

    await user.click(screen.getByText("mock-address-select"));
    await user.click(screen.getByRole("radio", { name: /1 bedroom/i }));
    await user.click(screen.getByRole("button", { name: /see my results/i }));
    await user.click(screen.getByRole("button", { name: /skip — explore the demo lot/i }));

    expect(onComplete).toHaveBeenCalledOnce();
    const config = onComplete.mock.calls[0][0];
    expect(config?.footprint).toBe(600);
  });

  it("opens the auth modal from the unlock CTA", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByText("mock-address-select"));
    await user.click(screen.getByRole("radio", { name: /1 bedroom/i }));
    await user.click(screen.getByRole("button", { name: /see my results/i }));
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    expect(screen.getByText("mock-auth-modal")).toBeInTheDocument();
  });
});

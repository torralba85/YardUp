import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificatesClient } from "./CertificatesClient";
import type { PurchasedCertificate } from "@/lib/purchased-certificates";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

const authState = vi.hoisted(() => ({
  user: {
    uid: "u1",
    email: "owner@example.com",
    displayName: "Alma Reyes",
  } as unknown,
  profile: {
    uid: "u1",
    email: "owner@example.com",
    displayName: "Alma Reyes",
    role: "user" as const,
  },
  loading: false,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    logout: vi.fn(),
  }),
}));

const certState = vi.hoisted(() => ({
  certificates: [] as PurchasedCertificate[],
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));

vi.mock("@/lib/purchased-certificates", async () => {
  const actual = await vi.importActual<typeof import("@/lib/purchased-certificates")>(
    "@/lib/purchased-certificates",
  );
  return {
    ...actual,
    useUserPurchasedCertificates: () => certState,
  };
});

describe("CertificatesClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = {
      uid: "u1",
      email: "owner@example.com",
      displayName: "Alma Reyes",
    };
    authState.loading = false;
    certState.certificates = [];
    certState.loading = false;
    certState.error = null;
  });

  it("shows sign-in prompt when not authenticated", () => {
    authState.user = null;
    render(<CertificatesClient />);
    expect(screen.getByRole("heading", { name: /certificates of feasibility/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login?next=/certificates",
    );
  });

  it("shows loading state when fetching certificates", () => {
    certState.loading = true;
    const { container } = render(<CertificatesClient />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("announces a load failure as an alert with a retry", () => {
    certState.error = "Could not load your certificates.";
    render(<CertificatesClient />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your certificates.");
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(certState.refresh).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no certificates exist", () => {
    render(<CertificatesClient />);
    expect(screen.getByRole("heading", { name: /no certificates unlocked yet/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore 3d studio/i })).toHaveAttribute("href", "/studio");
  });

  it("renders unlocked certificates with details and actions", () => {
    certState.certificates = [
      {
        id: "u1_ca-san-jose-141",
        certKey: "ca-san-jose-141-n-almaden-blvd-95110",
        uid: "u1",
        stripeSessionId: "cs_123",
        amount: 2900,
        status: "granted",
        demo: false,
        createdAt: new Date("2026-09-16T12:00:00Z"),
        address: "141 N Almaden Blvd",
        city: "San Jose",
        state: "CA",
        zip: "95110",
      },
    ];

    render(<CertificatesClient />);
    expect(screen.getByText("141 N Almaden Blvd")).toBeInTheDocument();
    expect(screen.getByText(/San Jose, CA 95110/)).toBeInTheDocument();
    expect(screen.getByText(/Amount: \$29/)).toBeInTheDocument();
    expect(screen.getAllByText(/Unlocked/).length).toBeGreaterThanOrEqual(1);

    const openButton = screen.getByRole("button", { name: /open in 3d studio/i });
    expect(openButton).toBeInTheDocument();
    fireEvent.click(openButton);

    expect(routerMock.push).toHaveBeenCalledWith(
      "/studio?cert=ca-san-jose-141-n-almaden-blvd-95110",
    );
  });
});

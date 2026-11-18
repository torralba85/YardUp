import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    emailVerified: false,
    getIdToken: vi.fn().mockResolvedValue("token-1"),
  } as unknown,
  profile: {
    uid: "u1",
    email: "owner@example.com",
    displayName: "Alma Reyes",
    role: "user" as const,
  },
  loading: false,
  refreshProfile: vi.fn(),
  sendVerification: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    logout: vi.fn(),
    refreshProfile: authState.refreshProfile,
    sendVerification: authState.sendVerification,
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
      emailVerified: false,
      getIdToken: vi.fn().mockResolvedValue("token-1"),
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
      "/studio?cert=ca-san-jose-141-n-almaden-blvd-95110&checkout=open",
    );
  });

  it("shows a live-lookup locality once when the city already carries state and ZIP", () => {
    const lot = "202-c-st-san-diego-ca-92101";
    certState.certificates = [
      {
        id: `u1_${lot}`,
        certKey: lot,
        uid: "u1",
        stripeSessionId: "cs_123",
        amount: 2900,
        status: "granted",
        demo: false,
        createdAt: new Date("2026-11-17T12:00:00Z"),
        address: "202 C St",
        city: "San Diego, CA 92101",
        state: "CA",
        zip: "92101",
      },
    ];

    render(<CertificatesClient />);
    expect(screen.getByText("San Diego, CA 92101")).toBeInTheDocument();
    expect(screen.queryByText(/CA 92101, CA/)).not.toBeInTheDocument();
  });

  it("labels a $0 agent-pass certificate as complimentary instead of a price", () => {
    const listing = "1234-elm-st-san-diego";
    certState.certificates = [
      {
        id: `u1_${listing}`,
        certKey: listing,
        uid: "u1",
        stripeSessionId: "pass:SMITH-ELM",
        amount: 0,
        status: "granted",
        demo: false,
        createdAt: new Date("2026-11-20T12:00:00Z"),
        address: "1234 Elm St",
        city: "San Diego",
        state: "CA",
      },
    ];

    render(<CertificatesClient />);
    expect(screen.getByText("Complimentary")).toBeInTheDocument();
    expect(screen.queryByText(/Amount:/)).not.toBeInTheDocument();
  });

  it("checks recovery when verification updates the existing Firebase User object", async () => {
    const sameUser = { uid: "u1", email: "owner@example.com", emailVerified: false, getIdToken: vi.fn().mockResolvedValue("verified-token") };
    authState.user = sameUser;
    authState.refreshProfile.mockImplementation(async () => { sameUser.emailVerified = true; });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ claimedCertKeys: ["lot-1"], alreadyOwnedCertKeys: [] }), { status: 200 }),
    );
    try {
      render(<CertificatesClient />);
      fireEvent.click(screen.getByRole("button", { name: /I've verified/ }));
      await waitFor(() => expect(certState.refresh).toHaveBeenCalledTimes(1));
    } finally { fetchSpy.mockRestore(); }
  });

  it("offers recovery retry after an outage without hiding existing certificates", async () => {
    authState.user = { uid: "u1", emailVerified: true, getIdToken: vi.fn().mockResolvedValue("token") };
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Temporarily unavailable" }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ claimedCertKeys: [], alreadyOwnedCertKeys: ["lot-1"] }), { status: 200 }));
    try {
      render(<CertificatesClient />);
      expect(await screen.findByRole("alert")).toHaveTextContent("Could not check for guest purchases");
      fireEvent.click(screen.getByRole("button", { name: "Retry guest purchase recovery" }));
      await waitFor(() => expect(certState.refresh).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    } finally { fetchSpy.mockRestore(); }
  });

  it("claims with a refreshed ID token so a pre-verification token is never sent", async () => {
    // Verifying via the email link updates user.emailVerified on reload, but the
    // cached ID token keeps email_verified=false for up to an hour; the claim
    // route rejects that with 403 and the buyer is stuck on "Retry".
    authState.user = {
      uid: "u1",
      email: "owner@example.com",
      emailVerified: true,
      getIdToken: vi.fn(async (forceRefresh?: boolean) => (forceRefresh ? "fresh-token" : "stale-token")),
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ claimedCertKeys: ["lot-1"], alreadyOwnedCertKeys: [] }), { status: 200 }),
    );
    try {
      render(<CertificatesClient />);
      await waitFor(() =>
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/certificates/claim",
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: "Bearer fresh-token" }),
          }),
        ),
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("recovers guest purchases automatically when signed in with a verified email", async () => {
    authState.user = {
      uid: "u1",
      email: "owner@example.com",
      displayName: "Alma Reyes",
      emailVerified: true,
      getIdToken: vi.fn().mockResolvedValue("verified-token"),
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ claimedCertKeys: ["lot-1"], alreadyOwnedCertKeys: [] }),
        { status: 200 },
      ),
    );

    try {
      render(<CertificatesClient />);

      await waitFor(() =>
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/certificates/claim",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: "Bearer verified-token",
            }),
          }),
        ),
      );
      await waitFor(() => expect(certState.refresh).toHaveBeenCalledTimes(1));
      expect(await screen.findByRole("status")).toHaveTextContent(
        /Recovered 1 guest certificate/,
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

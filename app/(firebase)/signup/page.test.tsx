import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "./page";
import LoginForm from "../login/LoginForm";

const mocks = vi.hoisted(() => ({
  push: vi.fn(), replace: vi.fn(), signUp: vi.fn(), google: vi.fn(), apple: vi.fn(),
  user: null as null | { uid: string },
  profile: null as null | { role: string },
  params: new URLSearchParams("role=builder"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => mocks.params,
}));
vi.mock("@/lib/auth-context", () => ({
  CURRENT_LEGAL_CONSENT: {},
  useAuth: () => ({ signUp: mocks.signUp, signInWithGoogle: mocks.google,
    signInWithApple: mocks.apple, user: mocks.user, profile: mocks.profile }),
}));

beforeEach(() => {
  mocks.user = null; mocks.profile = null;
  mocks.params = new URLSearchParams("role=builder");
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("builder auth in store shells", () => {
  it.each(["email", "Google", "Apple"])("ignores the builder query for %s signup", async (method) => {
    vi.stubGlobal("LotFoundryNative", { platform: "android" });
    render(<SignupPage />);
    expect(screen.queryByRole("button", { name: /Builder/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    if (method === "email") {
      fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Test Owner" } });
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "owner@example.com" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
      fireEvent.submit(screen.getByLabelText("Email").closest("form")!);
      await waitFor(() => expect(mocks.signUp).toHaveBeenCalledWith(
        "owner@example.com", "test-password", "Test Owner", "user", {},
      ));
    } else {
      fireEvent.click(screen.getByRole("button", { name: method }));
      await waitFor(() => expect(method === "Google" ? mocks.google : mocks.apple)
        .toHaveBeenCalledWith("user", {}));
    }
    expect(mocks.push).toHaveBeenCalledWith("/studio");
  });

  it("preserves builder registration in a phone web browser", () => {
    vi.stubGlobal("innerWidth", 390);
    render(<SignupPage />);
    expect(screen.getByRole("button", { name: /Builder/ })).toBeInTheDocument();
  });

  it.each(["", "next=%2Fbuilder", "next=%2Fbuilder%3Fpack%3D10"])(
    "routes an existing app builder to Studio, including old deep links (%s)", (query) => {
      vi.stubGlobal("LotFoundryNative", { platform: "android" });
      mocks.user = { uid: "builder" }; mocks.profile = { role: "builder" };
      mocks.params = new URLSearchParams(query);
      render(<LoginForm />);
      expect(mocks.replace).toHaveBeenCalledWith("/studio");
      expect(mocks.replace).not.toHaveBeenCalledWith("/builder");
    },
  );

  it("keeps existing web builder login routing", () => {
    mocks.user = { uid: "builder" }; mocks.profile = { role: "builder" };
    render(<LoginForm />);
    expect(mocks.replace).toHaveBeenCalledWith("/builder");
  });
});

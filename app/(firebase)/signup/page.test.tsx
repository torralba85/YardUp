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
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("builder auth in store shells", () => {
  it.each([
    ["signup", SignupPage],
    ["login", LoginForm],
  ])("hides Apple and names only Google by default on %s", (_surface, Surface) => {
    render(<Surface />);
    expect(screen.queryByRole("button", { name: "Apple" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Apple/)).not.toBeInTheDocument();
    const agreement = screen.getByRole("checkbox");
    expect(agreement).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Google" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Google" })).toHaveAccessibleDescription(/confirmation above to enable Google (sign-in|account creation)\.$/i);
    fireEvent.click(agreement);
    expect(screen.getByRole("button", { name: "Google" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Google" })).toHaveAccessibleDescription(/^Google (sign-in|account creation) is ready\.$/);
    expect(mocks.google).not.toHaveBeenCalled();
  });

  it.each([
    ["signup", SignupPage],
    ["login", LoginForm],
  ])("explains required social consent for both providers on %s when Apple is enabled", (_surface, Surface) => {
    vi.stubEnv("NEXT_PUBLIC_APPLE_SIGN_IN", "true");
    render(<Surface />);
    const agreement = screen.getByRole("checkbox");
    expect(agreement).not.toBeChecked();
    for (const provider of ["Google", "Apple"]) {
      expect(screen.getByRole("button", { name: provider })).toBeDisabled();
      expect(screen.getByRole("button", { name: provider })).toHaveAccessibleDescription(/confirmation above to enable Google or Apple/i);
    }
    fireEvent.click(agreement);
    for (const provider of ["Google", "Apple"]) {
      expect(screen.getByRole("button", { name: provider })).toBeEnabled();
      expect(screen.getByRole("button", { name: provider })).toHaveAccessibleDescription(/^Google and Apple .* are ready\.$/);
    }
    expect(mocks.google).not.toHaveBeenCalled();
    expect(mocks.apple).not.toHaveBeenCalled();
  });

  it.each(["email", "Google", "Apple"])("ignores the builder query for %s signup", async (method) => {
    vi.stubGlobal("LotFoundryNative", { platform: "android" });
    vi.stubEnv("NEXT_PUBLIC_APPLE_SIGN_IN", "true");
    render(<SignupPage />);
    expect(screen.queryByRole("radio", { name: /Builder/ })).not.toBeInTheDocument();
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
    expect(screen.getByRole("radio", { name: /Builder/ })).toBeInTheDocument();
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

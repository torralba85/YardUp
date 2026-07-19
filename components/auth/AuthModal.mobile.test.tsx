import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AuthModal } from "./AuthModal";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signInWithApple: vi.fn().mockResolvedValue(undefined),
    user: null,
  }),
}));

describe("AuthModal mobile input sizing", () => {
  it("keeps auth inputs at 16px on mobile to prevent iOS auto-zoom", () => {
    render(<AuthModal isOpen onClose={() => {}} />);

    expect(screen.getByLabelText("Email")).toHaveClass("text-base", "sm:text-sm");
    expect(screen.getByLabelText("Password")).toHaveClass("text-base", "sm:text-sm");

    fireEvent.click(screen.getByRole("button", { name: /don't have an account/i }));

    expect(screen.getByLabelText("Name")).toHaveClass("text-base", "sm:text-sm");
  });
});

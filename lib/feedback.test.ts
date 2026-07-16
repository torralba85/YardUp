import { describe, expect, it } from "vitest";
import { isFeedbackHoneypotTripped, validateFeedback } from "./feedback";

describe("validateFeedback", () => {
  it("accepts a normal report and normalizes optional fields", () => {
    expect(
      validateFeedback({ category: "bug", message: "Map is blank", company: "" }),
    ).toEqual({
      ok: true,
      value: { category: "bug", message: "Map is blank", email: null, page: null },
    });
  });

  it("rejects a too-short message", () => {
    expect(validateFeedback({ category: "bug", message: "x", company: "" })).toEqual({
      ok: false,
      error: "Tell us a little more (at least 10 characters).",
    });
  });

  it("rejects an unknown category", () => {
    expect(validateFeedback({ category: "rant", message: "Long enough message." })).toEqual({
      ok: false,
      error: "Pick a feedback category.",
    });
  });

  it("rejects a malformed reply email but allows a blank one", () => {
    expect(
      validateFeedback({ category: "idea", message: "Long enough message.", email: "nope" }),
    ).toEqual({
      ok: false,
      error: "Enter a valid email address, or leave it blank.",
    });
    expect(
      validateFeedback({ category: "idea", message: "Long enough message.", email: " " }),
    ).toMatchObject({ ok: true });
  });

  it("keeps a valid email and truncates the page path", () => {
    const result = validateFeedback({
      category: "data",
      message: "Zoning for my lot looks wrong.",
      email: "owner@example.com",
      page: `/studio?${"x".repeat(400)}`,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("owner@example.com");
      expect(result.value.page?.length).toBe(200);
    }
  });
});

describe("isFeedbackHoneypotTripped", () => {
  it("flags a filled company field and ignores an empty one", () => {
    expect(isFeedbackHoneypotTripped({ company: "Acme" })).toBe(true);
    expect(isFeedbackHoneypotTripped({ company: "" })).toBe(false);
    expect(isFeedbackHoneypotTripped({})).toBe(false);
  });
});

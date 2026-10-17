import { describe, expect, it } from "vitest";
import { isPlainPlaceText } from "./scenario-email";

describe("isPlainPlaceText", () => {
  it.each([
    "141 N Almaden Blvd",
    "18595 Del Monte Ave",
    "12 O'Neil & Main St.",
    "1234 Oak Street #5, Unit B",
    "100 N. Main St, St. Louis",
    "San Jose, CA",
    "HUD FMR · San Jose, CA · 1 bed",
  ])("accepts the real place label %j", (value) => {
    expect(isPlainPlaceText(value, 160)).toBe(true);
  });

  it.each([
    ["an empty label", "   "],
    ["a URL", "Refund at https://evil.test/claim"],
    ["a www host", "go to www.evil.test"],
    ["a bare domain", "see evil-site.com today"],
    ["an email address", "write help@evil.test"],
    ["a line break", "123 Main St\nCall now"],
    ["markup", "<b>123 Main St</b>"],
  ])("rejects %s", (_label, value) => {
    expect(isPlainPlaceText(value, 160)).toBe(false);
  });

  it("enforces the length cap after trimming", () => {
    expect(isPlainPlaceText(`  ${"1".repeat(120)}  `, 120)).toBe(true);
    expect(isPlainPlaceText("1".repeat(121), 120)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { getSafeCitationHref } from "./safe-url";

describe("getSafeCitationHref", () => {
  it("allows absolute http and https URLs", () => {
    expect(getSafeCitationHref("https://www.seattle.gov/sdci")).toBe(
      "https://www.seattle.gov/sdci",
    );
    expect(getSafeCitationHref("http://example.com")).toBe("http://example.com/");
  });

  it("rejects unsafe and non-web URL schemes", () => {
    expect(getSafeCitationHref("javascript:alert(1)")).toBeNull();
    expect(getSafeCitationHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(getSafeCitationHref("mailto:test@example.com")).toBeNull();
    expect(getSafeCitationHref("tel:+15555555555")).toBeNull();
    expect(getSafeCitationHref("/relative-path")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { initialsFor } from "./initials";

describe("initialsFor", () => {
  it("skips punctuation-only and quoted words instead of rendering a quote mark", () => {
    expect(initialsFor('A "Cookie" T')).toBe("AT");
    expect(initialsFor("A “Cookie” T")).toBe("AT");
  });

  it("uses first and last name letters, in any script", () => {
    expect(initialsFor("Jane Q Owner")).toBe("JO");
    expect(initialsFor("émile zoë")).toBe("ÉZ");
    expect(initialsFor("owner")).toBe("O");
  });

  it("falls back when there is no letter to use", () => {
    expect(initialsFor("")).toBe("U");
    expect(initialsFor(null)).toBe("U");
    expect(initialsFor("123 —")).toBe("U");
  });
});

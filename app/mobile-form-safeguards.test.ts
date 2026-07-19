import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./mobile-form-safeguards.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

describe("mobile form safeguards", () => {
  it("loads after global styles and enforces a 16px mobile text-control floor", () => {
    expect(layout.indexOf('import "./mobile-form-safeguards.css"')).toBeGreaterThan(
      layout.indexOf('import "./globals.css"'),
    );
    expect(css).toContain("@media (max-width: 639px)");
    expect(css).toContain("font-size: 1rem !important");
    expect(css).toContain("select,");
    expect(css).toContain("textarea");
  });

  it("does not resize non-text input controls", () => {
    for (const type of [
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit",
    ]) {
      expect(css).toContain(`:not([type="${type}"])`);
    }
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/mobile-form-safeguards.css"), "utf8");
const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");

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

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CTAButton } from "./CTAButton";

describe("CTAButton", () => {
  it("keeps motion-only focus attributes out of the server HTML", () => {
    const html = renderToString(<CTAButton href="/studio">Check my address</CTAButton>);

    expect(html).toContain('href="/studio"');
    expect(html).not.toMatch(/\stabindex=/i);
  });
});

import { describe, expect, it } from "vitest";
import { sampleCertificateResponse } from "./sample-certificate";
import { landingDemos, type LandingCity } from "./landing-demo";

describe("public sample Certificate", () => {
  it.each(Object.keys(landingDemos) as LandingCity[])("renders the actual %s report with paid planning sections and no indexing", async (city) => {
    const response = sampleCertificateResponse(city);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'self'");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    const html = await response.text();
    expect(html).toContain(`fictional ${landingDemos[city].city} demo`);
    expect(html).toContain("Hard &amp; Soft Cost Allowances");
    expect(html).toContain("Soft-cost allowance");
    expect(html).toContain("HELOC");
    expect(html).toContain("Recommended Next Steps");
    expect(html).toContain("Print menu");
    expect(html).not.toContain("<script");
  });
});

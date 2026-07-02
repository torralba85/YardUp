import { describe, expect, it } from "vitest";
import { certificateKey } from "./certificate-key";

describe("certificateKey", () => {
  it("derives a stable, url-safe slug from the address and city", () => {
    const key = certificateKey({ address: "413 Elmwood Ave", city: "Seattle" });
    expect(key).toBe("413-elmwood-ave-seattle");
  });

  it("is stable regardless of surrounding whitespace and case", () => {
    const a = certificateKey({ address: "  413 Elmwood Ave ", city: "Seattle" });
    const b = certificateKey({ address: "413 ELMWOOD AVE", city: "  seattle" });
    expect(a).toBe(b);
  });

  it("collapses punctuation and repeated separators", () => {
    const key = certificateKey({ address: "1234 Oak St., #2", city: "Portland" });
    expect(key).toBe("1234-oak-st-2-portland");
  });

  it("does not start or end with a separator", () => {
    const key = certificateKey({ address: "!!! Main !!!", city: "Austin" });
    expect(key.startsWith("-")).toBe(false);
    expect(key.endsWith("-")).toBe(false);
  });

  it("falls back to a non-empty key when the address is empty", () => {
    const key = certificateKey({ address: "", city: "" });
    expect(key.length).toBeGreaterThan(0);
  });
});

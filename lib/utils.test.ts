import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("resolves the design-system radius token against built-in radii", () => {
    expect(cn("rounded-control", "rounded-none")).toBe("rounded-none");
    expect(cn("rounded-none", "rounded-control")).toBe("rounded-control");
    expect(cn("rounded-control", "rounded-full")).toBe("rounded-full");
  });

  it("resolves the hard elevation tokens against each other and shadow-none", () => {
    expect(cn("shadow-card", "shadow-none")).toBe("shadow-none");
    expect(cn("shadow-paper", "shadow-overlay")).toBe("shadow-overlay");
    expect(cn("shadow-paper-sm", "shadow-callout")).toBe("shadow-callout");
  });

  it("keeps colour tokens separate from type sizes", () => {
    expect(cn("text-lot-ink", "text-sm")).toBe("text-lot-ink text-sm");
    expect(cn("bg-lot-chalk", "bg-lot-surface")).toBe("bg-lot-surface");
  });
});

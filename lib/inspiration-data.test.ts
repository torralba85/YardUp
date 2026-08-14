import { describe, expect, it } from "vitest";
import { inspirationItems } from "./inspiration-data";

describe("inspiration data layer", () => {
  it("contains all 6 templates", () => {
    expect(inspirationItems.length).toBe(6);
  });

  it("verifies properties are correctly typed", () => {
    const item = inspirationItems[0];
    expect(item.id).toBe("canyon-courtyard");
    expect(item.sqft).toBe(640);
    expect(item.roof).toBe("shed");
    expect(item.finish).toBe("cedar");
    expect(item.imagePath).toBe("/inspiration/canyon-courtyard.webp");
  });
});

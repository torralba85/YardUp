import { describe, expect, it } from "vitest";
import {
  BID_CHECKLIST_PREVIEW_COUNT,
  BID_LEVELING_BUILDERS,
  BID_LEVELING_CHECKLIST,
  SCOPE_CHECKLIST,
} from "./certificate-bid-checklist";

describe("scope checklist (builder RFQ sheet)", () => {
  it("lists 12 distinct scope items with a question for each builder", () => {
    expect(SCOPE_CHECKLIST).toBe(BID_LEVELING_CHECKLIST);
    expect(SCOPE_CHECKLIST).toHaveLength(12);
    expect(new Set(SCOPE_CHECKLIST.map((item) => item.id)).size).toBe(12);
    for (const item of SCOPE_CHECKLIST) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.ask).toMatch(/\?$/);
      expect(item).not.toHaveProperty("verdict");
      expect(item.title).not.toMatch(/overpriced|below market|fair price/i);
      expect(item.ask).not.toMatch(/overpriced|below market|fair price/i);
    }
  });

  it("previews design and permit fees before purchase and compares three builders", () => {
    expect(BID_CHECKLIST_PREVIEW_COUNT).toBe(2);
    expect(BID_LEVELING_CHECKLIST.slice(0, BID_CHECKLIST_PREVIEW_COUNT).map((item) => item.id)).toEqual([
      "design",
      "permits",
    ]);
    expect(BID_LEVELING_BUILDERS).toEqual(["Builder A", "Builder B", "Builder C"]);
  });

  it("covers the trenching, Title 24 and site-work exclusions quotes most often hide", () => {
    const titles = BID_LEVELING_CHECKLIST.map((item) => item.title).join(" | ");
    expect(titles).toMatch(/trenching/i);
    expect(titles).toMatch(/Title 24/);
    expect(titles).toMatch(/grading/i);
  });
});

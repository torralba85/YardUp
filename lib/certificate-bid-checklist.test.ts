import { describe, expect, it } from "vitest";
import {
  BID_CHECKLIST_PREVIEW_COUNT,
  BID_LEVELING_BUILDERS,
  BID_LEVELING_CHECKLIST,
} from "./certificate-bid-checklist";

describe("bid-leveling checklist", () => {
  it("lists 12 distinct scope items with a question for each builder", () => {
    expect(BID_LEVELING_CHECKLIST).toHaveLength(12);
    expect(new Set(BID_LEVELING_CHECKLIST.map((item) => item.id)).size).toBe(12);
    for (const item of BID_LEVELING_CHECKLIST) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.ask).toMatch(/\?$/);
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

import { describe, expect, it } from "vitest";
import { sanJose } from "./san-jose";

// Facts read in Chrome on 2026-11-03 from Bulletin 210 (updated 09/16/2026),
// the City's ADU FAQs and Preapproved ADUs pages, and HCD's ADU Handbook
// (March 2026). Update the guide and these together.
describe("San José guide facts", () => {
  const fees = [
    ...sanJose.introAnswer,
    ...sanJose.fees.paragraphs,
    ...(sanJose.fees.bullets ?? []),
    ...sanJose.faqs.map(({ answer }) => answer),
  ].join(" ");

  it("states the checklist's fee line and the school district's separate say", () => {
    // Bulletin 210 item 17: 750 sq ft or less, no impact fees; 751 or larger, school and parkland fees.
    expect(fees).toContain("750 square feet or less pays no school or parkland impact fees");
    expect(fees).toContain("751 square feet or more pays both");
    // HCD handbook: districts may levy school fees above 500 sq ft of interior livable space.
    expect(fees).toContain("over 500 square feet");
    // The FAQ's wording ("less than 750") differs at exactly 750.
    expect(fees).toContain("confirm a design of exactly 750");
  });

  it("keeps JADU occupancy and rental terms to State law", () => {
    const rentals = sanJose.glance.find(({ label }) => label === "Renting and selling")!;
    expect(rentals.value).toContain("at least 30 days");
    expect(rentals.value).toContain("JADU rentals longer than 30 days");
    expect(rentals.note).toContain("shares sanitation");
    expect(rentals.note).toContain("§66333");
  });

  it("names the current pre-approved plan range and the same-day exceptions", () => {
    const answer = sanJose.faqs.find(({ question }) => question.includes("pre-approved"))!.answer;
    expect(answer).toContain("476 to 991 square feet");
    expect(answer).toContain("can take longer");
  });

  it("carries the Municipal Code's 800 sq ft protection and legalization paths", () => {
    // §20.80.175(D)(3)(a), (D)(5)(e): the front setback and 40% rear-yard limit cannot block an 800 sq ft ADU.
    const siting = sanJose.glance.find(({ label }) => label === "Where a detached ADU sits")!;
    expect(siting.value).toContain("45 ft from the front property line with a 4 ft interior side setback");
    expect(siting.note).toContain("800 sq ft ADU");
    const legalize = sanJose.cityDiffers.flatMap(({ paragraphs }) => paragraphs).join(" ");
    expect(legalize).toContain("§20.80.179");
    expect(legalize).toContain("AB 2533");
    expect(legalize).toContain("Under City standards, on a lot of half an acre or more");
    expect(legalize).toContain("This City-standard setback does not apply to State-standard ADUs.");
  });

  it("keeps internal review notes out of the public copy", () => {
    const copy = JSON.stringify({ ...sanJose, sources: [] });
    expect(copy).not.toContain("Source check");
    expect(copy).not.toContain("previously reviewed");
  });
});

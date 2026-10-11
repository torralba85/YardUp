import { describe, expect, it } from "vitest";
import {
  buildPassages,
  hasLocalSources,
  PassageIndex,
  sourcesForGuide,
  tokenize,
  VAULT_DOCUMENTS,
  type SourceDocument,
} from "./guide-claim-sources";

const HEADER = "San Diego Municipal Code (9-2026)";

/** Four pages with a running header and footer, like pdftotext output. */
const SDMC: SourceDocument = {
  id: "sdmc",
  label: "SDMC",
  text: [
    `${HEADER}\n(8) Height.\n(A) Detached ADU structures shall not exceed two stories.\n1`,
    `${HEADER}\n(9) Setbacks.\n(A) The front yard setback of an ADU shall be consistent with the base zone.\n(C) Interior side yard and rear yard setbacks for ADU structures with a structure height of 16 feet or less shall be provided as follows:\n2`,
    `${HEADER}\n(i) Outside a High or Very High Fire Hazard Severity Zone, there is no minimum interior side yard and rear yard setback.\n(10) Parking.\n(A) No off-street parking spaces are required for ADUs.\n3`,
    `${HEADER}\n(11) Fees.\n(A) Impact fees apply as provided in Chapter 14.\n4`,
  ].join("\f"),
};

describe("buildPassages", () => {
  it("drops running headers and bare page numbers", () => {
    const text = buildPassages(SDMC).map((passage) => passage.text).join("\n");
    expect(text).not.toContain(HEADER);
    expect(text).not.toMatch(/^\d$/m);
    expect(text).toContain("two stories");
  });

  it("drops a footer whose page number changes", () => {
    const clauses = ["Height is capped.", "Setbacks vary.", "Parking is waived.", "Fees apply."];
    const pages = clauses.map((clause, n) => `${clause}\nCh. Art. Div. 14 1 3 ${n + 5}`);
    const text = buildPassages({ id: "d", label: "D", text: pages.join("\f") })
      .map((passage) => passage.text)
      .join("\n");
    expect(text).not.toContain("Ch. Art. Div.");
    expect(text).toContain("Parking is waived.");
  });

  it("records the page of each passage's first line", () => {
    const passages = buildPassages(SDMC, 120);
    const parking = passages.find((passage) => passage.text.startsWith("(10) Parking."));
    expect(parking?.page).toBe(3);
  });

  it("overlaps windows so a clause split across a page break stays whole somewhere", () => {
    const passages = buildPassages(SDMC, 400);
    expect(
      passages.some(
        (passage) =>
          passage.text.includes("16 feet or less") && passage.text.includes("no minimum interior side"),
      ),
    ).toBe(true);
    for (let index = 1; index < passages.length; index += 1) {
      expect(passages[index].lines[0]).toBeGreaterThan(passages[index - 1].lines[0]);
      expect(passages[index].lines[0]).toBeLessThanOrEqual(passages[index - 1].lines[1] + 1);
    }
  });

  it("keeps a line longer than the window as its own passage", () => {
    const long = "x".repeat(50);
    const passages = buildPassages({ id: "d", label: "D", text: `${long}\nshort` }, 20);
    expect(passages[0].text).toBe(long);
    expect(passages.at(-1)?.text).toBe("short");
  });

  it("returns nothing for an empty document", () => {
    expect(buildPassages({ id: "d", label: "D", text: "" })).toEqual([]);
  });
});

describe("tokenize", () => {
  it("normalizes units and thousands separators", () => {
    expect(tokenize("Up to 1,200 sq ft, 16 ft tall")).toEqual(["1200", "sqft", "16", "feet", "tall"]);
    expect(tokenize("1200 square feet; 16 feet")).toEqual(["1200", "sqft", "16", "feet"]);
  });

  it("drops stopwords and clause letters but keeps single digits", () => {
    expect(tokenize("(C) The setback is 4 feet")).toEqual(["setback", "4", "feet"]);
  });
});

describe("PassageIndex", () => {
  const passages = buildPassages(SDMC, 260);
  const index = new PassageIndex(passages);

  it("ranks the clause that matches the claim's terms first", () => {
    const [top] = index.search("Rear and side setbacks: 0 ft up to 16 ft tall", 3);
    expect(top.text).toContain("16 feet or less");
  });

  it("finds parking text for a parking claim", () => {
    const [top] = index.search("Parking required: generally none", 1);
    expect(top.text).toContain("No off-street parking");
  });

  it("skips windows that mostly repeat a better-ranked one", () => {
    const results = index.search("setback setbacks yard", 3);
    for (let a = 0; a < results.length; a += 1) {
      for (let b = a + 1; b < results.length; b += 1) {
        const [a0, a1] = results[a].lines;
        const [b0, b1] = results[b].lines;
        const shared = Math.min(a1, b1) - Math.max(a0, b0) + 1;
        expect(shared / Math.min(a1 - a0 + 1, b1 - b0 + 1)).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("returns nothing when no term matches", () => {
    expect(index.search("swimming pool cabana", 3)).toEqual([]);
  });
});

describe("guide source manifest", () => {
  it("checks San Diego against its code, bulletins and the state handbook", () => {
    expect(sourcesForGuide("san-diego")).toHaveLength(4);
    expect(hasLocalSources("san-diego")).toBe(true);
    expect(hasLocalSources("san-diego/cost")).toBe(true);
  });

  it("falls back to the state handbook for guides without city sources", () => {
    expect(sourcesForGuide("carlsbad")).toEqual(sourcesForGuide("ca"));
    expect(hasLocalSources("carlsbad")).toBe(false);
    expect(hasLocalSources("ca")).toBe(false);
  });

  it("labels every document a guide uses", () => {
    for (const guide of ["ca", "san-diego", "san-diego/cost", "oceanside"]) {
      for (const id of sourcesForGuide(guide)) expect(VAULT_DOCUMENTS[id]).toBeTruthy();
    }
  });
});

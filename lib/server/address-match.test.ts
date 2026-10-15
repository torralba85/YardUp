import { describe, expect, it } from "vitest";
import {
  type SitusFieldNames,
  compareSitus,
  delimitStreetAddress,
  enrichStreetAddress,
  normalizeCity,
  parseStreetAddress,
  parseStreetAddressWithConfidence,
  readSitusRecord,
  situsOutFields,
} from "./address-match";

/** The field names of King County's address-enriched parcel layer. */
const KING_FIELDS: SitusFieldNames = {
  id: "PIN",
  line: "ADDR_FULL",
  cities: ["CTYNAME", "POSTALCTYNAME"],
  zip: "ZIP5",
  state: "STATE_ABBR",
  area: "Shape__Area",
};

function situs(overrides: Record<string, unknown> = {}) {
  const record = readSitusRecord(
    {
      PIN: "8562901005",
      ADDR_FULL: "1421 NE 88TH ST",
      CTYNAME: "SEATTLE",
      POSTALCTYNAME: "SEATTLE",
      ZIP5: "98115",
      STATE_ABBR: "WA",
      ...overrides,
    },
    KING_FIELDS,
  );
  if (!record) throw new Error("fixture must publish identity and situs");
  return record;
}

const SEARCH = parseStreetAddress("1421 NE 88th St, Seattle, WA 98115, USA");
if (!SEARCH) throw new Error("fixture must parse");

describe("parseStreetAddress", () => {
  it("retains reliable house/state/ZIP components without guessing an ambiguous street boundary", () => {
    const parsed = parseStreetAddressWithConfidence("10 Old Court Road Somewhere, California 92101");
    expect(parsed?.confidence).toEqual({ houseNumber: true, street: false, city: false, state: true, zip: true });
    expect(parsed?.address).toMatchObject({ houseNumber: "10", state: "CA", zip: "92101" });
    expect(parseStreetAddress("10 Old Court Road Somewhere, California 92101")).toBeNull();
  });

  it("preserves a bare street's postdirectional rather than reading NE as Nebraska", () => {
    expect(parseStreetAddress("123 Main St NE")).toEqual({ houseNumber: "123", street: "MAIN ST NE" });
  });

  it.each(["123 Main St NE, 98115", "123 Main St NE 98115", "123 Main St NE 98115-1234"])(
    "preserves a postdirectional before a ZIP in %s", (query) => {
      expect(parseStreetAddress(query)).toEqual({ houseNumber: "123", street: "MAIN ST NE", zip: "98115" });
    },
  );

  it("keeps an explicitly separated Nebraska state with a ZIP", () => {
    expect(parseStreetAddress("123 Main St, NE 68508")).toEqual({ houseNumber: "123", street: "MAIN ST", state: "NE", zip: "68508" });
  });

  it("normalizes multiword states and separately entered ZIP/country components", () => {
    expect(parseStreetAddress("12 Oak St, Charleston West Virginia, 25301, United States")).toEqual({
      houseNumber: "12", street: "OAK ST", city: "CHARLESTON", state: "WV", zip: "25301",
    });
    expect(delimitStreetAddress("202 C Street, San Diego California 92101, USA"))
      .toBe("202 C Street, San Diego, CA 92101, USA");
  });
  it.each([
    "202 C Street San Diego, CA 92101",
    "202 C Street, San Diego CA 92101",
    "202 C Street, San Diego, California 92101",
    "202 C Street San Diego California 92101",
  ])("normalizes partially separated components in %s", (input) => {
    const parsed = parseStreetAddress(input);
    expect(parsed).toEqual({
      houseNumber: "202", street: "C ST", city: "SAN DIEGO", state: "CA", zip: "92101",
    });
    expect(compareSitus(parsed!, {
      line: "202 C ST", cities: ["San Diego"], state: "CA", zip: "92101",
    })).toEqual({ verdict: "match", localityConfirmed: true });
  });
  it("reads a complete address typed without commas", () => {
    expect(parseStreetAddress("202 C Street San Diego CA 92101")).toEqual({ houseNumber: "202", street: "C ST", city: "SAN DIEGO", state: "CA", zip: "92101" });
    expect(parseStreetAddress("1421 NE 88th St Seattle WA 98115")).toEqual(SEARCH);
    expect(parseStreetAddress("123 Main Street North Bend WA 98045")?.city).toBe("NORTH BEND");
  });
  it("does not guess the street/city boundary when several suffixes could end the street", () => {
    expect(parseStreetAddress("10 Old Court Road Somewhere WA 98115")?.city).toBeUndefined();
  });
  it("reads a Google-style formatted address", () => {
    expect(SEARCH).toEqual({
      houseNumber: "1421",
      street: "NE 88 ST",
      city: "SEATTLE",
      state: "WA",
      zip: "98115",
    });
  });

  it("normalizes a Nominatim-style address with spelled-out directional and suffix", () => {
    expect(parseStreetAddress("1421 Northeast 88th Street, Seattle, WA 98115")).toEqual(
      SEARCH,
    );
  });

  it("reads state and ZIP given as separate trailing parts", () => {
    expect(parseStreetAddress("1421 NE 88th St, Seattle, WA, 98115")).toEqual(SEARCH);
  });

  it("drops a unit designator and leading zeros from the house number", () => {
    const parsed = parseStreetAddress("01421 NE 88th St Apt 4, Seattle, WA");
    expect(parsed?.houseNumber).toBe("1421");
    expect(parsed?.street).toBe("NE 88 ST");
  });

  it("keeps a house-number letter suffix distinct", () => {
    expect(parseStreetAddress("1245B NE 88th St, Seattle, WA")?.houseNumber).toBe("1245B");
  });

  it("leaves locality unset when the address carries none", () => {
    const parsed = parseStreetAddress("1421 NE 88th St");
    expect(parsed).toEqual({ houseNumber: "1421", street: "NE 88 ST" });
  });

  it("does not read a two-letter word that is not a state as one", () => {
    const parsed = parseStreetAddress("1421 NE 88th St, Seattle, ZZ");
    expect(parsed?.state).toBeUndefined();
    expect(parsed?.city).toBe("ZZ");
  });

  it("refuses text that is not a numbered street line", () => {
    expect(parseStreetAddress("Seattle, WA")).toBeNull();
    expect(parseStreetAddress("Oak Street, Seattle, WA")).toBeNull();
    expect(parseStreetAddress("   ")).toBeNull();
    expect(parseStreetAddress(undefined)).toBeNull();
  });
});

describe("enrichStreetAddress", () => {
  const provider = "202 C Street, San Diego, CA 92101";
  it("fills only missing components after agreement with the entered street and locality", () => {
    expect(enrichStreetAddress("202 C St, California", provider)).toBe("202 C St, San Diego, CA 92101");
    expect(enrichStreetAddress("202 C Street, San Diego, CA 92101", provider)).toBe(provider);
  });
  it("fills locality when the provider only splits a compound street name differently", () => {
    expect(enrichStreetAddress("1515 Goldrush Way, Oceanside", "1515 Gold Rush Way, Oceanside, CA 92057")).toBe(
      "1515 Goldrush Way, Oceanside, CA 92057",
    );
  });
  it.each([
    "203 C Street", "202 D Street", "202 C Street, Chula Vista",
    "202 C Street, Nevada", "202 C Street, 92102", "202 C San Diego",
  ])("keeps conflicting or ambiguous input unchanged: %s", (input) => {
    expect(enrichStreetAddress(input, provider)).toBe(input);
  });
});

describe("normalizeCity", () => {
  it("folds case, punctuation, and Saint/Mount/Fort", () => {
    expect(normalizeCity("St. Louis")).toBe("ST LOUIS");
    expect(normalizeCity("Saint Louis")).toBe("ST LOUIS");
    expect(normalizeCity("mount  vernon")).toBe("MT VERNON");
  });
});

describe("situsOutFields", () => {
  it("requests exactly the allowlisted attributes, never a wildcard", () => {
    expect(situsOutFields(KING_FIELDS)).toBe(
      "PIN,ADDR_FULL,CTYNAME,POSTALCTYNAME,ZIP5,STATE_ABBR,Shape__Area",
    );
  });

  it("omits optional fields a layer does not have and never repeats one", () => {
    expect(
      situsOutFields({ id: "APN", line: "SITUS", cities: ["CITY", "CITY"] }),
    ).toBe("APN,SITUS,CITY");
  });
});

describe("readSitusRecord", () => {
  it("reads identity, situs line, every city-like value, ZIP, and state", () => {
    expect(
      readSitusRecord(
        {
          pin: 6401670000,
          addr_full: " 1421 NE 88TH ST ",
          CTYNAME: "SEATTLE",
          POSTALCTYNAME: "SHORELINE",
          zip5: "98115-1234",
          STATE_ABBR: "wa",
        },
        KING_FIELDS,
      ),
    ).toEqual({
      id: "6401670000",
      line: "1421 NE 88TH ST",
      cities: ["SEATTLE", "SHORELINE"],
      zip: "98115",
      state: "WA",
    });
  });

  it("surfaces only the allowlisted attributes, even if a server sends more", () => {
    const record = readSitusRecord(
      {
        PIN: "1",
        ADDR_FULL: "1421 NE 88TH ST",
        // A server that ignored `outFields` must not leak owner data through us.
        TAXPAYER_NAME: "SOMEONE",
        MAILADDR: "PO BOX 1",
      },
      KING_FIELDS,
    );
    expect(record).toEqual({ id: "1", line: "1421 NE 88TH ST", cities: [] });
    expect(JSON.stringify(record)).not.toMatch(/SOMEONE|PO BOX/);
  });

  it("does not treat the lot-area attribute as part of the address record", () => {
    const record = readSitusRecord(
      { PIN: "1", ADDR_FULL: "1421 NE 88TH ST", Shape__Area: 5155.45 },
      KING_FIELDS,
    );
    expect(record).toEqual({ id: "1", line: "1421 NE 88TH ST", cities: [] });
  });

  it("needs both an official identifier and a situs street line", () => {
    expect(readSitusRecord({ ADDR_FULL: "1421 NE 88TH ST" }, KING_FIELDS)).toBeNull();
    expect(readSitusRecord({ PIN: "1" }, KING_FIELDS)).toBeNull();
    expect(readSitusRecord({ PIN: 0, ADDR_FULL: "1421 NE 88TH ST" }, KING_FIELDS)).toBeNull();
    expect(readSitusRecord({ PIN: "  ", ADDR_FULL: "1421 NE 88TH ST" }, KING_FIELDS)).toBeNull();
    expect(readSitusRecord(undefined, KING_FIELDS)).toBeNull();
  });

  it("does not guess at fields the layer did not name", () => {
    // A situs-looking attribute the config does not list is not read.
    expect(
      readSitusRecord({ PIN: "1", SITUS_ADDRESS: "1421 NE 88TH ST" }, KING_FIELDS),
    ).toBeNull();
  });

  it("ignores a state that is not a state", () => {
    expect(situs({ STATE_ABBR: "??" }).state).toBeUndefined();
  });
});

describe("compareSitus", () => {
  it("matches an equal street line and confirms locality from the layer's city and ZIP", () => {
    expect(compareSitus(SEARCH, situs())).toEqual({
      verdict: "match",
      localityConfirmed: true,
    });
  });

  it("treats spelling variants of the same street as equal", () => {
    expect(compareSitus(SEARCH, situs({ ADDR_FULL: "1421 NORTHEAST 88TH STREET" })).verdict).toBe(
      "match",
    );
    expect(compareSitus(SEARCH, situs({ ADDR_FULL: "1421 NE 88 ST" })).verdict).toBe("match");
    expect(compareSitus(SEARCH, situs({ ADDR_FULL: "1421 NE 88TH ST #B" })).verdict).toBe(
      "match",
    );
  });

  it("treats a compound street name split differently by two sources as one street", () => {
    // San Diego County publishes GOLDRUSH WAY; OSM and the Census publish GOLD RUSH WAY.
    const searched = parseStreetAddress("1515 Gold Rush Way, Oceanside, CA 92057")!;
    expect(compareSitus(searched, { line: "1515 GOLDRUSH WAY", cities: ["OCEANSIDE"], zip: "92057" })).toEqual({
      verdict: "match",
      localityConfirmed: true,
    });
    expect(compareSitus(searched, { line: "1515 GOLDEN RUSH WAY", cities: [] }).verdict).toBe(
      "different-address",
    );
  });

  it.each([
    ["a different house number", "1423 NE 88TH ST"],
    ["a house-number letter suffix", "1421B NE 88TH ST"],
    ["a different directional", "1421 NW 88TH ST"],
    ["a different street number", "1421 NE 89TH ST"],
    ["a different street type", "1421 NE 88TH AVE"],
    ["a different street name", "1421 NE 88TH PL"],
    ["a line that is not a numbered street", "NE 88TH ST"],
  ])("rejects %s as a different address", (_label, line) => {
    expect(compareSitus(SEARCH, situs({ ADDR_FULL: line })).verdict).toBe(
      "different-address",
    );
  });

  it("does not match the audit's point parcel to the searched address", () => {
    // The parcel the audit point falls on is officially 1245B, not 1421.
    expect(
      compareSitus(SEARCH, situs({ PIN: "6401670000", ADDR_FULL: "1245B NE 88TH ST" })).verdict,
    ).toBe("different-address");
  });

  it("flags the same street line in another city, ZIP, or state as a conflict, never a match", () => {
    expect(compareSitus(SEARCH, situs({ CTYNAME: "SHORELINE", POSTALCTYNAME: "SHORELINE" })).verdict).toBe(
      "locality-conflict",
    );
    expect(compareSitus(SEARCH, situs({ ZIP5: "98125" })).verdict).toBe("locality-conflict");
    expect(compareSitus(SEARCH, situs({ STATE_ABBR: "OR" })).verdict).toBe("locality-conflict");
  });

  it("accepts a city that matches any one of the layer's city-like values", () => {
    expect(
      compareSitus(SEARCH, situs({ CTYNAME: "UNINCORPORATED", POSTALCTYNAME: "SEATTLE" })).verdict,
    ).toBe("match");
  });

  it("matches without confirmation when the layer publishes neither city nor ZIP", () => {
    const bare = readSitusRecord({ PIN: "1", ADDR_FULL: "1421 NE 88TH ST" }, KING_FIELDS);
    expect(bare).not.toBeNull();
    expect(compareSitus(SEARCH, bare!)).toEqual({
      verdict: "match",
      localityConfirmed: false,
    });
  });

  it("does not count a matching state alone as confirming the locality", () => {
    const stateOnly = readSitusRecord(
      { PIN: "1", ADDR_FULL: "1421 NE 88TH ST", STATE_ABBR: "WA" },
      KING_FIELDS,
    );
    expect(compareSitus(SEARCH, stateOnly!)).toEqual({
      verdict: "match",
      localityConfirmed: false,
    });
  });
});

// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { propertyRecords } from "./realie";
const fetcher = vi.fn();
const property = {
  address: "100 Main St",
  city: "Austin",
  state: "TX",
  latitude: 30,
  longitude: -97,
  assessments: [
    { taxYear: 2025, taxValue: 1100 },
    { taxYear: 2024, taxValue: 1000 },
  ],
  transfers: [
    {
      transferDate: "2024-05-01",
      transferDocNum: "Doc-1",
      multiParcel: true,
      transferPrice: 250000,
    },
  ],
  ownerName: "Omitted owner",
};
beforeEach(() => {
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
  vi.stubEnv("REALIE_API_KEY", "test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("reports tax changes and package transfers without leaking the raw record", async () => {
  fetcher.mockResolvedValue(Response.json({ property }));
  const result = JSON.stringify(
    await propertyRecords(property.address, "Austin, TX", "TX", false),
  );
  expect(result).toContain("Change from prior year $100");
  expect(result).toContain("Price covers multiple parcels");
  expect(result).not.toContain(property.ownerName);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("stops before comparables when the returned property is in another city", async () => {
  fetcher.mockResolvedValue(
    Response.json({ property: { ...property, city: "Dallas" } }),
  );
  expect(
    await propertyRecords(property.address, "Austin, TX", "TX", true),
  ).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("handles nested records and uses the comparable's qualifying sale", async () => {
  fetcher
    .mockResolvedValueOnce(
      Response.json({
        property: {
          ...property,
          city: undefined,
          propertyLocation: { city: "Austin" },
        },
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        comparables: [
          {
            transferDateObject: "2025-02-10T00:00:00Z",
            transferPrice: 222000,
            property: { address: "104 Main St", transferPrice: 999000 },
          },
        ],
      }),
    );
  const result = await propertyRecords(
    property.address,
    "Austin, TX",
    "TX",
    true,
  );
  expect(result[0].lines).toEqual(["104 Main St · 2025-02-10 · $222,000"]);
  expect(fetcher.mock.calls[1][0]).toContain("latitude=30");
});
it("requires the same unit and sends the unit number separately", async () => {
  fetcher.mockResolvedValue(
    Response.json({ property: { ...property, unitNumberStripped: "5" } }),
  );
  expect(
    await propertyRecords("100 Main St, Apt 4", "Austin, TX", "TX", false),
  ).toEqual([]);
  expect(fetcher.mock.calls[0][0]).toContain("unitNumberStripped=4");
});

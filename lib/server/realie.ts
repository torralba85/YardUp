import { compareSitus, parseStreetAddress } from "./address-match";
import { stripUnitDesignators } from "./geocode-query";

type Row = Record<string, unknown>;
const row = (value: unknown): Row =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? value.map(row) : [];
const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const money = (value: unknown) =>
  num(value) === undefined ? "" : usd.format(value as number);
const details = (...parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(" · ");

// Common residential and deed classifications from Realie's Property Feature Field Key.
const useLabels: Record<string, string> = {
  "1001": "Single-family residence",
  "1002": "Townhouse",
  "1004": "Condominium unit",
  "1006": "Manufactured home",
  "1021": "Tiny house",
  "1022": "Single-family residence with ADU",
  "1023": "Accessory dwelling unit",
  "1024": "Multiple houses on one parcel",
  "1101": "Duplex",
  "1102": "Triplex",
  "1110": "Multifamily dwelling",
};
const deedLabels: Record<string, string> = {
  TT0001: "Warranty deed",
  TT0002: "Deed",
  TT0003: "Intrafamily transfer or dissolution",
  TT0004: "Quitclaim deed",
  TT0005: "Grant deed",
  TT0006: "Special warranty deed",
  TT0008: "Bargain and sale deed",
  TT0009: "Trust deed",
  TT0010: "Transfer on death deed",
};

export type RecordSection = { title: string; lines: string[] };

function section(title: string, lines: string[]): RecordSection {
  return { title, lines: Array.from(new Set(lines.filter(Boolean))) };
}

function annualValues(records: Row[], yearKey: string, valueKey: string) {
  const values = new Map<number, number>();
  for (const record of records) {
    const year = num(record[yearKey]);
    const value = num(record[valueKey]);
    if (year && value !== undefined) values.set(year, value);
  }
  return Array.from(values.keys())
    .sort((a, b) => b - a)
    .map((year) => {
      const value = values.get(year)!;
      const prior = values.get(year - 1);
      return details(
        String(year),
        usd.format(value),
        prior !== undefined &&
          `Change from prior year ${usd.format(value - prior)}`,
      );
    });
}

export function historySections(p: Row): RecordSection[] {
  const valuation = row(p.valuationInformation);
  const tax = row(p.taxInformation);
  const flat = rows(p.assessments);
  const assessments = [...rows(p.assessmentHistory), ...flat, valuation, p];
  const taxes = [...flat, p, ...rows(p.taxHistory), tax].map((r) => ({
    year: r.taxYear,
    value: r.taxAmount ?? r.taxValue,
  }));
  const buildings = rows(row(p.buildingInformation).buildings);
  const acres = num(row(p.landInformation).acres ?? p.acres);
  const use = str(p.useCode ?? row(p.propertyClassification).propertyUseCode);
  const sales = [...rows(p.salesHistory), ...rows(p.transfers)];
  if (!sales.length && p.transferDate) sales.push(p);
  return [
    section("Site and structures", [
      acres !== undefined ? `Lot area ${acres} acres` : "",
      use && `Recorded use: ${useLabels[use] ?? use}`,
      ...(buildings.length ? buildings : [p]).map((b) => {
        const area = num(b.buildingArea);
        const year = num(b.actualYearBuilt ?? b.yearBuilt);
        return details(
          year ? `Built ${year}` : "",
          area !== undefined &&
            `Building area ${area.toLocaleString("en-US")} sq ft`,
          typeof b.garage === "boolean" &&
            (b.garage ? "Garage recorded" : "No garage recorded"),
        );
      }),
    ]),
    section(
      "County assessments",
      assessments.map((r) => {
        const land = money(r.assessedLandValue ?? r.totalLandValue);
        const building = money(r.assessedBuildingValue ?? r.totalBuildingValue);
        const total = money(r.assessedTotalValue ?? r.totalAssessedValue);
        return land || building || total
          ? details(
              String(r.assessmentYear ?? r.assessedYear ?? "Year unavailable"),
              land && `Land ${land}`,
              building && `Buildings ${building}`,
              total && `Total ${total}`,
            )
          : "";
      }),
    ),
    section("Annual property tax", annualValues(taxes, "year", "value")),
    section(
      "Recorded transfers",
      sales.map((r) => {
        const deed = str(r.saleDocumentType ?? r.transferDocType);
        return details(
          str(r.saleDate ?? r.transferDate ?? r.recordingDate),
          money(r.salePrice ?? r.transferPrice) || "Price undisclosed",
          (r.multiParcel === true ||
            r.transferMultiParcel === true ||
            Number(r.parcelCount) > 1) &&
            "Price covers multiple parcels",
          deed && (deedLabels[deed] ?? `Deed type ${deed}`),
          str(r.saleDocumentNumber ?? r.transferDocNum) &&
            `Recorder document ${r.saleDocumentNumber ?? r.transferDocNum}`,
        );
      }),
    ),
    section(
      "Recorded permits",
      rows(p.permits).map((r) =>
        details(
          str(r.issueDate),
          str(r.description ?? r.permitType),
          str(r.permitStatus),
          str(r.permitNumber) && `Permit ${r.permitNumber}`,
          str(r.jurisdiction),
        ),
      ),
    ),
  ].filter((s) => s.lines.length);
}

async function lookup(path: string, params: URLSearchParams) {
  const key = process.env.REALIE_API_KEY;
  if (!key) throw new Error("Realie unavailable");
  const res = await fetch(
    `https://app.realie.ai/api/public/${path}/?${params}`,
    {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    },
  );
  if (res.status === 404 || res.status === 409) return {};
  if (!res.ok) throw new Error("Realie unavailable");
  return row(await res.json());
}

export async function propertyRecords(
  address: string,
  city: string,
  state: string,
  comps: boolean,
) {
  const [firstLine, secondLine = ""] = address
    .split(",")
    .map((part) => part.trim());
  const unitPattern =
    /(?:\b(?:apt|apartment|unit|suite|ste)(?:\.\s*|\s+)#?|#)\s*([a-z0-9-]+)\s*$/i;
  const inlineUnit = unitPattern.exec(firstLine);
  const separateUnit = unitPattern.exec(secondLine);
  const requestedUnit = inlineUnit?.[1] ?? separateUnit?.[1];
  const street = inlineUnit
    ? firstLine.slice(0, inlineUnit.index).trim()
    : firstLine;
  const wanted = parseStreetAddress([street, city].join(", "));
  if (
    !wanted ||
    !/^[A-Z]{2}$/.test(state) ||
    (wanted.state && wanted.state !== state)
  )
    return [];
  const params = new URLSearchParams({ address: street, state });
  if (requestedUnit) params.set("unitNumberStripped", requestedUnit);
  const p = row((await lookup("property/address", params)).property);
  const location = row(p.propertyLocation);
  const line = str(p.address ?? location.address);
  const unit = str(
    location.unitNumberStripped ??
      p.unitNumberStripped ??
      location.unitNumber ??
      p.unitNumber,
  );
  // A building-level street comparison alone cannot distinguish two condo units.
  if (
    unit.toUpperCase() !== (requestedUnit ?? "").toUpperCase() ||
    stripUnitDesignators(street) !== street ||
    stripUnitDesignators(line) !== line
  )
    return [];
  const match = compareSitus(wanted, {
    line,
    cities: [str(location.city ?? p.city)].filter(Boolean),
    state: str(p.state ?? location.state),
    zip: str(p.zipCode ?? location.zipCode ?? p.zip),
  });
  if (
    match.verdict !== "match" ||
    !match.localityConfirmed ||
    str(p.state ?? location.state) !== state
  )
    return [];
  if (!comps) return historySections(p);
  const lat = num(p.latitude),
    lng = num(p.longitude);
  if (
    lat === undefined ||
    lng === undefined ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return [];
  const nearby = await lookup(
    "premium/comparables",
    new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      radius: "1",
      full: "true",
    }),
  );
  const lines = rows(nearby.comparables).flatMap((c) => {
    const other = row(c.property);
    const name = str(other.address ?? c.address);
    const date = str(c.transferDateObject ?? c.transferDate).slice(0, 10);
    const price = money(c.transferPrice);
    if (
      !name ||
      !date ||
      !price ||
      (p.realieParcelId && p.realieParcelId === other.realieParcelId) ||
      name.toUpperCase() === line.toUpperCase()
    )
      return [];
    return [details(name, date, price)];
  });
  return lines.length
    ? [section("Comparable sales within one mile", lines.slice(0, 10))]
    : [];
}

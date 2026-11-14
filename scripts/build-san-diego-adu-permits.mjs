/**
 * Build content/adu/ca/san-diego-permits.json, the aggregate behind the
 * San Diego ADU permit study page, from the City of San Diego's open
 * development-permit data.
 *
 * Usage:
 *   node scripts/build-san-diego-adu-permits.mjs extract
 *     Streams the City's issued-approvals CSV (~580 MB, every year) and keeps
 *     only building approvals that add an ADU or JADU (plus companion-unit
 *     permits filed with no unit count, so the page can say how many the
 *     totals leave out), written to data-src/sd-adu-approvals.ndjson
 *     (gitignored). Permit holders, addresses and APNs are never read, so
 *     no personal field is stored even locally.
 *   node scripts/build-san-diego-adu-permits.mjs aggregate
 *     Joins those rows to the City's community planning area boundaries and
 *     writes aggregate counts only. Shares are withheld for any group with
 *     fewer than MIN_GROUP approvals.
 *
 * Sources:
 *   https://data.sandiego.gov/datasets/development-permits/
 *   https://data.sandiego.gov/datasets/gis-community-planning-districts/ (community planning areas)
 */

import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "data-src");
const APPROVALS_URL =
  "https://seshat.datasd.org/development_permits/approvals_issued_datasd.csv";
const PLAN_AREAS_URL =
  "https://seshat.datasd.org/gis_community_planning_districts/cmty_plan_datasd.geojson";
const EXTRACT = path.join(SRC, "sd-adu-approvals.ndjson");
const PLAN_AREAS = path.join(SRC, "sd-cmty-plan.geojson");
const OUT = path.join(ROOT, "content", "adu", "ca", "san-diego-permits.json");

/** Columns kept from the City file. Holder, address and APN are never read. */
const KEEP = [
  "PROJECT_ID",
  "APPROVAL_ID",
  "APPROVAL_TYPE",
  "APPROVAL_STATUS",
  "APPROVAL_ISSUE_DATE",
  "APPROVAL_ADU_EXTREMELY_LOW",
  "APPROVAL_ADU_VERY_LOW",
  "APPROVAL_ADU_LOW",
  "APPROVAL_ADU_MODERATE",
  "APPROVAL_ADU_ABOVE_MODERATE",
  "APPROVAL_ADU_BONUS",
  "APPROVAL_ADU_TOTAL",
  "APPROVAL_JADU_TOTAL",
  "JOB_BC_CODE_DESCRIPTION",
  "GIS_LATITUDE",
  "GIS_LONGITUDE",
];

/** Building approvals; other approval types (electrical, grading…) repeat the same unit. */
const BUILDING_TYPES = new Set(["Building Permit", "Combination Building Permit"]);

/** The City's building-code class for ADU additions and conversions. */
const COMPANION_UNIT = /Companion Unit/i;

/** Approvals later cancelled or expired are left out of every count. */
const WITHDRAWN = /^(Cancel|Expired)/i;

/** First full year in which the City file carries ADU unit counts. */
const FIRST_YEAR = 2023;

/** Shares are withheld for groups with fewer approvals than this. */
const MIN_GROUP = 10;

/** Display fixes for community planning area names as the City publishes them. */
const AREA_NAMES = {
  "Ncfua Subarea Ii": "NCFUA Subarea II",
  "Reserve Area-Not A Community Plan": "Reserve areas (no community plan)",
};

/** Income tiers whose units carry an affordability restriction. */
const AFFORDABLE_TIERS = ["EXTREMELY_LOW", "VERY_LOW", "LOW", "MODERATE"];

/**
 * Streaming RFC 4180 parser: handles quoted fields, escaped quotes and
 * newlines inside quotes. Calls onRow(fields) for each record.
 */
function csvParser(onRow) {
  let field = "";
  let row = [];
  let quoted = false;
  let pendingQuote = false;
  return {
    write(chunk) {
      for (let i = 0; i < chunk.length; i++) {
        const c = chunk[i];
        if (quoted) {
          if (pendingQuote) {
            pendingQuote = false;
            if (c === '"') {
              field += '"';
              continue;
            }
            quoted = false;
          } else if (c === '"') {
            pendingQuote = true;
            continue;
          } else {
            field += c;
            continue;
          }
        }
        if (c === '"' && field === "") quoted = true;
        else if (c === ",") {
          row.push(field);
          field = "";
        } else if (c === "\n") {
          row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
          onRow(row);
          row = [];
          field = "";
        } else field += c;
      }
    },
    end() {
      if (pendingQuote) quoted = false;
      if (field !== "" || row.length) {
        row.push(field);
        onRow(row);
      }
    },
  };
}

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`${url}: HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        res.setEncoding("utf8");
        resolve(res);
      })
      .on("error", reject);
  });
}

async function extract() {
  fs.mkdirSync(SRC, { recursive: true });
  const out = fs.createWriteStream(EXTRACT);
  let header = null;
  let index = {};
  let rows = 0;
  let kept = 0;
  const parser = csvParser((fields) => {
    if (!header) {
      header = fields.map((name) => name.trim().toUpperCase());
      index = Object.fromEntries(header.map((name, i) => [name, i]));
      const missing = KEEP.filter((name) => !(name in index));
      if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);
      return;
    }
    rows++;
    const adu = Number(fields[index.APPROVAL_ADU_TOTAL]) || 0;
    const jadu = Number(fields[index.APPROVAL_JADU_TOTAL]) || 0;
    const companion = COMPANION_UNIT.test(fields[index.JOB_BC_CODE_DESCRIPTION] ?? "");
    if (adu + jadu <= 0 && !companion) return;
    if (!BUILDING_TYPES.has(fields[index.APPROVAL_TYPE])) return;
    const record = Object.fromEntries(KEEP.map((name) => [name, fields[index[name]]]));
    out.write(`${JSON.stringify(record)}\n`);
    kept++;
  });
  const res = await download(APPROVALS_URL);
  for await (const chunk of res) parser.write(chunk);
  parser.end();
  await new Promise((resolve) => out.end(resolve));
  console.log(JSON.stringify({ rowsScanned: rows, approvalsKept: kept, out: EXTRACT }));
}

/** Ray-casting point-in-polygon over GeoJSON Polygon/MultiPolygon rings. */
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(x, y, rings) {
  if (!inRing(x, y, rings[0])) return false;
  return !rings.slice(1).some((hole) => inRing(x, y, hole));
}

function inGeometry(x, y, geometry) {
  if (geometry.type === "Polygon") return inPolygon(x, y, geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => inPolygon(x, y, polygon));
  }
  return false;
}

function areaName(raw) {
  const name = String(raw ?? "").trim();
  return AREA_NAMES[name] ?? name.replace(/:(\S)/g, ": $1");
}

function camel(tier) {
  return tier.toLowerCase().replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

function sizeBucket(units) {
  if (units === 1) return "1";
  if (units === 2) return "2";
  if (units <= 4) return "3-4";
  if (units <= 9) return "5-9";
  return "10+";
}

async function aggregate() {
  if (!fs.existsSync(PLAN_AREAS)) {
    const res = await download(PLAN_AREAS_URL);
    let text = "";
    for await (const chunk of res) text += chunk;
    fs.writeFileSync(PLAN_AREAS, text);
  }
  const areas = JSON.parse(fs.readFileSync(PLAN_AREAS, "utf8")).features;
  const records = fs
    .readFileSync(EXTRACT, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  // One row per approval: the City file repeats an approval once per job.
  const byApproval = new Map();
  for (const record of records) byApproval.set(record.APPROVAL_ID, record);

  const excluded = { beforeFirstYear: 0, withdrawn: 0, companionWithoutUnitCount: 0 };
  const approvals = [];
  let latestIssue = "";
  for (const r of byApproval.values()) {
    const issued = String(r.APPROVAL_ISSUE_DATE).slice(0, 10);
    const year = Number(issued.slice(0, 4));
    if (!year || year < FIRST_YEAR) {
      excluded.beforeFirstYear++;
      continue;
    }
    if (WITHDRAWN.test(r.APPROVAL_STATUS)) {
      excluded.withdrawn++;
      continue;
    }
    const adu = Number(r.APPROVAL_ADU_TOTAL) || 0;
    const jadu = Number(r.APPROVAL_JADU_TOTAL) || 0;
    if (adu + jadu <= 0) {
      excluded.companionWithoutUnitCount++;
      continue;
    }
    if (issued > latestIssue) latestIssue = issued;
    const lat = Number(r.GIS_LATITUDE);
    const lng = Number(r.GIS_LONGITUDE);
    const area = lat && lng ? areas.find((feature) => inGeometry(lng, lat, feature.geometry)) : undefined;
    approvals.push({
      year,
      adu,
      jadu,
      bonus: Number(r.APPROVAL_ADU_BONUS) || 0,
      affordable: Object.fromEntries(
        AFFORDABLE_TIERS.map((tier) => [tier, Number(r[`APPROVAL_ADU_${tier}`]) || 0]),
      ),
      area: area ? areaName(area.properties.cpname) : null,
    });
  }

  const summarize = (list) => {
    const affordableByTier = Object.fromEntries(
      AFFORDABLE_TIERS.map((tier) => [camel(tier), list.reduce((sum, a) => sum + a.affordable[tier], 0)]),
    );
    const multiUnit = list.filter((a) => a.adu + a.jadu > 1).length;
    return {
      approvals: list.length,
      units: list.reduce((sum, a) => sum + a.adu + a.jadu, 0),
      aduUnits: list.reduce((sum, a) => sum + a.adu, 0),
      jaduUnits: list.reduce((sum, a) => sum + a.jadu, 0),
      bonusAduUnits: list.reduce((sum, a) => sum + a.bonus, 0),
      affordableAduUnits: Object.values(affordableByTier).reduce((sum, n) => sum + n, 0),
      affordableByTier,
      multiUnitApprovals: multiUnit,
      multiUnitShare: list.length >= MIN_GROUP ? Math.round((multiUnit / list.length) * 1000) / 1000 : null,
    };
  };

  const years = [...new Set(approvals.map((a) => a.year))].sort();
  const byYear = years.map((year) => ({ year, ...summarize(approvals.filter((a) => a.year === year)) }));
  const areaNames = [...new Set(approvals.map((a) => a.area).filter(Boolean))].sort();
  const byArea = areaNames
    .map((name) => {
      const list = approvals.filter((a) => a.area === name);
      return {
        name,
        ...summarize(list),
        unitsByYear: Object.fromEntries(
          years.map((year) => [
            year,
            list.filter((a) => a.year === year).reduce((sum, a) => sum + a.adu + a.jadu, 0),
          ]),
        ),
      };
    })
    .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name));
  const approvalsByUnitCount = { "1": 0, "2": 0, "3-4": 0, "5-9": 0, "10+": 0 };
  for (const a of approvals) approvalsByUnitCount[sizeBucket(a.adu + a.jadu)]++;

  const result = {
    // Local calendar date, matching the as-of dates on the other ADU pages.
    generatedAt: new Date().toLocaleDateString("en-CA"),
    coverage: { from: `${FIRST_YEAR}-01-01`, to: latestIssue },
    source: APPROVALS_URL,
    boundaries: PLAN_AREAS_URL,
    minGroup: MIN_GROUP,
    excluded,
    unmatched: approvals.filter((a) => !a.area).length,
    largestApprovalUnits: Math.max(...approvals.map((a) => a.adu + a.jadu)),
    approvalsByUnitCount,
    totals: summarize(approvals),
    byYear,
    byArea,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    JSON.stringify({ approvals: approvals.length, years, areas: byArea.length, excluded, unmatched: result.unmatched }),
  );
}

const command = process.argv[2];
if (command === "extract") await extract();
else if (command === "aggregate") await aggregate();
else {
  console.error("Usage: node scripts/build-san-diego-adu-permits.mjs <extract|aggregate>");
  process.exit(1);
}

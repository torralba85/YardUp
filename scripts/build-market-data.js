"use strict";

/**
 * Build lib/server/market/data/fmr.json from a HUD Fair Market Rents release.
 *
 * Usage:
 *   1. Download the FY county-level FMR file and the ZIP-level Small Area FMR
 *      file from https://www.huduser.gov/portal/datasets/fmr.html (CSV).
 *   2. Save them as data-src/fmr-county.csv and data-src/fmr-zip.csv (gitignored).
 *   3. node scripts/build-market-data.js
 *
 * Input columns expected (HUD naming varies by year — adjust here if needed):
 *   county file: state_alpha, countyname, fmr_0, fmr_1, fmr_2
 *   zip file:    zip_code, fmr_0, fmr_1, fmr_2  (+ optional area_name)
 *
 * Cost multipliers (cost-multipliers.json) and operating-expense factors
 * (operating-expenses.json) are curated separately; this script does NOT
 * generate them. Until this script runs against a full HUD release, the
 * checked-in fmr.json is a seed extract covering the demo metros plus the
 * CA/TX benchmark counties — out-of-seed addresses resolve at the state or
 * national tier, which the client surfaces as low-confidence.
 */

const fs = require("node:fs");
const path = require("node:path");

const SRC = path.join(__dirname, "..", "data-src");
const OUT = path.join(__dirname, "..", "lib", "server", "market", "data", "fmr.json");

function parseCsv(file) {
  const text = fs.readFileSync(file, "utf8").trim();
  const [header, ...rows] = text.split(/\r?\n/);
  const cols = header.split(",").map((c) => c.trim());
  return rows.map((line) => {
    // Split on commas only when outside double quotes (HUD area/county names
    // like "King County, WA" are quoted), then strip the surrounding quotes.
    const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const rec = {};
    cols.forEach((c, i) => {
      rec[c] = (cells[i] ?? "").replace(/^"|"$/g, "").trim();
    });
    return rec;
  });
}

function row(rec) {
  const studio = Number(rec.fmr_0);
  const oneBr = Number(rec.fmr_1);
  const twoBr = Number(rec.fmr_2);
  // Guard NaN/Infinity: JSON.stringify turns NaN into null, which violates the
  // MarketData type (Record<BedroomClass, number>) and breaks the client.
  if (![studio, oneBr, twoBr].every((n) => Number.isFinite(n))) {
    throw new Error(`Invalid FMR values in row: ${JSON.stringify(rec)}`);
  }
  return { studio, "1br": oneBr, "2br": twoBr };
}

function main() {
  const counties = {};
  const states = {};
  const zips = {};

  for (const rec of parseCsv(path.join(SRC, "fmr-county.csv"))) {
    const st = rec.state_alpha;
    if (!st || !rec.countyname) continue; // skip rows missing critical fields
    const county = rec.countyname.replace(/\s+County$/i, "");
    counties[`${st}/${county}`] = row(rec);
    if (!states[st]) states[st] = row(rec);
  }
  for (const rec of parseCsv(path.join(SRC, "fmr-zip.csv"))) {
    if (!rec.zip_code) continue; // skip rows missing the ZIP key
    zips[rec.zip_code] = { area: rec.area_name || `ZIP ${rec.zip_code}`, ...row(rec) };
  }

  const national = { studio: 1400, "1br": 1500, "2br": 1750 };
  const out = {
    asOf: `HUD FMR (FY${new Date().getFullYear()})`,
    sourceUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
    national,
    states,
    counties,
    zips,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `Wrote ${OUT}: ${Object.keys(zips).length} ZIPs, ${Object.keys(counties).length} counties.`,
  );
}

main();

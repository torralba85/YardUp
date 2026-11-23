// Run with node --experimental-strip-types scripts/check-studio-guide-freshness.mjs.
import { regulationGuides } from "../lib/regulations-data.ts";

const dayMs = 24 * 60 * 60 * 1000;
const today = Date.parse(new Date().toISOString().slice(0, 10));
const reviewCadenceDays = 90;

for (const [id, guide] of Object.entries(regulationGuides)) {
  if (id === "local-review") continue;

  const ageDays = (today - Date.parse(guide.verifiedAt)) / dayMs;
  if (ageDays >= 0 && ageDays <= reviewCadenceDays) continue;

  console.error(`${guide.title}: last verified ${guide.verifiedAt}. Check the verification date and re-verify against current city guidance if due.`);
  process.exitCode = 1;
}

if (!process.exitCode) {
  console.log(`All curated Studio guides are within the ${reviewCadenceDays}-day review window.`);
}

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Website stream for lotfoundry.net. Public identifier, not a credential.
export const productionMeasurementId = "G-7C1LM7VPMT";

export function verifyAnalyticsBundle(directory) {
  const ids = new Set();
  function scan(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) scan(child);
      else if (entry.name.endsWith(".js")) {
        for (const match of readFileSync(child, "utf8").matchAll(/\bG-[A-Z0-9]{6,}\b/g)) {
          ids.add(match[0]);
        }
      }
    }
  }
  scan(directory);
  if (ids.size !== 1 || !ids.has(productionMeasurementId)) {
    throw new Error(`Production analytics must use ${productionMeasurementId}; found: ${[...ids].join(", ") || "no GA4 ID"}. Check NEXT_PUBLIC_GA_MEASUREMENT_ID and rebuild.`);
  }
  return productionMeasurementId;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Verified production analytics: ${verifyAnalyticsBundle(".next/static/chunks")}`);
}

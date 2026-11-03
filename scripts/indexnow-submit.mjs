// Tells Bing (and the other IndexNow engines) which sitemap URLs a deploy
// added, removed or changed; the logic and the reasons live in indexnow.mjs.
//
// CI, around every production deploy:
//   node scripts/indexnow-submit.mjs --snapshot "$RUNNER_TEMP/indexnow-before.json"
//   node scripts/indexnow-submit.mjs --baseline "$RUNNER_TEMP/indexnow-before.json"
// By hand, every sitemap URL: npm run seo:indexnow -- --all
import { readFile, writeFile } from "node:fs/promises";
import { run } from "./indexnow.mjs";

process.exitCode = await run(process.argv.slice(2), {
  readFile: (file) => readFile(file, "utf8"),
  writeFile: (file, data) => writeFile(file, data, "utf8"),
});

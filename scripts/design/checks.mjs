import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { inspect, literalGrowth, root } from "./audit.mjs";

const read = (file) => readFileSync(resolve(root, file), "utf8");
const { colors, aliases } = JSON.parse(read("design/tokens.json"));
const names = new Set(Object.keys(colors));
const rgb = (hex) => hex.slice(1, 7).match(/../g).map((v) => parseInt(v, 16));
function luminance(channels) {
  return channels.map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("palette aliases resolve and approved text / focus pairs meet their contrast floors", () => {
  for (const target of Object.values(aliases)) assert.ok(names.has(target), target);
  const pairs = [
    ["lot-ink", "lot-chalk", 4.5], ["lot-stone", "lot-chalk", 4.5],
    ["lot-ink", "lot-orange", 4.5], ["lot-ink", "lot-orange-hover", 4.5],
    ["lot-orange-ink", "lot-chalk", 4.5], ["lot-orange-edge", "lot-chalk", 3],
    ["lot-chalk", "lot-ink", 4.5], ["lot-stone-on-dark", "lot-ink", 4.5],
    ["lot-stone-on-dark", "lot-surface-dark", 4.5], ["lot-stone", "lot-surface", 4.5],
    ["lot-orange-ink", "lot-surface", 4.5], ["lot-orange-ink", "lot-paper", 4.5],
    ["lot-stone", "lot-paper", 4.5], ["lot-chalk", "lot-surface-dark", 4.5],
  ];
  for (const status of ["eligible", "review", "blocked"]) {
    pairs.push([`status-${status}`, "lot-chalk", 4.5], [`status-${status}-on-dark`, "lot-ink", 4.5],
      [`status-${status}-on-dark`, "lot-surface-dark", 4.5]);
    const foreground = rgb(colors[`status-${status}`]);
    const tint = rgb(colors["lot-chalk"]).map((v, i) => v * 0.88 + foreground[i] * 0.12);
    assert.ok(contrast(foreground, tint) >= 4.5, `${status} on its 12% chip tint`);
  }
  // Text colors that render on their own 12% soft tint over chalk.
  for (const [fgName, softName] of [["lot-stone", "lot-stone-soft"], ["status-eligible", "status-eligible-soft"]]) {
    const foreground = rgb(colors[fgName]);
    const soft = colors[softName].match(/rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)/).slice(1, 4).map(Number);
    const tint = rgb(colors["lot-chalk"]).map((v, i) => v * 0.88 + soft[i] * 0.12);
    assert.ok(contrast(foreground, tint) >= 4.5, `${fgName} on ${softName}: ${contrast(foreground, tint).toFixed(2)} < 4.5`);
  }
  for (const [fg, bg, min] of pairs) {
    const ratio = contrast(rgb(colors[fg]), rgb(colors[bg]));
    assert.ok(ratio >= min, `${fg} / ${bg}: ${ratio.toFixed(2)} < ${min}`);
    console.log(`${fg} / ${bg}: ${ratio.toFixed(2)}:1`);
  }
});

test("scanner catches new aliases, undefined tokens, literal colors and misleading action ink", () => {
  const sample = `// text-lf-clay and #123456 in a comment must be ignored\nconst c = "text-lf-clay bg-lot-typo bg-lot-orange-ink text-[#abcdef]";`;
  const result = inspect("example.tsx", sample, names);
  assert.equal(result.raw["#123456"], undefined);
  assert.equal(result.raw["#abcdef"], 1);
  assert.ok(result.errors.some((e) => e.includes("retired")));
  assert.ok(result.errors.some((e) => e.includes("undefined")));
  assert.ok(result.errors.some((e) => e.includes("action fill")));
  // A checkbox accent paints the checked fill, so orange ink there is still a fill.
  assert.ok(inspect("accent.tsx", 'const c = "accent-lot-orange-ink";', names).errors.some((e) => e.includes("action fill")));
  assert.deepEqual(inspect("good.tsx", 'const c = "bg-lot-orange text-lot-ink";', names).errors, []);
  assert.equal(inspect("example.css", ".x { color: rgb(1 2 3); }", names).raw["rgb(1 2 3)"], 1);
  assert.ok(inspect("named.tsx", 'const style = { color: "red" };', names).errors.some((e) => e.includes("named color red")));
  assert.equal(inspect("color.tsx", 'const style = { color: "#123456" };', names).raw["#123456"], 1);
  assert.ok(inspect("broken.css", "@theme { --font-sans tabular-nums: sans-serif; }", names).errors.some((e) => e.includes("invalid CSS")));
});

test("native and offline copies match the canonical palette", () => {
  for (const file of ["public/manifest.json", "native/android/app/src/main/res/raw/web_app_manifest.json"]) {
    const manifest = JSON.parse(read(file));
    assert.equal(manifest.background_color, colors["lot-chalk"], file);
    assert.equal(manifest.theme_color, colors["lot-chalk"], file);
  }
  const twa = JSON.parse(read("native/android/twa-manifest.json"));
  for (const key of ["themeColor", "themeColorDark", "navigationColor", "navigationColorDark", "backgroundColor"]) assert.equal(twa[key], colors["lot-chalk"], key);
  for (const key of ["navigationDividerColor", "navigationDividerColorDark"]) assert.equal(twa[key], colors["lot-line"], key);
  const gradle = read("native/android/app/build.gradle");
  for (const key of ["themeColor", "themeColorDark", "navigationColor", "navigationColorDark", "backgroundColor"]) {
    assert.equal(gradle.match(new RegExp(`${key}: '([^']+)'`))?.[1], colors["lot-chalk"], key);
  }
  for (const file of ["public/offline.html", "native/ios-shell/index.html"]) {
    const literals = Object.keys(inspect(file, read(file), names).raw);
    const palette = new Set(Object.values(colors).map((v) => v.toLowerCase()));
    for (const color of literals) assert.ok(palette.has(color), `${file}: ${color}`);
  }
});

test("literal budgets cannot be traded between files or between colors", () => {
  const exceptions = { files: { "scene.tsx": { reason: "physical finish", colors: { "#123456": 2 } } } };
  assert.deepEqual(literalGrowth({ "scene.tsx": { "#123456": 1 } }, exceptions), []);
  assert.equal(literalGrowth({ "scene.tsx": { "#123456": 3 } }, exceptions).length, 1);
  assert.equal(literalGrowth({ "new.tsx": { "#123456": 1 } }, exceptions).length, 1);
  assert.equal(literalGrowth({ "scene.tsx": { "#abcdef": 1 } }, exceptions).length, 1);
});

test("store feature graphic uses only canonical palette colors and current typefaces", () => {
  const graphic = read("native/android/store-listing/feature-graphic.html");
  const palette = new Set(Object.values(colors).map((v) => v.toLowerCase()));
  for (const color of Object.keys(inspect("native/android/store-listing/feature-graphic.html", graphic, names).raw)) {
    assert.ok(palette.has(color), `feature graphic: ${color} is not a canonical palette value`);
  }
  assert.doesNotMatch(graphic, /DM Mono|Libre Franklin|Instrument Sans|Warm Earth/);
  assert.match(graphic, /Space Grotesk/);
  assert.match(graphic, /Manrope/);
});

test("money and transaction categories keep neutral meaning", () => {
  const ledger = read("components/builder/BillingLedger.tsx");
  const table = ledger.slice(ledger.indexOf("<table"), ledger.indexOf("</table>"));
  assert.doesNotMatch(table, /(?:text|bg|border)-status-/);
  assert.doesNotMatch(read("components/ui/MoneyFigure.tsx"), /forest|text-status-/);
  const metrics = read("components/studio/MetricsSummary.tsx");
  const moneyCell = metrics.slice(metrics.indexOf('data-metric-lead="true"'), metrics.indexOf("function CellLabel"));
  assert.doesNotMatch(moneyCell, /(?:text|bg|border)-status-/);
});

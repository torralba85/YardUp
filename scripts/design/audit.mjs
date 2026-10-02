import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import postcss from "postcss";

export const root = fileURLToPath(new URL("../../", import.meta.url));
const extensions = /\.(?:tsx?|jsx?|css|svg|json|xml|swift|kt|gradle|html)$/;
const excluded = /(?:\.test\.|\.spec\.|\.d\.ts$|\/package-lock\.json$|\/build\/|\/\.gradle\/|\/node_modules\/|\/test\/)/;
export function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = resolve(dir, entry.name);
    if (excluded.test(file.replaceAll("\\", "/"))) return [];
    return entry.isDirectory() ? sourceFiles(file) : extensions.test(file) ? [file] : [];
  });
}

// Read literal payloads through the TS parser so comments cannot introduce or hide debt.
export function authoredText(file, source) {
  if (!/\.[jt]sx?$/.test(file)) return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const values = [];
  function visit(node) {
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      values.push(node.text);
      const parent = node.parent;
      if (ts.isPropertyAssignment(parent) || ts.isJsxAttribute(parent)) {
        const name = parent.name.getText(ast);
        if (/^(?:color|backgroundColor|borderColor|outlineColor|fill|stroke)$/.test(name) && /^[a-z]+$/i.test(node.text)) values.push(`${name}: ${node.text};`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return values.join("\n");
}

export function inspect(file, source, defined) {
  const text = authoredText(file, source);
  const errors = [];
  if (file.endsWith(".css")) {
    try { postcss.parse(source, { from: file }); }
    catch (error) { errors.push(`invalid CSS: ${error.reason}`); }
  }
  const classes = /(?<![\w-])(?:bg|text|border(?:-[trblxy])?|ring(?:-offset)?|outline|fill|stroke|divide|accent|decoration|from|via|to|placeholder|caret)-((?:lot|lf|status)-[a-z0-9-]+)/g;
  for (const [, token] of text.matchAll(classes)) {
    if (token.startsWith("lf-")) errors.push(`retired color alias ${token}`);
    else if (!defined.has(token)) errors.push(`undefined color token ${token}`);
  }
  for (const [, token] of text.matchAll(/var\(--color-([a-z0-9-]+)/g)) {
    if (token.startsWith("lf-")) errors.push(`retired CSS alias ${token}`);
    else if (!defined.has(token)) errors.push(`undefined CSS color ${token}`);
  }
  if (/\b(?:bg|text|border|ring|outline|fill|stroke)-\[#[\da-f]/i.test(text)) errors.push("raw color utility; use a named token");
  if (/\bfont-mono\b/.test(text)) errors.push("retired mono type layer");
  if (/\bbg-lot-orange-ink\b/.test(text)) errors.push("orange ink is text/focus, not an action fill");
  if (/(?<![\w:-])text-lot-orange(?![\w-])/.test(text)) errors.push("signal-orange text requires an explicitly reviewed dark surface; use orange ink on chalk");
  if (/\b(?:bg|text|border|ring|outline|fill|stroke|divide)-(?:white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?![\w-])/.test(text)) errors.push("default utility palette bypasses the design system");
  if (/\b(?:shadow-(?:sm|md|lg|xl|2xl)|backdrop-blur[\w-]*)\b/.test(text)) errors.push("unapproved blurred UI surface");
  for (const [, value] of text.matchAll(/(?:\bcolor|\bbackground(?:Color|-color)?|\bborder(?:Color|-color)|\boutline(?:Color|-color)|\bfill|\bstroke)\s*:\s*([a-z]+)\s*[;}]/gi)) {
    if (!/^(?:transparent|currentcolor|inherit|initial|unset|revert|none)$/i.test(value)) errors.push(`named color ${value} bypasses the palette`);
  }
  const raw = {};
  for (const [literal] of text.matchAll(/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|(?:rgba?|hsla?|oklch|oklab|color)\([^)]*\)/gi)) {
    // Expressions composed entirely from named tokens stay connected to the palette.
    if (literal.includes("var(--")) continue;
    const key = literal.toLowerCase();
    raw[key] = (raw[key] || 0) + 1;
  }
  return { errors: [...new Set(errors)], raw };
}

export function audit() {
  const tokens = JSON.parse(readFileSync(resolve(root, "design/tokens.json"), "utf8"));
  const defined = new Set(Object.keys(tokens.colors));
  const inventory = {};
  const errors = [];
  const files = ["app", "components", "lib", "hooks", "utils", "content", "functions", "remotion", "public", "native", "ios", "brand"]
    .filter((dir) => { try { return readdirSync(resolve(root, dir)).length >= 0; } catch { return false; } })
    .flatMap((dir) => sourceFiles(resolve(root, dir)));
  for (const file of files) {
    const name = relative(root, file).replaceAll("\\", "/");
    if (name === "app/design-theme.css") continue; // separately checked against its generator
    const result = inspect(file, readFileSync(file, "utf8"), defined);
    if (Object.keys(result.raw).length) inventory[name] = result.raw;
    errors.push(...result.errors.map((error) => `${name}: ${error}`));
  }
  return { fileCount: files.length, inventory, errors };
}

export function literalGrowth(inventory, exceptions) {
  const errors = [];
  for (const [file, colors] of Object.entries(inventory)) {
    for (const [color, count] of Object.entries(colors)) {
      const ceiling = exceptions.files[file]?.colors[color] || 0;
      if (count > ceiling) errors.push(`${file}: ${color} grew from ${ceiling} to ${count}; use a palette role or document a reviewed renderer exception`);
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = audit();
  if (process.argv.includes("--inventory")) console.log(JSON.stringify(result, null, 2));
  else {
    const allowed = JSON.parse(readFileSync(resolve(root, "design/color-exceptions.json"), "utf8"));
    result.errors.push(...literalGrowth(result.inventory, allowed));
    if (result.errors.length) {
      console.error(result.errors.join("\n"));
      process.exitCode = 1;
    } else console.log(`Design audit passed: ${result.fileCount} source/asset files; zero legacy color utilities or arbitrary hex utilities; raw-color exceptions have not grown.`);
  }
}

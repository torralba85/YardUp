import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const css = readFileSync(resolve(root, "app/globals.css"), "utf8");

function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? componentFiles(path) : path.endsWith(".tsx") && !path.endsWith(".test.tsx") ? [path] : [];
  });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.endsWith(".d.ts") ? [path] : [];
  });
}

const productSources = () => ["app", "components", "lib"].flatMap((dir) => sourceFiles(resolve(root, dir)));

describe("A LOT MORE shared design contract", () => {
  it("keeps the approved palette global and font aliases acyclic", () => {
    for (const value of ["#F5F5F0", "#161616", "#FF5B24", "#C43708", "#B7B7AE"]) expect(css).toContain(value);
    expect(css).not.toContain(".lf-studio-theme");
    expect(css.match(/--font-sans:([^;]+);/)?.[1]).not.toContain("var(--font-sans)");
    expect(css).not.toContain("radial-gradient");
  });

  it("does not regress money figures to status green or orange buttons to chalk labels", () => {
    for (const file of componentFiles(resolve(root, "components"))) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/lf-money-\w+[^"\n]*text-lf-forest/);
      // Match unprefixed pairs only; selected/unselected variants intentionally
      // have different text colors in the same class string.
      expect(source, file).not.toMatch(/(?<![\w:-])bg-lf-clay\s[^"\n]*(?<![\w:-])text-lf-sand(?:\s|")/);
    }
  });

  it("keeps route and component readouts on the same tracking and accessible orange ink", () => {
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("tracking-[0.14em]");
      // Signal orange is a fill, never small type on a light route surface.
      expect(source, file).not.toMatch(/(?<![\w:-])text-lf-clay(?:\s|\")/);
    }
  });

  it("keeps the 3D scene off the retired Golden Hour palette", () => {
    for (const file of ["components/ParcelScene.tsx", "components/studio/InstancedFence.tsx", "lib/scene-lighting.ts"]) {
      const source = readFileSync(resolve(root, file), "utf8");
      // Weathered-wood fence, cool inspection fog, dusk sun tint and the old warm preset.
      for (const retired of ["#8a7e6e", "#e8ecef", "#ffaa66", "#ffd59e", "#fed7aa", "#93c5fd"]) {
        expect(source.toLowerCase(), `${file} ${retired}`).not.toContain(retired);
      }
      expect(source, file).not.toMatch(/golden.?hour/i);
    }
  });

  it("keeps every product source off the retired Golden Hour hexes", () => {
    // Scene lighting and fence values, plus the old forest/amber status pair.
    const retired = ["#8a7e6e", "#e8ecef", "#ffaa66", "#ffd59e", "#fed7aa", "#93c5fd", "#2f4a38", "#c8922a"];
    for (const file of productSources()) {
      const source = readFileSync(file, "utf8").toLowerCase();
      for (const hex of retired) expect(source, `${file} ${hex}`).not.toContain(hex);
    }
  });

  it("draws light-surface focus indicators in deep orange ink", () => {
    expect(css).toContain("--color-lf-focus-ring: #C43708;");
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      const source = readFileSync(file, "utf8");
      // Signal orange is 2.83:1 on chalk, below the 3:1 boundary floor.
      expect(source, file).not.toMatch(/focus(?:-visible|-within)?:(?:ring|border|outline)-(?:lf-clay|lot-orange)(?![\w-])/);
      // Carbon is reserved for rings on orange grounds; chalk surfaces use deep orange (§7).
      expect(source, file).not.toMatch(/focus(?:-visible|-within)?:(?:ring|border|outline)-(?:lf-espresso|lf-mahogany|lot-ink|\[#161616\])(?![\w-])/);
    }
  });

  it("references only colour tokens that globals.css defines", () => {
    const defined = new Set(Array.from(css.matchAll(/--color-((?:lot|lf|status)-[a-z0-9-]+):/g), (match) => match[1]));
    const utility =
      /(?<![\w-])(?:bg|text|border(?:-[trblxy])?|ring(?:-offset)?|outline|fill|stroke|divide|accent|decoration|from|via|to|placeholder|caret)-((?:lot|lf|status)-[a-z0-9-]+)/g;
    for (const file of productSources()) {
      for (const [, token] of Array.from(readFileSync(file, "utf8").matchAll(utility))) {
        expect(defined.has(token), `${file} ${token}`).toBe(true);
      }
    }
  });

  it("keeps product surfaces off Tailwind's default palette and pure white", () => {
    const defaults =
      /(?<![\w-])(?:bg|text|border|ring|fill|stroke|divide)-(?:white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?![\w-])/;
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(defaults);
    }
  });

  it("keeps overlays on the shared layering scale", () => {
    for (const file of productSources()) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/(?<![\w-])z-\[\d+\]/);
    }
  });

  it("sets display headings at the spec weights, never bold", () => {
    const weights: Array<[string, string]> = [
      ["lf-display-hero", "600"],
      ["lf-section-heading", "500"],
      ["lf-card-heading", "500"],
      ["lf-panel-heading", "500"],
    ];
    for (const [cls, weight] of weights) {
      expect(css.match(new RegExp(`\\.${cls} \\{[^}]*?font-weight: (\\d+)`))?.[1], cls).toBe(weight);
    }
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/<h[1-4]\b[^>]*\bfont-display\b[^>]*\bfont-bold\b|<h[1-4]\b[^>]*\bfont-bold\b[^>]*\bfont-display\b/);
    }
  });

  it("keeps exported certificates on the shared typography and neutral ledger", () => {
    const report = readFileSync(resolve(root, "lib/report.ts"), "utf8");
    expect(report).toContain('"Space Grotesk", Arial, sans-serif');
    expect(report).toContain('"Manrope", Arial, sans-serif');
    expect(report).toContain(".ledger tr.balance td.amt { color: var(--ink); }");
    expect(report).not.toMatch(/Cormorant|Libre Franklin|IBM Plex Mono/);
  });
});

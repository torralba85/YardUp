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

  it("keeps exported certificates on the shared typography and neutral ledger", () => {
    const report = readFileSync(resolve(root, "lib/report.ts"), "utf8");
    expect(report).toContain('"Space Grotesk", Arial, sans-serif');
    expect(report).toContain('"Manrope", Arial, sans-serif');
    expect(report).toContain(".ledger tr.balance td.amt { color: var(--ink); }");
    expect(report).not.toMatch(/Cormorant|Libre Franklin|IBM Plex Mono/);
  });
});

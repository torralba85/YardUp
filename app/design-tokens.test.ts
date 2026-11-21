import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const css = readFileSync(resolve(root, "app/globals.css"), "utf8") + readFileSync(resolve(root, "app/design-theme.css"), "utf8");

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
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/lf-money-\w+[^"\n]*text-status-eligible/);
      // Match unprefixed pairs only; selected/unselected variants intentionally
      // have different text colors in the same class string.
      expect(source, file).not.toMatch(/(?<![\w:-])bg-lot-orange\s[^"\n]*(?<![\w:-])text-lot-chalk(?:\s|")/);
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
    expect(css).toContain("--color-lf-focus-ring: var(--color-lot-orange-ink);");
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

  it("keeps the retired mono layer out of product markup", () => {
    // §3.1: two families only. `--font-mono` is aliased to Manrope as a safety net,
    // so a stray `font-mono` renders fine and silently re-teaches the old layer.
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/(?<![\w-])font-mono(?![\w-])/);
    }
  });

  it("keeps elevation hard-edged: no blurred Tailwind shadows", () => {
    // §4.4: elevation is a hard offset (`shadow-paper`, `shadow-paper-sm`, `shadow-card`,
    // `shadow-callout`, `shadow-overlay`). The only blurred shadows are the landing's sticky CTA and mobile
    // menu, which live in its CSS Module.
    const classLists = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      for (const [, plain, template] of Array.from(readFileSync(file, "utf8").matchAll(classLists))) {
        const classes = plain ?? template ?? "";
        expect(classes, file).not.toMatch(/(?<![\w-])(?:[\w-]+:)*shadow(?:-(?:xs|sm|md|lg|xl|2xl|inner))?(?![\w-])/);
      }
    }
  });

  it("never colours money or credit figures green", () => {
    // §2.6: money is typographic. Green is eligible/verified status only, so a green
    // class may not sit on the same line as a formatted amount or a signed credit.
    const green = /(?<![\w-])text-(?:lf-forest|status-eligible)(?![\w-])/;
    const greenMark = /(?<![\w-])(?:text|bg|border|decoration)-(?:lf-forest|status-eligible)(?![\w-])/;
    const figure = /formatCurrency|formatCompactCurrency|lf-money-|<MoneyFigure|creditsChange|\+\{/;
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (green.test(line)) expect(figure.test(line), `${file}:${index + 1}`).toBe(false);
        // Nor a green rule or underline decorating a money figure a few lines below it.
        if (/lf-money-|<MoneyFigure/.test(line)) {
          const following = lines.slice(index, index + 5).join("\n");
          expect(greenMark.test(following), `${file}:${index + 1}`).toBe(false);
        }
        // Nor a "money" tone that maps to green (the certificate's ReportFact did until 2026-11-02).
        if (/["']money["']/.test(line)) {
          const mapping = lines.slice(index, index + 3).join("\n");
          expect(green.test(mapping), `${file}:${index + 1} maps a money tone to green`).toBe(false);
        }
      });
    }
  });

  it("tracks every positive eyebrow and readout at the canonical 0.08em", () => {
    // §3.2: one restrained tracking value. Negative tracking on display type is separate.
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/tracking-\[0?\.(?!08em\])\d+em\]/);
    }
  });

  it("draws every field boundary at 3:1 or better, never the decorative hairline", () => {
    // §2.3 rule 4: the drafting line (1.28:1 on chalk) is decorative only. Fields
    // use ui/Field `Input` / `Select` / `Textarea`, whose boundary is stone.
    expect(readFileSync(resolve(root, "components/ui/Field.tsx"), "utf8")).toMatch(/fieldControlClass\s*=[^;]*border-lot-stone(?![\w-])/);
    const field = /<(input|select|textarea)\b([^>]*)>/g;
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      for (const [, , attributes] of Array.from(readFileSync(file, "utf8").matchAll(field))) {
        if (/type=["{]?["'`]?(?:checkbox|radio|range|file|hidden)/.test(attributes)) continue;
        expect(attributes, file).not.toMatch(/border-(?:lf-hairline|lot-line)(?![\w-])/);
      }
    }
  });

  it("uses the radius and elevation tokens instead of arbitrary values", () => {
    // §4.4: `rounded-control` for controls; `shadow-paper|paper-sm|card|callout|overlay` for elevation.
    for (const file of [...productSources(), ...sourceFiles(resolve(root, "hooks"))]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/(?<![\w-])(?:[\w-]+:)*rounded(?:-[trblse]{1,2})?-\[\d+(?:\.\d+)?px\]/);
      expect(source, file).not.toMatch(/(?<![\w-])(?:[\w-]+:)*shadow-\[/);
    }
  });

  it("draws every checkbox with the shared ui/Field Checkbox", () => {
    // The browser's own box is pure white and only its checked fill follows `accent-color`.
    // The 2026-11-02 audit found ten hand-rolled checkboxes in four colours, one browser blue.
    const primitive = resolve(root, "components/ui/Field.tsx");
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      if (file === primitive) continue;
      expect(readFileSync(file, "utf8"), file).not.toMatch(/type=\{?["'`]checkbox["'`]/);
    }
  });

  it("keeps looping animations behind motion-safe", () => {
    // §5: all motion sits inside prefers-reduced-motion: no-preference. A spinner that
    // stops under reduced motion still shows its icon beside the loading label.
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/(?<![\w:-])animate-(?:spin|pulse|ping|bounce)(?![\w-])/);
    }
  });

  it("keeps landing text over the hero photograph at chalk 86% or more", () => {
    // §2.3 rule 6. At 72–74% the required "illustrative" label and the sample captions
    // measured below 4.5:1 over the bright half of the photo (2026-11-02 audit).
    const landing = readFileSync(resolve(root, "components/landing/lot-more/LotMoreLanding.module.css"), "utf8");
    let checked = 0;
    for (const [, selector, body] of Array.from(landing.matchAll(/([^{}]+)\{([^{}]*)\}/g))) {
      if (!/\.hero/.test(selector) || /::placeholder/.test(selector)) continue;
      for (const [, percent] of Array.from(body.matchAll(/(?:^|[;\s])(?:color|--hero-text-muted):\s*color-mix\(in srgb, var\(--chalk\) (\d+)%/g))) {
        expect(Number(percent), selector.trim()).toBeGreaterThanOrEqual(86);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("renders every modal through the shared ui/Dialog on the one scrim", () => {
    // §6 Dialog. The 2026-11-02 audit found six hand-rolled modals with three scrim
    // strengths (70/75/90%) and four Escape/focus/scroll recipes; Dialog owns all of it.
    const primitive = resolve(root, "components/ui/Dialog.tsx");
    for (const file of [...componentFiles(resolve(root, "app")), ...componentFiles(resolve(root, "components"))]) {
      if (file === primitive) continue;
      const source = readFileSync(file, "utf8");
      expect(source, `${file}: use Dialog from components/ui/Dialog`).not.toMatch(/role=\{?["'`](?:alert)?dialog["'`]|aria-modal|<dialog\b/);
      // A full-screen backdrop dims with lot-scrim, never an ad-hoc carbon alpha.
      for (const [classes] of Array.from(source.matchAll(/["'`][^"'`\n]*["'`]/g))) {
        if (/(?<![\w:-])fixed(?![\w-])/.test(classes) && /(?<![\w:-])inset-0(?![\w-])/.test(classes)) {
          expect(classes, `${file}: dim with bg-lot-scrim`).not.toMatch(/(?<![\w-])bg-lot-ink\/\d+/);
        }
      }
    }
  });

  it("documents every shared ui component and hook in design-system §6", () => {
    // A new components/ui export is a new rule for every surface, so it ships with its row.
    const doc = readFileSync(resolve(root, "docs/design/design-system.md"), "utf8");
    const exported = new Set<string>();
    for (const file of sourceFiles(resolve(root, "components/ui"))) {
      for (const [, name] of Array.from(readFileSync(file, "utf8").matchAll(/^export (?:const|function) ([A-Z]\w*|use[A-Z]\w*)/gm))) {
        exported.add(name);
      }
    }
    expect(exported.size).toBeGreaterThan(15);
    for (const name of Array.from(exported)) {
      expect(doc, `${name} needs a row in docs/design/design-system.md §6`).toMatch(new RegExp("`" + name + "\\b"));
    }
  });

  it("only lets legacy aliases, raw hex, arbitrary type sizes, inline kickers and raw buttons fall (ratchet)", () => {
    // §12: new code uses lot-* / status-*. When a change migrates a surface, lower the
    // matching ceiling in the same commit. Never raise one.
    // Pinned 2026-10-02 on master after #249 (lf-* colour aliases were 1,759 at the
    // 2026-09-30 audit). lfAliases and rawHex are already zero: every colour class
    // names a lot-* / status-* token, and the lint audit keeps it that way.
    // Re-pinned 2026-11-02 after the Dialog migration (type sizes 166 → 151, kickers
    // 24 → 23). rawButtons counts <button> outside components/ui: new UI uses Button.
    // Re-pinned 2026-11-04 after the builder dashboard pass (type sizes 151 → 111,
    // kickers 23 → 10, raw buttons 75 → 71).
    // Re-pinned 2026-11-18 after retiring sub-11px text & auth/shell buttons (type sizes 111 → 87,
    // kickers 10 → 7, raw buttons 71 → 62).
    const ceilings = { lfAliases: 0, rawHex: 0, arbitraryTextSizes: 87, inlineKickers: 7, rawButtons: 62 };
    const patterns = {
      lfAliases:
        /(?<![\w-])(?:[\w-]+:)*(?:text|bg|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|decoration|divide|placeholder|caret|accent|from|via|to|shadow)-lf-[a-z0-9-]+|var\(--color-lf-[a-z0-9-]+\)/g,
      rawHex: /-\[#[0-9a-fA-F]{3,8}\]/g,
      arbitraryTextSizes: /(?<![\w-])(?:[\w-]+:)*text-\[\d+(?:\.\d+)?(?:px|rem)\]/g,
    };
    const counts = { lfAliases: 0, rawHex: 0, arbitraryTextSizes: 0, inlineKickers: 0, rawButtons: 0 };
    const sharedUi = resolve(root, "components/ui");
    for (const file of [...productSources(), ...sourceFiles(resolve(root, "hooks"))]) {
      const source = readFileSync(file, "utf8");
      if (!file.startsWith(sharedUi)) counts.rawButtons += source.match(/<button\b/g)?.length ?? 0;
      counts.lfAliases += source.match(patterns.lfAliases)?.length ?? 0;
      counts.rawHex += source.match(patterns.rawHex)?.length ?? 0;
      counts.arbitraryTextSizes += source.match(patterns.arbitraryTextSizes)?.length ?? 0;
      // The kicker recipe written out by hand instead of `lf-kicker` / `lf-kicker-dense`.
      for (const [classes] of Array.from(source.matchAll(/["'`][^"'`\n]*["'`]/g))) {
        if (/\buppercase\b/.test(classes) && classes.includes("tracking-[0.08em]") && /text-\[1[01](?:\.5)?px\]/.test(classes)) {
          counts.inlineKickers += 1;
        }
      }
    }
    for (const key of Object.keys(ceilings) as Array<keyof typeof ceilings>) {
      expect(counts[key], `${key} rose above its ratchet ceiling; use lot-*/status-* tokens, lf-kicker, a type utility or ui/Button`).toBeLessThanOrEqual(ceilings[key]);
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

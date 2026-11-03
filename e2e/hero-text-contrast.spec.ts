import { expect, test, type Page } from "@playwright/test";

/**
 * design-system §2.3 rule 6: text over the hero photograph clears 4.5:1. The
 * photo behind the text varies, so a token pair cannot prove it. Measure the
 * render instead: screenshot with and without the text, keep the pixels the
 * glyphs changed, and test each text colour against the photo under them. The
 * 5th percentile must clear AA (antialiased edges make the minimum noisy).
 * Text covered by the consent bar is skipped.
 */
const TEXT: Array<[string, string]> = [
  ["kicker", '[class*="heroKicker"]'],
  ["h1", "h1"],
  ["description", '[class*="heroDescription"]'],
  ["field label", '[class*="fieldLabel"]'],
  ["form note", '[class*="formNote"]'],
  ["sample kicker", '[class*="sampleKicker"]'],
  ["sample label", '[class*="sampleFigures"] dt'],
  ["sample unit", '[class*="sampleFigures"] dd small'],
  ["concept label", '[class*="heroCredit"]'],
];

const HIDE_TEXT = `
  *, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }
  svg { visibility: hidden !important; }
`;

type Box = { name: string; x: number; y: number; w: number; h: number; color: string };

async function measureHeroText(page: Page) {
  const hero = page.getByRole("region", { name: "Explore your lot" });
  await expect(hero.locator("img").first()).toHaveJSProperty("complete", true);
  await page.evaluate(() => document.fonts.ready);
  // The camera settle, wordmark rise and header fade all end within 4.8 s.
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"), null, { timeout: 15_000 });

  const boxes: Box[] = await page.evaluate((targets) => {
    const section = document.querySelector('section[aria-label="Explore your lot"]');
    if (!section) return [];
    return targets.flatMap(([name, selector]) => {
      const element = section.querySelector(selector);
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.bottom <= 0 || rect.top >= innerHeight) return [];
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      if (!hit || (!element.contains(hit) && !hit.contains(element))) return [];
      return [{ name, x: rect.x, y: rect.y, w: rect.width, h: rect.height, color: getComputedStyle(element).color }];
    });
  }, TEXT);

  const shown = (await page.screenshot()).toString("base64");
  await page.addStyleTag({ content: HIDE_TEXT });
  const hidden = (await page.screenshot()).toString("base64");

  return page.evaluate(async ({ shown, hidden, boxes }) => {
    async function pixels(base64: string) {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      return context.getImageData(0, 0, bitmap.width, bitmap.height);
    }
    function parse(color: string): number[] {
      const srgb = color.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
      if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] ? Number(srgb[4]) : 1];
      const [r, g, b, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
      return [r, g, b, a];
    }
    function luminance([r, g, b]: number[]) {
      const channel = (value: number) => {
        const v = value / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }
    const contrast = (a: number[], b: number[]) => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (light + 0.05) / (dark + 0.05);
    };

    const [withText, withoutText] = [await pixels(shown), await pixels(hidden)];
    const scale = withText.width / innerWidth;
    return boxes.map((box) => {
      const [r, g, b, alpha] = parse(box.color);
      const ratios: number[] = [];
      const x0 = Math.max(0, Math.floor(box.x * scale));
      const y0 = Math.max(0, Math.floor(box.y * scale));
      const x1 = Math.min(withText.width, Math.ceil((box.x + box.w) * scale));
      const y1 = Math.min(withText.height, Math.ceil((box.y + box.h) * scale));
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * withText.width + x) * 4;
          const ground = [withoutText.data[i], withoutText.data[i + 1], withoutText.data[i + 2]];
          const changed = Math.abs(withText.data[i] - ground[0]) + Math.abs(withText.data[i + 1] - ground[1]) + Math.abs(withText.data[i + 2] - ground[2]);
          if (changed < 90) continue;
          const ink = [r, g, b].map((value, k) => alpha * value + (1 - alpha) * ground[k]);
          ratios.push(contrast(ink, ground));
        }
      }
      ratios.sort((a, b) => a - b);
      return { name: box.name, glyphPixels: ratios.length, p5: ratios[Math.floor(ratios.length * 0.05)] ?? 0 };
    });
  }, { shown, hidden, boxes });
}

test.describe("hero text over the photograph (design-system §2.3 rule 6)", () => {
  test("keeps every hero text block at 4.5:1 or better", async ({ page, isMobile }) => {
    test.setTimeout(90_000);
    const viewports = isMobile ? [undefined] : [undefined, { width: 1280, height: 720 }];
    for (const viewport of viewports) {
      if (viewport) await page.setViewportSize(viewport);
      await page.goto("/");
      const results = await measureHeroText(page);
      const width = page.viewportSize()?.width;
      expect(results.filter((result) => result.glyphPixels > 50).length, `measured blocks at ${width}px`).toBeGreaterThanOrEqual(4);
      for (const result of results) {
        if (result.glyphPixels <= 50) continue;
        expect.soft(result.p5, `${result.name} at ${width}px`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

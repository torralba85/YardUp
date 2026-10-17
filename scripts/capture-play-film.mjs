import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Capture real rendered app frames at native screenshot resolution. No UI or
// application values are replaced. This is a public, curated Seattle demo.
const out = resolve('public/play-film');
const stillsOnly = process.argv.includes('--stills-only');
const frames = resolve('C:/Users/Andrew/LotFoundry/artifacts/play-film-2026-09-22/orbit-frames');
mkdirSync(frames, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await page.goto('https://lotfoundry.net/studio', { waitUntil: 'networkidle' });
  const decline = page.getByRole('button', { name: 'Decline', exact: true });
  if (await decline.isVisible()) await decline.click();
  await page.getByRole('button', { name: 'Seattle', exact: true }).click();
  await page.screenshot({ path: resolve(out, 'find.png') });
  await page.getByRole('button', { name: 'Reveal my backyard’s potential' }).click();
  await page.getByRole('button', { name: 'Shape your ADU' }).waitFor();
  await page.screenshot({ path: resolve(out, 'earn.png') });
  await page.getByRole('button', { name: 'Shape your ADU' }).click();
  const canvas = page.locator('canvas').first();
  await canvas.waitFor();
  await page.getByRole('button', { name: 'Frame lot', exact: true }).waitFor();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: resolve(out, 'shape.png') });
  if (!stillsOnly) {
  const box = await canvas.boundingBox();
  // Drag empty scene space to orbit the camera, staying away from ADU handles.
  await page.mouse.move(box.x + 65, box.y + 90);
  await page.mouse.down();
  for (let frame = 0; frame < 240; frame++) {
    await page.mouse.move(box.x + 65 + frame * 0.72, box.y + 90 + Math.sin(frame / 239 * Math.PI) * 14);
    await page.waitForTimeout(34);
    await canvas.screenshot({ path: resolve(frames, `${String(frame).padStart(4, '0')}.png`) });
    if (frame % 60 === 0) console.log(`Orbit frame ${frame}/240`);
  }
  await page.mouse.up();
  }
  await page.getByRole('button', { name: 'Check feasibility', exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(out, 'check.png') });
  console.log(stillsOnly ? 'Captured four app stills at 1620 x 2880.' : 'Captured four app stills and 240 native-resolution 3D frames.');
} finally { await browser.close(); }

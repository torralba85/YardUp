import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(PROJECT, "public");

const CHALK = "#F5F5F0";
const CARBON = "#161616";
const ORANGE = "#FF5B24";
const STONE = "#65655F";
const LINE = "#DADAD3";
const LINE_DARK = "#44443F";

const SG_FONT_PATH = path.resolve(
  PROJECT,
  "..",
  "release-artifacts",
  "play-developer-page",
  "sg600.woff2"
);
const MR_FONT_PATH = path.resolve(
  PROJECT,
  "..",
  "release-artifacts",
  "play-developer-page",
  "mr600.woff2"
);

const sgBase64 = fs.existsSync(SG_FONT_PATH)
  ? fs.readFileSync(SG_FONT_PATH).toString("base64")
  : "";
const mrBase64 = fs.existsSync(MR_FONT_PATH)
  ? fs.readFileSync(MR_FONT_PATH).toString("base64")
  : "";

// 1. Primary Mark (Chalk ground, Carbon stroke, Signal Orange dot)
const markPrimarySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="LotFoundry mark">
  <title>LotFoundry mark</title>
  <rect width="512" height="512" fill="${CHALK}"/>
  <svg x="96" y="96" width="320" height="320" viewBox="0 0 48 48">
    <path d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11" fill="none" stroke="${CARBON}" stroke-width="4"/>
    <circle cx="39" cy="9" r="3" fill="${ORANGE}"/>
  </svg>
</svg>
`;

// 2. Dark Mark (Carbon ground, Chalk stroke, Signal Orange dot)
const markDarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="LotFoundry dark mark">
  <title>LotFoundry mark</title>
  <rect width="512" height="512" fill="${CARBON}"/>
  <svg x="96" y="96" width="320" height="320" viewBox="0 0 48 48">
    <path d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11" fill="none" stroke="${CHALK}" stroke-width="4"/>
    <circle cx="39" cy="9" r="3" fill="${ORANGE}"/>
  </svg>
</svg>
`;

// 3. Monochrome Mark (Transparent ground, single color)
const markMonoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="LotFoundry monochrome mark">
  <title>LotFoundry mark</title>
  <path d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11" fill="none" stroke="${CARBON}" stroke-width="4"/>
  <circle cx="39" cy="9" r="3" fill="${CARBON}"/>
</svg>
`;

// 4. Horizontal Lockup (Light)
const fontCss = sgBase64
  ? `@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 600;
  src: url(data:font/woff2;base64,${sgBase64}) format('woff2');
}`
  : "";

const lockupHorizontalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 48" role="img" aria-label="LotFoundry">
  <title>LotFoundry</title>
  <defs>
    <style>
      ${fontCss}
      .brand-text {
        font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
        font-size: 32px;
        font-weight: 600;
        letter-spacing: -0.055em;
        fill: ${CARBON};
      }
      .brand-dot {
        fill: ${ORANGE};
      }
    </style>
  </defs>
  <g transform="translate(0, 0)">
    <path d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11" fill="none" stroke="${CARBON}" stroke-width="4"/>
    <circle cx="39" cy="9" r="3" fill="${ORANGE}"/>
  </g>
  <text x="58" y="34" class="brand-text">LotFoundry<tspan class="brand-dot">.</tspan></text>
</svg>
`;

// 5. Horizontal Lockup Inverse (Dark)
const lockupHorizontalInverseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 48" role="img" aria-label="LotFoundry">
  <title>LotFoundry</title>
  <defs>
    <style>
      ${fontCss}
      .brand-text-inverse {
        font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
        font-size: 32px;
        font-weight: 600;
        letter-spacing: -0.055em;
        fill: ${CHALK};
      }
      .brand-dot {
        fill: ${ORANGE};
      }
    </style>
  </defs>
  <g transform="translate(0, 0)">
    <path d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11" fill="none" stroke="${CHALK}" stroke-width="4"/>
    <circle cx="39" cy="9" r="3" fill="${ORANGE}"/>
  </g>
  <text x="58" y="34" class="brand-text-inverse">LotFoundry<tspan class="brand-dot">.</tspan></text>
</svg>
`;

// 6. Stacked Lockup
const lockupStackedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" role="img" aria-label="LotFoundry">
  <title>LotFoundry</title>
  <defs>
    <style>
      ${fontCss}
      .brand-text-stacked {
        font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
        font-size: 30px;
        font-weight: 600;
        letter-spacing: -0.055em;
        fill: ${CARBON};
        text-anchor: middle;
      }
      .brand-dot {
        fill: ${ORANGE};
      }
    </style>
  </defs>
  <g transform="translate(96, 12)">
    <path d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11" fill="none" stroke="${CARBON}" stroke-width="4"/>
    <circle cx="39" cy="9" r="3" fill="${ORANGE}"/>
  </g>
  <text x="120" y="102" class="brand-text-stacked">LotFoundry<tspan class="brand-dot">.</tspan></text>
</svg>
`;

async function renderOgImage() {
  console.log("Rendering 1200x630 OpenGraph card with Playwright...");
  const parcelAfterBase64 = fs.readFileSync(
    path.join(PUBLIC_DIR, "landing", "a-lot-more", "parcel-after.webp")
  ).toString("base64");

  const ogHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 600;
  src: url(data:font/woff2;base64,${sgBase64}) format('woff2');
}
@font-face {
  font-family: 'Manrope';
  font-style: normal;
  font-weight: 600;
  src: url(data:font/woff2;base64,${mrBase64}) format('woff2');
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1200px;
  height: 630px;
  background-color: ${CHALK};
  color: ${CARBON};
  font-family: 'Manrope', -apple-system, sans-serif;
  overflow: hidden;
  position: relative;
  display: flex;
}
.frame {
  width: 1200px;
  height: 630px;
  position: absolute;
  inset: 0;
  display: flex;
}
.left-col {
  width: 580px;
  height: 100%;
  padding: 60px 48px 60px 64px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  z-index: 2;
}
.brand-lockup {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.055em;
  color: ${CARBON};
}
.brand-dot {
  color: ${ORANGE};
}
.main-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.kicker {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${STONE};
}
.headline {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 56px;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.05em;
  color: ${CARBON};
}
.subhead {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.45;
  color: ${STONE};
  max-width: 460px;
}
.metrics-card {
  display: flex;
  gap: 28px;
  padding: 16px 20px;
  background: #EFEFEA;
  border: 1px solid ${LINE};
  border-radius: 0;
  box-shadow: 6px 8px 0 #E2E2D9;
}
.metric-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.metric-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${STONE};
}
.metric-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px;
  font-weight: 600;
  color: ${CARBON};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}
.metric-badge {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #176B4C;
  margin-top: 5px;
}
.right-col {
  position: absolute;
  right: -20px;
  top: 15px;
  width: 680px;
  height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.right-col img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.08));
}
.border-inset {
  position: absolute;
  inset: 12px;
  border: 1px solid ${LINE};
  pointer-events: none;
  z-index: 10;
}
</style>
</head>
<body>
<div class="border-inset"></div>
<div class="frame">
  <div class="left-col">
    <div class="brand-lockup">
      <svg width="40" height="40" viewBox="0 0 48 48">
        <path d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11" fill="none" stroke="${CARBON}" stroke-width="4"/>
        <circle cx="39" cy="9" r="3" fill="${ORANGE}"/>
      </svg>
      <span class="brand-name">LotFoundry<span class="brand-dot">.</span></span>
    </div>

    <div class="main-content">
      <p class="kicker">ADU Feasibility Studio</p>
      <h1 class="headline">See what your backyard can become.</h1>
      <p class="subhead">Instant zoning, build cost, and rental feasibility estimates for your property.</p>
    </div>

    <div class="metrics-card">
      <div class="metric-col">
        <span class="metric-label">Estimated Rent</span>
        <span class="metric-value">$2,400<span style="font-size: 15px; font-weight: 500; color: ${STONE}"> /mo</span></span>
      </div>
      <div style="width: 1px; background: ${LINE};"></div>
      <div class="metric-col">
        <span class="metric-label">Payback Period</span>
        <span class="metric-value">14.8<span style="font-size: 15px; font-weight: 500; color: ${STONE}"> yrs</span></span>
      </div>
      <div style="width: 1px; background: ${LINE};"></div>
      <div class="metric-col">
        <span class="metric-label">Status</span>
        <span class="metric-badge">● Eligible</span>
      </div>
    </div>
  </div>

  <div class="right-col">
    <img src="data:image/webp;base64,${parcelAfterBase64}" alt="LotFoundry 3D Model" />
  </div>
</div>
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  await page.setContent(ogHtml, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  const screenshot = await page.screenshot({ type: "png" });
  await page.close();
  await browser.close();

  const ogPngPath = path.join(PUBLIC_DIR, "lotfoundry-og.png");
  await sharp(screenshot)
    .png({ compressionLevel: 9 })
    .toFile(ogPngPath);

  console.log("Generated lotfoundry-og.png:", fs.statSync(ogPngPath).size, "bytes");
}

async function run() {
  console.log("Updating public SVG brand files to A LOT MORE...");
  fs.writeFileSync(path.join(PUBLIC_DIR, "lotfoundry-mark-primary.svg"), markPrimarySvg, "utf8");
  fs.writeFileSync(path.join(PUBLIC_DIR, "lotfoundry-mark-dark.svg"), markDarkSvg, "utf8");
  fs.writeFileSync(path.join(PUBLIC_DIR, "lotfoundry-mark-mono.svg"), markMonoSvg, "utf8");
  fs.writeFileSync(path.join(PUBLIC_DIR, "lotfoundry-lockup-horizontal.svg"), lockupHorizontalSvg, "utf8");
  fs.writeFileSync(path.join(PUBLIC_DIR, "lotfoundry-lockup-horizontal-inverse.svg"), lockupHorizontalInverseSvg, "utf8");
  fs.writeFileSync(path.join(PUBLIC_DIR, "lotfoundry-lockup-stacked.svg"), lockupStackedSvg, "utf8");

  await renderOgImage();
  console.log("All brand assets successfully updated!");
}

run().catch((err) => {
  console.error("Failed to render brand assets:", err);
  process.exit(1);
});

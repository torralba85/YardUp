import { COLOR } from "./design-tokens";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";
import { buildReportHtml } from "./report";
import { landingDemos, type LandingCity } from "./landing-demo";
import { PRIMARY_CTA_LABEL, SITE_NAV_LINKS } from "./site-nav";

export function sampleCertificateResponse(city: LandingCity) {
  const demo = landingDemos[city];
  const parcel = getParcelById(demo.parcelId);
  // Mirrors PublicHeader (lib/site-nav): the same links, labels, lockup and call to action. The
  // response's CSP blocks image fetches, so the parcel mark is inline SVG.
  const navLinks = SITE_NAV_LINKS.map((link) => `<a href="${link.href}" target="_top">${link.label}</a>`).join("");
  const lockup = `<a class="sample-brand" href="/" target="_top" aria-label="LotFoundry home"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="39" cy="9" r="3" fill="${COLOR["lot-orange"]}"/></svg><span aria-hidden="true">LotFoundry.</span></a>`;
  const topNav = `<nav class="sample-topbar" aria-label="Primary">${lockup}<div class="sample-links">${navLinks}<a class="sample-nav-cta" href="/studio" target="_top">${PRIMARY_CTA_LABEL} &rarr;</a><details class="sample-menu"><summary aria-label="Navigation menu">Menu</summary><div>${navLinks}</div></details></div></nav>`;
  const startLink = `<div class="sample-action"><a href="/studio" target="_top">${PRIMARY_CTA_LABEL}</a><p>Explore your address in the Studio. Planning estimates only.</p></div>`;
  const html = buildReportHtml({
    parcel,
    config: defaultAduConfig,
    result: calculateFeasibility(parcel, defaultAduConfig, { ...defaultFinancialAssumptions, rentScenario: "market" }),
    recordedAt: new Date("2026-10-16T12:00:00Z"),
  })
    .replace("</style>", `
    .sample-topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; max-width: 820px; margin: 0 auto; padding: 14px 24px; border-bottom: 1px solid var(--line); }
    .sample-brand { font-family: "Space Grotesk", Arial, sans-serif; font-size: 22px; font-weight: 600; letter-spacing: -0.055em; color: var(--ink); text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; gap: 8px; }
    .sample-brand svg { width: 26px; height: 26px; }
    .sample-links { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
    .sample-links a { font-size: 14px; font-weight: 500; color: var(--ink); text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
    .sample-links a:hover { color: var(--ink); }
    .sample-links a.sample-nav-cta { padding: 8px 14px; border-radius: 3px; background: ${COLOR["lot-orange"]}; color: var(--ink); }
    .sample-links a.sample-nav-cta:hover { background: ${COLOR["lot-orange-hover"]}; }
    .sample-menu { display: none; position: relative; }
    .sample-menu summary { display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 3px; font-size: 14px; font-weight: 600; color: var(--ink); cursor: pointer; list-style: none; }
    .sample-menu summary::-webkit-details-marker { display: none; }
    .sample-menu > div { position: absolute; right: 0; top: calc(100% + 6px); z-index: 2; display: flex; flex-direction: column; min-width: 200px; padding: 6px 14px; border: 1px solid var(--line); background: var(--paper); }
    .sample-menu > div a { display: flex !important; color: var(--ink); border-bottom: 1px solid var(--line); }
    .sample-menu > div a:last-child { border-bottom: 0; }
    .sample-intro, .sample-action { max-width: 820px; margin: 16px auto; padding: 12px 24px; }
    .sample-action a { display: inline-flex; align-items: center; min-height: 44px; padding: 10px 18px; border-radius: 3px; background: var(--ink); color: var(--paper); font-weight: 600; text-decoration: none; }
    .sample-action a:hover { background: ${COLOR["lot-ink-hover"]}; }
    .sample-action a:focus-visible, .sample-topbar a:focus-visible { outline: 2px solid var(--clay); outline-offset: 3px; }
    .sample-action p { margin: 8px 0 0; }
    @media (max-width: 680px) {
      .sample-topbar { padding: 10px 12px; }
      .sample-links a:not(.sample-nav-cta) { display: none; }
      .sample-menu { display: block; }
      .sample-intro, .sample-action { padding: 8px 12px; }
    }
    @media print { .sample-topbar, .sample-intro, .sample-action { display: none; } }
  </style>`)
    .replace("<body>", `<body>${topNav}<p class="sample-intro">Public sample · fictional ${demo.city} demo · market rent assumption. Use your browser’s Print menu to save as PDF.</p>${startLink}`)
    .replace("</body>", `${startLink}</body>`);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
    },
  });
}

import { COLOR } from "./design-tokens";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";
import { buildReportHtml } from "./report";
import { landingDemos, type LandingCity } from "./landing-demo";

export function sampleCertificateResponse(city: LandingCity) {
  const demo = landingDemos[city];
  const parcel = getParcelById(demo.parcelId);
  const topNav = `<nav class="sample-topbar" aria-label="Primary"><a class="sample-brand" href="/" target="_top">LotFoundry</a><div class="sample-links"><a href="/can-i-build-a-backyard-home" target="_top">Lot quiz</a><a href="/adu/ca" target="_top">ADU rules</a><a href="/adu-cost-calculator" target="_top">Calculator</a><a class="sample-nav-cta" href="/studio?parcel=${encodeURIComponent(demo.parcelId)}" target="_top">Open studio</a></div></nav>`;
  const startLink = `<div class="sample-action"><a href="/studio" target="_top">Start with my lot</a><p>Explore your address in the Studio. Planning estimates only.</p></div>`;
  const html = buildReportHtml({
    parcel,
    config: defaultAduConfig,
    result: calculateFeasibility(parcel, defaultAduConfig, { ...defaultFinancialAssumptions, rentScenario: "market" }),
    recordedAt: new Date("2026-10-16T12:00:00Z"),
  })
    .replace("</style>", `
    .sample-topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; max-width: 820px; margin: 0 auto; padding: 14px 24px; border-bottom: 1px solid var(--line); }
    .sample-brand { font-family: "Space Grotesk", Arial, sans-serif; font-size: 16px; font-weight: 600; letter-spacing: -0.03em; color: var(--ink); text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
    .sample-links { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
    .sample-links a { font-size: 13px; font-weight: 600; color: var(--muted); text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
    .sample-links a:hover { color: var(--ink); }
    .sample-links a.sample-nav-cta { padding: 8px 14px; border-radius: 3px; background: ${COLOR["lot-orange"]}; color: var(--ink); }
    .sample-links a.sample-nav-cta:hover { background: ${COLOR["lot-orange-hover"]}; }
    .sample-intro, .sample-action { max-width: 820px; margin: 16px auto; padding: 12px 24px; }
    .sample-action a { display: inline-flex; align-items: center; min-height: 44px; padding: 10px 18px; border-radius: 3px; background: var(--ink); color: var(--paper); font-weight: 600; text-decoration: none; }
    .sample-action a:hover { background: ${COLOR["lot-ink-hover"]}; }
    .sample-action a:focus-visible, .sample-topbar a:focus-visible { outline: 2px solid var(--clay); outline-offset: 3px; }
    .sample-action p { margin: 8px 0 0; }
    @media (max-width: 680px) {
      .sample-topbar { padding: 10px 12px; }
      .sample-links a:not(.sample-nav-cta) { display: none; }
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

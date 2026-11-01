import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";
import { buildReportHtml } from "./report";
import { landingDemos, type LandingCity } from "./landing-demo";

export function sampleCertificateResponse(city: LandingCity) {
  const demo = landingDemos[city];
  const parcel = getParcelById(demo.parcelId);
  const startLink = `<div class="sample-action"><a href="/studio" target="_top">Start with my lot</a><p>Explore your address in the Studio. Planning estimates only.</p></div>`;
  const html = buildReportHtml({
    parcel,
    config: defaultAduConfig,
    result: calculateFeasibility(parcel, defaultAduConfig, { ...defaultFinancialAssumptions, rentScenario: "market" }),
    recordedAt: new Date("2026-10-16T12:00:00Z"),
  })
    .replace("</style>", `
    .sample-intro, .sample-action { max-width: 820px; margin: 16px auto; padding: 12px 24px; }
    .sample-action a { display: inline-flex; align-items: center; min-height: 44px; padding: 10px 18px; border-radius: 3px; background: var(--ink); color: var(--paper); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
    .sample-action a:focus-visible { outline: 2px solid var(--clay); outline-offset: 3px; }
    .sample-action p { margin: 8px 0 0; }
    @media print { .sample-action { display: none; } }
  </style>`)
    .replace("<body>", `<body><p class="sample-intro">Public sample · fictional ${demo.city} demo · market rent assumption. Use your browser’s Print menu to save as PDF.</p>${startLink}`)
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

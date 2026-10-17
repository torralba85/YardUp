import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";
import { buildReportHtml } from "./report";
import { landingDemos, type LandingCity } from "./landing-demo";

export function sampleCertificateResponse(city: LandingCity) {
  const demo = landingDemos[city];
  const parcel = getParcelById(demo.parcelId);
  const html = buildReportHtml({
    parcel,
    config: defaultAduConfig,
    result: calculateFeasibility(parcel, defaultAduConfig, { ...defaultFinancialAssumptions, rentScenario: "market" }),
    recordedAt: new Date("2026-10-16T12:00:00Z"),
  }).replace("<body>", `<body><p style="max-width:850px;margin:16px auto;padding:12px">Public sample · fictional ${demo.city} demo · market rent assumption. Use your browser’s Print menu to save as PDF.</p>`);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
    },
  });
}

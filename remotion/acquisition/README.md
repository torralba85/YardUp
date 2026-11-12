# Acquisition demonstration videos — November 11, 2026

Two silent 24-second 1080×1920 / 30fps compositions, with visible explanatory text:
`AduSizeComparison` and `AduFinancing`. These are illustrative marketing examples,
not property reports, local construction quotes or lender offers.

```text
npx remotion studio remotion/acquisition/index.tsx --public-dir=remotion/acquisition/assets --no-open
npx remotion render remotion/acquisition/index.tsx AduSizeComparison size-comparison.mp4 --public-dir=remotion/acquisition/assets
npx remotion render remotion/acquisition/index.tsx AduFinancing financing.mp4 --public-dir=remotion/acquisition/assets
```

`data.json` is a dated snapshot derived from `estimateAdu` and
`calculateMonthlyPayment`. San Diego County, cedar finish, conservative HUD FY2027
one-bedroom rent, national construction base. Both 600/800 sq ft use the same rent
anchor; modeled build ranges differ. Loan: $120,000, 6.5% annual fixed rate (0.065
in the finance function), fully amortizing over 30 years. Model output, assumptions
and exclusions remain visible. Refresh and independently check the snapshot before
reusing the campaign after model changes.

`assets/` contains real calculator screenshots captured locally with measurement
declined. They stay out of `public/` so deploying the site does not upload media
production assets. The parcel diagrams are original illustrative SVGs; no generated
photography, voice or third-party footage is used.

The campaign kit, SRT captions, platform copy, descriptions and rendering evidence
are in the outer workspace at `artifacts/traffic-growth-2026-11-11/`. No videos are
automatically published by a site deployment.

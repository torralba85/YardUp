# YardUp mobile redesign implementation

This folder now contains two runnable entries:

- `YardUp Redesign.html` — original design canvas / artboard review.
- `mobile-app.html` — implemented app-style prototype using the same redesign primitives.

## Implemented aspects

- AR-first onboarding flow: welcome → scan → scan result.
- Single long Project Page replacing the old tabbed IA.
- Project detail drill-ins for Cost, Fit, Permit, and Build.
- Calm-minimal YardUp visual system: warm paper, serif money moments, mono data labels, sparse hairlines, visible assumptions.
- iOS / Android frame switch and Paper / Dusk theme switch for quick review.

## How to run

Open `mobile-app.html` in a browser from the folder, or serve the folder locally and visit `/mobile-app.html`.

The implementation reuses existing files instead of rewriting the artboards:

- `yardup-min.jsx`
- `onboarding-min.jsx`
- `project-page.jsx`
- `detail-screens.jsx`
- `ios-frame.jsx`
- `android-frame.jsx`

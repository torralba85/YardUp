# Archive — superseded design material

**Nothing in this directory carries design authority. Do not apply any of it to new work.**

These documents describe systems and audits that LotFoundry has retired. They are kept because the
reasoning in them is sometimes still useful — competitive research, accessibility findings, why a
particular decision was made — but every *rule*, token, font and colour in them is superseded by
[`../design-system.md`](../design-system.md).

If you are here because a search hit landed you here: go to [`../README.md`](../README.md).

| File | What it was | Retired |
|---|---|---|
| `DESIGN-v3-blue-hour-golden-hour.md` | The full previous design system — "Surveyor's desk at golden hour", the Blue Hour / Golden Hour dual-lighting split, clay/forest/amber/brick semantics, the two-serif rule, the pill-radius system. Was `DESIGN.md` at the repo root. | 2026-09-05 |
| `2026-07-05-design-audit.md` | Design audit against the v3 system. | 2026-09-05 |
| `2026-07-11-cross-platform-viewing-audit.md` | Cross-platform viewing audit. | 2026-09-05 |
| `2026-07-15-studio-color-ux.md` | Studio colour/UX pass under the v3 system. | 2026-09-05 |

## What specifically is dead

Called out because these are the rules most likely to be repeated from memory or pattern-matched out of
old specs:

- **Blue Hour / Golden Hour dual lighting** and the dawn-ramp seam between them.
- **"Green is money, always."** Green is now an eligible/verified *status* colour and never money.
- **The amber firewall** (window-glow vs. risk amber).
- **The two-serif rule** — Fraunces persuades, Cormorant records.
- **The mono recorded-fact layer** (IBM Plex Mono / DM Mono, uppercase, tracked).
- **The pill-radius system** (`rounded-full` controls).
- **The poster hero with a bottom-docked instrument rail.**
- **Warm sand / clay / espresso as the brand ground.**
- The `ln-*` Blue Hour tokens and the `nocturne` landing components — deleted from the codebase
  2026-09-05.

## Still live in code

The Golden Hour palette and its semantics are **still running** on the studio, auth, builder, report,
certificate and email surfaces. That is not this archive's job to describe — see
[`../product-surfaces.md`](../product-surfaces.md), which is the accurate, maintained record of what
those surfaces use today and how they migrate.

Historical specs under `docs/superpowers/specs/` also reference the retired system. They are design
records of work already shipped; read them for history, not for rules.

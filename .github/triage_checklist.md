# Issue Triage Checklist

Follow these steps for every newly submitted issue before assigning prioritization labels.

- [ ] **Check for Duplicates:** Search open and closed issues for similar error messages, symptom keywords, or context.
  - *Action if duplicate:* Mark as duplicate of #<number> and close the issue.
- [ ] **Review Environment Info:** Verify the issue provides OS version, runtime version, and library/dependency version.
- [ ] **Validate Reproducibility:**
  - [ ] Are the reproduction steps clear and complete?
  - [ ] Is there a Minimal Reproducible Example (MRE) or code block?
  - [ ] Try reproducing locally using the details provided.
  - *Action if missing/unclear:* Apply `status: needs-repro` label and request missing details.
- [ ] **Security Screening:** Ensure the issue does not expose raw API keys, production tokens, or sensitive user data.
  - *Action if leaked:* Immediately edit/delete the post content and cycle any leaked credentials.
- [ ] **Apply Classification Labels:**
  - [ ] `type: bug`, `type: feature`, or `type: chore`.
  - [ ] Component tags (e.g., `area: auth`, `area: database`).
- [ ] **Determine Priority:** Evaluate Severity vs. Impact and apply a single priority tag: `P0`, `P1`, `P2`, or `P3`.
- [ ] **Assign Ownership:** If it's a P0/P1 issue, assign it to a team member or milestone. If suitable for community, apply `good-first-issue`.

## Priority Matrix (Severity x Impact)

| | **Low impact** (few users, cosmetic) | **High impact** (most users, or blocks core flow) |
|---|---|---|
| **Severity: Critical** (data loss, security, prod down) | `P1` | `P0` |
| **Severity: High** (broken feature, no workaround) | `P2` | `P1` |
| **Severity: Low** (visual glitch, minor edge case) | `P3` | `P2` |

- `P0` — drop everything; fix or roll back immediately (prod outage, data
  loss, security exposure, payment/auth broken).
- `P1` — fix within the current work session/day (core feasibility, studio,
  or checkout flow broken for a meaningful subset of users).
- `P2` — scheduled normally (non-blocking bug, degraded but usable feature).
- `P3` — best-effort (cosmetic, rare edge case, nice-to-have).

## Label Taxonomy Reference

| Label | Meaning |
|---|---|
| `type: bug` | Confirmed defect in existing behavior. |
| `type: feature` | New functionality request. |
| `type: chore` | Tooling, deps, config, non-behavioral cleanup. |
| `status: triage` | Newly opened, not yet reviewed against this checklist. |
| `status: needs-repro` | Missing environment info or a reliable reproduction. |
| `status: flaky` | Reproduces intermittently; tracked per `docs/debugging-methodology.md` rather than immediately fixed or deleted. |
| `status: stale` | No activity from reporter/assignee; candidate for closing. |
| `wontfix` | Valid report, deliberately not addressing (state the reason in a comment before closing). |
| `security` | Vulnerability or sensitive-data exposure — route via `SECURITY.md`, do not leave details in a public issue. |
| `good-first-issue` | Small, well-scoped, suitable for a new contributor. |
| `area: <name>` | Subsystem tag, e.g. `area: studio`, `area: auth`, `area: ai`, `area: stripe`, `area: parcel`. |
| `P0`–`P3` | Priority from the matrix above. |

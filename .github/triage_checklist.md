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
- [ ] **Determine Priority:** Evaluate Severity vs. Impact and apply a single priority tag: `P0`, `P1`, `P2`, or `P3` (matrix below).
- [ ] **Assign Ownership:** If it's a P0/P1 issue, assign it to a team member or milestone. If suitable for community, apply `good-first-issue`.

## Priority matrix (Severity x Impact)

Severity = how badly it breaks things when it happens. Impact = how many
users/paths hit it. Use the higher of the two axes when they disagree (e.g. a
high-severity bug hit by one user on an edge case is still P1, not P3).

| | **High impact** (most users / core flow) | **Low impact** (edge case / few users) |
|---|---|---|
| **High severity** (data loss, broken auth/payments, security, prod down) | **P0** — drop everything, fix/rollback same day | **P1** — next available cycle, no overnight sit |
| **Low severity** (cosmetic, non-blocking, workaround exists) | **P2** — scheduled within the current/next milestone | **P3** — backlog, `good-first-issue` candidate |

## Label taxonomy

| Label | Meaning |
|---|---|
| `type: bug` / `type: feature` / `type: chore` | What kind of work this is. |
| `area: <name>` | Subsystem touched (e.g. `area: auth`, `area: parcel`, `area: ai`, `area: stripe`). |
| `status: triage` | Default on intake (set by the issue templates); removed once classified. |
| `status: needs-repro` | Missing or unclear reproduction steps/MRE; owner must respond before further triage. |
| `P0` / `P1` / `P2` / `P3` | Priority per the matrix above. |
| `good-first-issue` | Well-scoped, low-risk, suitable for a new contributor. |
| `security` | Touches auth, secrets, Firestore rules, or Stripe webhook verification; gets a security screening pass regardless of priority. |
| `wontfix` | Acknowledged, deliberately not actioned; comment with the reason before closing. |
| `stale` | No activity within the inactivity window; candidate for closing if it doesn't get a response. |

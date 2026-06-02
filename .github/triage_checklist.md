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

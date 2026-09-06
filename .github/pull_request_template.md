## Summary
<!-- Provide a concise 1-2 sentence description of what this PR does and why -->

## Related Issues
<!-- Closes #123, Fixes #456 -->

## Type of Change
- [ ] Bug fix (`type: bug`)
- [ ] New feature (`type: feature`)
- [ ] Tooling, dependencies, or maintenance (`type: chore`)
- [ ] Documentation (`type: docs`)
- [ ] Security fix or hardening (`type: security`)

---

# Pull Request Checklist

Before submitting this PR, please ensure you have checked the following criteria:

## Author Checklist

### Code Quality & Standards
- [ ] My code follows `docs/design/` (the design source of truth) and the style rules in `CLAUDE.md` (TypeScript strict mode, two-space indent, `@/*` imports).
- [ ] `npm run lint` passes with zero warnings.
- [ ] `npx tsc --noEmit` passes with no type errors.

### Testing & Verification
- [ ] I have added or updated unit tests (`npm test`) to verify my changes.
- [ ] `npm run build` succeeds locally.
- [ ] I have verified the changes manually in a development environment (`npm run dev`), including mobile/responsive states for UI changes.
- [ ] For landing, studio, or responsive UI changes, I ran or updated relevant `npm run test:e2e` Playwright coverage.

### Documentation
- [ ] I have updated relevant docs (`README.md`, `docs/`, `CLAUDE.md`/`AGENTS.md`) to reflect my changes.
- [ ] If I added or changed an environment variable, I have documented it in `CLAUDE.md`/`README.md` (never committed secrets to `.env.local` or `functions/.env`).

### Release & Commit Hygiene
- [ ] My PR commits follow the Conventional Commits specification (`feat:`, `fix:`, `chore:`, etc.).
- [ ] This PR introduces breaking changes *(if checked, explain migration path in summary)*.

---

## Reviewer Checklist
- [ ] The PR addresses the linked issue correctly.
- [ ] The code is clean, readable, and properly modularized.
- [ ] Test coverage is sufficient for the scope of the change.
- [ ] No credentials, secret keys, or local absolute file paths are checked in.

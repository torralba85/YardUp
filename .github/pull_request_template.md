# Pull Request Checklist

Before submitting this PR, please ensure you have checked the following criteria.

## Author Checklist

### Code Quality & Standards
- [ ] My code follows the code style guide of this project.
- [ ] I have executed local linters (`npm run lint` / `cargo clippy` etc.) and they pass without warnings.
- [ ] I have formatted my code locally (`npm run format` / `cargo fmt`).

### Testing & Verification
- [ ] I have added automated unit/integration tests to verify my changes.
- [ ] All existing and new tests pass locally (`npm run test`).
- [ ] I have verified the changes manually in a development environment.

### Documentation
- [ ] I have updated the documentation (README, API references, code comments) to reflect my changes.
- [ ] If changing environment variables, I have updated the `.env.example` file.

### Release Impact
- [ ] My PR commits follow the Conventional Commits specification.
- [ ] This PR introduces breaking changes. *(If checked, explain the migration path in the description below)*.

---

## Reviewer Checklist
- [ ] The PR addresses the linked issue correctly.
- [ ] The code is clean, readable, and properly modularized.
- [ ] Test coverage is sufficient for the scope of the change.
- [ ] No credentials, local absolute file paths, or private data are checked in.

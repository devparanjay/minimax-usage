# Phase 05 — Test Tasks

**Phase owner:** `software-tester`
**Status:** not started

## Tasks

- [ ] Produce `.kitchen/test/test-plan-v0.1.0.md` covering the
      happy path and every error state.
- [ ] Produce `.kitchen/test/manual-smoke-v0.1.0.md` — the
      manual install / configure / use walkthrough the project
      owner can repeat.
- [ ] Execute the manual smoke test with a real API key
      provided by the project owner (added locally, not
      committed).
- [ ] Execute the error-state scenarios (invalid key, expired
      key, network down, rate limit, partial data).
- [ ] Capture any defects with severity and disposition.
- [ ] Confirm the test report with the project owner.
- [ ] Update this task file and the phase plan to `complete`.
- [ ] Hand off any blocking defects to phase 04 for a fix on
      `v0.1.0` (or escalate to the project owner).

## Blockers

(depends on phase 04; requires a real API key from the project
owner)

# Phase 05 — Test

**Owner:** `software-tester`
**Status:** not started (depends on phase 04)
**Goal:** exercise the v0.1.0 extension end-to-end against the
real MiniMax API and confirm the acceptance criteria from the
user story.

## Inputs

- Working extension from phase 04.
- Acceptance criteria from phase 01.
- A real API key provided by the project owner (added locally,
  not committed).

## Deliverables

- `.kitchen/test/test-plan-v0.1.0.md` — what was tested, how, and
  the outcome.
- `.kitchen/test/manual-smoke-v0.1.0.md` — the manual install /
  configure / use walkthrough the project owner can repeat.
- A list of any defects, with severity and disposition (fix in
  v0.1.0, defer to v0.1.1, defer to v0.2.0, won't fix).
- Updated `.kitchen/roadmaps/v0.1.0/phases/05-test.md`.

## Tasks

See `.kitchen/roadmaps/v0.1.0/tasks/05-test-tasks.md`.

## Verification

- The full user path passes with a real API key.
- The error states (invalid key, expired key, network down,
  rate limit) behave as designed.
- The test report is reviewed by the orchestrator and signed
  off.
- Any blocking defects are fixed on `v0.1.0` (or escalated to
  the project owner if the fix is out of scope).

## Out of scope

- Automated UI tests in the extension's CI (deferred to a later
  version unless trivial).
- Load / performance testing.

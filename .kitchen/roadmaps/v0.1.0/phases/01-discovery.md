# Phase 01 — Discovery

**Owner:** `solution-architect` (lead) + `business-analyst` (support)
**Status:** complete
**Last updated:** 2026-06-02
**Goal:** produce a verified API contract for MiniMax usage data and
confirm the user story, edge cases, and acceptance criteria for v0.1.0.

## Inputs

- Kickoff discussion record (`.kitchen/discussion/2026-06-02-kickoff.md`).
- v0.1.0 roadmap (`.kitchen/roadmaps/v0.1.0/roadmap.md`).
- MiniMax official docs:
  - `https://platform.minimax.io/docs/`
  - `https://platform.minimax.io/docs/api-reference/api-overview`
- Reference repo (for behaviour reference only, no code copying):
  `https://github.com/JochenYang/minimax-status`.

## Deliverables

- `.kitchen/architecture/api-contract.md` — endpoint URLs, auth
  header format, request/response shapes, error responses,
  rate-limit guidance. Includes TypeScript types and example JSON.
- `.kitchen/discussion/YYYY-MM-DD-discovery.md` — record of what
  was learned, what is still unknown, and what was decided.
- Updated `.kitchen/roadmaps/v0.1.0/phases/01-discovery.md` with
  the final task status.
- A short list of confirmed user-story edge cases (invalid key,
  expired key, network down, rate limit, etc.).

## Tasks

See `.kitchen/roadmaps/v0.1.0/tasks/01-discovery-tasks.md` for the
task-level breakdown. The phase is complete when every task is
checked off and the API contract document is reviewed.

## Verification

- The API contract is reviewed by the orchestrator (FooFoo) and
  signed off.
- The contract document references the MiniMax official docs
  (URL + section) for every endpoint and field.
- Where the docs are silent, the contract records the ambiguity
  explicitly and the project owner is asked.

## Outcome (delivered 2026-06-02)

- API contract written to
  `.kitchen/architecture/api-contract.md`. Endpoints, auth,
  request/response shapes, error responses, caching guidance,
  TypeScript types, and an example JSON payload are in the
  document. Every endpoint and field is either cited to the
  official docs or marked `[AMBIGUOUS]` with a Phase 02
  verification step.
- Discovery discussion record at
  `.kitchen/discussion/2026-06-02-discovery.md` — what was
  learned, what was decided, what was flagged back to the
  project owner.
- Edge cases for v0.1.0 captured in the discussion record:
  invalid key, expired key, network down, rate limit, partial
  data, quota exhausted, region mismatch, transient server
  error — each with the expected user experience.
- Reference repo license (MIT) was confirmed compatible with
  the "reference use" policy in ADR 0003. No code or
  non-trivial structure was copied from the reference repo.

### Scope changes flagged to the project owner

The v0.1.0 roadmap originally listed "Credits: Balance" and
historical usage timeseries ("Hourly Usage / 5 Hours Usage /
Daily Usage / Weekly Usage") as in-scope. Discovery found:

- The standalone "Credits Balance" number lives on a
  cookie-only endpoint that is not callable from a backend
  tool. The Token Plan progress bars already include any
  purchased-Credit draw.
- The `token_plan/remains` endpoint returns a *current*
  snapshot, not a timeseries. There is no documented
  timeseries endpoint.

**Decision:** both lines are deferred. v0.1.0 ships the two
progress bars + countdowns. See the discussion record § 8 and
the contract § 3 for the rationale and the v0.2.0 follow-up.

### Open `[AMBIGUOUS]` items to resolve in Phase 02

- Success envelope shape (does `base_resp` appear on 200s?).
- Timestamp units (ms vs s for `start_time`, `remains_time`,
  `weekly_remains_time`, `weekly_start_time`, `weekly_end_time`).
- Whether the `Referer` header is required in practice.
- Region auto-detection from the key shape (currently
  user-picked; v0.2.0 candidate).

Live verification will use a real Subscription Key supplied by
the project owner. Captured redacted responses become follow-up
discussion records.

## Out of scope

- Implementation. No code is written in this phase.
- Visual design. That belongs to phase 03.
- Architecture decisions beyond "what does the API look like?"
  (those belong to phase 02).

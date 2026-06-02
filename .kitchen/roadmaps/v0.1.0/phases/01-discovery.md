# Phase 01 — Discovery

**Owner:** `solution-architect` (lead) + `business-analyst` (support)
**Status:** not started
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

## Out of scope

- Implementation. No code is written in this phase.
- Visual design. That belongs to phase 03.
- Architecture decisions beyond "what does the API look like?"
  (those belong to phase 02).

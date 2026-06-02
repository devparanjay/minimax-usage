# Phase 02 — Architecture

**Owner:** `technical-architect`
**Status:** not started (depends on phase 01)
**Goal:** produce the extension's module architecture, settings
schema, state model, webview design, and build/publish pipeline
shape, in line with the API contract from phase 01.

## Inputs

- API contract from phase 01.
- v0.1.0 roadmap.
- VSCode extension best-practice references (built into the
  `technical-architect` agent's knowledge).

## Deliverables

- `.kitchen/architecture/extension-architecture.md` — module
  layout, activation flow, settings schema, state model.
- `.kitchen/architecture/data-flow.md` — sequence/state
  transitions for the main user paths.
- `.kitchen/architecture/security.md` — how the API key is held
  (VSCode SecretStorage), how errors are surfaced, threat model.
- `.kitchen/architecture/build-and-publish.md` — build,
  package, and publish pipeline detail (in concert with phase 06).
- Updated `.kitchen/roadmaps/v0.1.0/phases/02-architecture.md`.

## Tasks

See `.kitchen/roadmaps/v0.1.0/tasks/02-architecture-tasks.md`.

## Verification

- The architecture documents are reviewed by the orchestrator and
  signed off.
- The settings schema matches the fields the user has to enter
  (API key, display mode) without unnecessary noise.
- The data-flow document covers the happy path and the error
  states agreed in phase 01.

## Out of scope

- Code. The architecture documents describe the *what* and the
  *why*; phase 04 produces the *how*.
- Visual design. Phase 03.
- Pipeline implementation. Phase 06.

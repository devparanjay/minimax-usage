# Phase 03 — Design

**Owners:** `ux-designer` (flow) + `ui-designer` (visual) +
`ux-writer` (text)
**Status:** not started (depends on phase 02)
**Goal:** produce the user-flow, wireframes, and visual design for
the usage modal, status bar entry, and settings UI, plus the
canonical user-facing strings.

## Inputs

- Architecture from phase 02 (especially the data-flow and the
  settings schema).
- API contract from phase 01 (to know what fields are available).
- v0.1.0 user story (kickoff discussion).

## Deliverables

- `.kitchen/design/user-flow-v0.1.0.md` — wireframe-level user
  flow for the modal, status bar, and settings.
- `.kitchen/design/ui-spec-v0.1.0.md` — visual spec: status bar
  icon, modal layout, progress-bar styling, color tokens,
  typography, spacing.
- `.kitchen/design/strings-v0.1.0.md` — canonical user-facing
  strings (notification text, settings labels, status bar text,
  modal copy, error messages). Banned-words list if any.
- Updated `.kitchen/roadmaps/v0.1.0/phases/03-design.md`.

## Tasks

See `.kitchen/roadmaps/v0.1.0/tasks/03-design-tasks.md`.

## Verification

- The user-flow covers install → API key → settings → status bar
  → modal end-to-end, including the error states.
- The strings document is the **single source of truth** for
  user-facing text. The implementation in phase 04 uses these
  strings verbatim.
- The design is reviewed by the orchestrator and signed off.

## Out of scope

- Implementation. Phase 04.
- Documentation. Phase 07.

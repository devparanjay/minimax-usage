# v0.1.0 Timeline

**Version:** v0.1.0
**Status:** planning — phases defined, dates not yet committed
**Last updated:** 2026-06-02

This is a phase-level timeline. Dates are deliberately left as TBD
until the discovery phase produces a realistic API contract and
the project owner signs off on the publisher identity. The team
will not commit to dates it cannot meet.

## Phase order

```
01 Discovery   →  02 Architecture  →  03 Design  →  04 Build
                                                         ↓
                                            05 Test  ←  04
                                                ↓
                                  06 Release pipeline  (parallel to 04/05)
                                                ↓
                                          07 Documentation  (parallel to 04/05/06)
                                                ↓
                                       PR review + merge
                                                ↓
                                          v0.1.0 release
```

Phases 06 and 07 can start in parallel with 04 and 05 once their
inputs are stable. The team does not run them strictly sequentially.

## Status legend

- `not started` — phase plan exists, no work has begun.
- `in progress` — work is happening; see the phase plan.
- `blocked` — work is paused on a dependency or a decision.
- `complete` — phase plan and tasks are done, deliverable verified.

| Phase | Status      | Started       | Completed     | Notes |
|-------|-------------|---------------|---------------|-------|
| 01 Discovery        | not started | — | — | Awaiting dispatch. |
| 02 Architecture     | not started | — | — | |
| 03 Design           | not started | — | — | |
| 04 Build            | not started | — | — | |
| 05 Test             | not started | — | — | |
| 06 Release pipeline | not started | — | — | |
| 07 Documentation    | not started | — | — | |
| PR review + merge   | not started | — | — | |
| v0.1.0 release      | not started | — | — | |

## Cadence

- Status updates from the orchestrator to the project owner at the
  end of every phase and on any cross-cutting change.
- The timeline is updated as phases start and complete — it is
  the canonical answer to "where are we."

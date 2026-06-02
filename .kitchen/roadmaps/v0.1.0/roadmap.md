# v0.1.0 Roadmap

**Version:** v0.1.0
**Branch:** `v0.1.0` (cut off `main` at start of v0.1.0)
**Status:** in flight — discovery phase
**Last updated:** 2026-06-02
**Owner:** orchestrator (FooFoo)
**Goal:** end-to-end MVP that delivers the user path described in
the kickoff discussion — install, API key entry, settings choice,
status bar click, usage modal — distributed only via the VSCode
Marketplace.

## Scope (in)

- VSCode extension that activates on install and shows a
  configuration prompt for the API key.
- Settings UI for the API key and the display mode (Token Plan /
  Credits / Both).
- Status bar entry that opens a usage modal when clicked.
- Usage modal contents:
  - **Token Plan:** 5-Hour Limit progress bar with "Resets in"
    and "Quota Used"; Weekly Limit progress bar with "Resets in"
    and "Quota Used".
  - **Credits:** Balance. If data is available, also Hourly Usage,
    5 Hours Usage, Daily Usage, Weekly Usage.
- Polling strategy for near-realtime data (rate-limit-aware).
- Error states: invalid key, expired key, network down, rate
  limited.
- CI on every PR; publish pipeline on `main` release.
- User-facing docs in `/docs/`.

## Out of scope (deferred to later versions)

- Multiple profiles / workspaces.
- Notification on threshold breach (e.g. "you used 80% of weekly
  quota").
- Custom polling intervals.
- Theming / custom colors.
- Localisation beyond English.

## Phases

| #  | Phase                | Owner                | Status      | Plan                                                  |
|----|----------------------|----------------------|-------------|-------------------------------------------------------|
| 01 | Discovery            | solution-architect + business-analyst | not started | `.kitchen/roadmaps/v0.1.0/phases/01-discovery.md` |
| 02 | Architecture         | technical-architect  | not started | `.kitchen/roadmaps/v0.1.0/phases/02-architecture.md` |
| 03 | Design               | ux-designer + ui-designer + ux-writer | not started | `.kitchen/roadmaps/v0.1.0/phases/03-design.md` |
| 04 | Build                | fullstack-engineer   | not started | `.kitchen/roadmaps/v0.1.0/phases/04-build.md` |
| 05 | Test                 | software-tester      | not started | `.kitchen/roadmaps/v0.1.0/phases/05-test.md` |
| 06 | Release pipeline     | devops-engineer      | not started | `.kitchen/roadmaps/v0.1.0/phases/06-release-pipeline.md` |
| 07 | Documentation        | technical-writer     | not started | `.kitchen/roadmaps/v0.1.0/phases/07-docs.md` |

## Definition of done (v0.1.0)

A v0.1.0 release is done when **all** of the following hold:

- The phases above are complete and verified.
- The extension can be installed from the VSCode Marketplace
  listing once the `VSCE_PAT` secret is in place.
- The user path from kickoff (install → API key → settings → status
  bar → modal) is reproducible end-to-end.
- All four ADRs (`0001`–`0004`) are still in force or have been
  formally superseded.
- The `v0.1.0` branch is merged into `main` through a reviewed
  PR.
- A release is tagged on `main` and is publishable via the
  GitHub Actions workflow.
- The user-facing docs in `/docs/` are complete enough to
  install, configure, and use the extension without prior
  context.
- The kickoff discussion record and the v0.1.0 phase plans
  reflect what actually shipped.

## Risks

- **API contract changes** between the docs and what the
  MiniMax platform actually serves. Mitigation: discovery phase
  validates against live responses before any code is written
  against the contract.
- **Reference repo license incompatibility.** Mitigation: read
  reference repo's license during discovery; if incompatible,
  stop referencing and flag to the project owner.
- **Publisher identity for the VSCode Marketplace** is not yet
  confirmed. Mitigation: the project owner confirms or creates
  the publisher account before the publish phase; without it,
  the release on `main` is not publishable.
- **API rate limits** for the usage endpoint are unknown. The
  polling strategy must be defensive (caching, exponential
  back-off, debouncing on tab focus).

## Decisions referenced

- ADR `0001` — Distribution: VSCode Marketplace only.
- ADR `0002` — Version branch strategy.
- ADR `0003` — API discovery approach.
- ADR `0004` — Publishing via GitHub Actions with `VSCE_PAT`
  secret.

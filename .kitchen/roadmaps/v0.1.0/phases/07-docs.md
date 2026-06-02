# Phase 07 — Documentation

**Owner:** `technical-writer`
**Status:** not started (can run in parallel with phases 04, 05,
and 06 once the user-facing strings from phase 03 are stable)
**Goal:** complete the user-facing documentation in `/docs/`
plus the project root README so that a new user can install,
configure, and use the extension without prior context.

## Inputs

- User-facing strings from phase 03.
- Test report from phase 05.
- Architecture documents from phase 02 (for the security and
  settings sections).
- v0.1.0 user story from the kickoff discussion.

## Deliverables (under `/docs/`)

- `/docs/README.md` — index of user docs.
- `/docs/installation.md` — install from the VSCode Marketplace.
- `/docs/setup.md` — how to find the API key on the platform
  and enter it in the extension's settings.
- `/docs/usage.md` — how to read the modal, what each field
  means, what the colors mean.
- `/docs/troubleshooting.md` — invalid key, expired key,
  network down, rate limit, "modal is empty."
- `/docs/security.md` — how the API key is held, that the
  extension does not phone home, that there is no telemetry.

## Deliverables (root)

- `README.md` — project overview, screenshot, install link to
  the Marketplace, link to `/docs/`, license, contribution
  pointer.
- `CHANGELOG.md` — keep-a-changelog format, with the v0.1.0
  entry added when the release is cut.
- Updated `.kitchen/roadmaps/v0.1.0/phases/07-docs.md`.

## Tasks

See `.kitchen/roadmaps/v0.1.0/tasks/07-docs-tasks.md`.

## Verification

- A reader who has never seen the project can install, configure,
  and use the extension by following only the README and
  `/docs/`.
- The docs do not leak local paths, real API keys, or other
  sensitive data.
- The project owner reviews and signs off on the user-facing
  copy.

## Out of scope

- Internal team docs in `.kitchen/` — those are written by the
  team that owns them.
- Marketing copy, blog posts, social media — out of scope for
  v0.1.0.

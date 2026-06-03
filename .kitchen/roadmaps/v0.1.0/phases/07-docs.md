# Phase 07 — Documentation

**Owner:** `technical-writer`
**Status:** complete
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

## Outcome

The user-facing documentation under `/docs/` is complete for
v0.1.0. The index, installation, setup, usage, troubleshooting,
and security documents are committed in atomic, conventional
commits on the `v0.1.0` branch. The docs inherit the
banned-words list and the canonical glossary from
`.kitchen/design/strings-v0.1.0.md` and refer to the strings
by their canonical terms (Subscription Key, Token Plan,
Credits, 5-Hour Limit, Weekly Limit, Mainland China, Status
bar entry, Modal, Open Platform API Key, Settings).

The docs do not paraphrase strings the user sees — they
describe the purpose of each surface and the recovery path
for each error state. The Subscription Key is described as
starting with `sk-cp-`; the docs use placeholder shapes
(`sk-cp-XXXX…`, `sk-cp-…`) rather than real key values.

The root `README.md` and `CHANGELOG.md` updates called out
in the phase plan are tracked as separate phase-07 tasks and
were not part of this commit set — they are the orchestrator's
call (the kickoff discussion reserves the Marketplace-related
copy for the project owner to confirm before the first
publish). The current phase-07 commit set is the five
`/docs/` files plus the index update and this phase plan /
task list.

## Out of scope

- Internal team docs in `.kitchen/` — those are written by the
  team that owns them.
- Marketing copy, blog posts, social media — out of scope for
  v0.1.0.

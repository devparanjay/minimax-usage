# Phase 02 — Architecture

**Owner:** `technical-architect`
**Status:** complete (4 of 4 documents committed; depends on phase 01)
**Goal:** produce the extension's module architecture, settings
schema, state model, webview design, and build/publish pipeline
shape, in line with the API contract from phase 01.

## Outcome

The architecture phase produced four documents under
`.kitchen/architecture/`, each fixing one layer of the design.
Together they are the contract for the build phase (Phase 04)
and the release-pipeline phase (Phase 06).

- **`extension-architecture.md`** — module layout under
  `src/`, activation event (`*`), first-run flow, settings
  schema (`minimaxUsage.region`, `minimaxUsage.displayMode`),
  state model (persisted `globalState`, in-memory closures,
  `SecretStorage` for the key), `UsageClient` architecture
  (auth header, cache, retry, `AbortController` lifecycle,
  region-aware host selection, `getUsage` / `getCreditBalance`
  signatures), the credits-endpoint resolution plan, and the
  list of things the architecture intentionally does not do.
- **`data-flow.md`** — sequence diagrams for first-run,
  steady-state (status-bar click), polling (60s timer, focus,
  click, settings change, debounce, abort), and a per-error
  sequence diagram for each of the eight edge cases
  A–H. Includes a modal state machine (`idle | loading |
  success | empty | quota_exhausted | error:invalid_key |
  error:rate_limited | error:transient | error:unavailable`)
  with the transitions and the status-bar mirror mapping.
- **`security.md`** — API key storage (VSCode `SecretStorage`
  under `"minimaxUsage.apiKey"`), threat model (7 in-scope
  threats with mitigations and code locations, 6 out-of-scope
  threats stated explicitly), `nil` telemetry policy, five
  concrete logger redaction rules (R1–R5) for the build
  phase's `util/logger.ts`, no-`Referer` rule, no webhooks,
  the minimum permissions in `package.json`, and the
  dependency-hygiene policy.
- **`build-and-publish.md`** — esbuild with a one-paragraph
  justification, `tsconfig.json` settings, ESLint with
  `@typescript-eslint`, Vitest for the five unit-testable
  modules, `vsce package` for the `.vsix`, dev loop,
  CI shape (lint + typecheck + test + package + artifact
  upload on every PR and version-branch push), publish
  shape (release on `main` or `workflow_dispatch`, `VSCE_PAT`
  referenced by name only, dry-run default), and the
  `MINIMAX_USAGE_DEV_KEY` dev-only escape hatch (with a hard
  build failure when it leaks into a `NODE_ENV=production`
  build).

The four documents cross-reference each other and the
contract; the verification step is the orchestrator's
review (the orchestrator sign-off is in the task list).
The build phase proceeds against this contract.

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

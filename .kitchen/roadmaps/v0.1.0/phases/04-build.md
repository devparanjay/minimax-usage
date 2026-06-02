# Phase 04 — Build

**Owner:** `fullstack-engineer`
**Status:** not started (depends on phases 01, 02, 03)
**Goal:** ship a working VSCode extension that delivers the
v0.1.0 user path end-to-end on the `v0.1.0` branch.

## Inputs

- API contract from phase 01.
- Architecture from phase 02.
- Design (flow, visual, strings) from phase 03.

## Deliverables

- Source tree under `src/`:
  - `src/extension.ts` — activation, deactivation.
  - `src/api/client.ts` — typed API client matching the contract.
  - `src/settings/config.ts` — settings schema and migration.
  - `src/secrets/key.ts` — VSCode SecretStorage wrapper.
  - `src/ui/statusBar.ts` — status bar entry.
  - `src/ui/webview/usageModal.ts` — usage modal.
  - `src/state/store.ts` — local state for the modal.
  - `src/types/api.ts` — TypeScript types matching the API
    contract.
- `package.json` — extension manifest, publisher, activation
  events, contributes (configuration, commands).
- `tsconfig.json` — strict TypeScript.
- Build configuration (esbuild, webpack, or similar — decided in
  phase 02).
- Tests in `src/**/*.test.ts` and/or `test/`, covering the API
  client (with a mock server) and the settings/state logic.
- Updated `.kitchen/roadmaps/v0.1.0/phases/04-build.md`.

## Tasks

See `.kitchen/roadmaps/v0.1.0/tasks/04-build-tasks.md`.

## Verification

- The extension installs and activates in a clean VSCode
  instance on the `v0.1.0` branch.
- The user path from kickoff is reproducible end-to-end with a
  placeholder API key (real key during phase 05).
- `npm run lint`, `npm run typecheck`, and `npm test` all pass
  locally.
- The code-reviewer agent signs off on the PRs to `v0.1.0`.
- No secrets, tokens, or local paths are committed.
- All user-facing strings come from the canonical strings
  document from phase 03.

## Out of scope

- Visual design decisions. Those are frozen in phase 03.
- Pipeline implementation. Phase 06.
- User documentation. Phase 07.

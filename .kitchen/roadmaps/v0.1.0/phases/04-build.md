# Phase 04 — Build

**Owner:** `fullstack-engineer`
**Status:** complete (depends on phases 01, 02, 03)
**Goal:** ship a working VSCode extension that delivers the
v0.1.0 user path end-to-end on the `v0.1.0` branch.

## Outcome

The v0.1.0 extension is implemented end-to-end on the
`v0.1.0` branch. The full `src/` tree from
`extension-architecture.md` is in place (37 files), the 5
Vitest test modules from `build-and-publish.md` § 5 are in
place and passing (95 tests across 5 files), the build
tooling (`package.json`, `tsconfig*.json`, `esbuild.config.mjs`,
`vitest.config.ts`, `.eslintrc.cjs`) is configured, the
`v0.1.0` VSCode dev-loop config (`.vscode/launch.json`,
`.vscode/tasks.json`) is in place, and `npm run package:prod`
produces a `.vsix`.

### Verification results (local)

- `npm run lint` — 0 errors, 0 warnings.
- `npm run typecheck` — 0 errors.
- `npm test` — 95/95 pass across 5 files.
- `npm run build` — produces `dist/extension.js` (49.0kb) +
  `dist/webview/modal.js` (9.6kb) + sourcemaps.
- `npm run package:prod` (clean) — produces
  `minimax-usage-0.1.0.vsix` (190 files, 316kb).
- `MINIMAX_USAGE_DEV_KEY=sk-cp-XXXX-TEST npm run package:prod` —
  **hard-fails** with the documented error message. The
  dev-key escape hatch is loud-fail in production builds.

### Notable fix during recovery

The `package:prod` script as landed was missing the build
step — it ran `cross-env NODE_ENV=production vsce package`
directly, which bypassed the `esbuild.config.mjs` hard-fail
check. Fixed by hoisting `cross-env NODE_ENV=production` to
cover `npm run build && vsce package`, so the hard-fail
fires before the `.vsix` is produced. Without this fix, a
developer who left `MINIMAX_USAGE_DEV_KEY` set in their
shell would have packaged a dev-built bundle with the key
embedded, against the security model in `security.md` § 4
and `build-and-publish.md` § 10.

### Lint / typecheck fix during recovery

`tsconfig.test.json` originally inherited `tsconfig.json`'s
`exclude: ["test"]`, so the test files were not included in
the project. ESLint reported "TSConfigs do not include this
file" for every test file. Fixed by overriding `exclude` in
`tsconfig.test.json` to drop the `test` entry. Also removed
two unused `vitest` imports from the test files
(`vi`, `afterEach`).

### Open flags for phase 05

- The actual end-to-end run needs a real Subscription Key
  (project owner provides at phase 05 start).
- The `[AMBIGUOUS]` markers in the API contract (timestamp
  units, success envelope, `Referer` requirement) are still
  unverified. The build is defensive — a unit mismatch is
  a one-line fix in `parseTimestamp()`.
- The credits endpoint identity is still unverified
  (Bearer auth on candidate #1). The build defaults to
  candidate #1; the swap is a one-line change in
  `src/api/endpoints.ts`.

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

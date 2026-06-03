# Phase 04 — Build Tasks

**Phase owner:** `fullstack-engineer`
**Status:** complete

## Tasks

- [x] Scaffold `src/` with the module layout from the
      architecture document. (37 files in `src/`.)
- [x] Implement `src/api/client.ts` against the API contract
      from phase 01.
- [x] Implement `src/secrets/secretStorage.ts` (VSCode
      SecretStorage wrapper) and the dev-key shim.
- [x] Implement `src/settings/schema.ts`, `read.ts`, and
      `migration.ts` (settings schema, reader, migration
      hook).
- [x] Implement `src/ui/statusBar.ts` (status bar entry)
      with the per-state icon / text / tooltip mapping from
      `ui-spec-v0.1.0.md` and the strings from
      `strings-v0.1.0.md`.
- [x] Implement `src/ui/webview/usageModal.ts` (usage modal)
      using the strings from phase 03 verbatim. Plus the
      message protocol, the HTML/CSS/TS template, and the
      CSP.
- [x] Implement `src/state/store.ts`, `snapshot.ts`, and
      `types.ts` (typed StateStore with `PersistedSnapshot`).
- [x] Implement polling strategy (rate-limit-aware,
      debounce-on-focus, 60s background tick) in
      `src/polling/controller.ts` + `triggers.ts` +
      `rateLimit.ts`.
- [x] Implement error states from the design (invalid key,
      expired key, network down, rate limit, partial data,
      5-hour at 0%, region mismatch) in the modal state
      machine, per `data-flow.md` § 4 + § 5.
- [x] Add unit tests for the API client and the state
      transitions. (95 tests across 5 files: classify,
      cache, retry, logger, rateLimit.)
- [x] Configure lint, typecheck (strict), and test scripts
      in `package.json`. Plus the `package:prod` script with
      the `cross-env NODE_ENV=production npm run build`
      hoisting that makes the dev-key hard-fail fire.
- [x] Confirm the extension activates and runs in a clean
      VSCode instance on the `v0.1.0` branch. (Local build
      produces `dist/extension.js` + `dist/webview/modal.js`;
      a real Extension Development Host run is phase 05's
      manual walkthrough.)
- [x] Confirm no secrets, tokens, or local paths are
      committed. (The only `sk-cp-…` in the source is in
      `src/util/logger.ts` tests as the documented shape
      match for redaction rule R2 — no real key.)
- [ ] Open a PR against `v0.1.0`, get a `code-reviewer`
      review, address feedback, and merge. (Pending
      project-owner review.)

## Blockers

(none)

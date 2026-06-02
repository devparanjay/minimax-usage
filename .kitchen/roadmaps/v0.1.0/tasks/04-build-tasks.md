# Phase 04 — Build Tasks

**Phase owner:** `fullstack-engineer`
**Status:** not started

## Tasks

- [ ] Scaffold `src/` with the module layout from the
      architecture document.
- [ ] Implement `src/api/client.ts` against the API contract
      from phase 01.
- [ ] Implement `src/secrets/key.ts` (VSCode SecretStorage
      wrapper).
- [ ] Implement `src/settings/config.ts` (settings schema).
- [ ] Implement `src/ui/statusBar.ts` (status bar entry).
- [ ] Implement `src/ui/webview/usageModal.ts` (usage modal)
      using the strings from phase 03 verbatim.
- [ ] Implement `src/state/store.ts` (local state for the
      modal).
- [ ] Implement polling strategy (rate-limit-aware,
      debounce-on-focus).
- [ ] Implement error states from the design (invalid key,
      expired key, network down, rate limit, partial data).
- [ ] Add unit tests for the API client and the state
      transitions.
- [ ] Configure lint, typecheck (strict), and test scripts in
      `package.json`.
- [ ] Confirm the extension activates and runs in a clean
      VSCode instance on the `v0.1.0` branch.
- [ ] Confirm no secrets, tokens, or local paths are committed.
- [ ] Open a PR against `v0.1.0`, get a `code-reviewer`
      review, address feedback, and merge.

## Blockers

(depends on phases 01, 02, 03)

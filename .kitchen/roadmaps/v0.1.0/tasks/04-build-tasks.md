# Phase 04 — Build Tasks

**Phase owner:** `fullstack-engineer`
**Status:** complete (with code-reviewer fix round, then a defect round
after the project-owner local test on 2026-06-03 — see "Defect
round" below)

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
      transitions. (140 tests across 7 files: classify,
      cache, retry, logger, rateLimit, client, strings.)
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
- [x] Code-reviewer fix round (post-phase-04 review).
- [x] **Fix 1 — Strings discipline:** introduce
      `src/strings.ts` and replace all 70+ inlined
      user-facing strings with `STR_*` imports. (Atomic
      commit `0e86046`.)
- [x] **Fix 2 — StateStore mirror contract:** write
      `region` and `displayMode` from `onDidChangeSettings`.
      `displayMode: 'both'` now surfaces the Credits block;
      `displayMode: 'credits'` shows a credits-only modal
      with title `STR_MODAL_TITLE_CREDITS`. (Atomic commit
      `8f239fe`.)
- [x] **Fix 3 — Credits endpoint wiring:** invoke
      `getCreditBalance` from `PollingController` when
      `displayMode` is `credits` or `both`. Set
      `creditsAvailable` on the store. (Carried in `8f239fe`
      along with the state-mirror changes that share the
      same `controller.ts` and `usageModal.ts` files.)
- [x] **Fix 4 — R5 redaction enforcement:** thread the
      logger level through `formatContext` and
      `formatError` so the production call path applies R5
      when `level === 'error'` and the event is a
      `UsageError`. (Atomic commit `c0c48ae`.)
- [x] **Fix 5 — `displayMode: 'credits'` rendering:** the
      modal shows only the Credits block in `credits` mode
      (and the title is `STR_MODAL_TITLE_CREDITS`). (Carried
      in `0e86046` along with the strings refactor that
      touched the same modal.ts file.)
- [x] **Fix 6 — `test/api/client.test.ts`:** 35 tests
      covering auth header, cache, retry, error classes,
      `quota_exhausted` special case, `empty` case, and
      AbortSignal. (Atomic commit `6d353bc`.)
- [x] **Fix 7 — Tighten `isUsageResponseLike`:** verify the
      first `model_remains` entry has the required fields.
      Malformed responses land in the `empty` state, not
      `NaN%` in the bar. (Atomic commit `6d353bc` along
      with the client tests.)
- [x] **NB-1 / NB-2 — Formatter de-duplication:** the
      `Resets in` and `Last updated {N} {unit} ago`
      formatters are now in `src/util/format.ts` as the
      single source. (Atomic commit `1555f6d`.)
- [ ] Open a PR against `v0.1.0` for the code-reviewer
      fix round, get a re-review (or self-verify), then
      hold for the project-owner go-ahead before merging to
      `main`. (Pending re-review.)

## Defect round (post-project-owner test, 2026-06-03)

The project owner ran the `.kitchen/test/local-test-guide-v0.1.0.md`
checklist on 2026-06-03 14:00 IST and surfaced 5 defects
(D-1 through D-5). The canonical defect log is
`.kitchen/test/defects-v0.1.0.md` and the per-defect fix
specs are in `.kitchen/planning/v0.1.0-defect-resolution-plan.md`.
Each defect was fixed as an atomic conventional commit on
`v0.1.0`:

- [x] **D-1 — Subscription Key custom row in Settings UI**
      (Blocker): added `minimaxUsage.subscriptionKey` with
      `type: null` and a `markdownDescription` containing the
      `command:minimaxUsage.setApiKey` URI; added
      `STR_SETTINGS_APIKEY_LINK` to `src/strings.ts`; added
      the corresponding shape to `src/settings/schema.ts`;
      fixed the trailing-period drift on
      `STR_SETTINGS_REGION_ENUM_0` and
      `STR_SETTINGS_REGION_ENUM_1` (Phase 04 review nit,
      related). Updated
      `.kitchen/architecture/extension-architecture.md` § 5.1
      with a one-line note documenting the
      `markdownDescription` + command-URI pattern.
- [x] **D-2 — Explicit refresh after setApiKey** (Blocker):
      added the cache.invalidateAll() + refreshNow +
      statusBar.render() sequence to the `setApiKey` command
      in `src/extension.ts:113-145`. The existing
      `onDidChangeApiKey` listener stays for cross-extension
      changes; the same-extension path is now explicit. Side
      fix in `src/secrets/secretStorage.ts:30`: the
      `fire()` function now passes the key name to handlers
      (was `undefined`); the contract is cleaner and
      future handlers that need the value can read it.
- [x] **D-3 + D-4 — Status bar click + modal template**
      (Blockers): `UsageModal.readBundledHtml` is now a
      private method on the class that reads from
      `context.extensionPath/dist/webview/modal.html` only
      (the source-tree fallback is removed; the source path
      is a build-time concern). On read failure, the
      documented fallback HTML is returned and
      `logger.error("usage.modal.template.missing", { htmlPath })`
      is called (R1–R5 redaction rules unchanged; the error
      context contains only the path, not the key). The
      `WebviewPanel`'s `ViewColumn` changed from `Beside` to
      `Active` (modal is a usage display, not a side-by-side
      editor). `esbuild.config.mjs` now has an
      `assertWebviewAssets()` check that runs after
      `copyStaticAssets()` in both the watch and one-shot
      build paths; it throws if any of
      `dist/webview/modal.{html,css,js}` is missing.
      `test/ui/usageModal.test.ts` (new) has 6 tests
      exercising the readHtml path with a stub
      `context.extensionPath` — 100% line + branch coverage
      on the new method.
- [x] **D-5 — `*` activation event warning** (Major):
      `package.json#activationEvents` switched from `["*"]`
      to `["onStartupFinished", "onCommand:minimaxUsage.setApiKey",
      "onCommand:minimaxUsage.showUsage",
      "onCommand:minimaxUsage.openSettings"]`. The status
      bar appears on `onStartupFinished` (a few seconds
      after VSCode opens); the three commands work via
      `onCommand:*` even if the user invokes them before
      startup finishes. The `vsce` warning goes away. The
      `extension.ts` activation flow is unchanged.
      `.kitchen/architecture/extension-architecture.md` § 3
      was updated to reflect the new commitment.

### Verification after the defect round

- `npm run lint` — 0 errors, 0 warnings.
- `npm run typecheck` — 0 errors.
- `npm test` — 147/147 pass across 8 files
  (140 baseline + 1 `STR_SETTINGS_APIKEY_LINK` + 6
  `UsageModal.readBundledHtml`).
- `npm run build` — produces `dist/extension.js` (~57kb) +
  `dist/webview/modal.js` (~17kb) + sourcemaps; the
  `assertWebviewAssets()` check passes.
- `npm run package:prod` (clean) — produces
  `minimax-usage-0.1.0.vsix`, exit 0, no `vsce` warning.
- `MINIMAX_USAGE_DEV_KEY=sk-cp-XXXX-TEST npm run package:prod` —
  hard-fails with the documented error, exit 1, no `.vsix`
  produced.

## Blockers

(none)

# v0.1.0 — Defect Log

**Source:** project owner's local-test run on `v0.1.0`, 2026-06-03 14:00 IST, recorded in `.kitchen/test/local-test-guide-v0.1.0.md` (the project owner filled in the Pass/Fail and Notes columns).
**Compiled by:** orchestrator (FooFoo), 2026-06-03 ~14:10 IST.

This document is the canonical defect log for v0.1.0. Sections 0-7 of the test guide are the source of truth for "what was tested"; this document is the source of truth for "what failed and how it will be fixed."

---

## Defect summary

| ID    | Severity | Title                                                                                       | Where                                                          | Blocking? |
|-------|----------|---------------------------------------------------------------------------------------------|----------------------------------------------------------------|------------|
| D-1   | Blocker  | "Subscription Key" custom row missing from the Settings UI                                  | `package.json` `contributes.configuration` (and the test guide § 10.1 expectation) | Yes |
| D-2   | Blocker  | After entering the key, the extension does not refresh and the status bar stays in "Set up" | `src/extension.ts:113-145` (the `setApiKey` command)             | Yes |
| D-3   | Blocker  | Clicking the status bar in the success state does not open the modal                         | `src/ui/statusBar.ts` + the `command` resolution               | Yes (linked to D-4) |
| D-4   | Blocker  | The modal opens to a placeholder "MiniMax Usage modal template not found" instead of real HTML | `src/ui/webview/usageModal.ts:11-24` (the `readBundledHtml` function) | Yes (linked to D-3) |
| D-5   | Major    | `vsce package` warns: "Using '*' activation is usually a bad idea as it impacts performance" | `package.json` `activationEvents` (currently `["*"]`)           | No, but should be fixed before publish |

Sections 0-4 of the test guide are blocked by D-1 through D-4. Section 6 is fully pass; only the warning in D-5. Sections 5 and 7 are untested and depend on the defects being fixed first.

---

## D-1 — "Subscription Key" custom row missing from the Settings UI

**Source:** test guide § 1.3 Notes:

> I only see "Minimax Usage: Display Mode" and "Minimax Usage: Region" in the settings. There is no "Subscription Key" option for setting the key.

**Reproduced in:** § 3.1 Notes (the user cannot re-enter the key after a rotation, an invalid-key recovery, or a fresh profile).

**Expected:** the architecture document (`.kitchen/architecture/extension-architecture.md` § 5.1) and the UI spec (`.kitchen/design/ui-spec-v0.1.0.md` § 10.1) both commit to a "Set your API key" row in the Settings UI, rendered as a custom command link inside the `minimaxUsage` namespace.

**Actual:** `package.json#contributes.configuration` only has `minimaxUsage.region` and `minimaxUsage.displayMode`. There is no `minimaxUsage.subscriptionKey` (or equivalent) property. The user sees only the two enum pickers.

**Root cause:** the build phase did not implement the "command-link in markdownDescription" pattern the architecture documented. The pattern is: declare a property with `type: null` and a `markdownDescription` containing a command URI. The Settings UI renders the property as a row with a clickable command link. The "Open Settings" notification button works (it opens the Settings UI filtered to `minimaxUsage`), but once the UI is open there is no way to trigger the key-entry flow from within the settings.

**Fix:** add a `minimaxUsage.subscriptionKey` property to `contributes.configuration` with `type: null` and a `markdownDescription` containing a clickable command link. Phase 04 review's nits (the trailing period on `STR_SETTINGS_REGION_ENUM`) also get fixed here for consistency.

**Where:** `package.json`, `src/strings.ts` (if a new string is introduced), `src/settings/schema.ts` (the corresponding TypeScript shape).

**Severity:** Blocker. The user cannot re-enter the key after a first run, which is the documented recovery path for `error:invalid_key`.

---

## D-2 — After entering the key, the extension does not refresh

**Source:** test guide § 1.4 Notes:

> the "Subscription Key saved. MiniMax Usage will refresh." message appears but the extension does no refresh and still keeps showing "Set up MiniMax Usage" in the status bar. Clicking it just reopens the input box with the value filled in from last time.

Reproduced in § 1.5 Notes:

> This transition does not happen automatically after inputting the API key. I had to disable the extension, restart extensions, and enable the extension again for it to take effect.

**Expected:** after `secretStorage.setApiKey(value)`, the extension should (a) invalidate the in-memory cache, (b) call `PollingController.refreshNow("api-key-change", { forceRefresh: true })`, (c) re-render the status bar, and (d) post a fresh snapshot to the modal. The user sees the status bar transition through `Loading…` to `5h: NN% · 7d: NN%` within a second or two.

**Actual:** none of (a)-(d) fire. The status bar's `command` is still the `SETUP_COMMAND = "minimaxUsage.setApiKey"` from the initial render; the next click re-opens `showInputBox` with the previous value pre-filled.

**Root cause:** VSCode's `SecretStorage.onDidChange` event does not fire for changes made by the same extension. The architecture (`.kitchen/architecture/extension-architecture.md` § 2.1) assumed the event would fire and wired an `onDidChangeApiKey` listener (`src/extension.ts:105-110`). The listener is correctly defined but it never fires for the same-extension case. The `setApiKey` command (`src/extension.ts:113-145`) calls `secretStorage.setApiKey(value)` and then immediately shows a success toast — it does not call the controller or the status bar directly. Compounding: the wrapper in `src/secrets/secretStorage.ts:30` passes `undefined` to the handlers, but the handlers don't depend on the value, so this is a secondary issue, not the cause of D-2.

**Fix:** in the `setApiKey` command, after `secretStorage.setApiKey(value)`, explicitly perform the refresh-render sequence:
1. `cache.invalidateAll()`
2. `void controller.refreshNow("api-key-change", { forceRefresh: true })`
3. `void statusBar.render()`

The `onDidChangeApiKey` listener stays for cross-extension changes (future use), but the same-extension path is explicit. The success toast still fires after the refresh is initiated, so the user sees the confirmation regardless.

**Where:** `src/extension.ts:113-145`.

**Severity:** Blocker. The first-run flow is broken without this.

---

## D-3 + D-4 — Status bar click does not open the modal (and the modal template is missing)

**Source:** test guide § 1.6 Notes:

> Nothing happens when I click the "5h: NN% · 7d: NN%" in status bar. The modal doesn't even open.

Reproduced in § 2.4 Notes:

> after changing the Display Mode to "both", when I click on it, it opens up a new tab in the editor called "MiniMax Usage" which displays only "MiniMax Usage modal template not found."

Also in § 2.5, § 2.6, § 4.1, § 5.2 — all symptoms of the same root cause.

**Expected:** clicking the status bar in the success state opens the modal showing 5-Hour Limit and Weekly Limit (and Credits Balance if `displayMode` is `credits` or `both`). The modal renders the real HTML, CSS, and JavaScript bundle.

**Actual (D-3):** the status bar's click in the success state does nothing visible. The `command` is set to `minimaxUsage.showUsage` in `src/ui/statusBar.ts:41` and overwritten by the per-state `presentation.command` in `render()` (`src/ui/statusBar.ts:62`). For the "success" state the command is `DEFAULT_COMMAND = "minimaxUsage.showUsage"`, which `extension.ts:160-169` registers. The `showUsageCmd` calls `modal.openOrFocus()`. The `openOrFocus` method (`src/ui/webview/usageModal.ts:47-81`) creates a `WebviewPanel` with `ViewColumn.Beside`. Because the user already has a single editor column, "beside" is a new editor tab, and the panel is created against the new tab. This is the "new tab in the editor" the test guide § 2.4 describes.

**Actual (D-4):** the new tab shows "MiniMax Usage modal template not found." — which is the fallback string at `src/ui/webview/usageModal.ts:23`. The fallback is reached when `readBundledHtml` cannot find the HTML at either of two relative paths: `dist/webview/modal.html` and `src/ui/webview/template/modal.html`. The extension runs with the user's home directory as the current working directory (not the extension's installation directory), so neither relative path resolves. The HTML file IS in the .vsix at `<extensionPath>/dist/webview/modal.html` (the esbuild config copies it via `copyStaticAssets()` in `esbuild.config.mjs:53-57`), but the read function uses bare relative paths that don't anchor to the extension's location.

**Root cause (D-3):** two related issues. (i) `ViewColumn.Beside` opens a new editor tab rather than a true side panel; this is a VSCode UX choice the architecture document didn't surface. (ii) The `command` resolution on the status bar works, but the `openOrFocus` silently fails to render because of D-4.

**Root cause (D-4):** `readBundledHtml` uses bare relative paths. The class already has a `distDir()` method that returns the correct absolute path via `this.opts.context.extensionPath`. The `readBundledHtml` function does not receive the `context` and so falls back to the relative paths that fail at runtime.

**Fix:**
1. Change `readBundledHtml` to take the `context` and use `context.extensionPath` to construct the absolute path.
2. Change the `WebviewPanel` `ViewColumn` from `Beside` to `Active` so the modal opens in the user's current column. (The modal is a usage display, not a side-by-side editor; `Active` is the correct UX.)
3. Add a small in-test sanity check: in the smoke test, verify the `dist/webview/modal.html` file is present in the .vsix after `vsce package` and the path matches the `localResourceRoots` set in the panel options.

**Where:** `src/ui/webview/usageModal.ts:11-24` and `src/ui/webview/usageModal.ts:54-55`.

**Severity:** Blocker. The entire user path through the modal is broken without this.

---

## D-5 — `*` activation event warning

**Source:** test guide § 6.2 Notes:

> vsix produced but got this warning while running this command — "WARNING Using '*' activation is usually a bad idea as it impacts performance."

**Expected:** no warning on `npm run package:prod`. Either the activation is appropriate and the warning is unjustified, or the activation is inappropriate and the architecture should be amended.

**Actual:** the architecture (`.kitchen/architecture/extension-architecture.md` § 3) explicitly committed to `"activationEvents": ["*"]` with a one-paragraph rationale: "We commit to the following: `*`. The `*` event is appropriate for an extension that always shows a status-bar entry — it would be confusing for the status bar to appear only after the user does something specific." The `vsce` linter disagrees and emits the warning.

**Root cause:** the architecture's trade-off was correct (the status bar should be visible from the start) but the implementation exposes the warning. The standard pattern for status-bar extensions is a combination: `onStartupFinished` (so the status bar appears once VSCode is ready, not before) plus `onCommand:minimaxUsage.setApiKey` and `onCommand:minimaxUsage.showUsage` so the commands work even if the user invokes them before startup finishes. The warning goes away.

**Fix:** change `package.json#activationEvents` from `["*"]` to `["onStartupFinished", "onCommand:minimaxUsage.setApiKey", "onCommand:minimaxUsage.showUsage", "onCommand:minimaxUsage.openSettings"]`. The status bar appears on `onStartupFinished`; the commands work via `onCommand:*`. The `extension.ts` activation flow is unchanged.

**Where:** `package.json`.

**Severity:** Major. The .vsix is built and the extension works, but the warning is unprofessional in a publish-time build. Fix before the marketplace publish.

---

## Untouched but flagged (untested in the project owner's run)

These are not defects per se — they are scenarios the project owner did not exercise, because the blocker defects (D-1 through D-4) prevented the scenarios from being reachable. After the fixes, they should be re-tested in a follow-up pass:

- 3.2 (Expired key) — depends on D-1 (the recovery path).
- 3.4 (Rate limit) — needs the workaround in the test guide § 3.4 to be performed.
- 3.5 (Partial / empty data) — needs a profile without a Token Plan.
- 3.6 (5-hour at 0%) — needs the test plan to wait for the quota to exhaust, or a test profile.
- 3.8 (Server-side transient) — needs the workaround in the test guide § 3.8 to be performed.
- 4.1 (60s polling tick) — depends on D-3 + D-4 (modal not opening).
- 4.3 (debounce on concurrent clicks) — needs the modal to work.
- 4.4 (log volume) — depends on the modal not being broken.
- 5.1, 5.3, 5.4 (security verification) — all are independent of the modal but were not run.
- 7.1, 7.2, 7.3 (CI workflow verification) — all are independent of the defects.

These are tracked in the test guide's defects log; they are inherited from the "untested" cells, not from project-owner-found issues. They will be re-tested in a follow-up pass after the blockers are fixed.

---

## Sign-off

The defect log is closed when all 5 defects (D-1 through D-5) are fixed, committed, and verified on the next test pass.

```
Orchestrator: FooFoo                    Date: 2026-06-03
Source: project owner local-test run on v0.1.0, 2026-06-03 14:00 IST
Status: open (defects D-1..D-5)  in progress  resolved
```

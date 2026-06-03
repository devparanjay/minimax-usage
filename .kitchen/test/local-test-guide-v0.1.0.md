# v0.1.0 — Local Test Guide

**Audience:** project owner (the only person with a real MiniMax
Subscription Key in hand for v0.1.0).
**Scope:** end-to-end test of the v0.1.0 extension on a local machine
before the v0.1.0 release is published to the VSCode Marketplace.
**Pass criterion:** every scenario below marked ✓ with no open
defects. Anything else blocks the release.

The guide is a checklist — walk it top to bottom, mark each scenario
pass/fail, and record observations in the Notes column. The result
is a single signed document; commit it back to the repo as
`.kitchen/test/local-test-results-v0.1.0.md` after testing.

---

## 0. Pre-test setup (10 min)

Before you start, you need:

- **VSCode 1.85.0+** (the `engines.vscode` minimum). Check via
  `Help → About`.
- **A built `.vsix` from the v0.1.0 branch.** From the project
  root on `v0.1.0`:
  ```bash
  npm ci
  npm run package:prod
  ```
  The output is `minimax-usage-0.1.0.vsix` in the project root.
- **A real MiniMax Subscription Key.** From
  https://platform.minimax.io → Subscriptions → Plan Details. It
  starts with `sk-cp-`. **Do not commit it.**
- **(Optional) A MiniMax account in Mainland China** if you want
  to test the region toggle. Otherwise, overseas is enough.
- **An Extension Development Host window** open with the v0.1.0
  extension loaded:
  ```bash
  code --install-extension minimax-usage-0.1.0.vsix
  # then open VSCode, run "Developer: Reload Window" once.
  ```
  Or, if you want the dev-loop version (with hot reload from
  source):
  ```bash
  npm run dev      # in one terminal — esbuild --watch
  # open the workspace, press F5 to launch the Extension Development Host
  ```
- **The "MiniMax Usage" output panel open** for log inspection:
  `View → Output → MiniMax Usage`.

---

## 1. First-run flow (no key set yet)

This is the path a brand-new user takes on first install.

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Open a clean VSCode window with the extension installed but no key set | The status bar shows `$(gear) Set up MiniMax Usage` (clickable) | pass | |
| 1.2 | Look for the first-run notification toast | A non-blocking notification appears: "Set your MiniMax API key" with body "Get your Subscription Key from the MiniMax platform. You can find it under Billing → Token Plan." and two buttons: `[ Open Settings ]` and `[ Later ]` | pass | |
| 1.3 | Click "Open Settings" in the notification | The Settings UI opens filtered to `minimaxUsage`. You see: `minimaxUsage: Region` (overseas default), `minimaxUsage: Display Mode` (Token Plan default), and a "Subscription Key" custom row with a "Set your API key" button | fail |I only see "Minimax Usage: Display Mode" and "Minimax Usage: Region" in the settings. There is no "Subscription Key" option for setting the key. |
| 1.4 | Click "Set your API key" → paste your real Subscription Key → Enter | The input box is dismissed; the key is written to `SecretStorage` (no log line, no file). A confirmation toast: "Subscription Key saved. MiniMax Usage will refresh." | fail |While clicking "Set your API key" does open up the input box for the key and allows putting in the key, the "Subscription Key saved. MiniMax Usage will refresh." message appears but the extension does no refresh and still keeps showing "Set your API key" in the status bar. Clicking it just reopens the input box with the value filled in from last time. |
| 1.5 | Watch the status bar | The status bar transitions through `$(loading~spin) Loading…` and lands on the success state: `$(check) 5h: NN% · 7d: NN%` | fail |This transition does not happen automatically after inputting the API key. I had to disable the extension, restart extensions, and enable the extension again for it to take effect. It does display the right "5h: NN% · 7d: NN%" in the status bar after that.|
| 1.6 | Click the status bar | The modal opens showing 5-Hour Limit and Weekly Limit blocks (and Credits Balance if displayMode is `both`) | fail |Nothing happens when I click the "5h: NN% · 7d: NN%" in status bar. THe modal doesn't even open. |
| 1.7 | Close the modal. Open it again from the status bar | The modal reopens; a fresh fetch fires (the 30s in-memory cache may short-circuit it within 30s) | fail | |
| 1.8 | Reload the VSCode window (`Developer: Reload Window`) | The status bar restores to the last known good state; no re-prompt; the key is still in `SecretStorage` | pass | |

**Sign-off after section 1:** fail. List any defects below - Defects are noted in the Notes column.

---

## 2. Settings behavior

The two settings: `minimaxUsage.region` and `minimaxUsage.displayMode`.

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 2.1 | Open Settings, change `Region` to `Mainland China platform` | The status bar transitions to `$(loading~spin) Loading…` (cache invalidated, refreshNow fires) then to either `success` (if your key is from the cn platform) or `error:invalid_key` (Sign in) if your key is from overseas | pass | |
| 2.2 | If `error:invalid_key` appeared: open the modal | The error block has a red left-border, title "Couldn't verify your Token Plan key", and a body that mentions "Subscription Key from Billing → Token Plan, not your Open Platform API Key" AND "If you subscribed on a different platform (overseas vs Mainland China), switch the region in settings" | ☐ | |
| 2.3 | Switch back to `Overseas platform` | The status bar transitions back to success | pass | |
| 2.4 | Open Settings, change `Display Mode` to `Both — Token Plan and Credits side by side` | The modal re-renders to show 5-Hour + Weekly + Credits blocks. No network call fires (displayMode change is a re-render, not a refresh). | fail |In section 1, clicking the status bar was doing nothing, but after changing the Display Mode to "both", when I click on it, it opens up a new tab in the editor called "MiniMax Usage" which displays only "MiniMax Usage modal template not found." |
| 2.5 | Open Settings, change `Display Mode` to `Credits — Balance only` | The modal re-renders to show only the Credits block. The modal title is `Credits` (not `MiniMax Usage`). | fail |No modal appears or opens and clicking it repeats the same from 2.4 where a new tab in editor opens with the message "MiniMax Usage modal template not found.". The status bar does show "Credits unavailable". |
| 2.6 | Open Settings, change `Display Mode` to `Token Plan` | The modal re-renders to show 5-Hour + Weekly only, no Credits block. The modal title is `MiniMax Usage`. | fail |No modal appears or is rendered. The status bar does switch back to the tokenPlan info mode where it displays 5h and 7d stats. Earlier in Section 1, nothng was happening when clicking the status bar for tokenPlan, but now when I click it, the same thing as 2.4 and 2.5 happens. |
| 2.7 | If your platform rejects Bearer auth on the credits endpoint (most likely, since this is a known platform constraint): check the modal in `credits` or `both` mode | The modal shows the "Credits Balance unavailable from the official API" placeholder with the `$(info)` icon and the "Coming in a future version" subtext. The status bar shows `$(dash) Credits unavailable`. | fail | This is the **expected** state for v0.1.0 — see the "no silent cookie fallback" rule. Tester: Refer to 2.4 and 2.5. |
| 2.8 | If the platform DOES accept Bearer auth on the credits endpoint: check the modal | The modal shows the balance (e.g. "$24.50 remaining"). | fail | If you see this, log the actual endpoint and response shape for the post-release architecture follow-up. Tester: Only see "Credits unavailable" since the modal is not working.|

**Sign-off after section 2:** fail. List any defects below - Defects are recorded in the Notes column.

---

## 3. Error states (intentionally triggered)

These are the edge cases A–H from the discovery record. Some require
real conditions (network, rate limit); others can be forced with a
test key.

| # | Trigger | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 3.1 | **A — Invalid key**: set a wrong key in SecretStorage (use `code --user-data-dir /tmp/vscode-test-1` for a clean profile) | Status bar: `$(error) Sign in` (red). Modal: red left-border error block, title `Couldn't verify your Token Plan key`, body distinguishes Subscription Key vs Open Platform API Key. Recovery: Open Settings. | fail |The setting or input to set API key is inaccessible after the first time. It does not appear anywhere in the settings either. |
| 3.2 | **B — Expired key**: use a real but revoked key (or use a subscription that has ended) | Same UX as 3.1. The wire does not distinguish "invalid" from "expired". | fail |Refer 3.1. |
| 3.3 | **C — Network down**: turn off wifi / unplug ethernet, then click the status bar | Status bar: grey, `$(sync)`, last-known-good text with "last updated N min ago" subtext. Modal: grey left-border error block, "Couldn't reach the MiniMax API", "Will retry automatically." After 1s/2s/4s back-off (3 attempts), the modal settles. | fail |No modal appears and refer 2.4 for what happens when clicking the status bar. The status bar does change colors and has a "(stale)" tag after the 5h 7d info, which is good. |
| 3.4 | **D — Rate limit**: harder to trigger naturally. To force it, edit `src/polling/rateLimit.ts` temporarily to set the suppression flag on any error, rebuild, click the status bar 5 times in quick succession. Revert before commit. | Status bar: `$(warning) Rate limited` (yellow). Modal: yellow left-border, "Too many requests", "Cooling down. The next refresh will happen automatically within a minute." | untested | If you do this, remember to revert. |
| 3.5 | **E — Partial / empty data**: this is for users without a Token Plan. If you have one, simulate by using a test profile that hasn't subscribed. | Status bar: `$(dash) No plan`. Modal: centered `$(info)` icon, "Token Plan data unavailable." body "Check the MiniMax console." | untested | |
| 3.6 | **F — 5-hour at 0%**: wait until the 5-hour quota is exhausted (or use a test key on a fresh plan). | Status bar: `$(warning) 5h: 0%` (yellow). Modal: 5-Hour bar at 0%, "Quota used 100%", "Resets in 1h 02m". The Weekly block continues to render normally. The error block is NOT shown — this is a normal state, not an error. | untested | |
| 3.7 | **G — Region mismatch**: set `minimaxUsage.region` to overseas but your key is from cn (or vice versa) | Same UX as 3.1 (HTTP 401, status_code 1004). The error body mentions the region toggle. | ☐ |Refer to 3.1 and 2.1. |
| 3.8 | **H — Server-side transient**: simulate by temporarily breaking the host in `src/api/hosts.ts` (e.g. point to `https://api.minimaxi.com` for an overseas key). Revert before commit. | Status bar: `$(sync)` with last-known-good dimmed. Modal: "MiniMax API temporarily unavailable", "Will retry." | untested | If you do this, remember to revert. |

**Sign-off after section 3:** fail. List any defects below - Defects are recorded in the Notes column.

---

## 4. Polling and refresh behavior

The polling controller refreshes on a 60s timer, on window focus,
on modal open, and on settings change. Verify each trigger.

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 4.1 | Open the modal, then close it. Wait 60s. Open it again. | A network request fires at ~60s (visible in the Output panel — the logger logs the request). The modal's footer "Last updated" timestamp refreshes. | fail |The modal does not open. Refer to 2.4. |
| 4.2 | Click into another window (e.g. browser), wait 10s, click back to VSCode | A refresh fires on focus (visible in Output: "focus" trigger). | pass |Switching back to VSC did refresh the message in status bar from stale. Not tested on modal due to modal issues. |
| 4.3 | Click the status bar twice in quick succession | Only one network request fires (the 750ms debounce coalesces concurrent `refreshNow()` calls). The first click's AbortController is `.abort()`-ed. | untested | |
| 4.4 | Open the Output panel, observe the log volume over 1 minute | At most 1–2 log lines per refresh (no key, no full response body). The Subscription Key is never logged. The `Authorization` header is redacted as `[redacted]`. | untested | |

**Sign-off after section 4:** fail. List any defects below - Defects are recorded in the Notes column.

---

## 5. Security verification

The five redaction rules R1–R5 from `.kitchen/architecture/security.md` § 4 are unit-tested. The integration check: does the live extension respect them?

| # | Check | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 5.1 | Open the Output panel under "MiniMax Usage". Trigger a few refreshes. | The `Authorization` header is never visible. The Subscription Key is never visible. The `minimaxUsage.apiKey` SecretStorage value is never visible. The request URL has no `key=`, `api_key=`, `apikey=`, or `token=` query param. | untested | |
| 5.2 | Open DevTools (Help → Toggle Developer Tools). Inspect the modal webview. | The webview's CSP is `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'`. The webview has NO API key. The host posts redacted data over `postMessage`. | fail |Modal not opening. Refer 2.4. |
| 5.3 | Search the workspace `.vsix` for the Subscription Key | The key is not in the .vsix. (Run `unzip minimax-usage-0.1.0.vsix -d /tmp/vsix && grep -r "sk-cp-" /tmp/vsix` — the only matches should be in the test fixtures as `sk-cp-XXXX…` placeholders.) | untested | |
| 5.4 | Confirm no telemetry | The extension does not phone home. `unzip` the .vsix, check `package.json` for a `telemetry` key (must be absent) and for analytics SDKs in `dependencies` (must be empty). | untested | |

**Sign-off after section 5:** ☐ pass ☐ fail. List any defects below.

---

## 6. Build and package verification

Per `.kitchen/architecture/build-and-publish.md` § 10.

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 6.1 | From `v0.1.0`, run `npm run build` | Two bundles produced: `dist/extension.js` (~50kb) + `dist/webview/modal.js` (~10kb). Sourcemaps present. | untested | |
| 6.2 | Run `npm run package:prod` (no env var) | `minimax-usage-0.1.0.vsix` produced. Exit 0. | pass |vsix produced but got this warning while running this command - " WARNING  Using '*' activation is usually a bad idea as it impacts performance." |
| 6.3 | Run `MINIMAX_USAGE_DEV_KEY=sk-cp-XXXX-TEST npm run package:prod` | The build throws with the error: "MINIMAX_USAGE_DEV_KEY is set in a production build. Unset the env var or build with NODE_ENV != 'production'." Exit 1. **No .vsix is produced.** | untested | This is the loud-fail; do not proceed to publish if it doesn't fire. Tester: not tested, but while running package:prod, got this in the terminal - "esbuild: production build complete. esbuild: no MINIMAX_USAGE_DEV_KEY set; dev-key shim disabled. esbuild: built package minimax-usage@0.1.0" so it must be checking for this before building. |

**Sign-off after section 6:** ☐ pass ☐ fail. List any defects below - No tested defects.

---

## 7. CI verification (workflow wiring)

Per `.kitchen/architecture/build-and-publish.md` § 8–9 and the
`.github/workflows/ci.yml` + `.github/workflows/publish.yml` files.

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 7.1 | Open a PR from `v0.1.0` to a feature branch (or another version branch). | The CI workflow fires. Lint, typecheck, test, build, package:prod all run. A `.vsix` artifact is uploaded. The PR check is green. | untested | |
| 7.2 | Run the publish workflow via `Actions → Publish → Run workflow`. Default `dry_run` is `true`. | The workflow runs lint, typecheck, test, build, package:prod, then exits 0 at the publish step (because `dry_run` is true and the publish is skipped). | untested | This is the dry-run; the .vsix is produced but not published. |
| 7.3 | (Optional) Run the publish workflow with `dry_run: false`. **This will publish to the Marketplace under the `devparanjay` publisher.** Skip this until you've confirmed the listing is ready. | `vsce publish` runs. The extension is live on the Marketplace. | untested | Only run when you intend to publish. |

**Sign-off after section 7:** untested. List any defects below.

---

## 8. Defects log

Use this space to log any defects found during the test. Each defect
gets an ID, a severity (Blocker / Major / Minor), and a one-line
description. Blockers stop the release; Major goes on the v0.1.0
follow-up; Minor is filed for v0.1.1.

| ID | Severity | Description | Where | Fix |
| --- | --- | --- | --- | --- |
| D-1 | | | | |
| D-2 | | | | |
| D-3 | | | | |
| D-4 | | | | |
| D-5 | | | | |


---

## 9. Sign-off

When all sections above are marked pass, sign below and commit the
results to `.kitchen/test/local-test-results-v0.1.0.md`.

```
Project owner: __________________________  Date: ____________
Result: ☐ All sections pass — v0.1.0 ready for release
        ☐ Sections ___ failed — release blocked, see defects log
        ☐ Sections ___ passed with nits — release proceeds, nits filed for v0.1.1
```

After sign-off, the orchestrator opens the PR `v0.1.0` → `main` per
ADR 0002. The PR's merge to main triggers the publish workflow
(release: published on main), which publishes the v0.1.0 `.vsix` to
the VSCode Marketplace under the `devparanjay` publisher.

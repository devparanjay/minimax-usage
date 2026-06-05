# v0.1.0 — Local Test Guide (Round 3)

**Audience:** project owner (the only person with a real MiniMax
Subscription Key in hand for v0.1.0).
**Scope:** end-to-end test of the v0.1.0 extension on a local
machine before the v0.1.0 → main PR.
**Pass criterion:** every scenario below marked ✓ with no open
defects. Anything else blocks the PR.

This guide supersedes `.kitchen/test/local-test-guide-v0.1.0-r2.md`
(round 2). Round 2 surfaced four more defects (D-6..D-9). Round 3
covers D-10, D-11, and D-12: the popup UX was changed from the
right-secondary-sidebar view (round 2) to a beautiful,
easy-on-the-eyes view in the **primary (left) sidebar**. The
previous editor tab and right sidebar are gone; the
`modalLocation` setting is gone. D-11 and D-12 fix status-bar
click regressions in the round-3 build (see section 1.6 for the
regression-guard note).

The defect logs are the source of truth for what was broken and how
it was fixed:
- `.kitchen/test/defects-v0.1.0.md` (D-1..D-5)
- `.kitchen/test/defects-round2-v0.1.0.md` (D-6..D-9)
- `.kitchen/test/defects-round3-v0.1.0.md` (D-10, D-11, D-12)

When you have completed the test, sign section 9. The orchestrator
opens the v0.1.0 → main PR after your sign-off.

---

## What changed since the round-2 guide

If you have the round-2 guide
(`.kitchen/test/local-test-guide-v0.1.0-r2.md`) in hand, here is
what the round-2 → round-3 delta did to the test scenarios:

- **The popup UX is now a primary (left) sidebar view.** A new icon
  appears in the activity bar (the narrow vertical bar on the left
  side of the workbench) labelled "MiniMax Usage". Click the status
  bar to open the view; click the activity-bar icon at any time to
  re-open it.
- **The `modalLocation` setting is gone.** The popup is always the
  left sidebar; the editor tab and right secondary sidebar are no
  longer options.
- **The `minimaxUsage.showUsage` command is gone.** The status bar
  click directly opens the left sidebar.
- **The view is a `WebviewViewProvider`** registered under a new
  `viewsContainers.activitybar` entry, with a new
  `src/ui/webview/template/sidebar.{html,css,ts}` template designed
  for the sidebar (narrow column, 280–420px, matches the sidebar
  background, generous whitespace, polished progress bars).
- **Sections 3–7 (error states, polling, security, build, CI) are
  unchanged** in scope. Re-exercise the existing scenarios on the
  fixed build.

---

## 0. Pre-test setup (10 min)

Before you start, you need:

- **VSCode 1.85.0+** (the `engines.vscode` minimum). Check via
  `Help → About`.
- **A clean rebuild of the `.vsix` from the v0.1.0 branch.** From
  the project root on `v0.1.0`:
  ```bash
  npm ci
  npm run package:prod
  ```
  The output is `minimax-usage-0.1.0.vsix` in the project root.
  **Important: this is a fresh build. Reload VSCode
  (`Developer: Reload Window`) after the install.**
- **A real MiniMax Subscription Key.** From
  https://platform.minimax.io → Subscriptions → Plan Details. It
  starts with `sk-cp-`. **Do not commit it.**
- **(Optional) A MiniMax account in Mainland China** if you want
  to test the region toggle. Otherwise, overseas is enough.
- **The "MiniMax Usage" output panel open** for log inspection:
  `View → Output → MiniMax Usage`.

After installing the `.vsix`, you should see a new icon in the
**activity bar** (left side, narrow vertical bar) with the
extension's logo. That's the sidebar view's icon.

---

## 1. First-run flow (no key set yet)

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | Open a clean VSCode window with the extension installed but no key set | The status bar shows `$(gear) Set up MiniMax Usage` (clickable) | ☐ | |
| 1.2 | Look for the first-run notification toast | A non-blocking notification: "Set your MiniMax API key" with body "Get your Subscription Key from the MiniMax platform. You can find it under Billing → Token Plan." and two buttons: `[ Open Settings ]` and `[ Later ]` | ☐ | |
| 1.3 | Click "Open Settings" in the notification | The Settings UI opens filtered to `minimaxUsage`. You see: `minimaxUsage: Region` (overseas default), `minimaxUsage: Display Mode` (Token Plan default), `minimaxUsage: Subscription Key` (the command-link row). The `minimaxUsage.modalLocation` setting is **gone** (removed in round 3 / D-10). | ☐ | |
| 1.4 | Click "Set your API key" → paste your real Subscription Key → Enter | The input box is dismissed; the key is written to `SecretStorage` (no log line, no file). A confirmation toast: "Subscription Key saved. MiniMax Usage will refresh." | ☐ | |
| 1.5 | Watch the status bar | The status bar transitions through `$(loading~spin) Loading…` and lands on the success state: `$(check) 5h: NN% · 7d: NN%` | ☐ | |
| 1.6 | Click the status bar | The **activity bar icon for "MiniMax Usage"** activates (the icon highlights) and the **primary (left) sidebar** opens, showing the sidebar view with: header (title "MiniMax Usage", region label "Overseas", "Last updated never"), main area (the 5-Hour Limit and Weekly Limit blocks with progress bars), footer ("Open Settings" link). The view is **not** in the secondary (right) sidebar and **not** in an editor tab. **No "command not found" error appears** — the status bar's click fires the `minimaxUsage.openUsage` wrapper registered in `src/extension.ts` (D-12), which in turn calls the built-in `workbench.view.minimaxUsage.usage` command (the *view* id, not the container id). The D-11 / D-12 history: D-10 removed the `minimaxUsage.showUsage` wrapper and pointed the click at the built-in `workbench.view.minimaxUsage` (the container id, which is not a view id — wrong); D-11 changed it to the same wrong id; D-12 reverts the status bar to a custom wrapper and the wrapper to the correct built-in. The end-to-end chain `item.command` → `minimaxUsage.openUsage` (registered in `src/extension.ts`) → `workbench.view.minimaxUsage.usage` (built-in) is what the regression test in `test/ui/statusBarCommands.test.ts` asserts. | ☐ | |
| 1.7 | Click the status bar again | The sidebar stays open with the latest data; the polling controller fires a fresh fetch (the 30s in-memory cache may short-circuit it within 30s) | ☐ | |
| 1.8 | Click the activity bar icon directly (without using the status bar) | The sidebar opens with the same content | ☐ | |
| 1.9 | Reload the VSCode window (`Developer: Reload Window`) | The status bar restores to the last known good state; no re-prompt; the key is still in `SecretStorage`. The activity bar icon is still there. | ☐ | |

**Sign-off after section 1:** ☐ pass ☐ fail. List any defects below.

---

## 2. Settings behavior

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 2.1 | Open Settings, change `Region` to `Mainland China platform` | The status bar transitions to `$(loading~spin) Loading…` then to either `success` (if your key is from the cn platform) or `error:invalid_key` (Sign in) if your key is from overseas | ☐ | |
| 2.2 | If `error:invalid_key` appeared: open the sidebar view | The error block has a red left-border, title "Couldn't verify your Token Plan key", and a body that mentions "Subscription Key from Billing → Token Plan, not your Open Platform API Key" AND "If you subscribed on a different platform (overseas vs Mainland China), switch the region in settings." The region label in the header should now read "Mainland China". | ☐ | |
| 2.3 | Switch back to `Overseas platform` | The status bar transitions back to success; the header region label updates back to "Overseas" | ☐ | |
| 2.4 | Open Settings, change `Display Mode` to `Both — Token Plan and Credits side by side` | The sidebar re-renders to show 5-Hour + Weekly + Credits blocks. No network call fires (displayMode change is a re-render, not a refresh). | ☐ | |
| 2.5 | Open Settings, change `Display Mode` to `Credits — Balance only` | The sidebar re-renders to show only the Credits block. The sidebar title remains "MiniMax Usage" (not "Credits" — the title is always the same for the sidebar view). | ☐ | |
| 2.6 | Open Settings, change `Display Mode` to `Token Plan` | The sidebar re-renders to show 5-Hour + Weekly only, no Credits block. The sidebar title remains "MiniMax Usage". | ☐ | |
| 2.7 | If your platform rejects Bearer auth on the credits endpoint (most likely, since this is a known platform constraint): check the sidebar in `credits` or `both` mode | The sidebar shows the "Credits Balance unavailable from the official API" placeholder with the `$(info)` icon and the "Coming in a future version" subtext. The status bar shows `$(dash) Credits unavailable`. | ☐ | This is the **expected** state for v0.1.0 — see the "no silent cookie fallback" rule. |
| 2.8 | If the platform DOES accept Bearer auth on the credits endpoint: check the sidebar | The sidebar shows the balance (e.g. "$24.50 remaining"). | ☐ | If you see this, log the actual endpoint and response shape for the post-release architecture follow-up. |

**Sign-off after section 2:** ☐ pass ☐ fail. List any defects below.

---

## 3. Visual design and polish

This is a new section for round 3 — it covers the "beautiful and
easy on the eyes" design bar set by the project owner in the
round-3 instructions.

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 3.1 | Open the sidebar view, look at the header | Title "MiniMax Usage" is 14px semibold. There is a small `$(pulse)` icon to the left of the title. Below the title is a metadata line: "Overseas" (or your region) · "Last updated N seconds ago" (or "Last updated never"). The header has a 1px bottom border and is sticky when you scroll the content. | ☐ | |
| 3.2 | Look at the data blocks | Each block is a card with rounded corners (6px), a subtle 1px border, and a slightly elevated background (uses `--vscode-sideBarSectionHeader-background`). The block has a 2-column header: the title (left, 13px semibold) and the percentage value (right, 18px semibold, tabular-nums). Below the header is a 6px-tall progress bar with rounded ends. Below the progress bar is a 2-column sub-row: "Quota used N%" (left, muted) and "Resets in 1h 23m" (right, muted, tabular-nums). | ☐ | |
| 3.3 | Hover over a block | The block's border color subtly darkens (transition 160ms ease-out) | ☐ | |
| 3.4 | Look at the progress bar colors | When the remaining percent is > 50%, the bar is green (`--vscode-charts-green`). Between 20% and 50%, the bar is yellow (`--vscode-charts-yellow`). Below 20%, the bar is red (`--vscode-charts-red`). The color transitions are smooth (200ms). | ☐ | |
| 3.5 | Look at the error block | The error block has a 3px left border (red for invalid_key, yellow for rate_limited, grey/transparent for transient/unavailable). The title is 13px semibold, the body is 11px with proper paragraph spacing, and the CTA button ("Open Settings" or "Dismiss") is a 1px-bordered button with rounded corners. The CTA is 11px, accent color, and has a hover state. | ☐ | |
| 3.6 | Look at the footer | The footer has a 1px top border, a 11px "Open Settings" link on the right, accent color, with a hover underline state. The footer is sticky at the bottom. | ☐ | |
| 3.7 | Resize the sidebar to ~300px wide | The layout adjusts gracefully. No horizontal scrollbar appears. The text wraps as needed. | ☐ | |
| 3.8 | Resize the sidebar to ~420px wide | The layout has more breathing room. The progress bars span the full width. | ☐ | |
| 3.9 | Switch themes (light → dark → high contrast) | The view follows the theme. All colors are VSCode theme variables; no hardcoded colors. The "high contrast" theme uses higher-contrast colors automatically. | ☐ | |

**Sign-off after section 3:** ☐ pass ☐ fail. List any defects below.

---

## 4. Error states (intentionally triggered)

The edge cases A–H. The first time through, the project's owner
re-tested the ones the setup allowed. Re-exercise them now that the
sidebar view renders correctly.

| # | Trigger | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 4.1 | **A — Invalid key**: set a wrong key in `SecretStorage` (use `code --user-data-dir /tmp/vscode-test-1` for a clean profile) | Status bar: `$(error) Sign in` (red). Sidebar: red left-border error block, title "Couldn't verify your Token Plan key", body distinguishes Subscription Key vs Open Platform API Key AND mentions the region hint. The header region label still shows your last-known region (or "Overseas" by default). | ☐ | |
| 4.2 | **B — Expired key**: use a real but revoked key (or a subscription that has ended) | Same UX as 4.1. The wire does not distinguish "expired" from "invalid". | ☐ | |
| 4.3 | **C — Network down**: turn off wifi / unplug ethernet, then click the status bar | Status bar: grey, `$(sync)`, last-known-good text with "last updated N min ago" subtext. Sidebar: grey left-border error block, "Couldn't reach the MiniMax API", "Will retry automatically." After 1s/2s/4s back-off (3 attempts), the modal settles. | ☐ | |
| 4.4 | **D — Rate limit**: harder to trigger naturally. To force it, edit `src/polling/rateLimit.ts` temporarily to set the suppression flag on any error, rebuild, click the status bar 5 times in quick succession. Revert before commit. | Status bar: `$(warning) Rate limited` (yellow). Sidebar: yellow left-border, "Too many requests", "Cooling down. The next refresh will happen automatically within a minute." | ☐ | If you do this, remember to revert. |
| 4.5 | **E — Partial / empty data**: this is for users without a Token Plan. If you have one, simulate by using a test profile that hasn't subscribed. | Status bar: `$(dash) No plan`. Sidebar: centered `$(info)` icon, "Token Plan data unavailable." body "Check the MiniMax console." | ☐ | |
| 4.6 | **F — 5-hour at 0%**: wait until the 5-hour quota is exhausted (or use a test profile on a fresh plan). | Status bar: `$(warning) 5h: 0%` (yellow). Sidebar: 5-Hour bar at 0%, "Quota used 100%", "Resets in 1h 02m". The Weekly block continues to render normally. The error block is NOT shown — this is a normal state, not an error. | ☐ | |
| 4.7 | **G — Region mismatch**: set `minimaxUsage.region` to overseas but your key is from cn (or vice versa) | Same UX as 4.1 (HTTP 401, `status_code: 1004`). The error body mentions the region toggle. | ☐ | |
| 4.8 | **H — Server-side transient**: simulate by temporarily breaking the host in `src/api/hosts.ts` (e.g. point to `https://api.minimaxi.com` for an overseas key). Revert before commit. | Status bar: `$(sync)` with last-known-good dimmed. Sidebar: "MiniMax API temporarily unavailable", "Will retry." | ☐ | If you do this, remember to revert. |

**Sign-off after section 4:** ☐ pass ☐ fail. List any defects below.

---

## 5. Polling and refresh behavior

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 5.1 | Open the sidebar, then wait 60s. Observe the "Last updated" timestamp | A network request fires at ~60s (visible in the Output panel — the logger logs the request). The "Last updated" timestamp updates. | ☐ | |
| 5.2 | Click into another window (e.g. browser), wait 10s, click back to VSCode | A refresh fires on focus (visible in Output: "focus" trigger). The "Last updated" timestamp updates. | ☐ | |
| 5.3 | Click the status bar twice in quick succession | Only one network request fires (the 750ms debounce coalesces concurrent `refreshNow()` calls). The first click's `AbortController` is `.abort()`-ed. | ☐ | |
| 5.4 | Open the Output panel, observe the log volume over 1 minute | At most 1–2 log lines per refresh (no key, no full response body). The Subscription Key is never logged. The `Authorization` header is redacted as `[redacted]`. | ☐ | |
| 5.5 | Click the sidebar's "Open Settings" footer link | The Settings UI opens filtered to `minimaxUsage`. | ☐ | |
| 5.6 | On the `error:invalid_key` state, click the "Open Settings" CTA inside the error block | The Settings UI opens filtered to `minimaxUsage`. | ☐ | |
| 5.7 | On a transient / rate-limited error, click the "Dismiss" CTA inside the error block | The sidebar closes (the workbench sidebar collapses via `workbench.action.closeSidebar`). | ☐ | |

**Sign-off after section 5:** ☐ pass ☐ fail. List any defects below.

---

## 6. Security verification

| # | Check | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 6.1 | Open the Output panel under "MiniMax Usage". Trigger a few refreshes. | The `Authorization` header is never visible. The Subscription Key is never visible. The `minimaxUsage.apiKey` SecretStorage value is never visible. The request URL has no `key=`, `api_key=`, `apikey=`, or `token=` query param. | ☐ | |
| 6.2 | Open DevTools (Help → Toggle Developer Tools). Inspect the sidebar webview. | The webview's CSP is `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'`. The webview has NO API key. The host posts redacted data over `postMessage`. | ☐ | |
| 6.3 | Search the workspace `.vsix` for the Subscription Key | The key is not in the .vsix. (Run `unzip minimax-usage-0.1.0.vsix -d /tmp/vsix && grep -r "sk-cp-" /tmp/vsix` — the only matches should be in the test fixtures as `sk-cp-XXXX…` placeholders.) | ☐ | |
| 6.4 | Confirm no telemetry | The extension does not phone home. `unzip` the .vsix, check `package.json` for a `telemetry` key (must be absent) and for analytics SDKs in `dependencies` (must be empty). | ☐ | |

**Sign-off after section 6:** ☐ pass ☐ fail. List any defects below.

---

## 7. Build and package verification

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 7.1 | From `v0.1.0`, run `npm run build` | Two bundles produced: `dist/extension.js` (~56kb) + `dist/webview/sidebar.js` (~17kb). Sourcemaps present. The esbuild `assertWebviewAssets()` check passes silently. | ☐ | |
| 7.2 | Run `npm run package:prod` (no env var) | `minimax-usage-0.1.0.vsix` produced. Exit 0. **No `vsce` warning about `*` activation.** Verify the .vsix contains `dist/webview/sidebar.html`, `dist/webview/sidebar.css`, `dist/webview/sidebar.js` and does NOT contain `dist/webview/modal.html` etc. (the old modal template is gone). | ☐ | |
| 7.3 | Run `MINIMAX_USAGE_DEV_KEY=sk-cp-XXXX-TEST npm run package:prod` | The build throws with the error: "MINIMAX_USAGE_DEV_KEY is set in a production build. Unset the env var or build with NODE_ENV != 'production'." Exit 1. **No .vsix is produced.** | ☐ | This is the loud-fail; do not proceed to publish if it doesn't fire. |
| 7.4 | Verify the icon is in the .vsix | `unzip -l minimax-usage-0.1.0.vsix \| grep logo` shows `extension/images/logo-v0.1.0.png` | ☐ | |
| 7.5 | Verify the new activity-bar icon is wired in `package.json` | `unzip -p minimax-usage-0.1.0.vsix extension/package.json \| python3 -m json.tool \| grep -A4 activitybar` shows a single container `minimaxUsage` with the logo icon. | ☐ | |

**Sign-off after section 7:** ☐ pass ☐ fail. List any defects below.

---

## 8. CI verification (workflow wiring)

| # | Action | Expected result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 8.1 | Open a PR from `v0.1.0` to a feature branch (or another version branch). | The CI workflow fires. Lint, typecheck, test, build, package:prod all run. A `.vsix` artifact is uploaded. The PR check is green. | ☐ | |
| 8.2 | Run the publish workflow via `Actions → Publish → Run workflow`. Default `dry_run` is `true`. | The workflow runs lint, typecheck, test, build, package:prod, then exits 0 at the publish step (because `dry_run` is true and the publish is skipped). | ☐ | This is the dry-run; the .vsix is produced but not published. |

**Sign-off after section 8:** ☐ pass ☐ fail. List any defects below.

---

## 9. Defects log

Use this space to log any defects found during the round-3 test.
Each defect gets an ID, a severity (Blocker / Major / Minor),
and a one-line description. Blockers stop the PR; Major goes on
the v0.1.0 follow-up; Minor is filed for v0.1.1.

| ID | Severity | Description | Where | Fix |
| --- | --- | --- | --- | --- |
| D-1 | | | | |
| D-2 | | | | |
| D-3 | | | | |

If the defects log is empty, the v0.1.0 PR can proceed.

---

## 10. Sign-off

When all sections above are marked pass, sign below.

```
Project owner: __________________________  Date: ____________
Result: ☐ All sections pass — v0.1.0 ready for the → main PR
        ☐ Sections ___ failed — PR blocked, see defects log
        ☐ Sections ___ passed with nits — PR proceeds, nits filed for v0.1.1
```

After sign-off, the orchestrator opens the v0.1.0 → main PR
with the title and body already drafted. You can open the PR
yourself from the web UI or your terminal (the orchestrator's
`gh` CLI is not authenticated in this shell, so the orchestrator
will hand you the title and body and you can paste it in). The
PR's merge to main triggers the publish workflow
(`release: published` on main), which publishes the v0.1.0
`.vsix` to the VSCode Marketplace under the `devparanjay`
publisher.

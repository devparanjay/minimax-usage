# v0.1.0 — Defect Log (Round 3)

**Source:** project owner's report after the round-2 test,
2026-06-05 15:14 IST. The project owner rejected the editor-tab,
secondary-sidebar, and bottom-panel approaches and asked for a true
"floating popup overlay above everything" UX; the VSCode public API
does not support a floating HTML overlay. The project owner accepted
the left sidebar as the closest non-tab option and asked for it to be
"beautiful and easy on the eyes".

**Compiled by:** orchestrator (FooFoo), 2026-06-05.

This document is the canonical defect log for round 3. Round 1's defect
log (`.kitchen/test/defects-v0.1.0.md`) and round 2's defect log
(`.kitchen/test/defects-round2-v0.1.0.md`) are now closed (D-1..D-9
resolved). This document covers D-10 and D-11.

---

## Defect summary

| ID   | Severity | Title                                                                                                                                          | Where                                                                                            | Blocking? |
|------|----------|------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|------------|
| D-10 | Blocker  | Status bar click UX does not match the project owner's intent — they want a real floating popup overlay above everything, not an editor / sidebar / bottom-panel tab. Closest VSCode-native option accepted: primary (left) sidebar view. | `package.json`, `src/extension.ts`, `src/ui/webview/sidebarUsageView.ts`, `src/ui/webview/template/sidebar.{html,css,ts}` | Yes |
| D-11 | Blocker  | Status bar click in non-setup / non-invalid-key states throws "command 'minimaxUsage.showUsage' not found" — D-10 removed the command but the status bar's `DEFAULT_COMMAND` still references it. | `src/ui/statusBar.ts:30` (`DEFAULT_COMMAND`), `src/extension.ts` (StatusBarController options) | Yes |

---

## D-10 — Status bar click UX: switch to a beautiful primary (left) sidebar view

**Source:** project owner's report, 2026-06-05 15:14 IST:

> I previously told you that clicking the status bar should only open up a relatively small floating rectangular pop up modal right above where the status bar was clicked. Similar to how a notification popup appears but it is larger and not a notification popup (approximately the same width as a regular notification popup but 2-3 times more in height. Some other extensions already do a similar thing. You can keep a button/link inside the popup modal to open a larger view in the side panel but the primary and default view is always going to be the popup modal as I described above. I do not want it to open in the sidebar or an editor tab.

> No, I do not want it even in the bottom panel area where terminal and output lives. It absolutely needs to be a floating popup modal/overlay that appears above everything when you click the status bar.

> Okay, fine, you can do it in the left sidebar instead. Make it look beautiful and easy on the eyes.

**Honest platform note:** VSCode's public extension API does not expose a floating HTML overlay anchored to a status bar item. The places rich HTML content can be put are editor tabs (`WebviewPanel`), sidebar panels (`WebviewView` in the primary or secondary side bar), and bottom-panel tabs (`WebviewView` in `workbench.panel`). The project owner asked specifically to exclude all three. The only floating UI primitives are `showInformationMessage` (text only), `showQuickPick` (list only), and `showInputBox` (single field). None of them supports rich HTML.

The project owner accepted the **primary (left) sidebar** as the closest non-tab option, with the request that the view look "beautiful and easy on the eyes".

**Expected:**

1. Clicking the status bar opens a view in the **primary (left) sidebar** (not the secondary/right sidebar, not the editor, not the bottom panel).
2. The view is rendered via a `WebviewViewProvider` registered under a new `viewsContainers.activitybar` entry — a new icon is added to the activity bar (left side) labelled "MiniMax Usage" with the extension logo.
3. The view content is the same data flow as before (5-Hour Limit block, Weekly Limit block, optional Credits Balance block, error states, loading state, last-updated timestamp).
4. The visual design is polished:
   - Body background matches the sidebar (`--vscode-sideBar-background`).
   - Generous whitespace; cards have rounded corners and a subtle border.
   - 6px progress bars with smooth color transitions (green > 50%, yellow 20–50%, red < 20%).
   - Typography hierarchy: 14px semibold titles, 18px semibold values (with `tabular-nums`), 13px body, 11px metadata.
   - All colors are VSCode theme variables with hex fallbacks (no hardcoded colors).
   - Smooth CSS transitions on progress-bar width, color, and border (160–320ms ease-out).
   - Sticky header and footer; flex column layout for the body.
5. Inside the view, the existing modal-style interactions still work: an "Open Settings" link in the footer, a clickable "Open Settings" CTA on the `error:invalid_key` state, and a "Dismiss" CTA on the rate-limit / transient / unavailable errors. The dismiss action closes the sidebar.
6. The header shows the title, the current region (e.g. "Overseas" or "Mainland China"), and the last-updated timestamp.
7. The `modalLocation` setting (added in round 2) is **removed** — the popup UX is now always the left sidebar.
8. The `minimaxUsage.showUsage` command (added in round 2) is **removed** — the status bar click directly opens the left sidebar.
9. The round-2 implementation (the `auxiliaryUsageView.ts` in the secondary side bar, the `usageModal.ts` editor tab, and the `modal.html/css/ts` template) is **deleted** — superseded by the new sidebar view.

**Actual (before the fix):** the editor tab opens (round 1), then the secondary sidebar with a `modalLocation` setting to switch to the right sidebar (round 2). The project owner rejected all of these.

**Root cause:** the prior rounds kept trying to land the closest alternative. The project owner pushed back each time. The current round accepts the primary (left) sidebar as the closest non-tab option.

**Fix:**

1. **New `package.json#contributes.viewsContainers.activitybar`** with a single container `{ id: "minimaxUsage", title: "MiniMax Usage", icon: "images/logo-v0.1.0.png" }`.
2. **Drop the previous `viewsContainers.secondarySideBar`** — the right-sidebar is no longer supported.
3. **Drop the `minimaxUsage.modalLocation` setting** and the `minimaxUsage.showUsage` command — the popup is always the left sidebar.
4. **Add a new `src/ui/webview/sidebarUsageView.ts`** — a `WebviewViewProvider` for the new view. Exports `SIDEBAR_VIEW_ID = "minimaxUsage.usage"` and `SIDEBAR_CONTAINER_ID = "minimaxUsage"`. The provider:
   - Reads `dist/webview/sidebar.html` at `resolveWebviewView` time, with a fallback HTML on missing-file (logged via the logger).
   - Wires `webview.onDidReceiveMessage` for the same `WebviewMessage` protocol as before.
   - Wires `webviewView.onDidDispose` for cleanup.
   - Exposes `postSnapshot(snapshot)` and `postLoading()` for the polling controller.
   - On the `dismiss` message, fires `workbench.action.closeSidebar`.
5. **New webview template** — `src/ui/webview/template/sidebar.{html,css,ts}`:
   - `sidebar.html` — header (title + region + last-updated), main (loading state, data blocks, credits block, error block), footer (Open Settings link).
   - `sidebar.css` — beautiful, easy-on-the-eyes design: VSCode theme variables with hex fallbacks; sticky header/footer; 6px rounded progress bars with smooth color and width transitions; card-based blocks with subtle borders; smooth hover states on links and CTAs.
   - `sidebar.ts` — same data flow as the previous modal template, but renders the new HTML structure; uses `STR_SIDEBAR_*` strings.
6. **Update `src/extension.ts`** — register the new `SidebarUsageViewProvider`; the status bar click fires `workbench.view.minimaxUsage` to open the left sidebar; the polling controller's `fireAfterRefresh` posts to the sidebar view; remove the `usageModal.ts` and `auxiliaryUsageView.ts` references.
7. **Update `esbuild.config.mjs`** — bundle `src/ui/webview/template/sidebar.ts` into `dist/webview/sidebar.js`; copy `sidebar.html` and `sidebar.css` to `dist/webview/`. The `assertWebviewAssets()` check now expects `sidebar.html`, `sidebar.css`, `sidebar.js`.
8. **Update `src/strings.ts`** — add `STR_SIDEBAR_TITLE`, `STR_SIDEBAR_LOADING`, `STR_SIDEBAR_FOOTER_SETTINGS`, `STR_SIDEBAR_REGION_OVESEAS`, `STR_SIDEBAR_REGION_CN`. Remove `STR_SIDEBAR_FOOTER_DISMISS` (no longer used). Remove `STR_SETTINGS_MODALLOCATION_*` (no longer a setting).
9. **Drop `ModalLocation` type** from `src/types/settings.ts`; drop the `readModalLocation()` and `ModalLocation` from `src/settings/{schema,read}.ts`.
10. **Drop unused files**:
    - `src/ui/webview/usageModal.ts` (the editor tab)
    - `src/ui/webview/auxiliaryUsageView.ts` (the right sidebar)
    - `src/ui/webview/template/modal.{html,css,ts}` (the editor-tab template)
    - `test/ui/modalLoad.test.ts` (the modal-bundle load test)
    - `test/ui/usageModal.test.ts` (the editor-tab unit test)
11. **Add new tests**:
    - `test/ui/sidebarLoad.test.ts` — replaces the deleted `modalLoad.test.ts`. Verifies the `sidebar.js` bundle contains `STR_SIDEBAR_TITLE`, calls `applyStaticStrings` before the ready postMessage, populates the title and footer strings, and falls back to a hardcoded title when the data-str lookup throws or the ready postMessage throws.
    - `test/ui/sidebarUsageView.test.ts` — replaces the deleted `usageModal.test.ts`. Verifies the `readBundledHtml` returns the bundled HTML when the file exists, returns the fallback HTML and logs an error when missing (and the logged context doesn't contain a Subscription Key), does not consult the source-tree path, and re-reads the bundle on each call.
12. **Update design docs** — `.kitchen/design/user-flow-v0.1.0.md`, `.kitchen/design/ui-spec-v0.1.0.md`, `.kitchen/design/strings-v0.1.0.md`.
13. **Update the test guide** — `.kitchen/test/local-test-guide-v0.1.0-r2.md` is superseded by `.kitchen/test/local-test-guide-v0.1.0-r3.md` (D-10 round). Replace the `modalLocation` test (sections 2.9/2.10/4.5) with the left-sidebar tests.

**Where:** all of the above files.

**Severity:** Blocker. The popup UX is the primary user-visible surface of the extension; if it doesn't match the project owner's intent, the v0.1.0 release is blocked.

---

## D-11 — Status bar click throws "command 'minimaxUsage.showUsage' not found"

**Source:** project owner's report, 2026-06-05 16:14 IST:

> Getting this error when clicking the status bar after installing the rebuilt vsix - "command 'minimaxUsage.showUsage' not found"

**Expected:** clicking the status bar opens the primary (left) sidebar (the same behaviour as the activity-bar icon click).

**Actual:** clicking the status bar throws the error `command 'minimaxUsage.showUsage' not found` because the D-10 commit removed the `minimaxUsage.showUsage` command from `package.json#contributes.commands` but left `DEFAULT_COMMAND = "minimaxUsage.showUsage"` in `src/ui/statusBar.ts`. Every status-bar presentation in the switch statement except the `setup` and `error:invalid_key` cases falls through to `DEFAULT_COMMAND` (7 cases), so almost every status-bar click was broken.

**Root cause:** the D-10 commit dropped the `minimaxUsage.showUsage` command and the `openUsage()` wrapper in `src/extension.ts` was updated to fire `workbench.view.minimaxUsage` directly, but the status bar's per-state `presentation.command` was not updated. The status bar's `DEFAULT_COMMAND` constant still referenced the removed command.

**Fix:**

1. **`src/ui/statusBar.ts`** — change `DEFAULT_COMMAND` from `"minimaxUsage.showUsage"` to `"workbench.view.minimaxUsage"` (the built-in VSCode command for opening an activity-bar view). Add a comment explaining the new command and the D-10 / D-11 history.
2. **`src/ui/statusBar.ts`** — remove the dead `onClick` and `openModal` parameters from `StatusBarItemOptions` (the `StatusBarController` does not use them; the click is handled by VSCode via `item.command`).
3. **`src/extension.ts`** — drop the `onClick: openUsage` and `openModal: openUsage` properties from the `StatusBarController` constructor options (no longer in the interface).

**Where:** `src/ui/statusBar.ts`, `src/extension.ts`.

**Severity:** Blocker. The primary user-visible surface (the status bar click) is broken for 7 of the 9 status-bar states.

---

## Sign-off

The round-3 defect log is closed when D-10 and D-11 are fixed, committed, pushed to `origin/v0.1.0`, and verified by the project owner on the next test pass.

```
Orchestrator: FooFoo                    Date: 2026-06-05
Source: project owner report, 2026-06-05 15:14 IST
Status: open (D-10)  in progress  resolved
```

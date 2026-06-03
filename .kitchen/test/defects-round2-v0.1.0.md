# v0.1.0 — Defect Log (Round 2)

**Source:** project owner's partial re-test on `v0.1.0` after the
round-1 fix, 2026-06-03 17:46 IST. The project owner did NOT do a
full re-test of every section — these are the issues found in the
subset of the local-test guide they re-exercised. The remaining
sections will be re-tested after this round's fixes land.

**Compiled by:** orchestrator (FooFoo), 2026-06-03 17:50 IST.

This document is the canonical defect log for round 2. Round 1's
defect log (`.kitchen/test/defects-v0.1.0.md`) covered D-1..D-5 and
is now closed pending re-test confirmation. This document covers
D-6..D-9.

---

## Defect summary

| ID  | Severity | Title                                                                                                                                                       | Where                                                                | Blocking? |
|-----|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|------------|
| D-6 | Blocker  | Modal opens as a new editor tab (not a popup) and shows only an empty h1 (the "underscore") — modal.js is not populating the data                  | `src/ui/webview/usageModal.ts` + `src/ui/webview/template/modal.ts` + the webview host messaging path | Yes |
| D-7 | Major    | Marketplace changelog (root `CHANGELOG.md`) currently lists `.kitchen/` paths and internal governance references; must be user-facing only            | `CHANGELOG.md`                                                        | No, but should be fixed before re-publish |
| D-8 | Major    | Marketplace README renders with broken images (relative paths don't resolve) and the install badge is "retired"                                              | `README.md` (root)                                                     | No, but should be fixed before re-publish |
| D-9 | Minor    | Marketplace category is `["Other"]`; user expects relevant categories (AI, etc.)                                                                              | `package.json#categories`                                              | No |

---

## D-6 — Modal opens as editor tab, content not populating

**Source:** project owner's report, 2026-06-03 17:46 IST:

> The primary issue is that the popup modal is not opening when clicking on the status bar or running the show usage command in VSC. Earlier there was a new editor tab opening with a message saying modal template not found. Now, a new editor tab is still opening when clicking but instead of the earlier message, there seems to be a large white underscore character there on top left and nothing else.

**Expected:**

1. Clicking the status bar (or running `MiniMax Usage: Show Usage`) opens a panel — not a new editor tab.
2. The panel renders the modal content: title, 5-Hour Limit block, Weekly Limit block, optional Credits Balance block, footer.
3. The "panel" is a `WebviewPanel` with `ViewColumn.Active` (the active column). The user expects this to feel like a popup; the actual VSCode UX is a panel that takes the editor area. A "popup" in VSCode terms is the closest to "an editor tab that takes the whole area," which is what `ViewColumn.Active` provides. The actual limitation is that VSCode does not support a true floating popup for webviews; a WebviewPanel is always in an editor column.

**Actual:**

1. The user clicks the status bar, gets a new editor tab.
2. The tab title is "MiniMax Usage".
3. The content is "a large white underscore character there on top left and nothing else" — this is the `.header` `border-bottom: 1px solid var(--color-border)` rendering against an empty header (the h1 has no text content; the underscore is the header's bottom border).

**Root cause (under investigation):**

The likely chain:
- `usageModal.ts` (the host) creates a `WebviewPanel` with `ViewColumn.Active` and reads the HTML from `context.extensionPath/dist/webview/modal.html`. This is the round-1 fix.
- `modal.html` has the `<h1 class="header__title" id="title" data-str="STR_MODAL_TITLE_TOKENPLAN"></h1>` placeholder. The `<script src="modal.js">` tag loads the bundled script.
- `modal.ts` (the script) calls `applyStaticStrings()` on load, which iterates over `[data-str]` elements and populates their `textContent` from `STRINGS`. The bundle (`dist/webview/modal.js`) contains `STRINGS.STR_MODAL_TITLE_TOKENPLAN = "MiniMax Usage"` (verified via `rg` on the bundle).
- After `applyStaticStrings`, `modal.ts` posts `{ kind: "ready" }` to the host. The host (`usageModal.ts` line 178-179) receives `ready`, calls `onModalOpen(this.opts.controller)` (which triggers a `refreshNow`), and then `postSnapshot(this.opts.store.read())` which sends a `HostMessage { kind: "snapshot", payload: ... }` to the webview.
- The webview's message handler (`modal.ts` line 332-337) receives the snapshot and calls `applyHostMessage` -> `renderSnapshot`, which populates the data blocks, error block, and footer.

If the user sees only the header's bottom border, **either** the script isn't running, or the script runs but `applyStaticStrings` doesn't populate the title.

The most likely failure mode: a runtime error before `applyStaticStrings` runs. Possibilities:
- `acquireVsCodeApi()` throws (only in certain webview contexts).
- An import is missing in the bundled output.
- The bundled `STRINGS` object is undefined (e.g., due to a CJS/ESM mismatch in the webview bundle).

**Fix plan:** investigate by reading the bundled `dist/webview/modal.js` directly to confirm `STRINGS` is populated, and check for runtime errors in the script. Likely fix: ensure the script's early initialization is bullet-proof, add a try/catch around `applyStaticStrings` so a partial populate doesn't fail entirely, and confirm the `asWebviewUri` resolution for the script src is correct.

The "editor tab, not popup" complaint: the user wants a more popup-like UX. `ViewColumn.Active` is the right call. To make the panel feel less like a tab and more like a panel, options:
- The panel is always an editor. VSCode does not support a true floating webview.
- A `WebviewView` registered as a view in the auxiliary bar would feel more like a panel. Trade-off: the user has to open the auxiliary bar (View → Appearance → Secondary Side Bar).
- Add a configuration option `minimaxUsage.modalLocation` with `["active", "auxiliary"]` so the user can choose. Default `active`.

For round 2, fix the rendering bug (so the user can see the modal content). Defer the UX change to a follow-up.

**Where:** `src/ui/webview/usageModal.ts`, `src/ui/webview/template/modal.ts`, possibly `esbuild.config.mjs` (webview entry).

**Severity:** Blocker. The entire modal UX is broken.

---

## D-7 — Marketplace changelog has internal references

**Source:** project owner's report, 2026-06-03 17:46 IST:

> Also, remove and never include internal working and references in the marketplace changelog.

**Expected:** the root `CHANGELOG.md` is user-facing once the extension is published (the Marketplace shows it). It should describe user-visible changes, not internal governance.

**Actual:** the current `CHANGELOG.md` lists:
- "Project scaffolding: `.kitchen/` governance docs (discussion records, ADRs, roadmaps, phase plans, tasks), `/docs/` for user-facing docs, root `README.md`, `.gitignore`, `.gitattributes`, this `CHANGELOG.md`."
- "Project-wide roadmap in `.kitchen/roadmaps/project-roadmap.md`."
- "v0.1.0 roadmap, timeline, phase plans, and tasks in `.kitchen/roadmaps/v0.1.0/`."
- "ADRs `0001`–`0004` covering distribution, version branching, API discovery, and publishing."

All four bullet points reference `.kitchen/` paths and internal governance artefacts. The marketplace reader doesn't care about these.

**Root cause:** the `CHANGELOG.md` was authored as a project-history document (internal) rather than as a user-facing release-notes document. The Keep a Changelog format supports both, but the "Added/Changed/Fixed" entries should be framed for the user, not the maintainer.

**Fix:** rewrite the `CHANGELOG.md` for v0.1.0 as a user-facing release. Structure:
- Top: thank-you / what is this.
- `[0.1.0] — <date>`: user-visible "Added" entries (status bar entry for Token Plan usage, modal with 5-Hour and Weekly progress bars, Credits Balance display, region toggle for Overseas and Mainland China, no telemetry, no analytics). No `.kitchen/`, no internal artefact references.
- Bottom: a one-line link to the GitHub repo for full history (the project owner can keep the full project-history in the v0.0.x entries if any).

**Where:** `CHANGELOG.md` (root).

**Severity:** Major. Not blocking the install but unprofessional in a public listing.

---

## D-8 — Marketplace README renders with broken images and a "retired" install badge

**Source:** project owner's report, 2026-06-03 17:46 IST:

> The marketplace readme is also not getting rendered properly. The images are not appearing anywhere in there and the VSCode Marketplace badge says "retired badge".

**Expected:** the marketplace README displays:
- The logo image at the top of the README (centered hero).
- The Install badge rendered as a clickable "Install from VSCode Marketplace" button.
- A "Star on GitHub" badge.
- Any other images (the screenshot placeholder) as broken images is acceptable for round 2 (the TODO comment is in place).

**Actual:**
- Images don't render (the marketplace reads the README from the GitHub raw URL and the image paths in the README are relative — `./images/logo-v0.1.0.png` — which the marketplace cannot resolve to a public URL).
- The VSCode Marketplace install badge `https://img.shields.io/vscode-marketplace/v/devparanjay.minimax-usage.svg` returns a "retired badge" indicator. This is the shields.io `vscode-marketplace` endpoint behavior when the extension isn't actively published or the endpoint is deprecated.

**Root cause:**
1. **Image paths:** the README uses `./images/logo-v0.1.0.png` (relative). GitHub renders this correctly when the README is viewed on github.com (it resolves to the repo file). The Marketplace reads the README via a raw GitHub URL, fetches the markdown source, and renders the HTML — relative image paths in the fetched HTML do not resolve to a public URL. The fix: use absolute GitHub URLs: `https://raw.githubusercontent.com/devparanjay/minimax-usage/main/images/logo-v0.1.0.png` or `https://github.com/devparanjay/minimax-usage/blob/main/images/logo-v0.1.0.png?raw=true`. The former is the more standard pattern.
2. **Install badge:** the `vscode-marketplace` shields.io endpoint may be returning a "retired" indicator because the extension is not yet publicly listed. Once the project owner publishes to the Marketplace under the `devparanjay` publisher, the badge will render with the live version. For a pre-publish state, the badge is decorative. Alternative: switch to a different badge style that doesn't show "retired" (e.g., `https://img.shields.io/badge/Install-VSCode-blue.svg` which is static text), or keep the shields.io badge and accept the "retired" pre-publish.

**Fix:**
1. Replace relative image paths in the README with absolute `https://raw.githubusercontent.com/devparanjay/minimax-usage/main/...` URLs.
2. Keep the shields.io install badge (it will resolve correctly once the Marketplace listing is public). Document the "retired" pre-publish state in the README with a sentence: "Install badge is showing the Marketplace pre-publish state; click through to verify the listing once you've published." Alternative: switch to a static text badge that doesn't show "retired" status.

**Where:** root `README.md`.

**Severity:** Major. Not blocking the install but unprofessional in a public listing.

---

## D-9 — Marketplace category is "Other" only

**Source:** project owner's report, 2026-06-03 17:46 IST:

> Also, right now the marketplace category says "Other". Add relevant categories to it like AI, etc.

**Expected:** the Marketplace listing shows multiple relevant categories.

**Actual:** `package.json#categories` is `["Other"]` only.

**Root cause:** the build phase defaulted to `["Other"]` because no clear category fit was identified. The VSCode Marketplace categories are an enum: `["Programming Languages", "Snippets", "Linters", "Debuggers", "Formatters", "Keymaps", "SCM Providers", "Extension Packs", "Dependency Management", "Education", "Other"]`. None of these are a great fit for a usage monitor. The closest are `Other` and arguably `Education` (a usage monitor could be educational). `AI` is NOT a valid VSCode Marketplace category.

**Fix:** keep `["Other"]` as the primary category. The user mentioned "AI" but `AI` is not a valid Marketplace category — the user's mental model differs from the Marketplace's taxonomy. Note this in the project owner's reply. If the user wants a non-Marketplace category for their own categorization (e.g., for filtering on the GitHub repo), use `package.json#keywords` (which is free-form) instead of `package.json#categories` (which is enum-constrained).

**Where:** `package.json#categories`.

**Severity:** Minor. The current `["Other"]` is a valid category. The user may be confusing Marketplace categories with GitHub topics or other tag systems. Flag back to the project owner.

---

## Sign-off

The round-2 defect log is closed when all 4 defects (D-6 through D-9) are fixed, committed, and verified on the next test pass.

```
Orchestrator: FooFoo                    Date: 2026-06-03
Source: project owner partial re-test, 2026-06-03 17:46 IST
Status: open (defects D-6..D-9)  in progress  resolved
```

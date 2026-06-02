# Phase 03 — Design

**Owners:** `ux-designer` (flow) + `ui-designer` (visual) +
`ux-writer` (text)
**Status:** complete (3 of 3 documents committed; depends on phase 02)
**Goal:** produce the user-flow, wireframes, and visual design for
the usage modal, status bar entry, and settings UI, plus the
canonical user-facing strings.

## Outcome

The design phase produced three documents under
`.kitchen/design/`, each fixing one layer of the design. Together
they are the contract for the build phase (Phase 04) and the
canonical source for the user-facing text, the visual treatment,
and the wireframes.

- **`user-flow-v0.1.0.md`** — wireframe-level user flow for the
  v0.1.0 user path. Covers the first-run flow (the
  "set up" status bar, the first-run notification, the
  `showInputBox` with `password: true`, the loading state, the
  modal becoming available), the steady-state flow on status-bar
  click, the display-mode picker (tokenPlan / credits / both) and
  the modal layout per mode, the region picker and its
  cache-invalidate-and-refresh reaction, the no-network-call
  re-render on display-mode change, and a wireframe for every
  modal state from `data-flow.md` § 5 (`idle`, `loading`,
  `success`, `empty`, `quota_exhausted`, `error:invalid_key`,
  `error:rate_limited`, `error:transient`, `error:unavailable`)
  plus the "Credits Balance unavailable" placeholder mandated by
  the discovery record's "Decisions confirmed" item 3. Each
  wireframe shows the modal at 360px, the status bar, and the
  recovery call-to-action. Diagrams are ASCII (consistent style
  across the document) with a Mermaid sequence diagram for the
  first-run flow.
- **`ui-spec-v0.1.0.md`** — visual spec. Concrete status-bar
  icon / text / tooltip per modal state (a table mapping each
  of the 9 modal states plus the setup state and the
  credits-unavailable state, with the specific octicon IDs
  `$(loading~spin)`, `$(check)`, `$(dash)`, `$(warning)`,
  `$(error)`, `$(sync)`, `$(gear)`, `$(info)`). Modal layout at
  360px and 720px (single-column, more whitespace at 720px, no
  side-by-side grid). Progress-bar styling with concrete CSS
  (`height: 4px`, `border-radius: 2px`, solid colour per stop,
  `transition: width 0.3s ease-out`, no CSS gradient) and the
  "Resets in" formatter (the `2h 14m` / `12m 03s` / `5d 3h` /
  `12s` rules). Colour tokens are VSCode theme variables with
  hex fallbacks for older VSCode versions
  (`--vscode-charts-green` / `--vscode-charts-yellow` /
  `--vscode-charts-red`, `--vscode-foreground`,
  `--vscode-descriptionForeground`,
  `--vscode-errorForeground`, `--vscode-editorWidget-border`,
  `--vscode-textLink-foreground`,
  `--vscode-statusBarItem-foreground`,
  `--vscode-statusBarItem-errorForeground`,
  `--vscode-statusBarItem-warningForeground`, `--vscode-focusBorder`,
  `--vscode-notifications-background`,
  `--vscode-notifications-border`,
  `--vscode-notificationHeader-foreground`,
  `--vscode-button-background` / `--vscode-button-foreground`
  / `--vscode-button-hoverBackground`). Typography inherits
  VSCode's editor font (no remote loads — the CSP forbids them)
  with sizes 11px / 13px / 15px and weights 400 / 600. Spacing
  is a 4 / 8 / 12 / 16 / 24 px scale. The icon set is the
  octicon IDs named above; the notification button is a text
  label, not an icon. The empty / no-data state is a centred
  message with `$(info)` and the strings from the strings
  document. The error-state block is a single block with a
  coloured left-border (red for `invalid_key`, yellow for
  `rate_limited`, grey for `transient` / `unavailable`), a
  tinted background, the error title, the body copy, and one
  primary call-to-action button.
- **`strings-v0.1.0.md`** — canonical user-facing strings.
  Every string the extension displays is here with an ID, the
  string itself, a usage note, and a voice note. The IDs are
  namespaced `STR_<surface>_<purpose>`. The strings cover the
  first-run notification, the `showInputBox` (prompt,
  placeholder, validation error, success confirmation), the
  settings UI labels (`minimaxUsage.region` and
  `minimaxUsage.displayMode` `markdownDescription` and
  `enumDescriptions`, plus the "Subscription Key" custom row),
  the status bar text per state (with template strings for
  the success / quota_exhausted / transient / unavailable
  states), the modal title per `displayMode`, the block
  titles, the progress-bar labels (including the "Quota used"
  value computed as `100 − remaining_percent` per the
  discovery record's "Decisions confirmed" item 4), the empty
  state, the "Credits Balance unavailable" placeholder, the
  error-state copy per state (with the Subscription Key vs
  Open Platform API Key distinction in `error:invalid_key` and
  the region-mismatch hint, per the discovery record's
  "Decisions confirmed" item 5), the recovery call-to-action
  labels, the tooltip text per status-bar state, and the
  "Last updated" footer strings. A banned-words list
  (no "amazing" / "incredible" / "free" / "!" / "Click here"
  / "Learn more" / "we" / "Sorry" / "just" / "simply" /
  "easy" / "Oops" / "Uh-oh" / "Heads up") and a glossary of
  canonical terms (Subscription Key, Token Plan, Credits,
  5-Hour Limit, Weekly Limit, Mainland China, overseas, Status
  bar entry, Modal, Open Platform API Key, Settings) are
  included. The strings document is the single source of
  truth for Phase 04; the implementation imports strings by
  ID.

The three documents cross-reference each other and the
architecture; the strings document is the build phase's
contract for what the user sees, and the visual spec is the
contract for how it is rendered. The orchestrator sign-off
is the next gate; the project owner reviews before Phase 04
begins.

## Inputs

- Architecture from phase 02 (especially the data-flow and the
  settings schema).
- API contract from phase 01 (to know what fields are available).
- v0.1.0 user story (kickoff discussion).

## Deliverables

- `.kitchen/design/user-flow-v0.1.0.md` — wireframe-level user
  flow for the modal, status bar, and settings.
- `.kitchen/design/ui-spec-v0.1.0.md` — visual spec: status bar
  icon, modal layout, progress-bar styling, color tokens,
  typography, spacing.
- `.kitchen/design/strings-v0.1.0.md` — canonical user-facing
  strings (notification text, settings labels, status bar text,
  modal copy, error messages). Banned-words list if any.
- Updated `.kitchen/roadmaps/v0.1.0/phases/03-design.md`.

## Tasks

See `.kitchen/roadmaps/v0.1.0/tasks/03-design-tasks.md`.

## Verification

- The user-flow covers install → API key → settings → status bar
  → modal end-to-end, including the error states.
- The strings document is the **single source of truth** for
  user-facing text. The implementation in phase 04 uses these
  strings verbatim.
- The design is reviewed by the orchestrator and signed off.

## Out of scope

- Implementation. Phase 04.
- Documentation. Phase 07.

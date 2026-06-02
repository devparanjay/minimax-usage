# v0.1.0 UI Spec — Visual Design

- **Status:** in review (Phase 03 — Design)
- **Owners:** `ux-designer` (flow), `ui-designer` (visual), `ux-writer` (text)
- **Last updated:** 2026-06-02
- **Source of truth for components:** `.kitchen/architecture/extension-architecture.md`
- **Source of truth for runtime behaviour:** `.kitchen/architecture/data-flow.md`
- **Source of truth for copy:** `.kitchen/design/strings-v0.1.0.md`
- **Source of truth for layout:** `.kitchen/design/user-flow-v0.1.0.md`

This document is the visual spec for the v0.1.0 extension:
the status bar's icon / text / tooltip per state, the modal's
layout at 360px and 720px, the progress-bar styling, the
colour tokens, the typography, the spacing, the icon set, and
the empty / error blocks. Every rule in this document is
implementable as CSS in `src/ui/webview/template/modal.css`
and as a property in `src/ui/statusBar.ts`.

The architecture commits to:

- Honouring the user's VSCode theme via the standard
  `var(--vscode-…)` token family (per
  `extension-architecture.md` § 6.4 and the CSP in
  `modal.html`).
- Inheriting VSCode's editor font (the CSP forbids remote
  font loads; `extension-architecture.md` § 2.1).
- Using only `$(symbol-name)` octicons that VSCode ships
  built-in — no custom font, no glyph atlas, no PNG sprite.

## 1. Status bar — icon / text / tooltip per state

The full mapping is in `data-flow.md` § 5.3. This section
restates it as a concrete, build-phase-ready table with the
specific octicon IDs.

| Modal state | Icon (octicon) | Text | Tooltip | Notes |
| --- | --- | --- | --- | --- |
| `idle` | `$(loading~spin)` | "Loading…" | "Fetching usage…" | Same shape as `loading`; the user never sees `idle` for more than one frame. |
| `loading` | `$(loading~spin)` | "Loading…" | "Fetching usage…" | Spinner animates; prior data (if any) is dimmed in the modal. |
| `success` | `$(check)` | "5h: {5hPercent}% · 7d: {7dPercent}%" | "5h resets in {5hReset} · 7d resets in {7dReset}" | Green icon. Template substitution from `current_interval_remaining_percent` and `current_weekly_remaining_percent`. |
| `empty` | `$(dash)` | "No plan" | "No Token Plan data — see the MiniMax console" | Grey icon. No recovery; user reads the tooltip. |
| `quota_exhausted` | `$(warning)` | "5h: 0%" | "5h resets in {5hReset} · 7d resets in {7dReset}" | Yellow icon. The Weekly window is still in the tooltip but not in the narrow status-bar text. |
| `error:invalid_key` | `$(error)` | "Sign in" | "Subscription Key is invalid or missing — open settings" | Red icon. The user is one click away from the recovery. |
| `error:rate_limited` | `$(warning)` | "Rate limited" | "Too many requests — cooling down" | Yellow icon. No countdown timer (per `data-flow.md` § 4 D). |
| `error:transient` | `$(sync)` | last-known-good, dimmed, "(stale)" suffix | "Last updated {N} {unit} ago — MiniMax API unavailable" | Grey icon. The text reuses the success-state template and appends " (stale)". |
| `error:unavailable` | `$(sync)` | last-known-good, dimmed, "(stale)" suffix | "Last updated {N} {unit} ago — couldn't reach the MiniMax API" | Grey icon. Same shape as `error:transient`; different tooltip text. |
| Setup state (no key) | `$(gear)` | "Set up MiniMax Usage" | "Enter your MiniMax Subscription Key to start" | The "set up" entry is the **only** state where the status bar is also a button to enter the API key. |
| Credits-unavailable (displayMode = "credits") | `$(dash)` | "Credits unavailable" | "Credits Balance unavailable from the official API" | Grey icon. The user is steered to switch to `tokenPlan` mode. |

### 1.1 Icon colour rules

The octicon name alone is colourless. The colour is applied
by VSCode based on the `StatusBarItem`'s `backgroundColor`
property (set per state) or by the inherited
`--vscode-statusBarItem-foreground` token. The rule is:

- `success` — green colour: `var(--vscode-charts-green)`,
  fallback `#3da64a` (light) / `#73c991` (dark).
- `empty` / `error:transient` / `error:unavailable` — neutral
  grey: `var(--vscode-statusBarItem-foreground)`, fallback
  `#cccccc` (light) / `#cccccc` (dark).
- `quota_exhausted` / `error:rate_limited` — yellow:
  `var(--vscode-charts-yellow)`, fallback `#cca700` (light) /
  `#cca700` (dark).
- `error:invalid_key` — red:
  `var(--vscode-charts-red)`, fallback `#b1617a` (light) /
  `#f14c4c` (dark).

The full colour-token table with fallbacks is in § 3.

### 1.2 "(stale)" suffix — typographic treatment

The " (stale)" suffix appended to the last-known-good text
in the `error:transient` and `error:unavailable` states is
rendered in a lower-emphasis colour:
`var(--vscode-descriptionForeground)`, fallback `#717171`
(light) / `#8b8b8b` (dark). The numeric values retain the
default `var(--vscode-statusBarItem-foreground)` colour so
the user can still read them at a glance.

## 2. Modal layout

The modal is a `WebviewPanel` rendered by the webview at
`src/ui/webview/template/modal.html` with styles from
`src/ui/webview/template/modal.css`. The layout is a
**single column** at every viewport width — the 720px
version is the same column with more whitespace and a wider
progress bar.

The modal has four logical sections, in this top-to-bottom
order:

1. **Header** — title + close.
2. **Data blocks** — 5-Hour, Weekly, and (optionally) Credits.
3. **Error block** (when an error state is active) — replaces
   the data blocks.
4. **Footer** — "last updated" timestamp + "Open Settings" link.

Sections 1 and 4 are always rendered. Sections 2 and 3 are
mutually exclusive — at most one is rendered at a time.

### 2.1 Header

```
+--------------------------------------------------------+
|  MiniMax Usage                              [ x ]     |
+--------------------------------------------------------+
```

- Title font: 15px, semibold (`font-weight: 600`), colour
  `var(--vscode-foreground)`, fallback `#000` (light) / `#fff` (dark).
- Title left-aligned, 16px from the left edge of the panel.
- Close button: VSCode's standard panel `$(close)` chrome
  (top-right). The webview does not contribute a close
  button — it is part of the panel chrome.
- Section padding: 12px on the top, 12px on the bottom,
  16px on the left, 12px on the right (per § 6).

### 2.2 Modal at 360px (narrow viewport)

```
+--------------------------------------------------------+
|                                                        |  <- 12px top padding
|  MiniMax Usage                              [ x ]     |  <- header
|                                                        |  <- 12px bottom padding
|  ---                                                   |  <- 1px divider
|                                                        |
|  5-Hour Limit                                          |  <- 8px above block title
|  [========================........] 75% remaining      |  <- progress bar (4px tall)
|  Quota used 25%                                        |  <- 4px above the value line
|  Resets in 2h 14m                                      |  <- 4px above the reset line
|                                                        |  <- 8px below block
|  ---                                                   |  <- 1px divider
|                                                        |
|  Weekly Limit                                          |
|  [============================........] 94% remaining |
|  Quota used 6%                                         |
|  Resets in 5d 3h                                       |
|                                                        |
+--------------------------------------------------------+
|                                                        |
|  Last updated 12s ago       Open Settings              |  <- footer
|                                                        |
+--------------------------------------------------------+
```

- Modal outer width: 360px (the panel chrome adds its own
  padding on top of this — the panel content is ~336px
  inside the chrome).
- Section padding: 12px top / 12px bottom / 16px left /
  12px right.
- Block padding: 8px top / 8px bottom.
- Inter-block gap: 12px (between the bottom of one block and
  the top of the next).
- Divider: 1px, colour `var(--vscode-editorWidget-border)`,
  fallback `#cccccc` (light) / `#303030` (dark). 0 vertical
  margin from the dividers — the gap is built into the block
  padding.

### 2.3 Modal at 720px (wide viewport, "Both" mode)

```
+----------------------------------------------------------------------------+
|                                                                            |
|  MiniMax Usage                                                  [ x ]     |
|                                                                            |
|  ---                                                                       |
|                                                                            |
|  5-Hour Limit                                                              |
|  [==================================........] 75% remaining                |
|  Quota used 25%                                                            |
|  Resets in 2h 14m                                                          |
|                                                                            |
|  ---                                                                       |
|                                                                            |
|  Weekly Limit                                                              |
|  [====================================........] 94% remaining              |
|  Quota used 6%                                                             |
|  Resets in 5d 3h                                                           |
|                                                                            |
|  ---                                                                       |
|                                                                            |
|  Credits Balance                                                           |
|  $24.50 remaining                                                          |
|  2,450 credits                                                             |
|                                                                            |
+----------------------------------------------------------------------------+
|                                                                            |
|  Last updated 12s ago                       Open Settings                   |
|                                                                            |
+----------------------------------------------------------------------------+
```

- Modal outer width: 720px.
- Section padding: 12px top / 12px bottom / **24px** left /
  12px right (the wider viewport gets more left padding for
  visual balance).
- Block padding: 8px top / 8px bottom.
- Inter-block gap: 16px.
- The Credits block reuses the same `8px / 4px` intra-block
  padding as the Token Plan blocks.
- The progress bar is wider in 720px mode; the percentage
  label and the "Resets in" label are still right-aligned
  to the bar's right edge.

### 2.4 Footer

```
+--------------------------------------------------------+
|  Last updated 12s ago       Open Settings              |
+--------------------------------------------------------+
```

- Section padding: 12px top / 12px bottom / 16px left /
  12px right.
- "Last updated {N} {unit} ago" — 11px, colour
  `var(--vscode-descriptionForeground)`. Template:
  `STR_FOOTER_LAST_UPDATED`.
- "Open Settings" — 11px, colour
  `var(--vscode-textLink-foreground)`, fallback
  `#0a66c2` (light) / `#3794ff` (dark). Hover:
  `var(--vscode-textLink-activeForeground)`. The link is a
  real `postMessage` to the host, not a `href` — the host
  runs `commands.executeCommand("workbench.action.openSettings", "minimaxUsage")`.
- The two are **left-aligned and right-aligned** respectively
  (a `space-between` flex row). At narrow widths the row does
  not wrap.
- "Last updated never" is the first-ever open state, with
  the string `STR_FOOTER_LAST_UPDATED_NEVER` ("Last updated
  never").

## 3. Progress bar styling

### 3.1 Anatomy

A progress bar has three elements:

1. **Track** — the unfilled portion. 4px tall, full width of
   the block, 4px corner radius, colour
   `var(--vscode-editorWidget-border)`, fallback
   `#cccccc` (light) / `#303030` (dark).
2. **Fill** — the filled portion. 4px tall, width = `(100 −
   remaining_percent) / 100 × track_width`, left-aligned,
   4px corner radius (so the right edge is rounded even when
   fill is partial), colour per the stop rule in § 3.2.
3. **Value label** — right-aligned to the track's right edge.
   13px, regular weight, colour `var(--vscode-foreground)`.
   Format: "{N}% remaining" (per the discovery record's
   "Decisions confirmed" item 4, the label is "remaining").

Below the bar, two more lines (the "Quota used" and
"Resets in" labels). Both are 11px, regular weight, colour
`var(--vscode-descriptionForeground)`. The "Quota used" line
is left-aligned; the "Resets in" line is also left-aligned.
At 360px width there is no room for the two on one line;
at 720px they remain left-aligned to keep the visual rhythm.

### 3.2 Colour stops — concrete CSS

The fill colour is selected by the value of
`current_interval_remaining_percent` (5-Hour bar) and
`current_weekly_remaining_percent` (Weekly bar) per the
following stops:

| `remaining_percent` range | Fill colour (light) | Fill colour (dark) | Token |
| --- | --- | --- | --- |
| `> 50` (more than half remaining) | `#3da64a` | `#73c991` | `var(--vscode-charts-green)` |
| `> 20` and `≤ 50` | `#cca700` | `#cca700` | `var(--vscode-charts-yellow)` |
| `> 0` and `≤ 20` | `#b1617a` | `#f14c4c` | `var(--vscode-charts-red)` |
| `= 0` (quota_exhausted) | `#b1617a` | `#f14c4c` | `var(--vscode-charts-red)` |

The fill is **not** a CSS gradient — it is a single solid
colour per bar. The "green / yellow / red" stops come from
the data, not from a CSS `linear-gradient`.

The exact stops match the platform's own console behaviour
qualitatively (green when the user has plenty left, red when
they are near exhaustion). The exact `> 50 / > 20 / ≤ 20`
thresholds are design decisions documented here so the build
phase has a single source.

### 3.3 Concrete CSS

```css
.bar {
  position: relative;
  height: 4px;
  width: 100%;
  background: var(--vscode-editorWidget-border, #cccccc);
  border-radius: 2px;
  overflow: hidden;
}

.bar__fill {
  height: 100%;
  border-radius: 2px;
  background: var(--vscode-charts-green, #3da64a);
  transition: width 0.3s ease-out;
}

.bar__fill--warning { background: var(--vscode-charts-yellow, #cca700); }
.bar__fill--danger  { background: var(--vscode-charts-red, #b1617a); }
```

The `transition: width 0.3s ease-out` animates the fill when
the data changes. The animation is short enough to feel
responsive but not so long that the user wonders if the bar
is broken.

The bar's value label and the "Quota used" / "Resets in"
labels are not part of the `.bar` element — they are siblings
in the block.

### 3.4 "Resets in" countdown format

The countdown is a function of `remains_time` (5-hour bar)
and `weekly_remains_time` (weekly bar). The unit is
**milliseconds** (per the reference implementation's
behaviour, marked `[AMBIGUOUS]` in
`api-contract.md` § 6.3). The build phase must handle the
unit-mismatch case defensively (a one-line fix in
`parseTimestamp()`).

The format is `{N}{unit}` where the unit is selected by the
magnitude:

| Range | Format | Example |
| --- | --- | --- |
| `< 60s` | "Ns" | "12s" |
| `< 60m` (1 min to 1 hour) | "Nm Ss" (seconds padded) | "12m 03s" |
| `< 24h` (1 hour to 1 day) | "Nh Mm" | "2h 14m" |
| `< 7d` (1 day to 1 week) | "Nd Mh" | "5d 3h" |
| `≥ 7d` | "Nd Mh" (same) | "9d 12h" |

The "12m 03s" form is the only one with two units; the rest
have one. The seconds are zero-padded to 2 digits in the
"12m 03s" form. The `M` (minutes) and `S` (seconds) and `h`
(hours) and `d` (days) are all lower-case. The `m` and `s`
suffixes use **no space** between the number and the unit
("2h 14m" has spaces between the unit pairs but no space
between the number and the unit).

The status-bar tooltip and the modal both use the same
formatter; the formatter lives in
`src/ui/webview/template/modal.ts` (webview side, for the
modal) and `src/ui/statusBar.ts` (host side, for the
tooltip).

### 3.5 "Quota used" — value mapping

Per the discovery record's "Decisions confirmed" item 4:

- Label: "Quota used".
- Value: `100 − remaining_percent`, rendered as an integer
  percentage with a `%` suffix.
- Examples: `remaining_percent = 75` → "Quota used 25%";
  `remaining_percent = 94` → "Quota used 6%";
  `remaining_percent = 0` → "Quota used 100%".

The label and the value live on the line directly under the
progress bar. They are 11px, colour
`var(--vscode-descriptionForeground)`. The number is
right-aligned to the same right edge as the bar's
percentage label, so the two lines visually align even
though they have different content.

## 4. Colour tokens (consolidated)

This section is the build-phase's single source for colours.
Every colour used by the modal or the status bar is in this
table. The tokens are VSCode theme variables; the fallbacks
are hard-coded hex values for older VSCode versions that
don't have the token. The fallback values are chosen to
match the **default Light+** and **Dark+** themes
respectively.

### 4.1 Tokens used

| Token | Fallback (light / dark) | Used for |
| --- | --- | --- |
| `--vscode-foreground` | `#000000` / `#ffffff` | Modal title, bar value labels, error-block title. |
| `--vscode-descriptionForeground` | `#717171` / `#8b8b8b` | Subtitle text, "(stale)" suffix, "Quota used" / "Resets in" labels, footer. |
| `--vscode-errorForeground` | `#a1260d` / `#f48771` | Error-block title text in `error:invalid_key`. |
| `--vscode-editorWidget-background` | `#f3f3f3` / `#252526` | Modal background (the panel default; the modal does not need to set its own background — it inherits). |
| `--vscode-editorWidget-border` | `#cccccc` / `#303030` | Progress-bar track, modal divider. |
| `--vscode-charts-green` | `#3da64a` / `#73c991` | Success icon, progress-bar fill when `remaining_percent > 50`. |
| `--vscode-charts-yellow` | `#cca700` / `#cca700` | Warning icon, progress-bar fill when `20 < remaining_percent ≤ 50`, `quota_exhausted` icon. |
| `--vscode-charts-red` | `#b1617a` / `#f14c4c` | Error icon, progress-bar fill when `remaining_percent ≤ 20` (and the `= 0` exhaust case). |
| `--vscode-textLink-foreground` | `#0a66c2` / `#3794ff` | "Open Settings" footer link, "Set your API key" settings button. |
| `--vscode-textLink-activeForeground` | `#0a66c2` / `#3794ff` | Footer-link hover/active state (the value is the same; the token name is documented so the build phase can swap the active-state colour from the same family). |
| `--vscode-statusBarItem-foreground` | `#ffffff` / `#ffffff` | Default status-bar text colour (used in `empty`, `error:transient`, `error:unavailable`, the `(stale)` suffix, and the setup state). |
| `--vscode-statusBarItem-errorForeground` | `#ffffff` / `#ffffff` | `error:invalid_key` status-bar text (red icon, white text). |
| `--vscode-statusBarItem-warningForeground` | `#000000` / `#ffffff` | `quota_exhausted` and `error:rate_limited` status-bar text. |
| `--vscode-focusBorder` | `#0a66c2` / `#007fd4` | Focus ring on the "Open Settings" button when the modal is keyboard-navigated. |
| `--vscode-notifications-background` | `#f3f3f3` / `#252526` | First-run notification background. |
| `--vscode-notifications-border` | `#cccccc` / `#303030` | First-run notification border. |
| `--vscode-notificationHeader-foreground` | `#000000` / `#ffffff` | First-run notification title. |

### 4.2 Fallback rules

- The fallback is the value the CSS uses when the token is
  not defined. Older VSCode versions (pre-1.74 for some
  tokens) may not have `--vscode-charts-red` /
  `--vscode-charts-yellow` — the fallback kicks in.
- The `var(--vscode-…, #fallback)` syntax is the standard CSS
  fallback form. The build phase uses this syntax in
  `modal.css`.
- The fallback values are **not** added to the production
  CSS as a second declaration; they live inline as the
  var() fallback. This is so a theme change in VSCode is
  immediately honoured.
- No hard-coded hex is used **outside** the fallbacks. The
  only colours the modal hard-codes are the fallbacks, and
  the fallbacks are only visible when the token is absent.

### 4.3 High-contrast theme

VSCode ships a "high-contrast" theme with stronger
foreground and border values. The `var(--vscode-…)` tokens
are all defined in the high-contrast theme, so the modal
inherits the high-contrast palette automatically. The
build phase does **not** need a separate high-contrast
stylesheet; the tokens cover it.

If the high-contrast theme ever drops a token the modal
relies on, the fallback is the same fallback the
default-theme users see — the worst case is the same
appearance as the default theme, not a contrast failure.

## 5. Typography

Per `extension-architecture.md` § 8 ("no remote loads"), the
modal inherits VSCode's editor font. No `@font-face`, no
Google Fonts, no webfont link.

### 5.1 Font family

```css
font-family: var(--vscode-font-family, "Segoe WPC", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif);
```

The cascade is:

1. The user's `editor.fontFamily` setting (which VSCode
   surfaces as `--vscode-font-family`).
2. The platform default ("Segoe WPC" on Windows, "Segoe UI"
   on macOS / Linux).
3. The web font fallback chain for VSCode's webview
   context.

### 5.2 Sizes and weights

| Use | Size | Weight | Colour token | Notes |
| --- | --- | --- | --- | --- |
| Modal title | 15px | 600 (semibold) | `--vscode-foreground` | Header, "Credits Balance" block title. |
| Block title (5-Hour, Weekly, Credits) | 13px | 600 (semibold) | `--vscode-foreground` | The "5-Hour Limit" / "Weekly Limit" lines. |
| Bar value label (e.g. "75% remaining") | 13px | 400 (regular) | `--vscode-foreground` | Right-aligned to the bar's right edge. |
| Subtitle / "Quota used" / "Resets in" | 11px | 400 (regular) | `--vscode-descriptionForeground` | Below the bar. |
| Error title (in-block) | 15px | 600 (semibold) | `--vscode-errorForeground` for `error:invalid_key`; `--vscode-foreground` for the others. | First line of the error block. |
| Error body (in-block) | 13px | 400 (regular) | `--vscode-foreground` | One or two sentences; the line height is 1.4. |
| Footer (timestamp + "Open Settings") | 11px | 400 (regular) | `--vscode-descriptionForeground` (timestamp); `--vscode-textLink-foreground` (link) | The link weight is 400 (not 600) so it reads as inline text, not as a heading. |
| Status-bar text | 11px (default) | 400 (regular) | inherited from the status-bar item's foreground | The status bar is not the webview; VSCode renders it natively and the font follows `--vscode-statusBarItem-foreground`. |
| Tooltip text | 11px (default) | 400 (regular) | inherited from the hover tooltip | Same as above. |
| Notification title | 13px | 600 (semibold) | `--vscode-notificationHeader-foreground` | First-run notification. |
| Notification body | 13px | 400 (regular) | `--vscode-foreground` | First-run notification. |
| Notification button | 13px | 400 (regular) | `--vscode-textLink-foreground` | "Open Settings" / "Later" buttons. |

### 5.3 Line height

- Modal body lines: 1.4.
- Modal title: 1.2 (tighter — titles are short).
- Status bar text: 1.0 (status bar is single-line).
- Tooltip: 1.4 (tooltip wraps sometimes).

### 5.4 Letter case

- **Sentence case** for all user-facing strings. "Open
  Settings", not "Open settings" (this is the VSCode
  convention for Settings UI labels — it treats "Settings" as
  a proper noun in VSCode's product).
- **No all-caps** anywhere in the modal, status bar, or
  notification.
- **No title case** for body copy. "Couldn't verify your
  Token Plan key." not "Couldn't Verify Your Token Plan Key."

## 6. Spacing scale

The spacing scale is 4 / 8 / 12 / 16 px, with 4px as the
smallest unit. Every padding, margin, and gap in the modal
and the status-bar text is a multiple of 4px.

| Use | Value | Notes |
| --- | --- | --- |
| Inter-block gap (between 5-Hour and Weekly, between Weekly and Credits) | 12px | One full step. |
| Section padding (top, bottom) | 12px | Header, data blocks, error block, footer. |
| Section padding (left) | 16px (360px viewport) / 24px (720px viewport) | More left padding on wider viewports for visual balance. |
| Section padding (right) | 12px | Both viewports. |
| Block padding (top, bottom) | 8px | The 5-Hour, Weekly, and Credits blocks. |
| Intra-block gap (between bar and "Quota used" / "Resets in" lines) | 4px | The half-step. |
| Block title gap (above block title) | 8px | Below the divider, above the block title. |
| Progress bar height | 4px | Bar itself. |
| Progress bar corner radius | 2px | Half the height, for the rounded-end look. |
| Divider thickness | 1px | A 1px line in `--vscode-editorWidget-border` colour. |
| Footer link gap (between timestamp and "Open Settings") | 16px | The 16px gap is the right-padding of the timestamp and the left-padding of the link. |
| Notification button gap | 8px | Between the two buttons in the first-run notification. |
| Status bar icon-to-text gap | 4px | Built into the octicon's intrinsic padding. |

The webview's CSS enforces these as constants in
`:root { --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px; }` and the build
phase uses the variables. The status bar (host side) is
inherently aligned by VSCode's layout; no CSS variables
needed there.

## 7. Icon set

VSCode's octicon set, accessed by the `$(symbol-name)` syntax
in `StatusBarItem.text` and by the `codicon` class in the
webview's CSS. The full list of octicons shipped with VSCode
is at https://microsoft.github.io/vscode-codicons/ (this URL
is documented for reference only — the build phase does not
fetch it; the implementation uses the symbol name only).

### 7.1 Icons used by the status bar

| Symbol | Where | When |
| --- | --- | --- |
| `loading~spin` | `loading`, `idle` | Animated spinner. The `~spin` suffix is what makes it animate. |
| `check` | `success` | Static green check. |
| `dash` | `empty`, `error:transient` when no `lastKnownGood`, `credits` mode when unavailable | Static grey em-dash. |
| `warning` | `quota_exhausted`, `error:rate_limited` | Static yellow warning triangle. |
| `error` | `error:invalid_key` | Static red error circle. |
| `sync` | `error:transient`, `error:unavailable` | Static grey circular arrow. |
| `gear` | Setup state (no key) | Static grey gear. |

The first-run notification button uses a **text label**, not
an icon — notifications are narrow, and the build phase
follows the VSCode notification convention of "text-only
buttons". The icon set is therefore:

- Status bar: 7 octicons, listed above.
- Notification: 0 octicons; text-only buttons.

### 7.2 Icons used by the modal

The modal's webview has two octicons:

- `$(loading~spin)` — centred in the `loading` state (§ 5.7
  of `user-flow-v0.1.0.md`).
- `$(info)` — centred in the `empty` state and in the
  "Credits Balance unavailable" placeholder.

Both are declared as `<span class="codicon codicon-loading~spin">` (or the equivalent for `info`) in
`modal.html`. The webview's CSP allows the `codicon` font
because VSCode injects it into every webview by default
(it's part of the `vscode:` resource scheme).

## 8. Empty / no-data state

When `model_remains` is empty (edge case E from the
discovery), the modal shows a centred message with a `$(info)`
icon and the text from `strings-v0.1.0.md`. The visual
treatment:

```
+--------------------------------------------------------+
|                                                        |
|                                                        |
|                  $(info)                               |  <- centred, 32px
|                                                        |  <- 8px gap below
|        Token Plan data unavailable.                    |  <- 13px, 600 weight
|        Check the MiniMax console.                      |  <- 13px, 400 weight
|                                                        |
|                                                        |
+--------------------------------------------------------+
```

- The icon is `$(info)`, rendered at 32px (larger than the
  11–13px text — it acts as a visual anchor).
- The text is centred horizontally.
- The vertical position is centred in the modal's content
  area (between header and footer), not centred to the full
  panel height.
- The text colour is `var(--vscode-foreground)` for the
  title line and `var(--vscode-descriptionForeground)` for
  the body line. The icon colour is
  `var(--vscode-descriptionForeground)` — the icon is not
  red or yellow, this is a neutral "no data" state, not an
  error.
- The "Credits Balance unavailable" placeholder uses the
  same visual treatment but with the credits-unavailable
  strings.

## 9. Error-state block

The error block is the single block that swaps in for the
data block when an error state is active. It has:

1. A **coloured left-border** — 4px wide, full height of the
   block. The colour is per state:
   - `error:invalid_key` → `var(--vscode-charts-red)`,
     fallback `#b1617a` (light) / `#f14c4c` (dark).
   - `error:rate_limited` → `var(--vscode-charts-yellow)`,
     fallback `#cca700` (light) / `#cca700` (dark).
   - `error:transient` / `error:unavailable` →
     `var(--vscode-editorWidget-border)`, fallback
     `#cccccc` (light) / `#303030` (dark). Grey, not red —
     these are "we'll retry" states, not "you must act"
     states.
2. A **background tint** — a 4% opacity overlay of the same
   colour, applied to the block's background. The
   implementation uses `background: rgba(<R>, <G>, <B>, 0.04)`
   with the RGB extracted from the border colour, or
   `background: color-mix(in srgb, <token> 4%, transparent)`
   for modern VSCode. The exact mechanism is a build-phase
   decision; the visual is "tinted background, coloured
   left border".
3. The **error title** — 15px, 600 weight, colour per state:
   - `error:invalid_key` → `var(--vscode-errorForeground)`,
     fallback `#a1260d` (light) / `#f48771` (dark).
   - All other error states → `var(--vscode-foreground)`.
4. The **error body** — 13px, 400 weight, colour
   `var(--vscode-foreground)`. The body is one or two
   sentences from `strings-v0.1.0.md`. Line height 1.4.
5. The **call-to-action buttons** — 13px, 400 weight,
   background `var(--vscode-button-background)`, fallback
   `#0e639c` (light) / `#0e639c` (dark). Text colour
   `var(--vscode-button-foreground)`, fallback `#ffffff`
   (light) / `#ffffff` (dark). The hover state uses
   `var(--vscode-button-hoverBackground)`. The primary
   button is the only button in the `error:invalid_key`
   state; the secondary button is "Dismiss" in the rate
   limit and transient states (and is rendered as a
   secondary-style button, not a link).

The block's geometry:

```
+--------------------------------------------------------+
|                                                        |
|  ++--------------------------------------------------+ |  <- 4px coloured left border
|  ++                                                  ++|
|  ++  Error title (15px, 600 weight)                 ++|  <- 8px above title
|  ++                                                  ++|
|  ++  Error body (13px, 400 weight, 1.4 line-height) ++|
|  ++                                                  ++|
|  ++  [ Primary button ]   [ Secondary button ]       ++|  <- 8px above buttons
|  ++                                                  ++|
|  ++--------------------------------------------------+ |
|                                                        |
+--------------------------------------------------------+
```

The left border is rendered as a 4px-wide column on the
block's left edge, with the block's content padded 16px
from the border. The border's full height matches the
block's content height. The build phase implements this
with `border-left: 4px solid <token>` and the appropriate
`padding-left`.

## 10. Settings UI — visual treatment

The settings UI is **not** rendered by the extension — it is
the VSCode-native `workbench.action.openSettings` view. The
extension contributes the configuration schema (per
`extension-architecture.md` § 5) and the
"Set your API key" custom row, but the visual treatment of
the settings UI is whatever the user's theme is.

The only "design" work for the settings UI is the
descriptions and the picker copy (in
`strings-v0.1.0.md`); the visual is VSCode's own.

### 10.1 Custom "Subscription Key" row

The "Set your API key" row is contributed by the extension
as a custom command. VSCode renders it as a row in the
configuration table with:

- **Label:** "Subscription Key".
- **Description:** "Set or update your MiniMax Subscription
  Key".
- **Button:** "Set your API key".

The row is the same height as a regular configuration row
(24px). The button is rendered as a
`vscode-button` (the standard VSCode button class) with the
`--vscode-button-background` / `--vscode-button-foreground`
tokens. The build phase implements the row via
`contributes.configuration` with a custom `command` link
(or the equivalent newer-vscode mechanism for "action
buttons" in settings rows).

## 11. Modal panel sizing

VSCode's `WebviewPanel` has a default size that is
platform-dependent. The extension does **not** set a fixed
`WebviewPanelOptions.width` or `.height` — instead, the
webview's CSS uses `min-width` and `max-width` to constrain
the content.

```css
body { min-width: 360px; max-width: 720px; }
```

The user can resize the panel by dragging the panel's
border. The CSS above means the content reflows between
360px and 720px; outside that range the content stays at
the nearest bound (no horizontal scroll). The 360px minimum
matches the wireframe in `user-flow-v0.1.0.md` § 2.2; the
720px maximum matches the wireframe in § 2.3.

For a 720px-wide `WebviewPanel`, the panel's content width
inside the chrome is approximately 696px (the chrome is
~24px wide on each side). The CSS clamps to 720px anyway;
the extra is the chrome's padding.

## 12. Cross-references

- `.kitchen/architecture/extension-architecture.md` § 5.1 —
  the settings schema the picker copy is built against.
- `.kitchen/architecture/data-flow.md` § 5 — the modal
  state machine the per-state visual treatments are tied
  to.
- `.kitchen/architecture/security.md` § 4 — the redaction
  rules; the modal does not log anything (and does not
  display the API key anywhere).
- `.kitchen/design/user-flow-v0.1.0.md` — the wireframes
  the visual spec implements.
- `.kitchen/design/strings-v0.1.0.md` — the strings the
  visual spec renders.

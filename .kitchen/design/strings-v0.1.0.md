# v0.1.0 Canonical User-Facing Strings

- **Status:** in review (Phase 03 — Design)
- **Owner:** `ux-writer` (text), with `ux-designer` (flow) and `ui-designer` (visual)
- **Last updated:** 2026-06-02
- **Source of truth for layout:** `.kitchen/design/user-flow-v0.1.0.md`
- **Source of truth for visual treatment:** `.kitchen/design/ui-spec-v0.1.0.md`
- **Source of truth for scope decisions:** `.kitchen/discussion/2026-06-02-discovery.md` § "Decisions confirmed by the project owner (2026-06-02)"

This document is the **single source of truth** for every
user-facing string the v0.1.0 extension displays. Phase 04
(Implementation) imports these strings by ID. If a string is
not in this document, it does not appear in the UI.

Every entry has:

- **ID** — the canonical identifier (`STR_…`). Phase 04 uses
  this as the lookup key. The naming is
  `STR_<surface>_<state-or-purpose>`.
- **String** — the literal text. Templates use `{placeholder}`
  notation. Placeholders are interpolated by the build phase;
  the curly braces are not part of the output.
- **Usage** — where the string appears in the UI.
- **Voice** — a one-line note on the tone register for this
  string.

The voice and tone rules are in § 12. The banned-words list
is in § 13. The glossary is in § 14.

## 1. First-run notification

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_FIRST_RUN_NOTIFICATION_TITLE` | "Set your MiniMax API key" | The notification's title. | Warm, direct, second person implicit. |
| `STR_FIRST_RUN_NOTIFICATION_BODY` | "Get your Subscription Key from the MiniMax platform. You can find it under Billing → Token Plan." | The notification's body, two sentences. | Helpful, points at the source. |
| `STR_FIRST_RUN_NOTIFICATION_OPEN_SETTINGS` | "Open Settings" | The primary notification button. | Sentence case; "Settings" treated as a proper noun (VSCode convention). |
| `STR_FIRST_RUN_NOTIFICATION_LATER` | "Later" | The dismiss button. | One word; no exclamation. |

## 2. "Set your API key" custom input box

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_APIKEY_INPUTBOX_PROMPT` | "Paste your Subscription Key" | The `showInputBox` prompt line. | Direct, action-oriented. |
| `STR_APIKEY_INPUTBOX_PLACEHOLDER` | "sk-cp-…" | The placeholder inside the input (password-masked). | The `…` is a U+2026 horizontal ellipsis. The placeholder shows the documented key prefix; the actual value is masked by `password: true`. |
| `STR_APIKEY_INPUTBOX_VALIDATION_ERROR` | "Subscription Keys start with `sk-cp-`. Check that you copied the full key from Billing → Token Plan." | Surfaced when the user enters a value that does not start with the documented prefix. | Helpful, points at the source. The `sk-cp-` is in inline code formatting; the build phase wraps it in `<code>` tags. |
| `STR_APIKEY_INPUTBOX_SUCCESS` | "Subscription Key saved. MiniMax Usage will refresh." | Confirmation toast after the key is written to `SecretStorage`. | Calm, no exclamation. "Will refresh" describes the next thing the extension does. |

## 3. Settings UI labels

### 3.1 `minimaxUsage.region`

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_SETTINGS_REGION_MD_DESC` | "Which MiniMax platform the Subscription Key is bound to. **Overseas** users have keys from `platform.minimax.io`; **Mainland China** users have keys from `platform.minimaxi.com`. If you subscribed on a different platform, change this setting — a wrong region will surface as 'invalid key'." | The setting's `markdownDescription`. | Explicit about the consequence. The bolded terms and the inline code formatting are markdown. |
| `STR_SETTINGS_REGION_ENUM_0` | "Overseas platform — `platform.minimax.io` (default)" | The first enum option. | The `(default)` suffix is the standard VSCode convention. |
| `STR_SETTINGS_REGION_ENUM_1` | "Mainland China platform — `platform.minimaxi.com`" | The second enum option. | No `(default)` suffix. |

### 3.2 `minimaxUsage.displayMode`

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_SETTINGS_DISPLAYMODE_MD_DESC` | "What the status bar and modal show." | The setting's `markdownDescription`. | One sentence, deliberate. |
| `STR_SETTINGS_DISPLAYMODE_ENUM_0` | "Token Plan — 5-Hour and Weekly progress bars" | The first enum option (the default). | Concrete about what the user sees. |
| `STR_SETTINGS_DISPLAYMODE_ENUM_1` | "Credits — Balance only" | The second enum option. | |
| `STR_SETTINGS_DISPLAYMODE_ENUM_2` | "Both — Token Plan and Credits side by side" | The third enum option. | |
| `STR_SETTINGS_DISPLAYMODE_DISABLED_HINT` | "Credits endpoint unavailable — coming in a future version" | The hint shown under the picker when the credits endpoint is in the "unavailable" state. The `credits` and `both` entries are greyed out. | Honest about the limitation, not apologetic. |

### 3.3 Custom "Subscription Key" row

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_SETTINGS_APIKEY_LABEL` | "Subscription Key" | The label of the custom row. | Sentence case; "Key" is the noun. |
| `STR_SETTINGS_APIKEY_DESC` | "Set or update your MiniMax Subscription Key" | The description under the label. | Action-oriented. |
| `STR_SETTINGS_APIKEY_BUTTON` | "Set your API key" | The button that opens the `showInputBox`. | Matches the notification's framing. |

## 4. Status bar text per state

Templates use `{placeholder}` notation. The build phase
interpolates the live values; the curly braces are not part
of the output.

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_STATUSBAR_SETUP` | "Set up MiniMax Usage" | The setup state, when there is no key. | Inviting. |
| `STR_STATUSBAR_SETUP_TOOLTIP` | "Enter your MiniMax Subscription Key to start" | The status-bar tooltip in the setup state. | Action-oriented. |
| `STR_STATUSBAR_LOADING` | "Loading…" | The `loading` (and `idle`) state. | Single word + ellipsis. |
| `STR_STATUSBAR_LOADING_TOOLTIP` | "Fetching usage…" | The status-bar tooltip in the `loading` state. | Single phrase + ellipsis. |
| `STR_STATUSBAR_SUCCESS` | "5h: {5hPercent}% · 7d: {7dPercent}%" | The `success` state. `{5hPercent}` and `{7dPercent}` are integers 0–100, rendered without decimals. | Compact. The "5h" and "7d" abbreviations are deliberate (status bars are narrow). The middle dot `·` is U+00B7, with regular spaces around it. |
| `STR_STATUSBAR_SUCCESS_TOOLTIP` | "5h resets in {5hReset} · 7d resets in {7dReset}" | The status-bar tooltip in the `success` state. `{5hReset}` and `{7dReset}` are formatted by the "Resets in" formatter (see `ui-spec-v0.1.0.md` § 3.4). | |
| `STR_STATUSBAR_EMPTY` | "No plan" | The `empty` state. | Two words. |
| `STR_STATUSBAR_EMPTY_TOOLTIP` | "No Token Plan data — see the MiniMax console" | The status-bar tooltip in the `empty` state. | Points at the source. |
| `STR_STATUSBAR_QUOTA_EXHAUSTED` | "5h: 0%" | The `quota_exhausted` state. The 0% is hard-coded; the value is not templated. | |
| `STR_STATUSBAR_QUOTA_EXHAUSTED_TOOLTIP` | "5h resets in {5hReset} · 7d resets in {7dReset}" | The status-bar tooltip in the `quota_exhausted` state. The Weekly reset is still shown; only the status-bar text is narrow. | |
| `STR_STATUSBAR_INVALIDKEY` | "Sign in" | The `error:invalid_key` state. | Two words. Direct — the user needs to re-enter the key. |
| `STR_STATUSBAR_INVALIDKEY_TOOLTIP` | "Subscription Key is invalid or missing — open settings" | The status-bar tooltip in the `error:invalid_key` state. | Explains the action; the em-dash separator is U+2014. |
| `STR_STATUSBAR_RATELIMITED` | "Rate limited" | The `error:rate_limited` state. | Two words. |
| `STR_STATUSBAR_RATELIMITED_TOOLTIP` | "Too many requests — cooling down" | The status-bar tooltip in the `error:rate_limited` state. | Concise. |
| `STR_STATUSBAR_TRANSIENT` | "5h: {5hPercent}% · 7d: {7dPercent}% (stale)" | The `error:transient` state. Reuses the success-state template and appends ` (stale)` (a single space + parens). | The "(stale)" suffix is in the lower-emphasis colour per `ui-spec-v0.1.0.md` § 1.2. |
| `STR_STATUSBAR_TRANSIENT_TOOLTIP` | "Last updated {N} {unit} ago — MiniMax API unavailable" | The status-bar tooltip in the `error:transient` state. `{N}` is the integer count; `{unit}` is `s`, `m`, or `h` (singular or plural not adjusted — "5 min ago" not "5 minutes ago" — to match the tooltip's narrowness). | The em-dash is U+2014. |
| `STR_STATUSBAR_UNAVAILABLE` | "5h: {5hPercent}% · 7d: {7dPercent}% (stale)" | The `error:unavailable` state. Same shape as the `transient` state. | |
| `STR_STATUSBAR_UNAVAILABLE_TOOLTIP` | "Last updated {N} {unit} ago — couldn't reach the MiniMax API" | The status-bar tooltip in the `error:unavailable` state. | |
| `STR_STATUSBAR_CREDITS_UNAVAILABLE` | "Credits unavailable" | The credits-unavailable state (when `displayMode = "credits"`). | |
| `STR_STATUSBAR_CREDITS_UNAVAILABLE_TOOLTIP` | "Credits Balance unavailable from the official API" | The status-bar tooltip in the credits-unavailable state. | |

### 4.1 "Last updated {N} {unit} ago" unit choices

The `STR_FOOTER_LAST_UPDATED` and the transient / unavailable
tooltips share the same `{N} {unit}` rule. The build phase
selects the largest unit that keeps `{N}` under a threshold:

- `{N} < 60` → unit `s` ("Last updated 12s ago").
- `60 ≤ {N} < 3600` → unit `m` ("Last updated 5 min ago").
  Note: the unit token in the string is `min` for the footer
  (full word) and `m` for the tooltip (abbreviated) — see
  § 6.
- `{N} ≥ 3600` → unit `h` ("Last updated 2h ago").

The `min` vs `m` distinction is the only place the strings
document diverges between the modal footer and the
status-bar tooltip. The status-bar tooltip is narrow; the
footer is wider.

## 5. Modal title and per-state body

### 5.1 Modal title

The modal title is a constant per `displayMode`. There is
no per-error-state title change.

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_MODAL_TITLE_TOKENPLAN` | "MiniMax Usage" | The modal title in `tokenPlan` mode. | Matches the extension's display name. |
| `STR_MODAL_TITLE_CREDITS` | "Credits" | The modal title in `credits` mode. | One word. |
| `STR_MODAL_TITLE_BOTH` | "MiniMax Usage" | The modal title in `both` mode. | Same as `tokenPlan` mode — the title does not change to differentiate, because the body still shows the Token Plan data. |
| `STR_MODAL_LOADING_BODY` | "Fetching usage…" | The centred body in the cold-open `loading` state. | Matches the status-bar loading text. |

### 5.2 Block titles

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_BLOCK_5H_TITLE` | "5-Hour Limit" | The 5-Hour block title. | Title case for the noun, hyphened number adjective. |
| `STR_BLOCK_WEEKLY_TITLE` | "Weekly Limit" | The Weekly block title. | Title case. |
| `STR_BLOCK_CREDITS_TITLE` | "Credits Balance" | The Credits block title. | Title case. |

## 6. Progress bar labels

Templates. The build phase interpolates the placeholders.

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_BAR_REMAINING` | "{N}% remaining" | The right-aligned value label next to the progress bar. `{N}` is the `remaining_percent` (0–100), rendered as an integer. | Direct. |
| `STR_BAR_QUOTA_USED` | "Quota used {N}%" | The line directly below the progress bar. `{N}` is `100 − remaining_percent`, rendered as an integer 0–100. | Per the discovery record's "Decisions confirmed" item 4. The label is "Quota used", the value is the consumed percentage. |
| `STR_BAR_RESETS_IN` | "Resets in {reset}" | The line below "Quota used". `{reset}` is the formatted countdown from the "Resets in" formatter (e.g. "2h 14m", "12m 03s", "5d 3h", "12s"). | |
| `STR_CREDITS_BALANCE` | "{amount} remaining" | The Credits block body. `{amount}` is the formatted credit amount (e.g. "$24.50", "2,450 credits") — the build phase selects the formatter based on what the response carries. | |

### 6.1 "Last updated" footer strings

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_FOOTER_LAST_UPDATED` | "Last updated {N} {unit} ago" | The footer timestamp. `{unit}` is `s`, `min`, or `h` (singular or plural not adjusted). | The footer uses the full word `min`, the status-bar tooltip uses the abbreviation `m` (see § 4.1). |
| `STR_FOOTER_LAST_UPDATED_NEVER` | "Last updated never" | The first-ever open state, before any successful fetch. | Two words, no period. |
| `STR_FOOTER_LOADING` | "Loading…" | The subtext under the footer when a `refreshNow()` is in flight. | Matches the status-bar loading text. |
| `STR_FOOTER_OPEN_SETTINGS` | "Open Settings" | The footer link. | Sentence case. |

## 7. Empty / no-data state (edge case E)

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_EMPTY_TITLE` | "Token Plan data unavailable." | The title of the `empty` state modal. | One line, period included. |
| `STR_EMPTY_BODY` | "Check the MiniMax console." | The body of the `empty` state modal. | One sentence, points at the source. |

## 8. Credits Balance unavailable state

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_CREDITS_UNAVAILABLE_TITLE` | "Credits Balance unavailable from the official API." | The title of the credits-unavailable placeholder (inside the Credits block in `both` mode; or the whole modal in `credits` mode). | Honest about the platform's behaviour. |
| `STR_CREDITS_UNAVAILABLE_BODY` | "Coming in a future version." | The body of the credits-unavailable placeholder. | Forward-looking, no apology. |

## 9. Error-state copy

Each error state has a title, a body, and a primary
call-to-action label. The body copy is the most important
UX detail in v0.1.0 — it is the user's only guidance when
something goes wrong. The voice notes below are
deliberately long-form.

### 9.1 `error:invalid_key` (edge cases A, B, G)

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_ERROR_INVALIDKEY_TITLE` | "Couldn't verify your Token Plan key" | The error block's title. | Soft phrasing ("Couldn't") instead of "Invalid key" — the latter reads as a verdict the user disagrees with. |
| `STR_ERROR_INVALIDKEY_BODY` | "Make sure you're using your Subscription Key from Billing → Token Plan, not your Open Platform API Key from Account → Basic Information.\n\nIf you subscribed on a different platform (overseas vs Mainland China), switch the region in settings." | The error block's body, two paragraphs separated by a blank line. The build phase renders the `\n\n` as a paragraph break (a `<p>` boundary in the webview). | Per the discovery record's "Decisions confirmed" item 5, the body explicitly distinguishes the two key types and adds the region hint. The arrow `→` is U+2192 (consistent with the discovery record's usage). |
| `STR_ERROR_INVALIDKEY_CTA_PRIMARY` | "Open Settings" | The error block's primary call-to-action. Opens the `showInputBox` flow. | Sentence case. |

### 9.2 `error:rate_limited` (edge case D)

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_ERROR_RATELIMITED_TITLE` | "Too many requests" | The error block's title. | Direct. |
| `STR_ERROR_RATELIMITED_BODY` | "Cooling down. The next refresh will happen automatically within a minute." | The error block's body. | Per `data-flow.md` § 4 D, the extension does not surface a separate countdown timer. The body says "within a minute" so the user knows it is short. |
| `STR_ERROR_RATELIMITED_CTA_PRIMARY` | "Dismiss" | The error block's primary call-to-action. Closes the modal; the status bar continues to show the yellow state. | One word, no exclamation. |

### 9.3 `error:transient` (edge cases C, H — network / server)

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_ERROR_TRANSIENT_TITLE` | "Couldn't reach the MiniMax API" | The error block's title. | Soft phrasing. The user is not at fault. |
| `STR_ERROR_TRANSIENT_BODY` | "Will retry automatically." | The error block's body. | One sentence. The user does not need to do anything. |
| `STR_ERROR_TRANSIENT_CTA_PRIMARY` | "Dismiss" | The error block's primary call-to-action. | One word. |

### 9.4 `error:unavailable` (unknown status code)

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_ERROR_UNAVAILABLE_TITLE` | "MiniMax API temporarily unavailable" | The error block's title. | Matches the discovery record's "Edge cases H" copy. |
| `STR_ERROR_UNAVAILABLE_BODY` | "Will retry." | The error block's body. | One phrase, no period needed (matches the discovery record's pacing). |
| `STR_ERROR_UNAVAILABLE_CTA_PRIMARY` | "Dismiss" | The error block's primary call-to-action. | One word. |

## 10. Recovery call-to-action labels

Consolidated list. These are the buttons across the modal,
the footer, the notification, and the settings UI.

| ID | String | Usage | Voice |
| --- | --- | --- | --- |
| `STR_CTA_OPEN_SETTINGS` | "Open Settings" | Footer link, invalid-key error CTA, settings UI entry. | The "Open Settings" footer link reuses the same string as the invalid-key CTA. |
| `STR_CTA_SET_APIKEY` | "Set your API key" | The custom row button in the settings UI. | |
| `STR_CTA_RETRY` | "Retry" | Reserved for future use. v0.1.0 does not surface a "Retry" button (the recovery is automatic or via "Open Settings"); the ID is reserved so a v0.2.0 retry button does not need a new string. | |
| `STR_CTA_DISMISS` | "Dismiss" | The CTA for `error:rate_limited`, `error:transient`, `error:unavailable`. | One word. |

The v0.1.0 implementation does **not** render a "Retry"
button anywhere. The string is documented here so the
build phase does not invent a different string in v0.2.0.

## 11. Tooltip text per status-bar state (consolidated)

For convenience, the tooltip strings are listed in the
status-bar § 4 table. The build phase should keep the
tooltip strings in the same module as the status-bar
string (they are set together via `StatusBarItem.tooltip`).
This is a documentation convenience, not a binding
implementation rule.

| Modal state | Tooltip string ID |
| --- | --- |
| `idle` / `loading` | `STR_STATUSBAR_LOADING_TOOLTIP` |
| `success` | `STR_STATUSBAR_SUCCESS_TOOLTIP` |
| `empty` | `STR_STATUSBAR_EMPTY_TOOLTIP` |
| `quota_exhausted` | `STR_STATUSBAR_QUOTA_EXHAUSTED_TOOLTIP` |
| `error:invalid_key` | `STR_STATUSBAR_INVALIDKEY_TOOLTIP` |
| `error:rate_limited` | `STR_STATUSBAR_RATELIMITED_TOOLTIP` |
| `error:transient` | `STR_STATUSBAR_TRANSIENT_TOOLTIP` |
| `error:unavailable` | `STR_STATUSBAR_UNAVAILABLE_TOOLTIP` |
| Setup (no key) | `STR_STATUSBAR_SETUP_TOOLTIP` |
| Credits-unavailable | `STR_STATUSBAR_CREDITS_UNAVAILABLE_TOOLTIP` |

## 12. Voice and tone guide

**Voice.** The extension speaks in a calm, helpful,
technical-but-not-condescending register. It talks to a
power user who is already running VSCode and already has a
MiniMax account; it does not need to explain what a status
bar is or what an API key does. The voice is direct ("Open
Settings", "Set your API key", "Last updated 12s ago") but
never curt. It uses second-person constructions ("Make
sure you're using your Subscription Key") where the user
needs to act, and impersonal passive voice ("The next
refresh will happen automatically within a minute") where
the user does not need to act. It does not anthropomorphise
itself ("I found an issue"), does not speak in first
person plural ("we", "our"), and does not effuse
("amazing", "incredible", "fantastic"). The error copy
acknowledges the user's situation without assigning blame
("Couldn't reach the MiniMax API", not "You broke
something" or "We failed"). The success copy is dry: a
percentage is a percentage; the user does not need the
extension to celebrate it.

**Tone.** Warm but not effusive. Apologetic on errors —
but with information, not with apology theatre. "Couldn't
reach the MiniMax API" is warm because it names the
platform, identifies the failure, and explains what comes
next. It is not warm because it apologises: the user does
not want to read "We're sorry for the inconvenience". On
success, the tone is matter-of-fact. The user opens the
modal to see numbers; the modal shows the numbers. The
notification on first run is the only place the tone lifts
slightly — it is a welcome, not a status update — but it
still keeps the exclamation marks out. The settings UI copy
is the most neutral of all: it is reference material, not
conversation, and the user is there to find a setting, not
to be told how to feel about it.

## 13. Banned-words list

The extension does **not** use the following in any
user-facing string. The list is enforced by code review in
Phase 04 and by an automated check in Phase 06 (a small
script that greps the shipped bundle for the banned terms).

| Banned term | Why |
| --- | --- |
| "amazing" | Effusive; reads as marketing copy. |
| "incredible" | Same. |
| "fantastic" | Same. |
| "awesome" | Same. |
| "free" | The Subscription Key is for a paid plan; using "free" in any context would be confusing. |
| "!" (exclamation mark, in any string) | The voice is calm; the single exception in v0.1.0 is none. |
| "Click here" | Anti-pattern. Use the action verb ("Open Settings", "Dismiss"). |
| "Learn more" | Anti-pattern. Use the specific destination ("see the MiniMax console", "switch the region in settings"). |
| "we" (in first-person plural, in the extension's voice) | The extension does not speak for a team. Use passive voice or second person. |
| "our" (when referring to the extension itself) | Same. |
| "Sorry" / "We're sorry" / "Apologies" | The voice acknowledges failures with information, not apology. |
| "Please" (in error copy) | The error copy is direct. ("Open Settings", not "Please open Settings".) |
| "just" (in instructional copy) | "Just paste your key" is condescending. "Paste your key" is direct. |
| "simply" | Same. |
| "easy" / "easily" | The user can decide for themselves. |
| "Oops" | Too casual; reads as an apology theatre without the apology. |
| "Uh-oh" | Same. |
| "Heads up" | Too casual; the message is the heads-up. |

The banned list is also enforced in user-facing docs
(`/docs/`). The technical-writer (Phase 07) inherits the
list.

## 14. Glossary

The project owner has chosen these terms. The strings use
them exactly — do not substitute synonyms.

| Term | Definition | Usage |
| --- | --- | --- |
| **Subscription Key** | The platform key used for Token Plan queries and purchased Credits. It is distinct from the Open Platform API Key. The Subscription Key starts with `sk-cp-` (per the documented prefix). | The strings call it "Subscription Key" or "your Subscription Key". Never "API key" (ambiguous with the Open Platform API Key), never "token" (overloaded with the model's token concept), never "secret". |
| **Token Plan** | The MiniMax subscription product the v0.1.0 extension targets. | The strings call it "Token Plan" (title case). The display name "Token Plan" appears in block titles and the modal title. |
| **Credits** | The purchased-credits balance, separate from the Token Plan usage. | The strings call it "Credits" (singular noun, title case). The block title is "Credits Balance". The display-mode option is "Credits". |
| **5-Hour Limit** | The 5-hour rolling quota window. | The block title. The status-bar abbreviation is "5h". |
| **Weekly Limit** | The weekly quota window. | The block title. The status-bar abbreviation is "7d" (the platform uses a 7-day window; the abbreviation mirrors the status-bar's compactness). |
| **Mainland China** | The `platform.minimaxi.com` region. | The strings call it "Mainland China". Never "China" alone (ambiguous with the country in a non-platform context), never "cn" in user-facing copy (the setting value is `cn` but the user-facing term is "Mainland China"). |
| **overseas** | The `platform.minimax.io` region (the default). | The strings call it "overseas" in lower case, matching the setting value's case. The setting's enumDescriptions use "Overseas platform" (title case for the picker row) and "overseas" (lower case for the body prose). The picker shows the title-case form; the body prose uses the lower-case form. |
| **Status bar entry** | The `StatusBarItem` rendered at the bottom of the VSCode window. | The user-facing docs (Phase 07) call it "the status bar entry" or "the status bar item". The modal's strings do not reference it directly. |
| **Modal** | The `WebviewPanel` that shows the usage data. | The user-facing docs call it "the usage modal" or "the modal". The user-facing strings do not reference it directly. |
| **Open Platform API Key** | The Pay-as-you-go API key, distinct from the Subscription Key. | The strings call it "Open Platform API Key" (per the official docs). Never "pay-as-you-go key" in user-facing copy (it is more accurate but harder to recognise for users who do not know the product name). |
| **Settings** | The VSCode Settings UI. | The strings call it "Settings" (sentence case; VSCode convention treats "Settings" as a proper noun). The button is "Open Settings". |

## 15. Cross-references

- `.kitchen/discussion/2026-06-02-discovery.md` § "Decisions
  confirmed by the project owner (2026-06-02)" — the locked-in
  copy rules (modal label "Quota used" with value
  `100 − remaining_percent`; Subscription Key vs Open Platform
  API Key distinction; region-mismatch hint; the "no silent
  cookie fallback" rule).
- `.kitchen/design/user-flow-v0.1.0.md` — the wireframes the
  strings are placed into.
- `.kitchen/design/ui-spec-v0.1.0.md` — the visual treatment
  the strings are rendered with.
- `.kitchen/architecture/data-flow.md` § 4 — the per-state
  UX the strings are written against.
- `.kitchen/architecture/data-flow.md` § 5 — the modal state
  machine; every state has a string set in this document.

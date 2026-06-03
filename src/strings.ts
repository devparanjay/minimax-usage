// DO NOT EDIT the string VALUES — copy from
// `.kitchen/design/strings-v0.1.0.md` (the canonical source of
// truth). If a string is not in this file, it does not appear in
// the UI. The build phase imports by ID.
//
// The webview bundle and the host bundle both include this file
// (esbuild tree-shakes). The webview does not need the host-only
// strings (commands, secrets) but importing the whole file is fine.

export const STRINGS = {
  // 1. First-run notification
  STR_FIRST_RUN_NOTIFICATION_TITLE: "Set your MiniMax API key",
  STR_FIRST_RUN_NOTIFICATION_BODY:
    "Get your Subscription Key from the MiniMax platform. You can find it under Billing → Token Plan.",
  STR_FIRST_RUN_NOTIFICATION_OPEN_SETTINGS: "Open Settings",
  STR_FIRST_RUN_NOTIFICATION_LATER: "Later",

  // 2. "Set your API key" custom input box
  STR_APIKEY_INPUTBOX_PROMPT: "Paste your Subscription Key",
  STR_APIKEY_INPUTBOX_PLACEHOLDER: "sk-cp-…",
  STR_APIKEY_INPUTBOX_VALIDATION_ERROR:
    "Subscription Keys start with `sk-cp-`. Check that you copied the full key from Billing → Token Plan.",
  STR_APIKEY_INPUTBOX_SUCCESS:
    "Subscription Key saved. MiniMax Usage will refresh.",

  // 3.1 minimaxUsage.region
  STR_SETTINGS_REGION_MD_DESC:
    "Which MiniMax platform the Subscription Key is bound to. **Overseas** users have keys from `platform.minimax.io`; **Mainland China** users have keys from `platform.minimaxi.com`. If you subscribed on a different platform, change this setting — a wrong region will surface as 'invalid key'.",
  STR_SETTINGS_REGION_ENUM_0: "Overseas platform — `platform.minimax.io` (default).",
  STR_SETTINGS_REGION_ENUM_1: "Mainland China platform — `platform.minimaxi.com`.",

  // 3.2 minimaxUsage.displayMode
  STR_SETTINGS_DISPLAYMODE_MD_DESC: "What the status bar and modal show.",
  STR_SETTINGS_DISPLAYMODE_ENUM_0: "Token Plan — 5-Hour and Weekly progress bars",
  STR_SETTINGS_DISPLAYMODE_ENUM_1: "Credits — Balance only",
  STR_SETTINGS_DISPLAYMODE_ENUM_2: "Both — Token Plan and Credits side by side",
  STR_SETTINGS_DISPLAYMODE_DISABLED_HINT:
    "Credits endpoint unavailable — coming in a future version",

  // 3.3 Custom "Subscription Key" row
  STR_SETTINGS_APIKEY_LABEL: "Subscription Key",
  STR_SETTINGS_APIKEY_DESC: "Set or update your MiniMax Subscription Key",
  STR_SETTINGS_APIKEY_BUTTON: "Set your API key",

  // 4. Status bar text per state
  STR_STATUSBAR_SETUP: "Set up MiniMax Usage",
  STR_STATUSBAR_SETUP_TOOLTIP: "Enter your MiniMax Subscription Key to start",
  STR_STATUSBAR_LOADING: "Loading…",
  STR_STATUSBAR_LOADING_TOOLTIP: "Fetching usage…",
  STR_STATUSBAR_SUCCESS: "5h: {5hPercent}% · 7d: {7dPercent}%",
  STR_STATUSBAR_SUCCESS_TOOLTIP: "5h resets in {5hReset} · 7d resets in {7dReset}",
  STR_STATUSBAR_EMPTY: "No plan",
  STR_STATUSBAR_EMPTY_TOOLTIP: "No Token Plan data — see the MiniMax console",
  STR_STATUSBAR_QUOTA_EXHAUSTED: "5h: 0%",
  STR_STATUSBAR_QUOTA_EXHAUSTED_TOOLTIP: "5h resets in {5hReset} · 7d resets in {7dReset}",
  STR_STATUSBAR_INVALIDKEY: "Sign in",
  STR_STATUSBAR_INVALIDKEY_TOOLTIP:
    "Subscription Key is invalid or missing — open settings",
  STR_STATUSBAR_RATELIMITED: "Rate limited",
  STR_STATUSBAR_RATELIMITED_TOOLTIP: "Too many requests — cooling down",
  STR_STATUSBAR_TRANSIENT: "5h: {5hPercent}% · 7d: {7dPercent}% (stale)",
  STR_STATUSBAR_TRANSIENT_TOOLTIP:
    "Last updated {N} {unit} ago — MiniMax API unavailable",
  STR_STATUSBAR_UNAVAILABLE: "5h: {5hPercent}% · 7d: {7dPercent}% (stale)",
  STR_STATUSBAR_UNAVAILABLE_TOOLTIP:
    "Last updated {N} {unit} ago — couldn't reach the MiniMax API",
  STR_STATUSBAR_CREDITS_UNAVAILABLE: "Credits unavailable",
  STR_STATUSBAR_CREDITS_UNAVAILABLE_TOOLTIP:
    "Credits Balance unavailable from the official API",

  // 5.1 Modal title
  STR_MODAL_TITLE_TOKENPLAN: "MiniMax Usage",
  STR_MODAL_TITLE_CREDITS: "Credits",
  STR_MODAL_TITLE_BOTH: "MiniMax Usage",
  STR_MODAL_LOADING_BODY: "Fetching usage…",

  // 5.2 Block titles
  STR_BLOCK_5H_TITLE: "5-Hour Limit",
  STR_BLOCK_WEEKLY_TITLE: "Weekly Limit",
  STR_BLOCK_CREDITS_TITLE: "Credits Balance",

  // 6. Progress bar labels
  STR_BAR_REMAINING: "{N}% remaining",
  STR_BAR_QUOTA_USED: "Quota used {N}%",
  STR_BAR_RESETS_IN: "Resets in {reset}",
  STR_CREDITS_BALANCE: "{amount} remaining",

  // 6.1 "Last updated" footer strings
  STR_FOOTER_LAST_UPDATED: "Last updated {N} {unit} ago",
  STR_FOOTER_LAST_UPDATED_NEVER: "Last updated never",
  STR_FOOTER_LOADING: "Loading…",
  STR_FOOTER_OPEN_SETTINGS: "Open Settings",

  // 7. Empty / no-data state
  STR_EMPTY_TITLE: "Token Plan data unavailable.",
  STR_EMPTY_BODY: "Check the MiniMax console.",

  // 8. Credits Balance unavailable state
  STR_CREDITS_UNAVAILABLE_TITLE:
    "Credits Balance unavailable from the official API.",
  STR_CREDITS_UNAVAILABLE_BODY: "Coming in a future version.",

  // 9.1 error:invalid_key
  STR_ERROR_INVALIDKEY_TITLE: "Couldn't verify your Token Plan key",
  STR_ERROR_INVALIDKEY_BODY:
    "Make sure you're using your Subscription Key from Billing → Token Plan, not your Open Platform API Key from Account → Basic Information.\n\nIf you subscribed on a different platform (overseas vs Mainland China), switch the region in settings.",
  STR_ERROR_INVALIDKEY_CTA_PRIMARY: "Open Settings",

  // 9.2 error:rate_limited
  STR_ERROR_RATELIMITED_TITLE: "Too many requests",
  STR_ERROR_RATELIMITED_BODY:
    "Cooling down. The next refresh will happen automatically within a minute.",
  STR_ERROR_RATELIMITED_CTA_PRIMARY: "Dismiss",

  // 9.3 error:transient
  STR_ERROR_TRANSIENT_TITLE: "Couldn't reach the MiniMax API",
  STR_ERROR_TRANSIENT_BODY: "Will retry automatically.",
  STR_ERROR_TRANSIENT_CTA_PRIMARY: "Dismiss",

  // 9.4 error:unavailable
  STR_ERROR_UNAVAILABLE_TITLE: "MiniMax API temporarily unavailable",
  STR_ERROR_UNAVAILABLE_BODY: "Will retry.",
  STR_ERROR_UNAVAILABLE_CTA_PRIMARY: "Dismiss",

  // 10. Recovery call-to-action labels
  STR_CTA_OPEN_SETTINGS: "Open Settings",
  STR_CTA_SET_APIKEY: "Set your API key",
  STR_CTA_RETRY: "Retry",
  STR_CTA_DISMISS: "Dismiss"
} as const;

export type StringId = keyof typeof STRINGS;

# Extension Architecture — v0.1.0

- **Status:** accepted (Phase 02 — Architecture)
- **Owner:** `technical-architect`
- **Last updated:** 2026-06-02
- **Source of truth for the API surface:** `.kitchen/architecture/api-contract.md`
- **Source of truth for scope:** `.kitchen/roadmaps/v0.1.0/roadmap.md`

This document specifies the module layout, activation flow, settings
schema, and state model for the v0.1.0 extension. It is **documentation
only** at this phase — no code is written until Phase 04.

The build phase is responsible for honouring every commitment in this
document. If the build phase finds a reason to deviate, the
architecture is updated first (in a PR), not the code in silence.

## 1. High-level shape

The extension is a single VSCode extension written in TypeScript. It
follows the canonical VSCode extension split: an **extension host
side** (Node.js, runs as a Node CJS module) that holds the API
client, secrets, state, and command surface; and a **webview side**
(local browser context, sandboxed by VSCode) that renders the
usage modal. The webview never has the API key — it receives
**derived, redacted data** from the extension host over a typed
message channel.

```
+------------------ VSCode extension host (Node, CJS) -------------------+
|                                                                        |
|  src/extension.ts        activation, deactivation, command registration |
|         |                                                                |
|         v                                                                |
|  src/secrets/  ---> VSCode SecretStorage (Subscription Key)             |
|                                                                        |
|  src/settings/ ---> VSCode configuration (region, displayMode)         |
|                                                                        |
|  src/state/    ---> globalState (last-known-good snapshot, timestamps)  |
|                                                                        |
|  src/polling/  ---> timer + focus + open triggers                      |
|         |                                                                |
|         v                                                                |
|  src/api/      ---> typed MiniMax client (getUsage, getCreditBalance)  |
|         |                                                                |
|         v                                                                |
|  src/ui/statusBar.ts     status bar item                               |
|  src/ui/notification.ts  first-run "set your API key" prompt            |
|  src/ui/webview/usageModal.ts                                          |
|         |                  modal data flow                              |
|         +-----------------------> postMessage({ kind, payload })         |
|                                                                        |
|  src/util/logger.ts       redacting logger (never logs the key)         |
|  src/types/               re-exported from api-contract § 5             |
|                                                                        |
+------------------------------------------------------------------------+
                                |
                                | postMessage (CSP-enforced, no remote loads)
                                v
+------------------------- Webview (browser) ----------------------------+
|                                                                        |
|  modal.html / modal.css / modal.ts                                     |
|   - renders the two progress bars + countdowns                        |
|   - renders the credits balance line when present                      |
|   - renders the error state from the contract                          |
|   - no network access (CSP default-src 'none')                         |
|                                                                        |
+------------------------------------------------------------------------+
```

The extension is **lazy**: it does not activate on every VSCode start
by itself; it activates when VSCode first needs it. The first-run
prompt is part of activation, so the "I just installed it" path is
still one click away.

## 2. `src/` tree

A concrete file-by-file layout. Phase 04 lands these files; this list
is the contract for what each one is for.

```
src/
├── extension.ts                         # activation, deactivation, command registration
├── api/
│   ├── client.ts                        # UsageClient — the typed HTTP client
│   ├── classify.ts                      # classifyError() — HTTP / status_code -> ErrorClass
│   ├── cache.ts                         # in-memory 30s TTL cache
│   ├── retry.ts                         # exponential back-off, single in-flight de-dup
│   ├── hosts.ts                         # region -> base URL resolution
│   ├── endpoints.ts                     # central URL table (one-line change for credits)
│   └── creditBalance.ts                 # getCreditBalance() — credits-endpoint client
├── secrets/
│   ├── secretStorage.ts                 # SecretStorage wrapper (get / set / delete / onDidChange)
│   └── keys.ts                          # SECRET_API_KEY constant — single source for the key name
├── settings/
│   ├── schema.ts                        # contributes.configuration shape (region, displayMode)
│   ├── migration.ts                     # future-proofing hook (no migrations in v0.1.0)
│   └── read.ts                          # readRegion() / readDisplayMode() with safe defaults
├── state/
│   ├── store.ts                         # StateStore — typed read/write of globalState
│   ├── snapshot.ts                      # lastKnownGood + lastSuccessAt + lastError
│   └── types.ts                         # PersistedSnapshot / InFlightState shape
├── ui/
│   ├── statusBar.ts                     # StatusBarItem — icon + text + tooltip + command
│   ├── notification.ts                  # first-run "set your API key" notification
│   ├── icons.ts                         # icon path resolution (octicons bundled with the extension)
│   └── webview/
│       ├── usageModal.ts                # WebviewPanel lifecycle, message protocol
│       ├── messageProtocol.ts           # the typed message union the webview exchanges
│       └── template/
│           ├── modal.html               # static shell (CSP, no remote resources)
│           ├── modal.css                # phase 03 designs
│           └── modal.ts                 # tiny client-side renderer
├── polling/
│   ├── controller.ts                    # PollingController — single owner of the timer + triggers
│   ├── triggers.ts                      # focus / open / manual click / settings change
│   └── rateLimit.ts                     # rate-limit back-off (60s suppression window)
├── util/
│   ├── logger.ts                        # redacting logger (NEVER logs the API key)
│   ├── debounce.ts                      # small utility for "one in-flight" de-dup
│   ├── abort.ts                         # AbortController lifecycle tied to deactivation
│   └── sleep.ts                         # back-off helper
└── types/
    ├── index.ts                         # re-exports from .kitchen/architecture/api-contract.md § 5
    ├── settings.ts                      # Region, DisplayMode enum types
    └── messages.ts                      # modal message-protocol types
```

### 2.1 File responsibilities (one line each)

- **`src/extension.ts`** — single entrypoint. Registers the
  `onStartupFinished` / `*` activation event, wires the API client
  to the status bar, opens the modal on status-bar click, disposes
  the `PollingController` and cancels in-flight requests on
  deactivation.
- **`src/api/client.ts`** — the typed `UsageClient`. Owns auth-header
  construction, timeout, in-memory cache, error classifier, retry
  policy, region-aware host selection, and `AbortSignal` plumbing.
  Exposes `getUsage()` and `getCreditBalance()`. Both throw a
  discriminated `UsageError` with `kind` in the union from the
  contract § 5.
- **`src/api/classify.ts`** — `classifyError(httpStatus, baseResp?)` →
  `ErrorClass`. Pure function, no I/O, fully unit-testable.
- **`src/api/cache.ts`** — in-memory 30-second TTL cache keyed by
  endpoint identity (region + endpoint name). Cache hit short-
  circuits the HTTP call. Cache is invalidated on settings change.
- **`src/api/retry.ts`** — exponential back-off (1s, 2s, 4s; cap 3
  attempts; never retry on `invalid_key`). Caller passes a
  `retryable: boolean` derived from `classifyError()`.
- **`src/api/hosts.ts`** — `resolveHost(region: Region): string`.
  Region → base URL mapping. Single source for the two hosts.
- **`src/api/endpoints.ts`** — central URL table. The Token Plan
  URL is hard-coded here; the credits URL defaults to the chosen
  candidate from § 6 below, with all three § 3.1 candidates
  enumerated as constants so swapping is a one-line change.
- **`src/api/creditBalance.ts`** — `getCreditBalance()`. Same shape
  as `getUsage()` (auth header, timeout, cache, retry, abort). Uses
  the URL from `endpoints.ts`.
- **`src/secrets/secretStorage.ts`** — thin wrapper around
  `context.secrets`. `getApiKey()`, `setApiKey(key)`, `deleteApiKey()`,
  `onDidChangeApiKey(handler)`. The wrapper exists so the key name
  string is centralised in `keys.ts` and so call-sites do not import
  the `SecretStorage` API directly.
- **`src/secrets/keys.ts`** — `SECRET_API_KEY = "minimaxUsage.apiKey"`.
  The one and only place the storage key is named.
- **`src/settings/schema.ts`** — exports the `contributes.configuration`
  JSON object. Lives next to the call-site so the schema and the
  reader stay in sync.
- **`src/settings/read.ts`** — `readRegion()` / `readDisplayMode()` /
  `onDidChangeSettings(handler)`. Reads from `vscode.workspace.getConfiguration()`.
  Defensive defaults if the value is missing or out of range.
- **`src/settings/migration.ts`** — placeholder. v0.1.0 has no
  migrations; the file exists so v0.2.0+ has a hook.
- **`src/state/store.ts`** — `StateStore` — typed read/write of
  `context.globalState`. The store is the **only** place that
  touches `globalState` directly.
- **`src/state/snapshot.ts`** — `lastKnownGood` snapshot (the
  `UsageResponse` from the most recent successful call),
  `lastSuccessAt` (epoch ms), `lastError` (the last `UsageError` or
  `null`).
- **`src/state/types.ts`** — `PersistedSnapshot`, `InFlightState`.
- **`src/ui/statusBar.ts`** — `StatusBarItem` lifecycle. Reads from
  `StateStore` to render the current state. Clicking opens the
  modal. Tooltip shows the stale time and last error.
- **`src/ui/notification.ts`** — first-run "set your API key"
  notification. Shown **only** when `SecretStorage` has no key.
  Clicking the notification button opens the Settings UI filtered
  to this extension.
- **`src/ui/icons.ts`** — `$(symbol-name)` resolution. The
  `minimaxUsage.icons` set, if any, lives here so the status bar and
  notification agree.
- **`src/ui/webview/usageModal.ts`** — `WebviewPanel` lifecycle.
  Creates the panel, sets the HTML, listens for `postMessage` from
  the webview, posts typed `UsageModalMessage`s back.
- **`src/ui/webview/messageProtocol.ts`** — the discriminated union
  of messages the webview exchanges. The webview cannot trigger an
  API call directly — it asks the host for data, the host answers.
- **`src/ui/webview/template/modal.html`** — static HTML shell.
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';">`.
  No remote fonts, no remote images, no analytics.
- **`src/ui/webview/template/modal.css`** — phase 03 designs.
- **`src/ui/webview/template/modal.ts`** — small client-side script
  that renders the data the host posts.
- **`src/polling/controller.ts`** — `PollingController` — the
  **single owner** of the background 60s timer. Exposes
  `start()`, `stop()`, `refreshNow()`. Reacts to settings changes
  and to `window.onDidChangeWindowState` (focus gain).
- **`src/polling/triggers.ts`** — focus / open / manual click /
  settings change → `controller.refreshNow()`. Triggers are
  fire-and-forget; the controller debounces them.
- **`src/polling/rateLimit.ts`** — on `rate_limited` error, set a
  60s suppression flag. `controller.refreshNow()` short-circuits
  while the flag is set. Focus-gain after the window expires is
  the next eligible refresh.
- **`src/util/logger.ts`** — the redacting logger. See § 6 below.
- **`src/util/debounce.ts`** — generic `debounce()` and `coalesce()`.
- **`src/util/abort.ts`** — `createAbortController()` that is
  `.abort()`-ed in `deactivate()`. Plumbed through `client.ts` so
  in-flight requests are cancelled on shutdown.
- **`src/util/sleep.ts`** — `sleep(ms)` for the back-off timer.
- **`src/types/index.ts`** — re-exports the types from the API
  contract. **Build-time note:** the contract is the source of truth;
  the build phase either re-exports from
  `.kitchen/architecture/api-contract.md` via a generated file, or
  the build phase copies the § 5 types into `src/types/contract.ts`
  with a comment "DO NOT EDIT — copy from .kitchen/architecture/api-contract.md § 5"
  and a CI check that flags drift. The architecture favours the
  comment-anchored copy for now (the contract is markdown, not a
  `.ts` file).
- **`src/types/settings.ts`** — `Region`, `DisplayMode` enums.
- **`src/types/messages.ts`** — the webview message-protocol
  discriminated union.

## 3. Activation events

VSCode extensions declare the events that trigger them in
`package.json` under `activationEvents`. We commit to the following:

| Event | Why | What it loads |
| --- | --- | --- |
| `*` | Catch-all. We want to be alive as soon as the user starts VSCode, so the status bar appears and the first-run prompt can fire. | Full extension. |

The `*` event is appropriate for an extension that always shows a
status-bar entry — it would be confusing for the status bar to
appear only after the user does something specific. (Alternatives
considered: `onLanguage:...` — we do not hook a language. `onView:...` —
we do not own a view. `onStartupFinished` — too lazy: the user
could click our status bar in the first second and we'd not be
loaded.)

The extension is therefore not "lazy" in the strict sense, but
activation is cheap: it is one extension-host script run per VSCode
session, holding a `StatusBarItem`, a `PollingController`, and a
single `SecretStorage` listener. There is no in-flight request at
activation time.

`activationEvents` will list only `*` in `package.json`. We will
**not** add a `onCommand:minimaxUsage.openSettings` event for the
"first-run" path — see § 4.

## 4. First-run flow

The flow when the user has just installed the extension and has no
key in `SecretStorage` yet.

```
VSCode starts
    │
    v
extension.activate() runs
    │
    ├── secretStorage.getApiKey() -> undefined
    │
    ├── statusBar shows "Set up MiniMax Usage" + gear icon (clickable)
    │
    └── notification.postFirstRun()  ──>  VSCode notification:
                                                ┌──────────────────────────────────────┐
                                                │  Set your MiniMax API key            │
                                                │                                      │
                                                │  Get your Subscription Key from the  │
                                                │  MiniMax platform.                   │
                                                │                                      │
                                                │  [ Open Settings ]   [ Later ]       │
                                                └──────────────────────────────────────┘
                                                            │
                                                            v  (user clicks "Open Settings")
                                                            │
                                          commands.executeCommand("workbench.action.openSettings", "minimaxUsage")
                                                            │
                                                            v
                                          Settings UI opens, filtered to minimaxUsage
                                                            │
                                                            v  (user pastes key, "focus out" or save)
                                                            │
                                          SecretStorage "minimaxUsage.apiKey" write fires
                                                            │
                                                            v  (onDidChange listener)
                                                            │
                                          notification dismissed
                                          statusBar transitions to "loading…"
                                          polling controller: refreshNow()
                                                            │
                                                            v
                                          usage renders in the status bar
                                          modal works end to end
```

The first-run notification is a **Notification**, not a popup, and
not a webview. It is non-blocking; the user can dismiss it with
"Later" and the status-bar item remains clickable.

The notification is **only** shown when `SecretStorage.getApiKey()`
returns `undefined` at activation. If the user has a key, the
notification does not appear. If the user deletes the key later
(via the Settings UI), the notification is shown again on the next
activation, but a re-prompt mid-session is **not** in scope (the
status bar enters the "invalid key" state and the modal's
"Open Settings" button is the recovery path).

`extension.ts` registers a single command —
`minimaxUsage.openSettings` — that the notification button calls.
The command does the same as the click on the status bar's "Open
Settings" link in the invalid-key error state: it opens the
Settings UI filtered to `minimaxUsage`.

## 5. Settings schema

The extension contributes the following configuration. The schema
lives in `package.json` under `contributes.configuration`. The
`src/settings/schema.ts` file holds the same shape in TS for
type-safe reads.

```jsonc
{
  "contributes": {
    "configuration": {
      "title": "MiniMax Usage",
      "type": "object",
      "properties": {
        "minimaxUsage.region": {
          "type": "string",
          "enum": ["overseas", "cn"],
          "default": "overseas",
          "markdownDescription": "Which MiniMax platform the Subscription Key is bound to. **Overseas** users have keys from `platform.minimax.io`; **Mainland China** users have keys from `platform.minimaxi.com`. If you subscribed on a different platform, change this setting — a wrong region will surface as 'invalid key'.",
          "enumDescriptions": [
            "Overseas platform — `platform.minimax.io` (default).",
            "Mainland China platform — `platform.minimaxi.com`."
          ]
        },
        "minimaxUsage.displayMode": {
          "type": "string",
          "enum": ["tokenPlan", "credits", "both"],
          "default": "tokenPlan",
          "markdownDescription": "What the status bar and modal show.",
          "enumDescriptions": [
            "Token Plan — 5-Hour Limit and Weekly Limit progress bars.",
            "Credits — Balance only.",
            "Both — Token Plan and Credits side by side."
          ]
        }
      }
    }
  }
}
```

### 5.1 The API key is NOT in the schema

The Subscription Key **does not** appear in
`contributes.configuration`. It is held in
`context.secrets` (VSCode `SecretStorage`) under the name
`"minimaxUsage.apiKey"` (see `src/secrets/keys.ts`). The Settings
UI's built-in `secret` type is **not** sufficient on its own — we
use `SecretStorage` directly because the Settings UI's secret input
is per-workspace-state in some VSCode versions and we want a
user-global, encrypted-at-rest store. The Settings UI's
`minimaxUsage` filter group shows:

- `minimaxUsage.region` (enum picker)
- `minimaxUsage.displayMode` (enum picker)
- A **custom "Subscription Key" row** rendered by the extension
  via `workbench.action.openSettings` is **not** how we do it.
  Instead, the extension contributes a separate
  `viewsWelcome` or settings-flow command: the "Set your API key"
  button in the first-run notification and in the invalid-key modal
  state opens a custom input box (`vscode.window.showInputBox`) that
  accepts the key with `password: true`. That value is written
  straight to `SecretStorage` and never round-trips through the
  Settings JSON.

> **Note (v0.1.0 defect round, D-1):** the build's "Subscription
> Key" row uses the `markdownDescription` + `command:…` URI
> pattern — a `minimaxUsage.subscriptionKey` property with
> `type: null` and a `markdownDescription` that contains
> `command:minimaxUsage.setApiKey`. The Settings UI renders this
> as a row with a clickable "Set your API key" link. The key
> value itself still lives in `SecretStorage`; the property is a
> UI hook, not a real config value.

This design is explicit so phase 04 does not accidentally add
`minimaxUsage.apiKey` to the schema (which would put the key in
plain-text `settings.json`).

### 5.2 Settings-change reactions

The `PollingController` listens to `onDidChangeConfiguration` for
`minimaxUsage.region` and `minimaxUsage.displayMode`. Region change
invalidates the cache and fires a `refreshNow()`. Display-mode
change just re-renders the status bar (no network call).

## 6. State model

Three storage locations, with different lifetimes and access rules.

### 6.1 Persisted (lives in `context.globalState`)

| Field | Type | Purpose | Lifetime |
| --- | --- | --- | --- |
| `lastKnownGood` | `UsageResponse \| null` | The most recent successful response. Drives the "stale" subtext on transient errors. | Across VSCode restarts. |
| `lastSuccessAt` | `number \| null` (epoch ms) | Drives the "last updated N min ago" subtext. | Across VSCode restarts. |
| `lastError` | `{ kind: ErrorClass, at: number } \| null` | Drives the error badge in the status bar tooltip. | Across VSCode restarts. |
| `region` | `Region` | Cached copy of the setting, to avoid the round-trip on every read. Mirrors `minimaxUsage.region`. | Across VSCode restarts. |
| `displayMode` | `DisplayMode` | Cached copy of the setting. Mirrors `minimaxUsage.displayMode`. | Across VSCode restarts. |

These fields are written through `StateStore` in
`src/state/store.ts`. The store is the **only** code that calls
`context.globalState.update()` or `context.globalState.get()`.

### 6.2 In-memory (lives in closures inside the extension host)

| Field | Owner | Purpose |
| --- | --- | --- |
| `currentRequestAbort` | `polling/controller.ts` | The `AbortController` for the in-flight request, if any. |
| `currentModalPanel` | `ui/webview/usageModal.ts` | The currently open `WebviewPanel`, if any. |
| `lastModalSnapshot` | `ui/webview/usageModal.ts` | The data the modal last received, for re-renders on window resize. |
| `pollingTimerHandle` | `polling/controller.ts` | The `setInterval` handle. |
| `rateLimitSuppressUntil` | `polling/rateLimit.ts` | Epoch ms until which polling is suppressed. |
| `secretChangeListener` | `secrets/secretStorage.ts` | The `onDidChange` disposable. |
| `configChangeListener` | `settings/read.ts` | The `onDidChangeConfiguration` disposable. |

These are **not** serialised. They are recreated at every
`activate()`. They are disposed in `deactivate()`.

### 6.3 SecretStorage (lives in `context.secrets`)

| Field | Type | Purpose |
| --- | --- | --- |
| `minimaxUsage.apiKey` | `string` (Subscription Key) | Read at request time, held in a local variable, used in the `Authorization: Bearer <key>` header. |

The key is read at request time, used in the header, and not
retained in any module-level variable. After the request resolves,
the only references to the key are:

- the `SecretStorage` store (encrypted at rest by VSCode);
- the local variable inside the request function (dropped when
  the function returns);
- the in-flight `fetch` headers (consumed by Node's HTTP client).

It is **never** written to `globalState` / `workspaceState` / any
file in the workspace / any log line / any URL query string / any
cookie / any telemetry payload. The `util/logger.ts` filter and
the `secretStorage.ts` wrapper enforce this in code (see
`security.md`).

### 6.4 Not stored anywhere

- The raw API key in any log line, telemetry, error report, or
  crash dump.
- The full request URL with the key in a query string (the
  contract does not put the key in the URL; we honour that — see
  `security.md` § "Threat model").
- The response body if the body is a 401 error and the user
  echoed the key back into the body (this should not happen with
  the documented `base_resp` envelope, but the logger still
  filters the substring anyway).

## 7. API client architecture

The `UsageClient` is the single entrypoint for the platform. Both
`getUsage()` and `getCreditBalance()` live behind it. The client
owns the following concerns:

### 7.1 Auth header construction

```ts
const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};
```

No `Referer` header. The contract § 6.1 commits to this; if live
testing in phase 05 reveals 401s that a `Referer` would unblock,
the contract is updated first and the project owner is told. The
extension does not silently add a `Referer`.

### 7.2 Timeout

`AbortController` + `setTimeout`. Default 10 seconds,
configurable per-call via `timeoutMs`. The `AbortController` is
shared with the deactivation lifecycle (see § 7.6).

### 7.3 In-memory cache

A `Map<CacheKey, { value, expiresAt }>`. The cache key is
`(region, endpointName)`. TTL is 30 seconds (configurable, but
not surfaced in settings). Cache hit short-circuits the HTTP
call. Cache is invalidated on region change and on a 401 (a 401
means the cached snapshot was generated with a key that no longer
works, so the next call should hit the wire).

### 7.4 Error classifier

`classifyError(httpStatus, baseResp?)` returns the
`ErrorClass` union from the contract § 5. Pure function. Drives
the retry policy and the modal state machine.

### 7.5 Retry policy

- On `transient` errors (`1000`, `1001`, `1024`, `1033`, `1039`,
  plus HTTP 5xx and network errors): exponential back-off,
  1s → 2s → 4s, cap at 3 attempts. Each attempt uses the same
  `AbortSignal` (so deactivation still cancels).
- On `invalid_key` (1004, 2049): no retry. The next attempt is
  from a manual click or a settings change.
- On `rate_limited` (1002, 2045): no retry. The polling controller
  sets the 60-second suppression flag. The next attempt is from
  focus gain after the window expires.
- On `quota_exhausted` (2056): no retry. This is a success; the
  response is parseable and the modal shows "0% remaining".
- On `invalid_params` (2013): no retry. Surface a "configuration
  problem" error state; this should not happen with the documented
  GET request, but the contract is defensive.
- On `unknown`: retry as transient, then surface the generic
  "Couldn't reach the MiniMax API" message.

### 7.6 `AbortController` lifecycle

The `PollingController` owns a single `AbortController` that is
replaced (and the previous one `.abort()`-ed) on each new
`refreshNow()`. The `extension.ts` `deactivate()` disposes the
`PollingController`, which calls `.abort()` on the current
controller, which cancels any in-flight `fetch` via the
`AbortSignal` plumbed through `client.ts` → `retry.ts` → the
underlying HTTP call.

### 7.7 Region-aware host selection

`hosts.ts` resolves the base URL:

| `region` | Base URL |
| --- | --- |
| `"overseas"` | `https://www.minimax.io` |
| `"cn"` | `https://www.minimaxi.com` |

The endpoint path is appended in `endpoints.ts` and
`creditBalance.ts`.

### 7.8 `getUsage()` signature

```ts
export interface UsageClient {
  getUsage(opts: {
    apiKey: string;
    region: Region;
    signal?: AbortSignal;
    timeoutMs?: number;
    forceRefresh?: boolean; // bypasses the 30s cache
  }): Promise<UsageResponse>;
}
```

On success, returns the parsed `UsageResponse`. On error, throws
a `UsageError` with a discriminated `kind`:

```ts
export type UsageErrorKind =
  | "invalid_key"
  | "rate_limited"
  | "quota_exhausted"
  | "transient"
  | "invalid_params"
  | "unknown";

export class UsageError extends Error {
  constructor(
    public readonly kind: UsageErrorKind,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "UsageError";
  }
}
```

`quota_exhausted` is **thrown** rather than returned as a success
because the surface is uniform: every failure path is a thrown
`UsageError`, and the state machine in `data-flow.md` drives
the UX off `kind`. Phase 04's modal renders "0% remaining" when
the response carries `current_interval_remaining_percent: 0`
**and** `base_resp.status_code === 2056` is treated as a success,
not an error — the contract's classification says 2056 is
`quota_exhausted` but the state machine renders it as the normal
empty state. The architecture resolves this in
`classify.ts` by mapping 2056 to `quota_exhausted` **and** the
client's success path special-cases 2056 to return the parsed
`UsageResponse` (so the modal gets the data and the 0%). This
is the one place the "thrown vs returned" rule bends.

### 7.9 `getCreditBalance()` signature and endpoint resolution

`getCreditBalance()` has the same shape as `getUsage()`:

```ts
getCreditBalance(opts: {
  apiKey: string;
  region: Region;
  signal?: AbortSignal;
  timeoutMs?: number;
  forceRefresh?: boolean;
}): Promise<CreditBalanceResponse>;
```

The endpoint URL is **TBD** per the contract § 6.6. The
architecture picks the **most likely candidate** as the default
and structures the code so swapping is a one-line change in
`endpoints.ts`.

#### 7.9.1 Default credits endpoint

> **Default:** `https://{baseHost}/backend/account/token_plan_credit`
> (region-resolved host).
>
> **Reason:** this is candidate #1 in the contract § 3.1 ranked
> list. The reference repo's README § "已知限制" acknowledges the
> endpoint exists (just claims it is cookie-session-only — which
> is the very thing phase 04's Bearer test will verify). Choosing
> the empirically-confirmed candidate over the inferred
> `/v1/account/credit` path (candidate #2) means phase 04's
> verification is a meaningful test of the documented behaviour,
> not just a probe of an unverified path.

#### 7.9.2 Resolution plan for phase 04

`endpoints.ts` declares **all three** § 3.1 candidates as
constants, with `DEFAULT` pointing at candidate #1:

```ts
export const CreditsEndpointCandidates = {
  tokenPlanCredit: (baseHost: string) =>
    `${baseHost}/backend/account/token_plan_credit`,
  v1AccountCredit: (baseHost: string) =>
    `${baseHost}/v1/account/credit`,
  // Candidate #3 (a sibling field of the token_plan/remains
  // payload) is handled inside getUsage() — see § 7.10.
} as const;

export const DEFAULT_CREDITS_ENDPOINT =
  CreditsEndpointCandidates.tokenPlanCredit;
```

Phase 04 swaps `DEFAULT_CREDITS_ENDPOINT` to a different
constant if the live response shows candidate #1 returns
401/403 (or otherwise rejects Bearer). This is a **one-line
change**.

#### 7.9.3 Unavailable state

If every candidate returns a non-recoverable error
(`invalid_key`, persistent 401, etc.), the `PollingController`
sets a `creditsUnavailable: true` flag on the `StateStore` and
the UI surfaces:

- A modal line: "Credits Balance unavailable from the official
  API."
- A settings-picker hint: `credits` and `both` modes show the
  entries greyed out with the subtext "Coming in a future
  version" (this is the **first-class fallback UX** the
  discovery record § "Decisions confirmed" item 3 mandates —
  no silent cookie fallback).

The "unavailable" flag is **not** a de-scope; the picker still
shows the options, but the options are visibly inert.

### 7.10 Candidate #3 — sibling field of `token_plan/remains`

If the live `token_plan/remains` response carries a `credit_balance`
(or similarly named) field that the contract does not yet model,
`getUsage()` returns it as part of `UsageResponse` (a new
optional field) and the client does not need a second endpoint.
Phase 04 inspects the live response and, if found, commits the
field to the contract. The `endpoints.ts` constant for candidate
#3 is "do nothing — read it from `getUsage()`."

## 8. Things this architecture intentionally does not do

- **No telemetry, no analytics, no crash reporting.** The
  extension does not phone home. There is no `telemetry` key in
  `package.json`. There is no `vscode.env.isTelemetryEnabled`
  check (we do not send anything regardless of the user's
  setting). Documented in `security.md` § "Telemetry".
- **No writes to the platform.** The extension is `GET`-only. It
  does not touch `/v1/chat/completions` or any other write
  endpoint.
- **No model-switching on the user's behalf.** The modal may
  show the active `model_name` as a label, but the extension
  does not send chat traffic. (Out of scope for v0.1.0
  regardless.)
- **No OAuth.** The contract is "Bearer key in a header"; no
  token refresh, no auth code flow, no PKCE.
- **No persistent local DB.** `globalState` holds only the
  last-known-good snapshot. There is no SQLite, no JSON file, no
  separate cache directory.
- **No `fetch` from the webview.** The webview's CSP is
  `default-src 'none'`; the only thing it can load is the
  bundled `modal.html` and `modal.css` and `modal.ts`. It
  cannot reach the platform directly. All API calls are made
  from the extension host and the data is posted in.

## 9. Open items for phase 04

These need a build-phase decision or a contract follow-up:

1. **Confirm the credits endpoint identity with a live request.**
   Phase 04 sends a Bearer-keyed request to candidate #1. If
   the response is 200, the contract gains a `CreditBalanceResponse`
   type. If 401, candidate #2 is tried. If both fail, the
   "unavailable" state is shown and the project owner is told.
2. **Resolve every `[AMBIGUOUS]` marker in the contract § 2.2
   and § 6** during phase 05 live verification. Phase 04 code
   is defensive: a unit mismatch (`ms` vs `s`) is a one-line
   fix in a single `parseTimestamp()` helper.
3. **Pick the publisher identity for the VSCode Marketplace**
   before phase 06 — the project owner owns this. Without it,
   the release on `main` is not publishable. The build phase
   inserts a placeholder `publisher` in `package.json`; the
   project owner replaces it before the first publish.
4. **Confirm the modal copy** for the first-run notification and
   the invalid-key error state. Phase 03 owns the strings, but
   the architecture pins the structure (a non-blocking
   notification with two buttons; an error state with one
   "Open Settings" call to action).

## 10. Cross-references

- `.kitchen/architecture/api-contract.md` — the API surface this
  architecture implements against.
- `.kitchen/architecture/data-flow.md` — the runtime flows this
  architecture enables.
- `.kitchen/architecture/security.md` — the threat model and
  secret-handling rules.
- `.kitchen/architecture/build-and-publish.md` — how the
  artifacts of this architecture are built and published.
- `.kitchen/decisions/0001`–`0004` — the governance and
  publishing ADRs this architecture honours.

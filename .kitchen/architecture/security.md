# Security Model — v0.1.0

- **Status:** accepted (Phase 02 — Architecture)
- **Owner:** `technical-architect`
- **Last updated:** 2026-06-02
- **Source of truth for the components:** `.kitchen/architecture/extension-architecture.md`
- **Source of truth for the API surface:** `.kitchen/architecture/api-contract.md`

This document specifies the security model for the v0.1.0
extension. It is **documentation only** at this phase; the
build phase enforces every rule below in code, and the
verification phase runs tests against the redaction rules.

The architecture's stance is conservative: the extension holds
**one credential** (the user's Subscription Key), and the
extension's only job is to read that credential, send it in a
single `Authorization: Bearer …` header to one of two hosts,
and surface the response. Everything else — telemetry,
crash reporting, model-switching, writes, OAuth, webhooks,
persistence — is deliberately absent, both because it is out
of scope and because removing the surface area removes the
threat.

## 1. API key storage

### 1.1 Where the key lives

The Subscription Key is held in VSCode's `SecretStorage`
(`context.secrets`), under the name
`"minimaxUsage.apiKey"` (defined as a single constant in
`src/secrets/keys.ts` as `SECRET_API_KEY`). The store is
encrypted at rest by VSCode. It is **not** written to
`settings.json`, `globalState`, `workspaceState`, any file in
the workspace, or any `.log` / `.json` / `.txt` file anywhere
in the user's filesystem.

### 1.2 When the key is read

The key is read at request time, inside the request function
(local variable `apiKey`), used in the `Authorization: Bearer
<key>` header, and dropped when the function returns. The
key is **not** retained in any module-level variable, closure,
singleton, or class field. The `UsageClient::getUsage()` and
`UsageClient::getCreditBalance()` functions take the key as a
parameter, never read it from a module-level state.

```ts
// Pseudocode of the only place the key enters the request path
async function getUsage(opts: { apiKey: string; region: Region; signal?: AbortSignal; timeoutMs?: number; forceRefresh?: boolean; }): Promise<UsageResponse> {
  // `opts.apiKey` is the only reference; it lives in `opts` until the
  // function returns, then is GC'd.
  const headers = {
    Authorization: `Bearer ${opts.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  // ... fetch with these headers; no assignment to any module-level state
}
```

### 1.3 What the key is never written to

- `package.json` `contributes.configuration` — the key is
  **not** in the schema. See
  `extension-architecture.md` § 5.1.
- `settings.json` (user or workspace) — no key field.
- `context.globalState` / `context.workspaceState` — the
  `StateStore` is documented in
  `extension-architecture.md` § 6.1; the `PersistedSnapshot`
  shape does not include the key.
- A `.log` file or `console.log` call — see § 4 below.
- A `fetch` URL query string — see § 5 below.
- A cookie — see § 5 below.
- A telemetry / crash report payload — see § 3 below.
- The `postMessage` channel to the webview — the webview
  receives **derived, redacted data** (the 5-Hour and Weekly
  percent and the "Resets in" countdown), never the key. See
  `extension-architecture.md` § 8.
- A `Referer` header — see § 5 below.

## 2. Threat model

The threat model is a short list of **concrete attacks** the
extension defends against. Each row is: threat, mitigation,
and the file / function where the mitigation lives in code.
The build phase is responsible for honouring the mitigation;
this table is the contract.

| # | Threat | Mitigation | Code location |
| --- | --- | --- | --- |
| 1 | Malicious workspace reads the key from disk. | The key is never written to disk. The only on-disk artefact is VSCode's `SecretStorage` blob, which is encrypted at rest by VSCode and is not in the workspace folder. | `src/secrets/secretStorage.ts` (the only `setApiKey` call) |
| 2 | Another extension reads the key from a shared API. | The key is held in `context.secrets`, which is per-extension and is not exposed across the extension API. The extension does not export the key through `vscode.commands`, `vscode.window`, or any other shared surface. | `src/secrets/secretStorage.ts`, `src/extension.ts` |
| 3 | Extension accidentally logs the key (e.g. a `console.log(apiKey)`, a `JSON.stringify(headers)`, an error `.stack` containing a `fetch` URL). | `util/logger.ts` redacts the key on every log call. The redaction is enforced in `redact()` which is called from `info()`, `warn()`, `error()` before any output is written. The redaction rules are unit-tested. | `src/util/logger.ts` (see § 4) |
| 4 | Network observer sees the key in transit. | The key is sent over TLS to the platform's documented host. The key is in the `Authorization` header — not in a URL query string, not in a cookie, not in a request body (the request is `GET` with no body). | `src/api/client.ts` (auth header construction) |
| 5 | XSS in the webview exfiltrates the key. | The webview's CSP is `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';`. The webview has **no** API key. The host posts derived data over `postMessage`; the webview cannot reach the platform directly. | `src/ui/webview/template/modal.html` (CSP meta tag), `src/ui/webview/usageModal.ts` (message protocol — host-to-webview only) |
| 6 | Phishing via a fake "set your API key" prompt. | The extension's "Set your API key" UI is the extension's own `vscode.window.showInputBox({ password: true })`, invoked only by the extension's own command `minimaxUsage.setApiKey`. The Settings UI's `secret` field is **not** used (see `extension-architecture.md` § 5.1). The command is registered in `src/extension.ts` with no parameters — it cannot be invoked with a pre-filled value from the URL or another extension. | `src/extension.ts` (command registration), `src/ui/notification.ts` (first-run button), the invalid-key modal state in `src/ui/webview/usageModal.ts` |
| 7 | Compromised npm dependency exfiltrates the key. | `package-lock.json` is committed. CI runs `npm audit --omit=dev` (or the modern equivalent) and fails on `high` or `critical` advisories. Dependabot (or `npm-check-updates` in CI) opens PRs for minor and patch updates weekly. Major updates need a manual review. The build script refuses to bundle dependencies outside the lockfile. | `package-lock.json`, `.github/workflows/ci.yml` (CI shape in `build-and-publish.md`), `.github/dependabot.yml` |

### 2.1 Out-of-scope threats (stated explicitly)

The extension makes **no claim** of defending against the
following. Stating them here so a future version knows not to
claim coverage.

- **Compromised VSCode install.** If the user's VSCode binary
  is replaced with a malicious one, `SecretStorage`'s
  encryption key is in the attacker's process. Out of scope.
- **Compromised user account.** A user who pastes their
  Subscription Key into a phishing site has lost the key
  regardless of what the extension does. The extension
  surfaces the warning in the invalid-key error state
  (Subscription Key vs Open Platform API Key copy), but cannot
  prevent the paste.
- **OS-level keylogger.** A keylogger on the user's machine
  captures the key as it is typed into the `showInputBox`.
  Out of scope; the build phase does not implement
  copy-from-clipboard-with-clear-after-paste, etc.
- **Memory dump by another process on the user's machine.**
  The key is in the extension host's address space while a
  request is in flight. A user-space process that can read
  another process's memory has already won.
- **Compromised publisher account.** If the VSCode Marketplace
  publisher account is taken over, the attacker can publish
  a malicious update. Mitigated at the org / MFA level
  (project owner concern), not in this extension.
- **Compromised npm registry / typosquat.** Mitigated by
  committed `package-lock.json` and CI; a full defence
  requires running `npm install` from a vendored / pinned
  registry mirror, which is out of scope for v0.1.0.
- **TLS interception by a user-installed root CA.** The
  extension uses Node's default TLS validation. If the user
  has installed a custom root CA (corporate proxy, mitmproxy,
  Charles, etc.), the platform's certificate chain is
  validated against that root. The extension does not pin the
  certificate; the project owner can opt to add pinning in
  v0.2.0.

## 3. Telemetry

**None.** The extension does not phone home. Concretely:

- No `telemetry` key in `package.json` (the modern
  `package.json#contributes. telemetry` is not set).
- No `vscode.env.isTelemetryEnabled` check — the extension
  does not send anything regardless of the user's setting.
  Checking the setting would imply the extension sends
  something when the user opts in, which is not the case.
- No `applicationinsights` / `sentry` / `posthog` / `mixpanel`
  / `amplitude` / `datadog` / `bugsnag` dependency in
  `package.json`.
- No crash reporting. A thrown `UsageError` is logged at
  `warn` level via `util/logger.ts` (with the key redacted,
  the URL scrubbed of any key in the query — none, by
  contract — and the response body dropped for 401s). The
  log line lives in the user's "Output" panel under the
  "MiniMax Usage" channel; nothing leaves the user's machine.
- No analytics, no usage counters, no A/B test framework.
- The CI pipeline does not run on forks in a way that
  publishes anything; the publish workflow (see
  `build-and-publish.md` § 4) is the only thing that touches
  the network beyond the user-facing API calls.

## 4. Logger redaction rules — concrete and testable

The build phase implements these rules in `src/util/logger.ts`.
Every rule is unit-tested (see
`build-and-publish.md` § 5 — Tests). The rules are
**mandatory**; the logger does not accept an "I know what I'm
doing" escape hatch.

### 4.1 Redaction rule R1 — never log an `Authorization` header

If the logged value's key is `Authorization` or `authorization`
(case-insensitive), the value is replaced with the literal
string `"[redacted]"`. The original value is dropped on the
floor before any output is written.

```ts
// Input:  { headers: { Authorization: "Bearer sk-cp-XXXX..." } }
// Output: { headers: { Authorization: "[redacted]" } }
```

### 4.2 Redaction rule R2 — never log a Subscription Key shape

If the logged value is a string that matches the documented
Subscription Key prefix (`sk-cp-` followed by base32 / base64
characters; the exact character set is the documented shape —
phase 04 confirms the live prefix), the string is replaced
with `"[redacted]"`. This rule catches any accidental log
line that includes the key by value (e.g. a malformed error
message that embedded it).

```ts
// Input:  "tried key sk-cp-XXXX... on overseas host"
// Output: "tried key [redacted] on overseas host"
```

### 4.3 Redaction rule R3 — never log the SecretStorage value

If the logged object's key is `minimaxUsage.apiKey` (the
SecretStorage key), the value is replaced with `"[redacted]"`.
This rule catches a logger that accepts the result of
`secretStorage.get()` and stringifies it.

```ts
// Input:  { "minimaxUsage.apiKey": "sk-cp-XXXX..." }
// Output: { "minimaxUsage.apiKey": "[redacted]" }
```

### 4.4 Redaction rule R4 — never log a request URL with the key in the query

The contract does not put the key in the URL; the extension
honours that. If a logged value is a URL string, the logger
parses it; if the parsed URL has a query parameter named
`api_key`, `apikey`, `key`, or `token`, the parameter is
stripped and the URL is re-serialised. The log line records
the host + path only.

```ts
// Input:  "GET https://www.minimax.io/v1/token_plan/remains?key=sk-cp-XXXX..."
// Output: "GET https://www.minimax.io/v1/token_plan/remains"
```

### 4.5 Redaction rule R5 — never log a 401 response body at `error` level

When a `UsageError` with `kind === "invalid_key"` is logged
at the `error` level, the logger records **only** the `kind`
and the `base_resp.status_code` (e.g. `1004`, `2049`). The
full `base_resp.status_msg` and any other response fields are
dropped. The `warn` level is allowed to include a redacted
copy of the message (no key) for diagnostic purposes; the
`error` level is the one that ends up in the user's
attention.

```ts
// warn level (diagnostic, redacted):
//   { kind: "invalid_key", statusCode: 1004, statusMsg: "not authorized" }
// error level (user-facing, minimal):
//   { kind: "invalid_key", statusCode: 1004 }
```

This rule is in addition to R1 (a `headers.Authorization`
field on a 401 is still redacted) and R3 (a 401 body that
echoes the key is still redacted by R1/R2/R3).

### 4.6 Output channel

Log output is written to a VSCode `OutputChannel` named
`"MiniMax Usage"`. The user can open it via the command
palette (`> MiniMax Usage: Show Logs`). The log file is
**not** written to disk by the extension; VSCode's
`OutputChannel` lives in memory. (If the user uses VSCode's
"save log" feature, the saved file is in the user's download
folder and is the user's responsibility to handle.)

## 5. No `Referer` header

Per `api-contract.md` § 1.3 and § 6.1, the extension does
**not** send a `Referer` header. The reference implementation
sends `Referer: https://platform.minimaxi.com/`; the
documented surface does not require it. The hard-coded
`Referer` would leak hard-coded machine assumptions about the
user (a `Referer` set to `platform.minimaxi.com` when the user
is on `platform.minimax.io` is a privacy bug).

**Operational rule:** if phase 05's live verification surfaces
a 401 that only a `Referer` would unblock, the project owner
is told, the contract is updated first
(`api-contract.md` § 6.1), and the change is recorded in a
follow-up discussion record. The build phase does **not**
silently add a `Referer` to ship a green test.

## 6. Webhook / outbound URLs

**None.** The extension is `GET`-only against the platform.
There are no callbacks, no webhooks, no ServiceWorker, no
push, no `postMessage` from a remote origin. The only
outbound HTTP traffic is the two `GET` requests in
`client.ts` (`getUsage` and `getCreditBalance`) to the
region-resolved host. The webview's CSP is `default-src
'none'`, so it cannot make outbound calls of its own.

## 7. Permissions in `package.json`

The minimum required set, with the rationale for each:

| Permission | Why |
| --- | --- |
| (implicit) | The extension is `main: ./dist/extension.js` and runs in the extension host. No `main` permission key — the entry is implicit. |
| `commands` | To register `minimaxUsage.setApiKey` and `minimaxUsage.openSettings`. The `contributes.commands` block is required. |
| `configuration` | To contribute `minimaxUsage.region` and `minimaxUsage.displayMode` to the Settings UI. The `contributes.configuration` block is required. |
| `secrets` | To use `context.secrets` (`SecretStorage`). This is a scope, not a key — VSCode grants it because the extension asks for it in `package.json#extensionDependencies` or via the `secrets` permission. **This is the one scope that is strictly required for the Subscription Key to be stored.** |

**Permissions explicitly NOT requested.** The build phase
must not add any of the following without an explicit ADR:

- `workspaceTrust` / `untrustedWorkspaces` — we do not
  restrict by workspace trust. The extension is
  workspace-agnostic (it talks to the platform, not the
  workspace).
- `*` wildcard permission for `commands` / `configuration` /
  `menus` — every command and configuration key is
  namespaced under `minimaxUsage.*`.
- `webview` is implicit; the extension uses `WebviewPanel`,
  which is part of the standard extension API and does not
  require a separate `webview` permission key.
- No `authenticationProviders` — the extension does not
  contribute an auth provider.
- No `keybindings` / `keybinding` — no global key bindings
  in v0.1.0.
- No `viewsContainers` / `views` — no sidebar view.
- No `menus` (the status-bar click is wired by the
  `StatusBarItem.command` field, not a `menus` contribution).
- No `walkthroughs` — onboarding is the first-run
  notification, not a walkthrough.

## 8. Dependency-hygiene policy

The build phase implements the following, in coordination
with the CI shape in `build-and-publish.md`:

- `package-lock.json` is committed and treated as a build
  artefact. `npm ci` is used in CI (not `npm install`).
- CI runs `npm audit --omit=dev --audit-level=high` (or the
  modern equivalent — `npm audit --audit-level=high` with the
  `--omit=dev` flag) and fails the build on `high` or
  `critical` advisories. Medium and low advisories are
  reported but do not block.
- Dependabot (`.github/dependabot.yml`) is configured to open
  weekly PRs for `npm` ecosystem updates. Minor and patch
  updates open PRs automatically; major updates open a PR
  labelled `major-bump` and require manual review.
- An alternative — `npm-check-updates` running in CI on a
  weekly schedule and opening a single PR with all minor /
  patch bumps — is acceptable if Dependabot is unavailable.
  Phase 06 picks one.
- The build script (`esbuild.config.mjs`) bundles only the
  declared dependencies. There is no dynamic `require()`,
  no `import()` of an undeclared path, no `eval`.
- The shipped `package.json` `main` is `./dist/extension.js`
  (a single CJS bundle). `vsce package` is run with
  `--no-dependencies` for dev builds; the CI publish step
  bundles the dependencies into the `.vsix`.

## 9. Cross-references

- `.kitchen/architecture/extension-architecture.md` § 6.3
  (SecretStorage), § 6.4 (not stored anywhere), § 7.1 (no
  `Referer`), § 8 (telemetry, no writes, no OAuth, no DB,
  no `fetch` from webview).
- `.kitchen/architecture/api-contract.md` § 1.3 (no
  `Referer`), § 6.1 (`Referer` open question), § 6.6
  (credits endpoint, no silent cookie fallback).
- `.kitchen/architecture/data-flow.md` — the runtime
  behaviours this model defends.
- `.kitchen/architecture/build-and-publish.md` — the build
  artefacts and CI shape that enforce § 4, § 7, and § 8.
- `.kitchen/decisions/0001-distribution-vscode-marketplace-only.md` —
  distribution is the Marketplace only; no other channels
  carry the build artefact.
- `.kitchen/decisions/0004-publishing-via-github-actions.md` —
  the publish workflow is the only path that touches
  `secrets.VSCE_PAT`; the build phase does not.

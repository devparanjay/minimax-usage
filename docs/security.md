# Security

This guide describes the security model of MiniMax Usage
v0.1.0, written for the user. It covers where the
Subscription Key is held, what the extension does and does
not do, and how to rotate the key.

## Where the API key is held

The Subscription Key is held in VSCode's `SecretStorage`
under the name `minimaxUsage.apiKey`. VSCode's
`SecretStorage` is encrypted at rest by VSCode.

The Subscription Key is **not** written to:

- `settings.json` (the user settings file).
- `globalState` or `workspaceState` (VSCode's other storage
  surfaces).
- Any file in the workspace.
- Any `.log` file or any `console.log` call.
- Any `fetch` URL query string.
- Any cookie.
- Any telemetry or crash-report payload.
- The webview's `postMessage` channel — the modal never
  receives the Subscription Key. It receives the derived
  data (the two percentages, the countdowns, the timestamp)
  over a typed message channel from the extension host.

The key is read at request time, used in the
`Authorization: Bearer <key>` header, and dropped when the
request function returns. The key is never retained in a
module-level variable, closure, singleton, or class field.

## What the extension does not do

The extension is intentionally narrow. It exists to do one
thing: read the Subscription Key, send it in a single
`Authorization: Bearer …` header to one of two hosts, and
surface the response in the status bar and modal.

- **No telemetry.** The extension does not phone home. It
  does not include any analytics SDK, does not report
  crashes, and does not check or read VSCode's telemetry
  setting (the extension does not send anything regardless
  of the setting). There is no `telemetry` key in the
  extension's manifest.
- **No model-switching, no chat traffic, no writes.** The
  extension is `GET`-only. It never calls a write endpoint,
  never sends a chat request, and never invokes the
  platform on the user's behalf.
- **No OAuth.** The auth model is a single Bearer key in a
  header. There is no token refresh, no auth code flow, no
  PKCE, and no auth provider contributed to VSCode.
- **No persistent local database.** `globalState` holds the
  last-known-good snapshot and the timestamps. The
  extension does not write a SQLite database, a JSON cache
  file, or a separate cache directory.
- **No remote resource loads in the modal.** The modal's
  content security policy locks the webview down. The only
  scripts and styles that load are the ones bundled with
  the extension. The only outbound network traffic the
  extension makes is the two `GET` requests to the
  platform (Token Plan usage, and the optional Credits
  Balance call). The webview cannot reach the network on
  its own.

The output channel under **MiniMax Usage** is the only
diagnostic surface. The log lines do not include the
Subscription Key. The extension's logger redacts the key
on every log call, and the platform's URL is recorded
without any key in the query string (the platform's
documented endpoint does not put the key in the URL).

## What the extension does not protect against

The threat model is the workspace, the network, and the
platform's auth — not the user's machine. The extension
makes no claim of defending against the following:

- **A compromised VSCode install.** If the user's VSCode
  binary is replaced with a malicious one, the
  `SecretStorage` encryption key is in the attacker's
  process. The extension cannot defend against an
  attacker that has the user's process.
- **A compromised user account.** A user who pastes the
  Subscription Key into a phishing site has lost the key
  regardless of what the extension does. The extension
  surfaces a warning in the invalid-key error state to
  help with key-type confusion, but cannot prevent a paste
  into a hostile site.
- **An OS-level keylogger on the user's machine.** A
  keylogger captures the key as it is typed into the input
  box. The extension does not implement
  copy-from-clipboard-with-clear-after-paste.
- **A memory dump by another process on the user's
  machine.** The key is in the extension host's address
  space while a request is in flight. A user-space process
  that can read another process's memory has already won.
- **A compromised Marketplace publisher account.** If the
  VSCode Marketplace publisher account is taken over, the
  attacker can publish a malicious update. This is
  mitigated at the organisation / multi-factor-auth level
  (the project owner's concern), not in the extension.
- **A compromised npm registry or typosquat.** The
  extension's `package-lock.json` is committed and CI
  installs from the lockfile, not from a live registry
  resolution. A full defence against a compromised
  registry requires running `npm install` from a vendored
  mirror, which is out of scope for v0.1.0.
- **TLS interception by a user-installed root CA.** The
  extension uses Node's default TLS validation. If the
  user has installed a custom root CA (corporate proxy,
  `mitmproxy`, `Charles`, and similar), the platform's
  certificate chain is validated against that root. The
  extension does not pin the platform's certificate; the
  project owner can add pinning in a future version.

## How to rotate the key

Rotating the key overwrites the value in `SecretStorage`.
The old key is discarded; the new key takes effect on the
next request.

1. Generate a new Subscription Key on the MiniMax platform
   under **Subscriptions** → **Plan Details** (or
   **Billing** → **Token Plan**).
2. Revoke the old key on the platform.
3. In VSCode, open **Settings** → search for
   **MiniMax Usage** → click **Set your API key** in the
   **Subscription Key** row.
4. Paste the new key and press **Enter**.

The extension invalidates its in-memory cache for the old
key and fires a refresh with the new key. The status bar
transitions to the loading state and to the live data
within a couple of seconds.

If the platform's revoke has not yet propagated, the
extension may briefly show the **Sign in** state before
the new key's first successful response lands. The retry
on the 60-second background tick re-fetches within a
minute.

To remove the key entirely, open **Settings** →
**MiniMax Usage** → **Set your API key** → clear the input
→ press **Enter**. The key is removed from `SecretStorage`
and the extension returns to the **Set up MiniMax Usage**
state.

## How to report a security issue

Open a GitHub issue on
`https://github.com/devparanjay/minimax-usage/issues` with
a clear title that flags the issue as security-related.
The project owner triages new issues and routes
security-sensitive reports through a private channel if
one is set up.

Include:

- A description of the issue and the impact.
- Steps to reproduce.
- The **Output** panel under **MiniMax Usage**, with the
  Subscription Key already redacted by the logger (the
  logger applies the redaction on every log call; the
  captured log should not contain the key).

Do not include the Subscription Key in the issue. The
project owner does not need the key to triage; the
extension's logs and the platform's response codes are
enough.

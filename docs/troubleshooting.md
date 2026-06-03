# Troubleshooting

This guide covers the common issues that surface in v0.1.0
and the recovery path for each. If a state described here
does not match what the extension shows, capture the
**Output** panel under the **MiniMax Usage** channel (open
via the command palette: **MiniMax Usage: Show Logs**) and
include it in a GitHub issue.

## Status bar entry does not appear after install

- Check the VSCode version. The extension requires
  **VSCode 1.85.0** or later. Open **Help** → **About** to
  confirm. If the version is older, update VSCode and
  reinstall the extension.
- Reload the window. Open the command palette
  (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run
  **Developer: Reload Window**. The extension activates on
  the next start.
- Open the **Output** panel and pick the **MiniMax Usage**
  channel. Any activation-time error is logged there.
- Confirm the extension is enabled. Open the **Extensions**
  panel, search for **MiniMax Usage**, and confirm the
  entry is present and not disabled. If it is disabled,
  click **Enable**.

## "Sign in" badge with no key set

The status bar shows a red **Sign in** label. The
Subscription Key has not been entered, or the key was
deleted from storage.

1. Click the status bar entry to open the modal.
2. Click **Open Settings**.
3. Click **Set your API key** in the **Subscription Key**
   row.
4. Paste the key and press **Enter**.

See [Setup](./setup.md) for the full setup flow.

## "Sign in" badge with a key set

The status bar shows a red **Sign in** label even after a
key has been entered. The extension is reaching the
platform but the platform is rejecting the key. Three
causes, in order of likelihood:

- **The key is invalid, mistyped, or has been revoked.**
  Re-enter the key. Open **Settings** → search for
  **MiniMax Usage** → click **Set your API key** in the
  **Subscription Key** row. Confirm the value starts with
  `sk-cp-` and matches the key shown on the platform
  exactly.
- **The wrong key type is in storage.** Confirm the value
  in the platform console. The **Subscription Key** lives
  under **Billing** → **Token Plan**. The **Open Platform
  API Key** lives under **Account** → **Basic Information**
  → **Interface Key**. The two are not interchangeable; the
  extension reads the Subscription Key. The modal's
  invalid-key body explains the distinction.
- **The region does not match.** If the Subscription Key
  is from `platform.minimaxi.com` (Mainland China) but the
  region setting is set to **Overseas**, the platform
  rejects the request as if the key were invalid. Open
  **Settings** → **MiniMax Usage: Region** and switch to
  **Mainland China platform — `platform.minimaxi.com`**, or
  vice versa. The next fetch happens within a second or
  two.

If the issue persists after re-entering the key and
checking the region, capture the **Output** panel under
**MiniMax Usage** and open a GitHub issue with the
extension's logs.

## "Rate limited" badge

The platform is throttling. The status bar shows a yellow
**Rate limited** label; the modal shows
**Too many requests — cooling down.** Wait a minute. The
next refresh is automatic. There is no manual retry button
by design; the extension suppresses polls for 60 seconds
to avoid making the throttle worse.

If the badge persists for several minutes, confirm:

- No other tool is calling the Token Plan endpoint with
  the same Subscription Key at high frequency.
- The platform is not in a peak-hour dynamic rate-limit
  window (the platform's documentation notes 15:00–17:30
  weekdays for some plan tiers).

## "No Token Plan data" badge or modal body

The status bar shows **No plan**; the modal shows
**Token Plan data unavailable. Check the MiniMax
console.** The platform returned a successful response,
but with no Token Plan data.

This means the account has no Token Plan seat and no
Credits. The extension cannot show what does not exist.
Open the MiniMax console to confirm the account state.

If the account does have a Token Plan seat, this state can
also surface if the platform's response shape changes or
the response is missing fields the extension reads. Capture
the **Output** panel and open a GitHub issue.

## "Couldn't reach the MiniMax API" error

The modal shows the grey **Couldn't reach the MiniMax API**
error block. The status bar shows the last known data with
a `(stale)` suffix. Causes:

- The local network is down or restricted. Confirm a
  browser on the same machine can reach
  `https://www.minimax.io` (or `https://www.minimaxi.com`
  for Mainland China).
- A corporate proxy, firewall, or VPN is blocking the
  request. The extension uses Node's default TLS validation
  and does not honour a custom root CA. If a corporate
  proxy requires a custom CA, see [Security](./security.md)
  for the threat-model note on TLS interception.
- The platform is temporarily unreachable from the
  extension's region. The retry is automatic on focus gain
  and on the 60-second background tick.

Open the **Output** panel under **MiniMax Usage** for the
specific error. The retry policy fires 3 attempts with
exponential back-off (1s, 2s, 4s) before the surface
message is shown.

## "MiniMax API temporarily unavailable" error

The modal shows the grey **MiniMax API temporarily
unavailable** error block. The platform returned a
transient server-side error. The retry is automatic on
focus gain and on the 60-second background tick.

If the badge persists for several minutes, check the
platform's status page (if one is published) and capture
the **Output** panel under **MiniMax Usage** for the
specific error.

## "Credits Balance unavailable from the official API"

The Credits block in the modal shows the placeholder
**Credits Balance unavailable from the official API.**
with the body **Coming in a future version.** The
**Credits** and **Both** entries of the display-mode picker
are greyed out.

The platform's Credits endpoint is not currently callable
with a Bearer Subscription Key. The Token Plan blocks
continue to render normally from the platform's other
endpoint. This is a known platform constraint, surfaced as
a placeholder rather than an error.

To continue using the extension, switch the display mode
to **Token Plan** in **Settings**.

## "Last updated never" footer

The modal's footer reads **Last updated never**. The
extension has not yet received a successful response. Wait
for the next refresh, or click the status bar entry to
force one. The first refresh after install happens within
a second or two of saving the Subscription Key.

If the footer never updates after several minutes, the
extension is in an error state. The status bar projection
shows the error icon and label. See the relevant section
above for the recovery path.

## The modal opens but shows "Fetching usage…" forever

The modal's centred body reads **Fetching usage…** and the
spinner does not stop. The request is in flight and has not
yet returned. Causes:

- A network issue or platform outage. See **Couldn't reach
  the MiniMax API** above.
- The 10-second client timeout has not yet fired. The
  modal updates when the request resolves or times out.
- The extension is waiting for a focus event to retry after
  a previous error. Click the status bar to force a
  refresh.

Open the **Output** panel under **MiniMax Usage** for the
specific error. The extension retries on focus gain and on
the 60-second background tick.

## Display-mode picker entries are greyed out

The **Credits** and **Both** entries in the display-mode
picker are greyed out. The hint under the picker reads
**Credits endpoint unavailable — coming in a future
version**. The platform's Credits endpoint is not
currently callable. Pick **Token Plan** to keep using the
extension. See **Credits Balance unavailable** above.

## Capture a log

For any issue that the recovery paths above do not
resolve, capture the **Output** panel under the
**MiniMax Usage** channel. The logs are written to a
VSCode `OutputChannel` named **MiniMax Usage**; open it
from the command palette via **MiniMax Usage: Show Logs**.

The log lines do not include the Subscription Key. The
extension's logger redacts the key on every log call. See
[Security](./security.md) for the redaction rules.

Open a GitHub issue at
`https://github.com/devparanjay/minimax-usage/issues` and
attach the captured log. The project owner triages new
issues.

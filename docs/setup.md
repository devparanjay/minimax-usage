# Setup

This guide covers configuring MiniMax Usage after install:
finding the **Subscription Key** on the MiniMax platform,
entering it in the extension, choosing the region, and
choosing the display mode.

The Subscription Key is the only credential the extension
holds. The extension never reads, accepts, or stores the
**Open Platform API Key**. The two are not interchangeable on
the platform.

## Get the Subscription Key

1. Open `https://platform.minimax.io` in a browser and sign
   in.
2. Navigate to **Subscriptions** → **Plan Details**. The
   same key is also surfaced under **Billing** → **Token
   Plan**; both paths land on the same Subscription Key.
3. Copy the key. The Subscription Key starts with
   `sk-cp-` followed by additional characters. A typical
   value has the shape `sk-cp-XXXX…` (the suffix is
   redacted here; copy the full string from the platform).

If you subscribed on the Mainland China platform
(`platform.minimaxi.com`), follow the same path on that
host. The two platforms issue keys for different regions;
the platform rejects a key that does not match the host.
See [Choose the region](#choose-the-region) below.

A key from **Account** → **Basic Information** → **Interface
Key** is the **Open Platform API Key**, not the Subscription
Key. The extension surfaces an invalid-key error if a
non-Subscription Key is pasted; see
[Troubleshooting](./troubleshooting.md).

## Enter the key in the extension

There are two equivalent entry points. Both reach the same
input.

### From the first-run notification

The first time the extension activates and finds no
Subscription Key in storage, a VSCode notification appears
with the title **Set your MiniMax API key** and a body
pointing at **Billing** → **Token Plan**. The notification
has two buttons: **Open Settings** (primary) and
**Later** (dismiss). Click **Open Settings** to continue.

### From the status bar entry

The status bar entry is always present, even before the key
is set. Click the status bar entry to open the same setup
flow.

### The input

After clicking through, an input box opens with the prompt
**Paste your Subscription Key**. The placeholder shows the
key prefix (`sk-cp-…`) so you can confirm you are pasting a
Subscription Key and not an Open Platform API Key. The
characters you type are masked.

1. Paste the key.
2. Press **Enter**.

The key is written to VSCode's `SecretStorage` and is
**never** written to `settings.json` or to any other file on
disk. The extension confirms with the toast
**Subscription Key saved. MiniMax Usage will refresh.** The
status bar entry transitions to the live data within a
second or two.

To change the key later, open **Settings** → search for
**MiniMax Usage** → click **Set your API key** in the
**Subscription Key** row.

## Choose the region

The region setting tells the extension which platform host
to call. The Subscription Key is bound to the platform it
was issued from.

1. Open **Settings** (`Ctrl+,` / `Cmd+,`).
2. Search for **MiniMax Usage** to filter to this
   extension's settings.
3. Under **MiniMax Usage: Region**, pick the value that
   matches where you subscribed:

   - **Overseas platform — `platform.minimax.io` (default)**
     for users on `platform.minimax.io`.
   - **Mainland China platform — `platform.minimaxi.com`**
     for users on `platform.minimaxi.com`.

A wrong region surfaces as an invalid-key error. If you
flip the region, the extension invalidates its in-memory
cache and re-fetches within a second or two.

## Choose the display mode

The display mode setting picks what the status bar entry
and the usage modal show.

1. Open **Settings**.
2. Under **MiniMax Usage: Display Mode**, pick one of:

   - **Token Plan — 5-Hour and Weekly progress bars**
     (default). The status bar shows the two percentages
     and the modal shows the two progress bars. This is the
     view most users want.
   - **Credits — Balance only**. The status bar and modal
     show only the credit balance. Pick this if the Token
     Plan quotas are not what you want to monitor.
   - **Both — Token Plan and Credits side by side**. The
     modal shows the Token Plan blocks and the Credits
     block stacked vertically.

Changing the display mode does not trigger a new network
request. The status bar and modal re-render against the
data the extension already has.

If the platform's Credits endpoint is not currently
callable, the **Credits** and **Both** entries are greyed
out in the picker. The hint **Credits endpoint unavailable
— coming in a future version** appears under the picker.
Pick **Token Plan** until that resolves.

## After setup

The status bar entry transitions from the setup prompt to
the live data projection within a couple of seconds. Click
it to open the usage modal. See [Usage](./usage.md) for
how to read the modal.

If the status bar shows **Sign in** after entering a key,
the key is invalid, revoked, or the region is wrong. See
[Troubleshooting](./troubleshooting.md).

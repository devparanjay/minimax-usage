# Usage

This guide covers the status bar entry and the usage modal:
how to read them, what the colour codes mean, what each
error state looks like, and when the data refreshes.

## The status bar entry

The status bar entry is the clickable item at the bottom of
the VSCode window. It is always present, even when the
extension is in an error state or has no Subscription Key
configured. The icon, text, and tooltip change with the
extension's state.

### Success state

When the extension has a valid Subscription Key and the
platform has returned fresh data, the status bar shows the
two remaining percentages in a compact form:

```
[check]  5h: 75% · 7d: 94%
```

- **5h** is the **5-Hour Limit**, the platform's rolling
  5-hour quota window.
- **7d** is the **Weekly Limit**, the platform's 7-day
  quota window.
- The middle dot `·` separates the two values.

The tooltip on hover shows the time remaining in each
window (e.g. **5h resets in 2h 14m · 7d resets in 5d 3h**).

The icon is colour-coded against the lower of the two
percentages:

| Range (lower of 5h / 7d) | Icon | Colour |
| --- | --- | --- |
| More than 50% remaining | check | Green |
| 20% to 50% remaining | check or dash | Yellow |
| 20% or less remaining | check or dash | Red |

The icon colour follows the data, not the user's theme. The
values themselves are always readable.

### Setup state (no key)

Before the Subscription Key is entered, the status bar
shows a gear icon and the text **Set up MiniMax Usage**.
Click it to start the setup flow. See
[Setup](./setup.md).

### Other states

The status bar has dedicated projections for every state
the modal can be in. The mapping is summarised in
[The status bar entry's full state table](#the-status-bar-entrys-full-state-table)
below.

## The modal

Click the status bar entry to open the modal. The modal is
a single VSCode panel. The contents depend on the display
mode (Token Plan / Credits / Both) and on whether the
extension is in a data state, an error state, or a
loading state.

### Token Plan modal

In the default **Token Plan** display mode, the modal shows
two blocks stacked vertically, separated by a thin divider.

**5-Hour Limit block**

```
5-Hour Limit
[========================........] 75% remaining
Quota used 25%
Resets in 2h 14m
```

- A progress bar whose fill width reflects **Quota used**,
  computed as `100 − remaining_percent`.
- The **Quota used** line, with the integer percentage.
- The **Resets in** line, with a countdown formatted as
  `Nh Mm` (hours and minutes), `Nm Ss` (minutes and
  seconds), or `Nd Mh` (days and hours), depending on the
  magnitude.

The progress bar fill colour is green when more than 50%
remains, yellow from 20% to 50%, and red at 20% or less.
At 0% the bar is fully filled in red.

**Weekly Limit block**

The Weekly Limit block has the same shape as the 5-Hour
block, on the platform's 7-day window. The two windows are
independent — a 5-hour exhaustion does not affect the
Weekly percentage.

**Modal footer**

```
Last updated 12s ago                              Open Settings
```

- The **Last updated** timestamp ticks in seconds, then
  minutes, then hours.
- The **Open Settings** link on the right opens the
  Settings UI filtered to MiniMax Usage.

### Credits modal

In **Credits** display mode, the modal shows the **Credits
Balance** block. The block title is **Credits Balance**.
The body shows the remaining credit amount and (when the
response carries it) the credit count.

The **5-Hour Limit** and **Weekly Limit** blocks are
omitted in this mode. The modal title is **Credits**.

### Both modal

In **Both** display mode, the modal shows the 5-Hour Limit
block, the Weekly Limit block, and the Credits Balance
block stacked vertically. The modal title is
**MiniMax Usage**.

The status bar still shows the compact `5h: … · 7d: …`
projection in this mode; the status bar does not have room
for the credit amount.

### Credits Balance unavailable

If the platform's Credits endpoint is not currently
callable, the Credits block in the modal is replaced with a
**Credits Balance unavailable from the official API.**
placeholder, and the body reads **Coming in a future
version.** The Token Plan blocks continue to render
normally. The 5h and 7d percentages are unaffected.

The **Credits** and **Both** entries of the display-mode
picker are greyed out while this state is active. Pick
**Token Plan** to keep using the extension without the
Credits data.

## Error states

The modal and the status bar entry render distinct visual
treatments for each error state. The colour codes are
visual only; the recovery path depends on the state.

### Sign in (red)

The Subscription Key is invalid, expired, or the region
does not match where you subscribed. The status bar shows a
red **Sign in** label; the modal shows the
**Couldn't verify your Token Plan key** error block.

The modal body explains the difference between the
Subscription Key from **Billing** → **Token Plan** and the
Open Platform API Key from **Account** → **Basic
Information**, and reminds you to switch the region in
settings if you subscribed on a different platform. The
modal has a single **Open Settings** call to action.

Click **Open Settings** (in the modal or in the footer) to
re-enter the key. The status bar transitions to the
loading state and back to the live data on the next
successful fetch.

### Rate limited (yellow)

The platform is throttling. The status bar shows a yellow
**Rate limited** label; the modal shows the
**Too many requests** error block. The body says
**Cooling down. The next refresh will happen automatically
within a minute.**

There is no manual retry button by design. The extension
suppresses polls for 60 seconds; the next eligible refresh
is from a window focus event or a manual click on the
status bar after the window expires.

### Couldn't reach the MiniMax API (grey)

Network or DNS failure. The status bar shows the last
known data with a `(stale)` suffix in grey; the modal shows
the **Couldn't reach the MiniMax API** error block. The
body says **Will retry automatically.**

The extension retries with exponential back-off (1s, 2s,
4s, capped at 3 attempts). The next attempt is from the
60-second background tick, a window focus event, or a
manual click on the status bar.

### MiniMax API temporarily unavailable (grey)

The platform returned a transient server-side error. The
visual treatment is identical to **Couldn't reach the
MiniMax API**; the title is **MiniMax API temporarily
unavailable** and the body is **Will retry.** The recovery
path is the same.

### Credits Balance unavailable (grey)

The platform does not currently expose a programmatic
Credits endpoint that accepts a Bearer key. The Token Plan
blocks continue to render normally. This is a known
platform constraint, surfaced as a placeholder rather than
an error.

### No Token Plan data (grey)

The platform returned an empty response. This means the
account has no Token Plan seat and no Credits. The modal
shows the **Token Plan data unavailable.** title and
**Check the MiniMax console.** body. The status bar shows
**No plan**. The extension has nothing to display; the
MiniMax console is the source of truth for the account
state.

## Refreshing

The extension refreshes the data in three situations:

- **On modal open.** Clicking the status bar entry fires
  the request. The 30-second in-memory cache short-circuits
  the network call when the click happens within 30 seconds
  of the last successful fetch.
- **On window focus.** When the VSCode window gains focus,
  the extension fires a refresh.
- **Every 60 seconds in the background.** A timer ticks
  every 60 seconds while VSCode is running and fires a
  refresh.

To force a refresh, click the status bar entry. The status
bar transitions to the loading state and the modal shows
the new data when the response lands.

## The status bar entry's full state table

For reference, the full mapping between the modal state and
the status bar projection is:

| Modal state | Status bar icon | Status bar text |
| --- | --- | --- |
| Setup (no key) | gear (grey) | **Set up MiniMax Usage** |
| Loading | spinner (grey) | **Loading…** |
| Success | check (green / yellow / red) | **5h: {pct}% · 7d: {pct}%** |
| 5-hour exhausted | warning (yellow) | **5h: 0%** |
| No Token Plan data | dash (grey) | **No plan** |
| Invalid key | error (red) | **Sign in** |
| Rate limited | warning (yellow) | **Rate limited** |
| Could not reach API (transient) | sync (grey) | **5h: {pct}% · 7d: {pct}% (stale)** |
| Server unavailable | sync (grey) | **5h: {pct}% · 7d: {pct}% (stale)** |
| Credits unavailable (in Credits mode) | dash (grey) | **Credits unavailable** |

The status bar always shows something; it never goes
blank. The icon, text, and tooltip together tell the user
what state the extension is in and what to do next.

## Related

- [Troubleshooting](./troubleshooting.md) — what to do when
  something does not look right.
- [Security](./security.md) — what the extension does with
  the Subscription Key, and what it does not do.

# MiniMax Usage

<p align="center">
  <img src="https://raw.githubusercontent.com/devparanjay/minimax-usage/main/images/logo-v0.1.0.png" alt="MiniMax Usage" width="160" />
</p>

See your MiniMax Token Plan and Credits usage in the VSCode status bar, with one click for the full picture.

<!-- TODO: add status-bar-and-modal screenshot when one is available -->
![MiniMax Usage — status bar and modal](https://raw.githubusercontent.com/devparanjay/minimax-usage/main/images/screenshot.png)

MiniMax Usage is a VSCode extension for MiniMax subscribers who would rather not switch to the platform console to check how much of the 5-Hour Limit or Weekly Limit is left. The extension adds a status bar entry that shows the live Token Plan percentages, and a modal that opens on click for the full breakdown.

[![Install from VSCode Marketplace](https://img.shields.io/vscode-marketplace/v/devparanjay.minimax-usage.svg?style=flat-square&label=VSCode%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=devparanjay.minimax-usage) [![Star on GitHub](https://img.shields.io/github/stars/devparanjay/minimax-usage.svg?style=social)](https://github.com/devparanjay/minimax-usage)

The install badge reflects the Marketplace's pre-publish state. The listing is wired and ready; the project owner publishes when ready.

If this extension saves you a context switch, consider giving it a star on [GitHub](https://github.com/devparanjay/minimax-usage) — it helps others find it.

## Install

### From the VSCode Marketplace

Open VSCode → Extensions panel → search "MiniMax Usage" → Install.

Or open the listing directly: [VSCode Marketplace — MiniMax Usage](https://marketplace.visualstudio.com/items?itemName=devparanjay.minimax-usage).

### From a `.vsix` (sideload)

For local testing before the Marketplace listing is public, sideload the packaged extension:

```
code --install-extension minimax-usage-0.1.0.vsix
```

The `.vsix` artefact is published on the [GitHub releases page](https://github.com/devparanjay/minimax-usage/releases) for the v0.1.0 tag.

## Setup

Three steps, end to end.

### 1. Get your Subscription Key

Log in to [https://platform.minimax.io](https://platform.minimax.io) → Subscriptions → Plan Details. Copy the key. It starts with `sk-cp-`.

The Subscription Key is the key for Token Plan and purchased Credits. It is **not** the same thing as the Open Platform API Key, which lives in Account → Basic Information. The extension will not work with the Open Platform API Key.

For Mainland China subscribers, the platform is `https://platform.minimaxi.com`. The key is bound to the platform that issued it.

### 2. Enter the key in the extension

Click the status bar entry → "Set your API key" → paste the Subscription Key → Enter.

The key is held in VSCode's `SecretStorage` (encrypted at rest). It does not appear in `settings.json`, and it does not round-trip through the webview.

### 3. Pick your region

Open the Settings UI (Cmd+, / Ctrl+,) and search for "MiniMax Usage".

- **MiniMax Usage: Region** — Overseas (default) or Mainland China.
- **MiniMax Usage: Display Mode** — Token Plan (default), Credits, or Both.

A wrong region surfaces as "Sign in" in the status bar. Flip the Region picker to the other option and the next refresh will pick up the right host.

## Use

The status bar entry shows the two Token Plan percentages:

```
$(check)  5h: 75% · 7d: 94%
```

- **5h** is the 5-Hour Limit.
- **7d** is the Weekly Limit (7-day rolling).

Click the status bar entry to open the modal. The modal shows:

- **5-Hour Limit** — progress bar, "Quota used" percentage, and a "Resets in" countdown.
- **Weekly Limit** — progress bar, "Quota used" percentage, and a "Resets in" countdown.
- **Credits Balance** (when Display Mode is "Both" or "Credits") — the purchased-credits balance.

Colour codes on the status bar:

- **Green** — more than 50% remaining.
- **Yellow** — 20%–50% remaining.
- **Red** — 20% or less remaining, or the 5-Hour Limit is exhausted.

The footer of the modal shows when the data was last fetched, with a link to the Settings UI.

The status bar polls every 60 seconds in the background, plus on window focus and on modal open. There is no manual refresh button — the next eligible refresh happens automatically.

## Privacy

The extension does not phone home. There is no telemetry, no analytics, no crash reporting. The Subscription Key is held in VSCode's `SecretStorage` (encrypted at rest, on the local machine) and never leaves the machine except as the `Authorization: Bearer <key>` header in the request to the platform. The platform is the only network destination the extension talks to.

For the full threat model, see [`/docs/security.md`](https://github.com/devparanjay/minimax-usage/blob/main/docs/security.md).

## Contributing and feedback

Bug reports and feature requests go on the [GitHub issues page](https://github.com/devparanjay/minimax-usage/issues). Include the VSCode version, the extension version, and the contents of the modal in the relevant error state.

## License

[AGPL v3](https://github.com/devparanjay/minimax-usage/blob/main/LICENSE).

## Disclaimer

MiniMax is a trademark of its respective owner. This extension is not affiliated with, endorsed by, or sponsored by MiniMax.

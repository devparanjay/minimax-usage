# MiniMax Usage

A VSCode extension that shows near-realtime usage of your MiniMax
plan inside VSCode — usage you would otherwise have to check on
the platform's account page.

## Status

**v0.1.0 — in development.**

The MVP scope is end-to-end:

- Install from the VSCode Marketplace.
- Get a notification to set the API key on first run; click
  through to the extension's settings.
- Enter the API key (find it in **Plan Details** under
  **Subscriptions** on the platform's account page).
- Pick what to display: **Token Plan**, **Credits
  (Pay-as-you-go)**, or **Both**.
- Click the extension's status bar entry to open a usage modal:
  - **Token Plan:** 5-Hour Limit and Weekly Limit progress bars,
    each with "Resets in" and "Quota Used."
  - **Credits:** Balance, and (where available) Hourly Usage,
    5 Hours Usage, Daily Usage, Weekly Usage.

User-facing docs live in [`/docs/`](./docs/). Internal team docs
(roadmaps, decisions, planning) live in [`.kitchen/`](./.kitchen/).

## Distribution

The extension is distributed **only** through the Visual Studio
Code Marketplace. See [`.kitchen/decisions/0001-distribution-vscode-marketplace-only.md`](./.kitchen/decisions/0001-distribution-vscode-marketplace-only.md).

## License

[AGPL v3](./LICENSE).

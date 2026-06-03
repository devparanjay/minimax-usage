# User documentation

This directory is the user-facing documentation for
**MiniMax Usage**, a VSCode extension that shows
near-realtime MiniMax plan usage inside VSCode. The
extension is for personal use by users with a MiniMax
subscription; the only data source is the platform's
`token_plan/remains` endpoint, accessed with the user's
Subscription Key.

A new user can install, configure, and use the extension
by following only this index and the linked documents.

## What is in this directory

- [Installation](./installation.md) — install from the
  VSCode Marketplace, or sideload a `.vsix` for testing.
- [Setup](./setup.md) — find the Subscription Key on the
  MiniMax platform, enter it in the extension, choose the
  region, choose the display mode.
- [Usage](./usage.md) — read the status bar entry and the
  usage modal, including every error state.
- [Troubleshooting](./troubleshooting.md) — common issues
  and the recovery path for each.
- [Security](./security.md) — where the Subscription Key
  is held, what the extension does and does not do, how
  to rotate the key, how to report a security issue.

## Where to start

1. **Installing for the first time:** read
   [Installation](./installation.md) and then
   [Setup](./setup.md).
2. **Reading the modal and understanding the colours:**
   read [Usage](./usage.md).
3. **Something is not working:** read
   [Troubleshooting](./troubleshooting.md).
4. **Curious about the security model:** read
   [Security](./security.md).

## Release status

v0.1.0 is in active development. The Marketplace listing
becomes public when the release is cut and published. The
GitHub releases page for this repository carries the
`minimax-usage-0.1.0.vsix` artefact for sideloading in the
meantime:

```
https://github.com/devparanjay/minimax-usage/releases
```

The v0.1.0 release notes and the source archives are on
the same page. Internal team documentation (roadmaps,
architecture, design notes) lives in `.kitchen/`.

# Installation

This guide covers installing MiniMax Usage in VSCode.

The extension is published under the publisher name
`devparanjay` and the extension name `minimax-usage`. The
display name is **MiniMax Usage**.

## Requirements

- VSCode **1.85.0** or later. The extension declares
  `engines.vscode: "^1.85.0"` in its manifest. Older versions
  of VSCode do not provide the APIs the extension depends on.
- An active MiniMax subscription with access to a
  **Subscription Key**. See [Setup](./setup.md) for where to
  find it.

## Install from the VSCode Marketplace

When v0.1.0 is published, the extension is available on the
VSCode Marketplace at the listing:

```
https://marketplace.visualstudio.com/items?itemName=devparanjay.minimax-usage
```

To install from VSCode:

1. Open VSCode.
2. Open the **Extensions** panel. The default keybinding is
   `Ctrl+Shift+X` (Windows, Linux) or `Cmd+Shift+X` (macOS).
3. Search for **MiniMax Usage**.
4. Open the extension's listing and click **Install**.

VSCode downloads and activates the extension on the next
window start, or immediately if VSCode is already running.

If the Marketplace listing is not yet public for v0.1.0, the
search will not return a result. In that case, install the
sideloaded `.vsix` from the GitHub releases page until the
Marketplace publish lands. See
[Install from a `.vsix`](#install-from-a-vsix-sideload-for-testing)
below.

## Install from a `.vsix` (sideload for testing)

The sideload path is useful for testing the v0.1.0 build
before the Marketplace publish is approved, or for users on
managed installs where the Marketplace is not reachable.

1. Download `minimax-usage-0.1.0.vsix` from the GitHub
   releases page for this repository.
2. Open a terminal and run:

   ```sh
   code --install-extension minimax-usage-0.1.0.vsix
   ```

   The `code` command is the VSCode CLI. It is on the `PATH`
   on most setups; if it is not, launch it from VSCode's
   command palette via **Shell Command: Install 'code' command
   in PATH**.

3. Restart VSCode when prompted.

The `.vsix` artefact is a `.zip` that VSCode unpacks into its
extension directory. To uninstall a sideloaded version, use
the Extensions panel's **Uninstall** action on the
**MiniMax Usage** entry, or run:

```sh
code --uninstall-extension devparanjay.minimax-usage
```

## Verify the install

After installing, the VSCode status bar (the strip at the
bottom of the VSCode window) shows a status bar entry. On
the first run, the entry is the setup prompt described in
[Setup](./setup.md).

If the status bar entry does not appear, see
[Troubleshooting](./troubleshooting.md).

## Next steps

- [Setup](./setup.md) — find your Subscription Key on the
  MiniMax platform and enter it in the extension.
- [Usage](./usage.md) — read the status bar entry and the
  usage modal.
- [Security](./security.md) — how the extension handles the
  Subscription Key, and what it does not do.

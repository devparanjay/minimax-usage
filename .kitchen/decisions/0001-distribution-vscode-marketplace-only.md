# ADR 0001 — Distribution: VSCode Marketplace Only

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** project owner, FooFoo (orchestrator)

## Context

The project is a VSCode extension that shows MiniMax plan usage inside
VSCode. The project owner has stated the expected result clearly:
distribution through the VSCode Marketplace, and through no other public
or private channel on any other platform.

This is a personal-use extension that the project owner is also making
publicly available to other VSCode users. It is not intended for
distribution through alternative marketplaces, package managers,
side-loaded installers, or any other channel.

## Decision

The extension is distributed **exclusively** through the Visual Studio
Code Marketplace. Specifically:

- The release on `main` is the only release that gets published to the
  Marketplace.
- The build pipeline does not target any other distribution channel
  (no Open VSX, no `.vsix` mirrors, no side-loaded bundles, no
  alternative package managers).
- README, `/docs/`, and any marketing or install instructions point
  only at the VSCode Marketplace listing as the install source.

## Consequences

- The CI/CD pipeline only needs to publish to one target: the VSCode
  Marketplace, via `vsce publish` driven by GitHub Actions.
- The `package.json` `publisher` field must be set to the project
  owner's verified VSCode Marketplace publisher ID. The project owner
  will confirm or create the publisher account.
- The `/docs/` installation guide has a single, unambiguous install
  path. If the user is reading the docs, they should never have to
  guess where the extension lives.
- If a future need arises to publish elsewhere (e.g. Open VSX for
  VSCodium users), it will be raised as a new ADR — this one will be
  superseded, not silently broadened.

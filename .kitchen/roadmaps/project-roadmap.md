# Project Roadmap — MiniMax Usage

**Status:** in flight — v0.1.0
**Last updated:** 2026-06-02
**Owner:** orchestrator (FooFoo)

## Vision

A VSCode extension that shows near-realtime usage of the user's
MiniMax plan inside VSCode, removing the need to context-switch to
the platform's account page to check quota and credit consumption.

## Distribution

- **Channel:** VSCode Marketplace only. (See ADR `0001`.)
- **Publisher:** the project owner's VSCode Marketplace publisher
  identity (to be confirmed).

## Non-goals

- Not distributed through any other public or private channel.
- Not an MCP server, not a CLI, not a desktop app.
- Not a usage analytics aggregator across multiple platforms —
  MiniMax only.
- Not a billing or payment tool.

## Version strategy

See ADR `0002` for the branch and merge model. Versions are tagged
and released per branch; only the release on `main` is published to
the Marketplace.

## Versions

| Version | Status        | Branch    | Goal                                                    |
|---------|---------------|-----------|---------------------------------------------------------|
| v0.1.0  | in flight     | `v0.1.0`  | End-to-end MVP: install, API key, settings, status bar, usage modal. See `.kitchen/roadmaps/v0.1.0/roadmap.md`. |
| v0.2.0  | not started   | (future)  | (To be planned at end of v0.1.0.)                       |

Future versions will be defined after v0.1.0 ships and we have real
feedback on the API contract, the UX, and the install funnel.

## Cross-cutting concerns

- **Security:** API key held in VSCode SecretStorage, not in
  settings storage; never logged, never serialised.
- **Documentation:** user docs in `/docs/`, internal docs in
  `.kitchen/`. Both are kept current.
- **CI/CD:** lint + typecheck + test on every PR; publish on
  release of `main`. (See ADR `0004`.)
- **Telemetry:** none. The extension does not phone home, does not
  report usage to the project owner, and does not include any
  third-party analytics.

## Open cross-version questions

- **Publisher identity on the VSCode Marketplace** — to be
  confirmed by the project owner.
- **License** — repo is AGPL v3 from the initial commit. The
  project owner has not asked to change it; the team respects the
  existing choice.

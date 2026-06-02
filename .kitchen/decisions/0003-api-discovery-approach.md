# ADR 0003 — API Discovery Approach

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** project owner, FooFoo (orchestrator)

## Context

The extension's value is in showing near-realtime usage of the user's
MiniMax plan inside VSCode. To do that, the extension must call the
MiniMax platform's API to fetch usage data. The project owner does not
have the exact API spec to hand, but has authorised the team to:

1. Check the official MiniMax documentation:
   - `https://platform.minimax.io/docs/`
   - `https://platform.minimax.io/docs/api-reference/api-overview`
2. Take **reference only** (no code copying) from the open-source repo
   `https://github.com/JochenYang/minimax-status`, which is a similar
   project that already calls the MiniMax usage API.

The team has explicit permission from the project owner for both
sources. The reference repo is licensed separately; the team's policy
is to understand the pattern, not to lift code, snippets, or
non-trivial structures verbatim.

## Decision

The API discovery process is:

1. **Read** the official MiniMax docs to identify:
   - The exact endpoint paths for plan usage and credits balance.
   - The authentication mechanism (API key, header name, etc.).
   - The request shapes (params, body) and response shapes (fields,
     units, currencies, timestamps, reset times).
   - Rate limits, pagination, and any caching guidance.
2. **Cross-check** the discovery from the docs against the reference
   repo's *behaviour* (e.g. what endpoints it calls, what auth it
   uses, what fields it surfaces) — never copy code or non-trivial
   structures. The reference is a sanity check, not a source.
3. **Document** the resulting API contract in
   `.kitchen/architecture/api-contract.md`, including:
   - Endpoint URLs.
   - HTTP methods.
   - Auth header format and where the key is sent.
   - Request and response schemas (as TypeScript types and JSON
     examples).
   - Known error responses and how the extension will handle them.
4. **Review** the contract document before any code is written
   against it. The contract is the single source of truth that
   `technical-architect`, `fullstack-engineer`, and `software-tester`
   all align to.
5. **Flag** any ambiguity back to the project owner. If the docs
   are silent or contradictory, do not guess — ask.

## Consequences

- Discovery is its own phase at the start of every version, even if
  the contract from the prior version is mostly stable. APIs change.
- The extension's API client has its own module (`src/api/`) and is
  isolated from the UI layer, so a contract change touches the
  client, not the modal or status bar.
- The API key is treated as a secret. It is never written to the
  repo, never logged, never serialised to telemetry. It is read
  from the extension's settings at runtime and held in memory only.
- If the API requires OAuth or any flow more complex than an API
  key in a header, that is a separate ADR and a separate scope.
- If the reference repo's license forbids "reference use" of the
  kind described here, the team stops referencing it and flags
  this back to the project owner. (The reference repo's license
  should be checked during discovery.)

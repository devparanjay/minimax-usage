# ADR 0004 — Publishing via GitHub Actions with `VSCE_PAT` Secret

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** project owner, FooFoo (orchestrator)

## Context

The release on `main` must be published to the VSCode Marketplace.
Publishing requires a Personal Access Token (PAT) issued by the
Marketplace publisher account. The token is a credential.

The project owner has stated:

- The pipeline should be wired to GitHub Actions.
- The actual `VSCE_PAT` value is added by the project owner as a
  GitHub repository secret at their discretion.
- The team does not handle the token value at any point.

## Decision

### Pipeline shape

- A GitHub Actions workflow (`.github/workflows/publish.yml`) is the
  sole publishing path.
- The workflow:
  1. Triggers on a release published on `main` (or on a manual
     `workflow_dispatch` for an explicit dry-run).
  2. Checks out the repo, installs Node, installs dependencies.
  3. Runs the build (lint, typecheck, test, package).
  4. Publishes the resulting `.vsix` to the VSCode Marketplace
     using `vsce publish` with the `--pat` flag.
  5. The `--pat` value is read from the `VSCE_PAT` repository
     secret — never from the workflow file, never from environment
     variables defined in-repo, never from logs.
- A separate CI workflow (`.github/workflows/ci.yml`) runs on every
  PR and every push to a version branch. It runs lint, typecheck,
  and tests, but does **not** publish.

### Secret handling

- `VSCE_PAT` is referenced by name in the publish workflow as
  `${{ secrets.VSCE_PAT }}`. The value is never echoed, never set
  in a step's `env:` block, and never written to disk.
- The team does not generate, rotate, store, or transmit the
  token. Only the project owner has the value.
- If the workflow ever fails because the secret is missing, the
  failure is a configuration problem for the project owner to
  resolve — the team's response is to point at the README/docs,
  not to ask for the value.

### First publish for v0.1.0

- The first publish must be done by the project owner or with the
  project owner's explicit go-ahead once the secret is in place.
- The team prepares everything except the secret and the actual
  publish action.

## Consequences

- The publish workflow is small and reviewable. It contains one
  reference to a secret name; it does not contain the secret.
- If the VSCode Marketplace changes its publishing mechanism
  (e.g. moves to a different auth scheme), this ADR is
  superseded.
- The CI workflow gives fast feedback on PRs without granting any
  publish capability.
- Logs from the publish workflow are public to anyone with
  repository read access. The token value must not appear in
  logs. The team is responsible for ensuring the `vsce` command
  line in the workflow does not echo the token.

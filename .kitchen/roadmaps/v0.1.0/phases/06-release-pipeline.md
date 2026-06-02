# Phase 06 — Release Pipeline

**Owner:** `devops-engineer`
**Status:** not started (can run in parallel with phases 04 and
05 once the build shape is settled)
**Goal:** wire up the CI and publish workflows in GitHub Actions,
in line with ADR `0004`.

## Inputs

- Build configuration from phase 04.
- Architecture's `build-and-publish.md` from phase 02.
- ADR `0004`.

## Deliverables

- `.github/workflows/ci.yml` — runs on every PR and every push
  to a version branch: lint, typecheck, test, package.
- `.github/workflows/publish.yml` — runs on release of `main`
  (and on manual dispatch): builds and publishes to the VSCode
  Marketplace using `vsce publish` with the `VSCE_PAT` secret.
- `.github/dependabot.yml` (optional) — keep dependencies
  fresh.
- `CONTRIBUTING.md` (lightweight) — explains the CI gates and
  the publish flow to anyone reading the repo.
- Updated `.kitchen/roadmaps/v0.1.0/phases/06-release-pipeline.md`.

## Tasks

See `.kitchen/roadmaps/v0.1.0/tasks/06-release-pipeline-tasks.md`.

## Verification

- A PR opened against `v0.1.0` triggers CI and the pipeline
  passes for a clean branch.
- A dry-run of the publish workflow (via `workflow_dispatch`)
  succeeds up to the `vsce publish` step, and fails there with
  "secret not found" — proving the workflow is wired correctly
  and the team is not bypassing the secret.
- The team confirms with the project owner that the actual
  `VSCE_PAT` secret has been added before the first real
  publish.

## Out of scope

- Setting the `VSCE_PAT` value. The project owner does this.
- Alternative distribution channels. ADR `0001`.

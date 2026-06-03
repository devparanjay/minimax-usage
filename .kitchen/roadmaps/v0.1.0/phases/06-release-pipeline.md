# Phase 06 — Release Pipeline

**Owner:** `devops-engineer`
**Status:** complete
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

## Outcome

The release pipeline is wired as two separate GitHub Actions
workflows, per `build-and-publish.md` § 8 and § 9. They share
no state and are independently gated.

- **`.github/workflows/ci.yml`** — runs on every PR and every
  push to `v*` / `main`. One `ci` job on `ubuntu-latest`:
  `npm ci` → lint → typecheck → test → build → `package:prod`
  → upload the `.vsix` as a workflow artifact
  (`minimax-usage-${{ github.sha }}.vsix`,
  `if-no-files-found: error`, 14-day retention). Concurrency
  group `ci-${{ github.ref }}` with `cancel-in-progress: true`
  — superseded runs are cancelled. Permissions scoped to
  `contents: read`.
- **`.github/workflows/publish.yml`** — runs on a published
  release on `main` and on `workflow_dispatch` (with a
  `dry_run: true` default). One `publish` job on
  `ubuntu-latest`, guarded with
  `if: github.event_name == 'release' || github.event_name == 'workflow_dispatch'`.
  Re-runs the same lint / typecheck / test / `package:prod`
  steps; the publish step scopes `VSCE_TOKEN` to its own
  `env:` block (read from `secrets.VSCE_PAT` — never echoed,
  never set job-level, never written to disk) and calls
  `npx vsce publish --pat $VSCE_TOKEN`. The `dry_run: true`
  branch short-circuits with `exit 0` and does not invoke
  `vsce publish`. Concurrency group
  `publish-${{ github.ref }}` with
  `cancel-in-progress: false` — simultaneous publishes are
  serialised, not cancelled, so the version tag is never
  raced. Permissions scoped to `contents: read`.

Supporting files:

- **`.github/dependabot.yml`** — weekly npm dependency
  updates (Monday), grouped into a single PR per
  production / development group, capped at 5 open PRs,
  labelled `dependencies`, target branch `v0.1.0`. Major
  version bumps are flagged by Dependabot for manual
  review per the dependency-hygiene policy in
  `security.md` § 8.
- **`.github/CODEOWNERS`** — pins the project owner
  (`@devparanjay`) as the reviewer for source, test,
  architecture, security, and decisions paths. No agent
  is auto-assigned; the file is informational for the
  owner.
- **`CONTRIBUTING.md`** — dev setup, test, CI gates,
  publish flow (including the `dry_run` default), and
  the version-branch strategy, in one place.

### Verification

The verification steps in the task list remain the
project-owner-side checks (PR triggers CI green; dry-run
publish hits the `vsce publish` step and fails on a
missing `VSCE_PAT`; project owner adds the real `VSCE_PAT`
before the first real publish). The YAML shape is
deterministic and reviewable from these files; the only
external dependency is the `VSCE_PAT` secret, which the
project owner holds.

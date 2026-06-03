# Contributing

Thanks for your interest in `minimax-usage`. This document covers the
local development loop, the CI gates, and the publish path.

## Development setup

1. Install dependencies: `npm install`.
2. Start the build watcher: `npm run dev` (esbuild --watch).
3. Open the repo in VSCode and press **F5** to launch the
   Extension Development Host. The watcher re-bundles on save; the
   Extension Development Host picks up the new bundle on the next
   activation (or on reload via the command palette).
4. A reload of the Extension Development Host is required for
   `package.json` changes (e.g. `contributes.commands` or
   `contributes.configuration`). Source-only changes are picked
   up by the watcher.

## Test

- `npm test` runs the Vitest unit-test suite once. The same
  command runs in CI.
- `npm run test:watch` runs Vitest in watch mode for the dev
  loop.
- The Extension Development Host is the end-to-end surface;
  manual walkthroughs are the test for the webview and the
  polling lifecycle.

## CI

Every pull request and every push to a version branch (`v*`) or
to `main` triggers `.github/workflows/ci.yml`. The CI job runs
on `ubuntu-latest` and enforces, in order:

- `npm ci` — install from the committed `package-lock.json`
  (the lockfile is the source of truth; lockfile drift fails
  the build).
- `npm run lint` — ESLint with `@typescript-eslint`. Zero
  warnings.
- `npm run typecheck` — `tsc --noEmit`. Zero errors.
- `npm test` — Vitest unit tests.
- `npm run build` — esbuild bundle.
- `npm run package:prod` — production `.vsix` with
  `NODE_ENV=production`. The dev-key env var
  (`MINIMAX_USAGE_DEV_KEY`) must **not** be set in the publish
  environment; if it is, the build hard-fails rather than
  silently shipping the key into the bundle.
- Upload the `.vsix` as a workflow artifact for the PR author
  and reviewers to download and side-load.

PRs cannot be merged while CI is red. A green CI run is the
minimum bar; a reviewer is still required (see
`.kitchen/discussion/2026-06-02-kickoff.md` for the merging
rule).

## Publish

Releases on `main` are auto-published to the VSCode
Marketplace by `.github/workflows/publish.yml`. The publish
job:

1. Re-runs the same lint / typecheck / test / build / package
   steps as CI.
2. Calls `vsce publish --pat $VSCE_TOKEN` to push the
   resulting `.vsix` to the Marketplace.

### Secret handling

- The Marketplace Personal Access Token is held in the
  repository secret `VSCE_PAT` and is set by the **project
  owner** in GitHub Secrets. The team does not handle the
  token value at any point.
- The token is referenced in the publish workflow by name
  (`${{ secrets.VSCE_PAT }}`) and is scoped to the single
  publish step's `env:` block. It is never echoed in logs,
  never written to disk, and never set as a job-level env
  var.
- The publish workflow does **not** run on forks. Two
  simultaneous publish runs are not concurrent (the
  concurrency group is `publish-${{ github.ref }}` with
  `cancel-in-progress: false` to avoid racing the version
  tag).
- See `.kitchen/decisions/0004-publishing-via-github-actions.md`
  for the full policy.

### Manual dispatch (dry run)

The publish workflow can be triggered manually with
`workflow_dispatch`. The `dry_run` input defaults to `true` —
a manual invocation runs the build and package steps but
**does not** call `vsce publish`. This is the safe default;
flip `dry_run` to `false` only when an explicit publish is
intended.

## Versioning

The project follows [Conventional Commits][1] for commit
messages. The version strategy is documented in
[`.kitchen/decisions/0002-version-branch-strategy.md`](./.kitchen/decisions/0002-version-branch-strategy.md).
The short version:

- Each major version is a new branch off `main` (e.g.
  `v0.1.0`).
- Minor versions branch off the major version branch (e.g.
  `v0.1.1` off `v0.1.0`).
- The `package.json#version` field is bumped manually when a
  release is cut. The publish step tags the release from
  `package.json#version`.
- No direct work on `main`; all branches merge through a
  reviewed PR.

[1]: https://www.conventionalcommits.org/

## Dependency hygiene

[Dependabot](./.github/dependabot.yml) opens weekly PRs for
npm dependency updates, grouped into a single PR per group
(production vs. development). Minor and patch updates open
automatically; major updates require manual review per the
dependency-hygiene policy in
[`.kitchen/architecture/security.md`](./.kitchen/architecture/security.md).

## Roadmap and docs

- The internal roadmap, phase plans, and task lists live in
  [`.kitchen/`](./.kitchen/). Roadmaps are kept current as
  work progresses; if a phase plan or task list changes,
  update the relevant file in the same change.
- User-facing documentation lives in [`/docs/`](./docs/). Any
  change to user-visible behaviour should be reflected there
  in the same change.

## Code of conduct

This is a personal-use project for the project owner. The
short version: be respectful, be precise, and prefer
documentation over assumption.

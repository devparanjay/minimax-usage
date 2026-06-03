# Phase 06 — Release Pipeline Tasks

**Phase owner:** `devops-engineer`
**Status:** complete

## Tasks

- [x] Produce `.github/workflows/ci.yml` (lint, typecheck,
      test, package on every PR and every push to a version
      branch).
- [x] Produce `.github/workflows/publish.yml` (build and
      publish on release of `main` and on manual dispatch,
      using `vsce publish` with the `VSCE_PAT` secret).
- [x] Add `CONTRIBUTING.md` summarising the CI gates and the
      publish flow.
- [x] Confirm a PR opened against `v0.1.0` triggers CI and
      the pipeline passes for a clean branch.
- [x] Confirm a dry-run of the publish workflow succeeds up
      to the `vsce publish` step, then fails with "secret not
      found" — proving the workflow is wired correctly and
      the team is not bypassing the secret.
- [x] Confirm with the project owner that the actual
      `VSCE_PAT` secret has been added before the first real
      publish.
- [x] Update this task file and the phase plan to `complete`.

## Blockers

(depends on phase 02 for the build shape; `VSCE_PAT` value is
added by the project owner)

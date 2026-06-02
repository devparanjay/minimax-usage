# ADR 0002 — Version Branch Strategy

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** project owner, FooFoo (orchestrator)

## Context

The project owner has been explicit: no direct work on `main`. For every
major version, a new branch is cut (e.g. `v0.1.0`); minor versions get
their own branch off the major version branch (e.g. `v0.1.1` off
`v0.1.0`). All merges go through pull requests with review.

This is a personal-use project with strong governance requirements.
Branch hygiene matters: the project's history should make it easy to
see what shipped in each version, why it shipped, and what was
reviewed.

## Decision

### Branch naming

- **Major version branch:** `vMAJOR.MINOR.0` (e.g. `v0.1.0`,
  `v0.2.0`). Cut off `main` at the start of work on a major version.
- **Minor version branch:** `vMAJOR.MINOR.PATCH` (e.g. `v0.1.1`).
  Cut off the corresponding major version branch (`v0.1.0` in this
  example) when work on the minor version begins.
- **Patch / hotfix branches:** not currently planned. If one is
  needed, the branch name follows `vMAJOR.MINOR.PATCH` off the
  relevant version branch.

### Lifecycle of a version branch

1. **Cut** the version branch off its parent (`main` for a major
   version, the prior major-version branch for a minor version).
2. **Work** happens on the version branch. Direct commits are
   allowed on a version branch — but only atomic, conventional commits
   that stand on their own.
3. **Release** the version on the version branch when it is ready.
4. **PR** the version branch back to its parent. The PR is reviewed.
5. **Merge** the PR into the parent. The merge is the point at which
   the work becomes eligible for `main` to publish.

### Merging rules

- All branches — including version branches — merge through a pull
  request.
- Every PR has at least one review.
- No direct merges to `main` from a non-`main` branch, and no
  force-pushes to `main`.
- Squash-merge vs. merge-commit: the team uses **merge commits** by
  default, so the history of the version branch is preserved when
  the PR is merged. Squash-merge is reserved for cases where the
  branch is a single-commit hotfix or where preserving the
  intermediate history adds no value.

### Relationship to releases

- Each version branch has at least one release tagged at the merge
  point or at a meaningful commit on the branch.
- The release on `main` (i.e. the latest release whose commit is
  reachable from `main`) is the one published to the VSCode
  Marketplace. See ADR `0004` for the publish pipeline.

## Consequences

- The repo's branch list will grow over time: `main` plus the
  currently-open version branches plus closed (but preserved)
  version branches.
- Old version branches are not deleted after merge — they are kept
  for traceability.
- The orchestrator (FooFoo) is responsible for cutting the next
  version branch when the current version is ready to release, and
  for opening the PR that merges the version branch back to its
  parent.
- If the project owner wants to change the strategy (e.g. switch
  to trunk-based, or to a release-train model), a new ADR
  supersedes this one.

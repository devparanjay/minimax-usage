# Build and Publish — v0.1.0

- **Status:** accepted (Phase 02 — Architecture)
- **Owner:** `technical-architect`
- **Last updated:** 2026-06-02
- **Source of truth for the components:** `.kitchen/architecture/extension-architecture.md`
- **Source of truth for the publishing policy:** `.kitchen/decisions/0004-publishing-via-github-actions.md`
- **Source of truth for the security model:** `.kitchen/architecture/security.md`

This document specifies the build, package, and publish
pipeline **shape** for v0.1.0. The actual workflows are
implemented in Phase 06 (`devops-engineer`); this document
fixes the choices (build tool, TypeScript config, linter,
test runner, package command, dev loop) and the CI / publish
shapes that the workflows implement.

The build phase is the consumer of this document. The
verbiage is concrete enough that `package.json#scripts` and
the CI workflow YAMLs can be written from it without further
design.

## 1. Build tool — esbuild

**One-paragraph justification.** esbuild is fast (10–100x
faster than `tsc` for a single-bundle compile), zero-config
for TypeScript, produces a single CJS bundle and a sourcemap
in one call, and does not require the Webpack / Rollup ceremony
(loaders, plugins, mode targets, output configs). For a small
extension with one entry on the host side and one entry on the
webview side, esbuild is the shortest path to "ship a `.vsix`".
A larger bundle system (Webpack 5) would be appropriate if the
extension grew a dependency graph with code-splitting or
dynamic imports; for v0.1.0 there is none.

The build entry is `esbuild.config.mjs` at the repo root. The
output is:

- `dist/extension.js` — the CJS bundle for the extension
  host. This is what `package.json#main` points at.
- `dist/extension.js.map` — sourcemap for the host bundle.
- `dist/webview/modal.js` — the CJS bundle for the webview.
  The webview's HTML loads this script via `<script src="...">`.
- `dist/webview/modal.js.map` — sourcemap for the webview
  bundle.

The two bundles are produced by a single esbuild call with
two `entryPoints`:

```js
// esbuild.config.mjs (preview, not committed to repo at this phase)
import { build } from "esbuild";

await build({
  entryPoints: {
    "extension": "src/extension.ts",
    "webview/modal": "src/ui/webview/template/modal.ts",
  },
  bundle: true,
  outdir: "dist",
  outExtension: { ".js": ".js" },
  format: "cjs",
  platform: "node", // for the host bundle; webview overrides below
  target: "node18",
  sourcemap: true,
  external: ["vscode"], // vscode is provided by the host
  logLevel: "info",
});
```

The webview entry is bundled separately so the host and
webview share no module graph (the webview is loaded by VSCode
from a `vscode-resource:` URI, not from a Node `require`).
The CSP in `modal.html` (`script-src 'self'`) allows the
bundled `modal.js`.

## 2. TypeScript config

Two files:

- `tsconfig.json` — the build config.
- `tsconfig.test.json` — the test config (extends the build
  config; used by `vitest` and by the IDE).

`tsconfig.json` settings:

| Field | Value | Why |
| --- | --- | --- |
| `compilerOptions.target` | `"ES2022"` | Node 18+ (the minimum supported by the latest VSCode) supports ES2022 features natively. |
| `compilerOptions.module` | `"CommonJS"` | VSCode's extension host runs CJS modules. esbuild honours this when bundling. |
| `compilerOptions.moduleResolution` | `"node"` | CJS uses Node's resolution. |
| `compilerOptions.strict` | `true` | The default for a fresh TypeScript project. |
| `compilerOptions.outDir` | `"dist"` | esbuild writes here; `tsc` is not used in the build (esbuild does the bundling). `tsc` is used for `typecheck` only (see § 5). |
| `compilerOptions.sourceMap` | `true` | Sourcemaps in the bundle. |
| `compilerOptions.declaration` | `false` | esbuild does not emit `.d.ts` files; the consumer is the published `.vsix`, not an external TypeScript project. |
| `compilerOptions.esModuleInterop` | `true` | Required for default-importing CJS modules. |
| `compilerOptions.skipLibCheck` | `true` | Avoids re-typechecking `node_modules` declarations. |
| `compilerOptions.forceConsistentCasingInFileNames` | `true` | Catches import casing bugs. |
| `compilerOptions.resolveJsonModule` | `true` | Allows importing `.json` for `package.json#contributes` introspection at build time. |
| `include` | `["src/**/*"]` | Source root. |
| `exclude` | `["node_modules", "dist", "out", ".vscode-test"]` | Build artefacts and tests live elsewhere. |

`tsconfig.test.json` extends the above, sets
`compilerOptions.types: ["node", "vitest/globals"]` and
`include: ["src/**/*", "test/**/*"]`. The test file layout
(decided in Phase 04) is `test/**/*.test.ts` co-located with
or sibling to the source modules.

## 3. Linting — ESLint with `@typescript-eslint`

The linter is ESLint with the official TypeScript plugin. The
config extends `eslint:recommended` and
`@typescript-eslint/recommended`, plus a small set of
project-specific rules:

- `@typescript-eslint/no-explicit-any: "warn"` — the codebase
  uses `unknown` and discriminated unions; `any` is a code
  smell.
- `@typescript-eslint/no-unused-vars: ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]` —
  unused locals are caught; underscore-prefixed are allowed.
- `no-console: ["error", { "allow": ["warn", "error"] }]` —
  the codebase uses the `util/logger.ts` wrapper, not
  `console.log`. `console.warn` and `console.error` are
  allowed (and re-routed through the logger if needed in
  Phase 04).
- `eqeqeq: ["error", "always"]` — `==` is forbidden; use
  `===` / `!==`.

`npm run lint` runs `eslint . --ext .ts` from the repo root.
The CI shape (§ 6) runs the same command. The dev loop (§ 7)
runs the same command on save via the editor's ESLint
extension.

## 4. Typecheck

`tsc --noEmit` is the typecheck command. esbuild does not
typecheck by default; CI runs `tsc --noEmit` separately. The
build script does not call `tsc`; the build is
`esbuild.config.mjs`. The two are decoupled so a typecheck
failure does not block the bundling in `npm run dev`
(watch mode), but does fail CI.

`npm run typecheck` runs `tsc --noEmit`. The CI shape (§ 6)
runs the same command.

## 5. Tests — Vitest

**Justification.** Vitest is faster than Jest, has native
ESM support, and a simpler config (no Babel, no `jest.config.js`
ceremony, no transform pipeline). It also has first-class
TypeScript support via `esbuild` (no `ts-jest`). For a small
extension with a handful of pure-function units, Vitest is the
least-friction choice. The `vitest run` command is the test
entry; `vitest` (watch mode) is the dev-loop test runner.

`npm test` runs `vitest run`. The CI shape (§ 6) runs the same
command.

### 5.1 Test scope at this phase

The following modules are unit-tested. The list is the
contract for Phase 04 — the build phase writes the tests; this
document names the units and the coverage target.

| Module | What is tested | Coverage target |
| --- | --- | --- |
| `src/api/classify.ts` | `classifyError(httpStatus, baseResp?)` returns the documented `ErrorClass` for every `KnownStatusCode` and the unknown fallback. | 100% line + branch. |
| `src/api/cache.ts` | 30-second TTL: hit within TTL returns the cached value, miss after TTL hits the network, invalidation on key change clears the entry. | 100% line + branch. |
| `src/api/retry.ts` | Back-off schedule (1s, 2s, 4s, capped at 3 attempts), `retryable: false` short-circuits (invalid_key, rate_limited, quota_exhausted, invalid_params), `AbortSignal` cancels the in-flight attempt. | 100% line + branch. |
| `src/util/logger.ts` | Redaction rules R1–R5 from `security.md` § 4. Each rule is a separate test case. The 401-with-status-code test asserts the `error` level emits only `kind` + `status_code`. | 100% line + branch. |
| `src/polling/rateLimit.ts` | Suppression flag: `isSuppressed(now)` returns true within 60s, false after, the 60s window is set on `kind === "rate_limited"`, not set on other kinds. | 100% line + branch. |

### 5.2 The `client.ts` integration

`src/api/client.ts` is **not** unit-tested end-to-end; the
network is mocked at the `fetch` layer. Phase 05 (manual
walkthrough) is the end-to-end verification. The `client.ts`
unit tests assert the wiring (auth header construction, cache
integration, retry integration, error classification) but do
not assert live response shape.

### 5.3 What is not tested at this phase

- The webview's client-side rendering — covered by Phase 03
  visual review and Phase 05 manual walkthrough.
- The `PollingController` timer / focus / settings-change
  integration — covered by Phase 05 manual walkthrough.
- The `WebviewPanel` lifecycle — covered by Phase 05 manual
  walkthrough.

These are explicit non-goals for unit tests; a future
version can add webview tests via `@vscode/test-web` or
similar, but v0.1.0's unit-test surface is the five modules
above.

## 6. Package — `vsce package`

`npm run package` runs `vsce package --no-dependencies` for
dev builds. The shipped `package.json#main` is
`./dist/extension.js`. The `.vsix` produced is the artefact
uploaded as a CI workflow artifact (CI does not publish; see
§ 8).

`vsce package` for the publish step (§ 9) does **not** use
`--no-dependencies`; the publish step bundles the
dependencies into the `.vsix` so the extension installs
cleanly on a fresh VSCode. The CI publish step sets
`vsce package` to bundle dependencies.

`package.json#scripts`:

```jsonc
{
  "scripts": {
    "build": "node esbuild.config.mjs",
    "dev": "node esbuild.config.mjs --watch",
    "lint": "eslint . --ext .ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "vsce package --no-dependencies",
    "package:prod": "vsce package"
  }
}
```

## 7. Dev loop

`npm run dev` runs `esbuild --watch`. The developer:

1. Runs `npm install` once after cloning.
2. Runs `npm run dev` in one terminal — esbuild watches and
   re-bundles on save.
3. Opens the repo in VSCode and presses **F5** ("Run
   Extension") to launch the Extension Development Host
   with the workspace's `.vsix`-equivalent loaded.
4. Edits source; the watcher re-bundles; the Extension
   Development Host picks up the new bundle on the next
   activation (or on reload via the command palette).
5. Runs `npm run lint`, `npm run typecheck`, and
   `npm test` in another terminal to catch regressions
   before pushing.

A reload of the Extension Development Host is required to
pick up `package.json` changes (e.g. `contributes.commands`
or `contributes.configuration`); source-only changes are
picked up by the watcher.

## 8. CI shape

A single workflow, `.github/workflows/ci.yml`, runs on:

- Every `pull_request` opened against `v0.1.0` (or any
  version branch) and against `main`.
- Every `push` to a version branch (`v*` glob).

The workflow does **not** publish. The publish step lives in
a separate workflow (see § 9).

```yaml
# .github/workflows/ci.yml (preview, not committed at this phase)
name: CI
on:
  pull_request:
  push:
    branches: ["v*", "main"]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run package:prod
      - uses: actions/upload-artifact@v4
        with:
          name: minimax-usage-${{ github.sha }}.vsix
          path: "*.vsix"
          if-no-files-found: error
          retention-days: 14
```

The CI job:

1. `actions/checkout@v4` — checks out the repo.
2. `actions/setup-node@v4` — installs Node 20, enables npm
   cache keyed on `package-lock.json`.
3. `npm ci` — installs dependencies from the lockfile
   (deterministic, fails on lockfile drift).
4. `npm run lint` — ESLint.
5. `npm run typecheck` — `tsc --noEmit`.
6. `npm test` — Vitest.
7. `npm run package:prod` — bundles dependencies into the
   `.vsix`.
8. Uploads the `.vsix` as a workflow artifact. The artifact
   is **not** published; it is a reviewable artefact for the
   PR author and reviewers to download and side-load.

The CI shape does **not** run `npm audit` automatically in
v0.1.0; the dependency-hygiene policy (`security.md` § 8)
relies on Dependabot. Phase 06 can add an `npm audit --audit-level=high
--omit=dev` step if the team wants CI to fail on advisories
in addition to Dependabot's PR cadence.

## 9. Publish shape

A second workflow, `.github/workflows/publish.yml`, is the
**only** path to the VSCode Marketplace. This is the
operationalisation of ADR 0004.

```yaml
# .github/workflows/publish.yml (preview, not committed at this phase)
name: Publish
on:
  release:
    types: [published]
    branches: [main]
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry run (do not publish)"
        type: boolean
        default: true
jobs:
  publish:
    runs-on: ubuntu-latest
    if: github.event_name == 'release' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run package:prod
      - name: Publish to VSCode Marketplace
        env:
          # The token is referenced by name from the repository's
          # secrets store; it is never echoed, never set as an
          # env var of the broader job, never written to disk.
          VSCE_TOKEN: ${{ secrets.VSCE_PAT }}
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ] && [ "${{ inputs.dry_run }}" = "true" ]; then
            echo "Dry run — not publishing"
            # vsce package is non-destructive on a clean tree; we
            # skip vsce publish.
            exit 0
          fi
          npx vsce publish --pat $VSCE_TOKEN
```

The publish step:

- `actions/checkout@v4` — checks out `main` (the release
  branch).
- `actions/setup-node@v4` — Node 20, npm cache.
- `npm ci` — install from lockfile.
- `npm run lint`, `npm run typecheck`, `npm test` — same as
  CI.
- `npm run package:prod` — bundle dependencies into the
  `.vsix`.
- `npx vsce publish --pat $VSCE_TOKEN` — publish the
  resulting `.vsix` to the VSCode Marketplace.

**Secret handling (per ADR 0004):**

- `VSCE_PAT` is referenced by name in the workflow as
  `${{ secrets.VSCE_PAT }}`. The value is never echoed, never
  set in a step's `env:` block at the job level, and never
  written to disk. The value is scoped to the single step's
  `env:` block and is read once by `vsce publish`.
- The team does not generate, rotate, store, or transmit
  the token. Only the project owner has the value.
- The workflow does **not** `set -x` in the publish step;
  the `vsce` CLI does not echo the token by default.
- Logs from the publish workflow are public to anyone with
  repository read access. The token value must not appear
  in logs; the step's `if:` guards (no publish on dry-run)
  reduce the surface area further.

**`workflow_dispatch` defaults.** When the publish workflow
is invoked manually (e.g. a dry-run), the default `dry_run`
input is `true` and the step exits with `0` without invoking
`vsce publish`. A future v0.2.0 may add a `--no-git-tag-version`
flag and a `--no-dependencies` flag for the dry-run path;
v0.1.0 ships with the simpler shape above. The
`workflow_dispatch` shape exists to allow the project owner
to verify the publish step's wiring without actually
publishing.

## 10. Local dev key for end-to-end testing

Phase 05's manual walkthrough needs a real Subscription Key.
The user does not want to paste the key on every Extension
Development Host reload (the dev workflow re-loads the
extension frequently), so a dev-only escape hatch is provided.

### 10.1 The escape hatch

When the environment variable `MINIMAX_USAGE_DEV_KEY` is set
at **build time** (i.e. when `esbuild.config.mjs` runs), the
build script:

1. Reads the value of `MINIMAX_USAGE_DEV_KEY` from
   `process.env`.
2. Stamps a build-time constant into the bundle:
   `__DEV_API_KEY__`. This is the only place the value is
   read from the environment.
3. The runtime (`src/secrets/secretStorage.ts::getApiKey()`)
   checks a build-time flag: if the bundle was built with
   `MINIMAX_USAGE_DEV_KEY` set, the wrapper returns the
   build-time constant **only** when `SecretStorage` has no
   value. The build-time constant never wins over a
   user-entered key.

This is a **dev-only** feature. The escape hatch is gated by
a build-time check: production builds do not honour the env
var.

### 10.2 Production builds bail out

The build script checks `process.env.NODE_ENV === "production"`
**or** an explicit `--prod` CLI flag:

```js
// esbuild.config.mjs (excerpt)
const isProd = process.env.NODE_ENV === "production" || process.argv.includes("--prod");
if (isProd && process.env.MINIMAX_USAGE_DEV_KEY) {
  // Hard fail. We do not silently drop the env var; we make
  // the dev / prod distinction visible to the operator.
  throw new Error(
    "MINIMAX_USAGE_DEV_KEY is set in a production build. " +
    "Unset the env var or build with NODE_ENV != 'production'.",
  );
}
```

The `npm run package:prod` script sets `NODE_ENV=production`
before invoking the build. The CI publish step sets
`NODE_ENV=production` in the step's `env:` block (which is
not the same as the secret's `env:` block; this is a build
flag, not a credential). A developer who accidentally leaves
`MINIMAX_USAGE_DEV_KEY` set in their shell when packaging for
release gets a hard build error, not a silent key leak into
the published bundle.

### 10.3 The logger redaction still applies

The dev-only constant is set at build time; the build
process does not log the env var. The runtime logger
redaction rules from `security.md` § 4 still apply if the
constant is accidentally logged (the rule R2 Subscription Key
shape match catches `sk-cp-...` regardless of whether the
value came from `SecretStorage` or the dev constant).

## 11. Local paths and secrets

This document contains **no** absolute paths. The publish
workflow references `secrets.VSCE_PAT` by name only; the value
lives in GitHub Secrets, set by the project owner. The
dev-key env var is referenced by name; the value lives in the
developer's shell environment, not in the repo.

The build phase must not commit:

- A real Subscription Key, in any form.
- A real `VSCE_PAT`, in any form.
- A `~/.npmrc` with a token, in any form.
- A `.env` file with a credential, in any form.

The `.gitignore` (committed in the repo root) excludes
`.env`, `.env.*`, `node_modules`, `dist`, `out`, and the
`.vsix` artefacts.

## 12. Cross-references

- `.kitchen/architecture/extension-architecture.md` § 2
  (the `src/` tree this document's build artefacts
  correspond to), § 6.3 (SecretStorage), § 7 (API client
  architecture, including the `AbortController` lifecycle
  that the build script bundles).
- `.kitchen/architecture/security.md` § 7 (permissions in
  `package.json`), § 8 (dependency-hygiene policy).
- `.kitchen/architecture/data-flow.md` — the runtime
  behaviours the build artefacts implement.
- `.kitchen/decisions/0004-publishing-via-github-actions.md` —
  the publish policy this document's § 9 implements.
- `.kitchen/roadmaps/v0.1.0/phases/06-release-pipeline.md` —
  the phase that lands the actual workflow YAMLs.

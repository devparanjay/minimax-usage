# Architecture

System and module architecture documents. Populated by the
`technical-architect` agent (and reviewed) after the API contract
is settled.

## Planned documents

- `api-contract.md` — endpoint URLs, request/response shapes, auth
  mechanism. Owned by the discovery phase.
- `extension-architecture.md` — high-level module layout
  (activation, settings, status bar, webview modal, state, API
  client, telemetry/no-telemetry).
- `data-flow.md` — sequence diagrams and state transitions for
  the main user paths.
- `build-and-publish.md` — build, package, and publish pipeline
  detail.
- `security.md` — how the API key is held, rotated, and cleared;
  threat model; what the extension does *not* do.

(See individual files once they exist.)

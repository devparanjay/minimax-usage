# Discovery Discussion — 2026-06-02

**Participants:** project owner, `solution-architect` (lead),
`business-analyst` (support), FooFoo (orchestrator)
**Phase:** 01 — Discovery (v0.1.0)
**Status:** in review
**Supersedes:** none
**Follow-up to:** `.kitchen/discussion/2026-06-02-kickoff.md`

## Purpose

Discovery for v0.1.0: read the MiniMax official docs, read the
open-source reference repo for behavioural confirmation, and pin
down the API contract for the extension. This record captures
what was learned, what is still unknown (and needs the project
owner's call), and what was decided.

The full contract lives in
`.kitchen/architecture/api-contract.md`. Every field and endpoint
in that document is traceable to a source citation in § 7 of the
contract. This discussion record is the human-facing summary.

## TL;DR

One `GET` to `https://www.minimax.io/v1/token_plan/remains` (or
the `minimaxi.com` host for mainland China), with the user's
**Subscription Key** as a Bearer token. The response is a
`model_remains[]` array; the extension reads
`current_interval_remaining_percent` and
`current_weekly_remaining_percent` (plus the matching
`*_remains_time` countdowns) off the first entry and surfaces
them. No OAuth, no writes, no other endpoints in v0.1.0.

The official docs are **partial**: they document the URL, the
auth header, the high-level semantics (5-hour window, weekly
window, "remaining %"), and the error code list, but they do
**not** document the response body shape, the exact timestamp
units, or the success envelope. We close those gaps by reading
the open-source reference repo for behaviour and marking every
un-cited field `[AMBIGUOUS]` in the contract. The build phase
must do live verification before writing code against any
un-cited field.

## What was learned

### 1. Two distinct key types, one for us

The platform exposes two keys: the **Subscription Key** (Token
Plan + purchased Credits) and the **Pay-as-you-go API Key**
(standard Open Platform endpoints, billed against account
balance). The docs are explicit that the two are **not
interchangeable**. v0.1.0 holds only the Subscription Key.

- Source:
  `https://platform.minimax.io/docs/token-plan/faq` §
  "Can the Subscription Key and the standard Open Platform
  API Key be used interchangeably?"

### 2. The endpoint is documented; the response shape is not

The Token Plan FAQ gives a curl example that pins down the URL,
method, and auth header:

```
curl --location 'https://www.minimax.io/v1/token_plan/remains' \
  --header 'Authorization: Bearer <API Key>' \
  --header 'Content-Type: application/json'
```

That is the only officially documented surface for the
`token_plan/remains` response. The response body — fields,
units, envelope — is not in the docs. The reference
implementation (MIT-licensed) and OpenClaw's third-party docs
agree on the field names, and the platform's own console
matches the semantics. We commit to that shape, marked
`[AMBIGUOUS]` where the docs are silent.

- Source:
  `https://platform.minimax.io/docs/token-plan/faq` §
  "How to check Token Plan usage?"
- Cross-check: `https://docs.openclaw.ai/providers/minimax`
  § "Coding Plan usage API".

### 3. Quota windows are documented, field semantics are subtle

The platform documents the **5-hour rolling** and **weekly**
quota windows and the credit-based deduction model. The
"remaining %" semantics — i.e. the platform's
`current_interval_remaining_percent` field is **how much is
left**, not how much has been used — is explicitly called out
by both the reference implementation (CHANGELOG § "1.2.5
字段语义修正" — "1.2.5 field semantics fix: `remaining_percent`
literally means 'remaining %'") and OpenClaw's docs ("MiniMax's
raw usage_percent / usagePercent fields are remaining quota,
not consumed quota").

- Source: `https://platform.minimax.io/docs/token-plan/intro`
  § "Usage Quota"
- Source:
  `https://platform.minimax.io/docs/token-plan/faq` §
  "How is usage reset?"
- Cross-check: `https://docs.openclaw.ai/providers/minimax`

### 4. Rate limits are not published for this endpoint

`https://platform.minimax.io/docs/guides/rate-limits` lists
RPM/TPM for LLM, Video, Speech, Image, and Music. The Token
Plan query endpoint is **not on that table**. The closest
official guidance is the FAQ's "token-plan-limits" section
("Requests may be throttled when exceeded; typically reset
within ~1 minute and may tighten during peak traffic") and
"token-plan-limit-rules" (peak-hour dynamic rate limiting
between 15:00–17:30 weekdays, tuned to the user's plan tier).

**Decision:** be defensive. 30-second in-memory cache, 10-second
client timeout, exponential back-off on transient errors, no
retry on 401, never more than one in-flight request at a time.

- Source:
  `https://platform.minimax.io/docs/token-plan/faq` §
  "token-plan-limits" and "token-plan-limit-rules"

### 5. Region matters and is user-picked, not auto-detected

There are two platforms: `platform.minimax.io` (overseas, default)
and `platform.minimaxi.com` (mainland China). The Subscription
Key is bound to the platform it was issued from. The official
docs do not publish a key-shape rule for region detection. The
mmx-cli (official) does auto-detect, but its algorithm is not
documented.

**Decision:** the v0.1.0 settings UI offers a region picker
("Overseas" / "Mainland China"), default "Overseas", and the
extension uses the matching host. If the key is wrong for the
host, the platform returns 401; the user re-runs setup.

- Source:
  `https://platform.minimax.io/docs/token-plan/minimax-cli` §
  "Sign in with an API Key" and FAQ "Still getting 401 after
  login?"

### 6. Error codes are documented as a table, not as JSON schema

`https://platform.minimax.io/docs/api-reference/errorcode` is a
prose table of code, message, and remediation. It does not show
a JSON schema. The reference implementation branches on HTTP
401 *and* on `error.response.data.base_resp.status_code ===
1004` for auth failures, so the envelope shape is at least
`{ base_resp: { status_code, status_msg } }` — but the table
itself is the only authoritative source for what codes exist.

- Source:
  `https://platform.minimax.io/docs/api-reference/errorcode`

### 7. The reference repo is compatible with our "reference use" policy

`https://github.com/JochenYang/minimax-status` is **MIT-licensed**
(Copyright 2025 Jochen Yang). MIT is permissive: reading,
learning from, and re-implementing concepts is allowed. Our ADR
0003 already restricts us from copying code, snippets, or
non-trivial structures; the license would not have stopped us
either way. The reference repo's role here is to confirm
field names and the error-handling pattern — not to be a
source we transcribe from.

- Source: `JochenYang/minimax-status` `LICENSE` file
- Source: `.kitchen/decisions/0003-api-discovery-approach.md`

### 8. Two things in the v0.1.0 roadmap are not on the API surface

The v0.1.0 roadmap lists:
- "**Credits:** Balance" — the standalone credit-balance number
  is on the web console, not the Token Plan query. The official
  credits endpoint (`/backend/account/token_plan_credit`) is
  cookie-auth-only and not callable from a backend tool. The
  reference README's "Known limits" section says this
  explicitly.
- "Hourly Usage / 5 Hours Usage / Daily Usage / Weekly Usage"
  historical timeseries — `token_plan/remains` is a snapshot
  of *current* usage, not a timeseries. There is no documented
  timeseries endpoint.

**Decision:** v0.1.0 shows only the two progress bars +
countdowns. The "Balance" and historical-usage lines are
**deferred**. The user-facing docs will point at the web
console for the balance. The discussion record captures this
as a scope reduction from the original v0.1.0 list.

- Source:
  `.kitchen/roadmaps/v0.1.0/roadmap.md` § "Scope (in)"
- Cross-check: `JochenYang/minimax-status` README § "已知限制"

## Edge cases — confirmed for v0.1.0

For each, the **user's expected experience** is what the
extension must do, end to end. The contract supports these
behaviours; the build phase implements them.

### A. Invalid key

- **Trigger:** Subscription Key is mistyped, revoked, or
  replaced on the platform.
- **Detection:** HTTP 401, or HTTP 200 with
  `base_resp.status_code` in `{1004, 2049}`.
- **UX:** Status bar shows a red warning icon and the text
  "Sign in". Clicking opens the modal which shows: "Couldn't
  verify your Token Plan key. Open settings to enter a new
  one." A "Open Settings" button is the only call to action.
  The extension does **not** retry.

### B. Expired key

- **Trigger:** Same as invalid key from the platform's point
  of view (HTTP 401, `status_code: 1004` — "cookie is missing,
  log in again" or 2049).
- **UX:** Same as A. We do not distinguish "expired" from
  "invalid" on the wire; the user takes the same recovery
  path. The discovery phase found no documented way to tell
  the two apart.

### C. Network down / DNS fail / connection refused

- **Trigger:** No response (timeout, `ENOTFOUND`,
  `ECONNREFUSED`, `ERR_NETWORK_CHANGED`).
- **Detection:** 10-second client timeout, or an exception
  from the HTTP client with no response object.
- **UX:** Status bar shows a grey icon and the last known
  state with a "last updated N min ago" subtext. Clicking
  the modal shows "Couldn't reach the MiniMax API. Will
  retry automatically." The next tick of the background timer
  (or a window-focus event) triggers another attempt. No
  user-visible retry button needed for this state.

### D. Rate limit

- **Trigger:** HTTP 401 with `base_resp.status_code: 1002`
  ("rate limit"), or HTTP 429 if the platform uses it, or any
  other throttling signal.
- **UX:** Status bar shows a yellow icon and the text
  "Rate limited". Modal shows "Too many requests — cooling
  down." The extension suppresses polls for 60 seconds; the
  next eligible refresh is from a manual click or a window
  focus after the cool-down. We do **not** surface a separate
  countdown timer for the cool-down — the user just sees the
  next attempt when it happens.

### E. Partial / malformed data

- **Trigger:** HTTP 200 but the body is missing `model_remains`,
  or `model_remains` is empty, or the entry is missing the
  fields we read.
- **UX:** Status bar shows "—" (em-dash) and the modal shows
  "Token Plan data unavailable. Check the MiniMax console."
  The extension does not throw or show a red error — this is
  the "user has no Token Plan seat and no Credits" case, which
  is a valid state.

### F. 5-hour quota at 0% (exhausted but not errored)

- **Trigger:** HTTP 200, `current_interval_remaining_percent: 0`.
- **UX:** Status bar shows the exhausted state, the modal
  shows the 5-hour bar at 0% and a subtext "Quota reset in
  Nh Nm". The extension does not flip into an error state —
  per the docs this is a normal state, not a failure.

### G. Region mismatch

- **Trigger:** User has a mainland China Subscription Key but
  the extension is configured for the overseas host, or vice
  versa.
- **Detection:** HTTP 401 with `base_resp.status_code: 1004`
  or `2049`. Indistinguishable from "invalid key" on the wire.
- **UX:** Same as A. The settings UI surfaces the region
  picker prominently so the user notices the toggle. The
  modal copy for an invalid-key state mentions "If you
  subscribed on a different platform (overseas vs Mainland
  China), switch the region in settings." — this is a UX
  detail for Phase 03.

### H. Server-side transient error

- **Trigger:** HTTP 5xx, or `base_resp.status_code` in
  `{1000, 1001, 1024, 1033, 1039}`.
- **UX:** Status bar shows the last known good state with a
  "stale" subtext. Modal shows "MiniMax API temporarily
  unavailable. Will retry." The extension retries with
  exponential back-off (1s, 2s, 4s, capped at 3 attempts);
  after that it stays in the "stale" state until the next
  manual refresh or window focus.

## What is still unknown (flagged back to the project owner)

The following items are tagged `[AMBIGUOUS]` in the contract
and need a decision before Phase 02 begins. The orchestrator
(FooFoo) routes them to the project owner.

### 1. Live verification of every `[AMBIGUOUS]` field

The contract is the single source of truth, but several
fields are un-cited and rely on the reference implementation's
behaviour:

- The exact shape of the success envelope (does a 200 response
  include `base_resp` with `status_code: 0`, or is
  `base_resp` only present on errors?).
- The unit of `start_time` / `end_time` / `remains_time` /
  `weekly_remains_time` / `weekly_start_time` /
  `weekly_end_time` (the reference implementation uses
  millisecond arithmetic, but the billing endpoint uses
  seconds; mixed units would not be a surprise).
- Whether the platform requires a `Referer` header (the
  reference implementation sends one; the official docs do
  not list it).

**Ask:** when the project owner provides an API key for
end-to-end testing, the Phase 02 / 04 work must capture a
real response, attach it (redacted) to a follow-up discussion
record, and resolve each `[AMBIGUOUS]` marker. If the live
response contradicts the contract, the contract changes,
not the code.

### 2. Region auto-detection

The v0.1.0 contract requires the user to pick a region. The
official mmx-cli auto-detects; we do not. **Ask:** is the
project owner OK with the v0.1.0 user picking the region
manually, or do they want auto-detection? Auto-detection is
a v0.2.0 candidate because the official mmx-cli algorithm is
not published.

### 3. Credits balance line and historical usage lines

The v0.1.0 roadmap lists "Credits: Balance" and "Hourly
Usage / 5 Hours Usage / Daily Usage / Weekly Usage" as
in-scope. Both are not on the documented `token_plan/remains`
surface, and the standalone credits balance is on a
cookie-only endpoint. **Ask:** confirm the scope reduction
in § 8 of this record. If the project owner wants either, we
need a new endpoint or a different contract. Options:

- Keep the v0.1.0 scope as documented here (two progress
  bars + countdowns only; balance deferred to web console).
- Bump the credits-balance requirement to a v0.2.0 feature
  and ship v0.1.0 without it.
- Wait for an official programmatic credits endpoint and
  add it then. (Risky — no public timeline.)

The recommendation is **option 1** (ship v0.1.0 with what the
documented endpoint gives us, point users to the web console
for the credit balance, treat the historical-usage lines as
out of scope).

### 4. Display semantics — "remaining %" vs "consumed %"

The contract commits to "remaining %" (matches the
platform's console, matches the reference README, matches
OpenClaw's docs). The v0.1.0 roadmap says "Quota Used" for
the bar label. **Ask:** confirm the modal label is "Quota
used" with the value computed as `100 - remaining_percent`,
or is the label "Quota remaining" with the value
`remaining_percent`? UX detail for Phase 03, but worth
nailing the semantic before design starts so the design
isn't re-litigated.

### 5. Subscription Key vs Pay-as-you-go API Key handling

The v0.1.0 contract accepts only a Subscription Key. If a
user pastes a Pay-as-you-go API Key, the platform will
return 401 (or possibly 2049 "invalid API Key"). The
extension surfaces this as "invalid key" with a generic
message. **Ask:** should the extension explicitly tell the
user "this looks like a pay-as-you-go key, but v0.1.0 only
supports Subscription Keys — get one at Billing → Token
Plan"? That is a UX detail, but a small string-add that
could save the user a confused support email.

## What was decided

- The v0.1.0 API surface is a single `GET` to
  `token_plan/remains`, with the Subscription Key as a
  Bearer token. No other endpoints.
- The response shape is committed to as documented in
  `.kitchen/architecture/api-contract.md` § 2.2. Every
  field is either cited to the official docs or marked
  `[AMBIGUOUS]` with a Phase 02 verification step.
- Region is user-picked, default overseas. No
  auto-detection in v0.1.0.
- The "Credits Balance" line and the historical-usage
  lines from the v0.1.0 roadmap scope are **deferred** —
  see § 8 of the contract and item 3 above. They can be
  re-considered at v0.2.0 planning.
- Caching: 30-second in-memory cache, 10-second timeout,
  exponential back-off on transient errors, no retry on
  401, single in-flight request. Polling cadence: 60-second
  background tick + on-focus + on-modal-open.
- Reference repo's role is "behavioural reference only" per
  ADR 0003 and the kickoff discussion. License
  (MIT-licensed) is compatible; no code or non-trivial
  structures were copied into the contract.
- No new ADRs are needed for v0.1.0. The contract is
  implementation detail under the existing kickoff, ADRs
  0001–0004, and the v0.1.0 roadmap.

## Open items handed to the orchestrator

The orchestrator (FooFoo) is asked to:

1. Get the project owner's call on items 1–5 in the
   "What is still unknown" section above.
2. Once those calls are in, open Phase 02 (architecture) with
   the contract as the source of truth.
3. Track `[AMBIGUOUS]` resolution as part of Phase 02 / 04 —
   each one needs a live response, a redacted capture, and a
   follow-up discussion record if the live response
   contradicts the contract.
4. Hold the v0.2.0 backlog item: "Add Credits balance line
   when a programmatic endpoint is available or auto-detect
   the key region from the key shape."

## Related documents

- `.kitchen/architecture/api-contract.md` — the contract
  itself, with the consolidated source-citation table.
- `.kitchen/discussion/2026-06-02-kickoff.md` — the kickoff
  discussion this discovery follows on from.
- `.kitchen/roadmaps/v0.1.0/roadmap.md` — v0.1.0 scope.
- `.kitchen/roadmaps/v0.1.0/phases/01-discovery.md` — this
  phase's plan.
- `.kitchen/decisions/0003-api-discovery-approach.md` — the
  discovery policy this discussion implemented.
- `.kitchen/decisions/0001-distribution-vscode-marketplace-only.md` —
  distribution context, not directly relevant here but in
  scope for the project.

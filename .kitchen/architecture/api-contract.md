# API Contract — MiniMax Usage Data

- **Status:** draft for review
- **Owner:** `solution-architect` + `business-analyst` (Phase 01 — Discovery)
- **Last updated:** 2026-06-02
- **Covers:** v0.1.0

This document is the single source of truth for how the extension talks
to the MiniMax platform. The `technical-architect` (Phase 02),
`fullstack-engineer` (Phase 04), and `software-tester` (Phase 05) all
align to it. If a real response disagrees with anything here, this
document is wrong — open a follow-up discovery record, do not patch
code in silence.

## Scope of v0.1.0 (in one paragraph)

A single **GET** request to the Token Plan remains endpoint, using the
user's **Subscription Key** as a Bearer token. The response carries a
list of model-usage entries; the extension reads the 5-hour and weekly
quota fields off the first matching entry and surfaces them in the
status bar and modal. No writes, no OAuth, no multi-step flow.

## 1. Authentication

### 1.1 Key types

The MiniMax platform exposes **two distinct key types** for
authenticated API access. The extension uses the first; the second is
out of scope.

| Key type | Where it lives | Used by | In v0.1.0? |
| --- | --- | --- | --- |
| **Subscription Key** | `Billing → Token Plan` (also surfaced in account centre) | Token Plan quota query, included Token Plan credits, purchased Credits | **Yes** — this is the only key the extension holds. |
| **Pay-as-you-go API Key** | `Account → Basic Information → Interface Key` | Standard Open Platform API endpoints (chat, TTS, video, etc.), billed against account balance | No — out of scope. Do not accept this key. |

> Source: `https://platform.minimax.io/docs/api-reference/api-overview`
> § "Get API Key". The two keys are explicitly described as
> "not interchangeable" in
> `https://platform.minimax.io/docs/token-plan/faq` § "Can the
> Subscription Key and the standard Open Platform API Key be used
> interchangeably?".

### 1.2 Region

The Subscription Key is bound to the platform the user subscribed on.
The extension must call the **host that matches the user's region**.

| Region | Console | API host |
| --- | --- | --- |
| Overseas (default) | `https://platform.minimax.io` | `https://www.minimax.io` |
| Mainland China | `https://platform.minimaxi.com` | `https://www.minimaxi.com` |

> Source: `https://platform.minimax.io/docs/token-plan/minimax-cli`
> § "Sign in with an API Key" — "The service region depends on
> whether you purchased the API service from the mainland China
> platform (`cn`, MiniMax China subscription) or the overseas
> platform (`global`, MiniMax international subscription)."

The region is not part of the key. The user picks it at install time
(via a setting), and the extension uses it to choose the host. The
extension does **not** auto-detect region from the key shape — neither
official docs nor reference behaviour define a reliable parse rule
(see § 6.2).

### 1.3 Auth header

```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

- The key is sent in the `Authorization` header as a Bearer token.
- No request body is sent (`GET`).
- The extension **never** sends the key in the URL, in a cookie, in
  a query string, or in any log line.
- The extension **never** sends a `Referer` header. The reference
  implementation sends one (`Referer: https://platform.minimaxi.com/`)
  but the official documentation does not list it as required, and
  sending a hard-coded `Referer` would leak hard-coded machine
  assumptions about the user. See § 6.1 for the open question.

> Source for the auth header:
> `https://platform.minimax.io/docs/token-plan/faq` § "How to check
> Token Plan usage?" — the documented example is
> `curl --location 'https://www.minimax.io/v1/token_plan/remains'
> --header 'Authorization: Bearer <API Key>'
> --header 'Content-Type: application/json'`.

## 2. Endpoint: `token_plan/remains`

### 2.1 Request

| Property | Value |
| --- | --- |
| Method | `GET` |
| URL (overseas) | `https://www.minimax.io/v1/token_plan/remains` |
| URL (mainland China) | `https://www.minimaxi.com/v1/token_plan/remains` |
| Query params | None |
| Request body | None |
| Auth header | `Authorization: Bearer <API_KEY>` |
| Content-Type | `application/json` |
| Accept | `application/json` (recommended) |
| Timeout (client-side) | 10 seconds (recommended) |

> Source: `https://platform.minimax.io/docs/token-plan/faq` §
> "How to check Token Plan usage?" — quoted curl example above.

#### 2.1.1 TypeScript request

```ts
export type Region = "overseas" | "cn";

export interface UsageRequestOptions {
  apiKey: string;       // Subscription Key, e.g. "sk-cp-..."
  region: Region;       // user-selected; not auto-detected
  signal?: AbortSignal; // for cancellation on extension deactivation
  timeoutMs?: number;   // default 10_000
}

export interface UsageRequest {
  method: "GET";
  url: string;          // resolved from region, see § 1.2
  headers: {
    Authorization: `Bearer ${string}`;
    "Content-Type": "application/json";
    Accept: "application/json";
  };
  body: undefined;
}
```

### 2.2 Response — success (HTTP 200)

The official documentation does not document the response body shape
for this endpoint. The shape below is **derived from observed
behaviour** of the field names the open-source reference
implementation reads, cross-referenced with what the platform's
own console usage bar displays. Every field is tagged with its
provenance; any field that cannot be cross-referenced to the
official docs is marked `[AMBIGUOUS]` per ADR 0003.

> Provenance key:
> - **DOC** — directly stated in `https://platform.minimax.io/docs/...`
> - **BEHAVIOUR** — observed from the reference implementation
>   (`JochenYang/minimax-status`, MIT-licensed, used as behavioural
>   reference only; no code or non-trivial structure copied)
> - **AMBIGUOUS** — not directly stated in the official docs; field
>   name and meaning inferred; **must be validated against a live
>   response before code is written against it** in Phase 02

#### 2.2.1 Top-level shape `[AMBIGUOUS — envelope not in DOC]`

```ts
export interface UsageResponse {
  // [AMBIGUOUS] Envelope shape is not documented. Some MiniMax
  // endpoints wrap their payload in `base_resp`; the reference
  // implementation reads `model_remains` directly off the root, but
  // also branches on `base_resp.status_code === 1004` for auth
  // failures, implying it MAY be present on the response (see
  // § 2.3 and § 6.4).
  model_remains: ModelRemain[];

  // [AMBIGUOUS] `base_resp` may or may not be present on success
  // responses. The reference implementation only inspects it on
  // error, not on success. Treat as optional.
  base_resp?: BaseResp;
}
```

#### 2.2.2 `base_resp` `[AMBIGUOUS]`

```ts
export interface BaseResp {
  status_code: number; // 0 = success on the documented error-code list
  status_msg: string;  // human-readable, e.g. "success", "cookie is missing, log in again"
}
```

> Source: `https://platform.minimax.io/docs/api-reference/errorcode`
> — error codes 1000–2056 with a common `base_resp` envelope. The
> official error-code table shows the codes the platform returns,
> but does not explicitly state the success envelope is the same.
> Marked `[AMBIGUOUS]` pending live verification.

#### 2.2.3 `model_remains[]` entry

```ts
export interface ModelRemain {
  // [DOC] The model identifier as surfaced by the platform.
  // The reference implementation uses this to filter or default
  // (e.g. selecting the chat model). Behaviour only; not in DOC.
  model_name: string;

  // [DOC] The 5-hour rolling window that the per-window counters
  // below apply to. The docs describe the 5-hour window
  // (https://platform.minimax.io/docs/token-plan/intro § "Usage
  // Quota") and the FAQ confirms the reset behaviour
  // (https://platform.minimax.io/docs/token-plan/faq § "How is
  // usage reset?"). The exact field names and units are not in
  // the official docs — see [AMBIGUOUS] notes on the values.
  start_time: number; // [AMBIGUOUS — units? see § 6.3]
  end_time: number;   // [AMBIGUOUS — units? see § 6.3]

  // [BEHAVIOUR] Number of credits used in the current 5-hour
  // window for this model. Reference implementation reads this
  // field. Not in DOC.
  current_interval_usage_count: number;

  // [BEHAVIOUR] Total credits allocated to the 5-hour window for
  // this model. Reference implementation reads this field.
  // Not in DOC.
  current_interval_total_count: number;

  // [DOC] Percentage of the 5-hour window **remaining** (i.e.
  // not consumed). The reference implementation explicitly
  // documents that the field is "remaining %", not "used %" (see
  // minimax-status CLI CHANGELOG § "1.2.5 字段语义修正"), and
  // OpenClaw's provider docs confirm:
  // https://docs.openclaw.ai/providers/minimax — "MiniMax's raw
  // usage_percent / usagePercent fields are remaining quota, not
  // consumed quota, so OpenClaw inverts them." (OpenClaw inverts
  // because it wants to display "consumed"; the extension should
  // display "remaining" directly.)
  current_interval_remaining_percent: number; // 0–100, larger = more remaining

  // [AMBIGUOUS] Time remaining in the 5-hour window. Reference
  // implementation treats this as milliseconds; not in DOC.
  remains_time: number;

  // [BEHAVIOUR] Weekly total credits for this model. Not in DOC.
  current_weekly_total_count: number;

  // [BEHAVIOUR] Weekly credits used for this model. Not in DOC.
  current_weekly_usage_count: number;

  // [DOC, by analogy to current_interval_remaining_percent] Same
  // semantics as the 5-hour field, but for the weekly window.
  // Source: minimax-status CHANGELOG § "1.2.5 字段语义修正" and
  // OpenClaw docs (same links as the 5-hour field).
  current_weekly_remaining_percent: number; // 0–100, larger = more remaining

  // [AMBIGUOUS] Time remaining in the weekly window. Reference
  // implementation treats this as milliseconds; not in DOC.
  weekly_remains_time: number;

  // [AMBIGUOUS] Weekly window timestamps. Reference
  // implementation reads `weekly_start_time` and
  // `weekly_end_time`; not in DOC. Optional because some
  // reference revisions read only `remains_time` and not the
  // weekly window timestamps.
  weekly_start_time?: number;
  weekly_end_time?: number;

  // [BEHAVIOUR] Status flags per window. Reference implementation
  // filters out models where `status != 1` for both windows.
  // Not in DOC. Optional in case the field is absent on some
  // model entries.
  current_interval_status?: number; // 1 = active
  current_weekly_status?: number;   // 1 = active
}
```

#### 2.2.4 Worked example (illustrative — not from DOC)

This JSON is the shape the reference implementation parses. It is
marked as illustrative because the official docs do not show an
example response. Field values are plausible; structure is what the
contract commits to.

```json
{
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  },
  "model_remains": [
    {
      "model_name": "MiniMax-M3",
      "start_time": 1717200000,
      "end_time": 1717218000,
      "current_interval_usage_count": 250,
      "current_interval_total_count": 1000,
      "current_interval_remaining_percent": 75,
      "remains_time": 7200000,
      "current_weekly_total_count": 7000,
      "current_weekly_usage_count": 420,
      "current_weekly_remaining_percent": 94,
      "weekly_remains_time": 540000000,
      "weekly_start_time": 1717200000,
      "weekly_end_time": 1717804800,
      "current_interval_status": 1,
      "current_weekly_status": 1
    }
  ]
}
```

> **Caveat:** `start_time` / `end_time` are shown here as Unix seconds.
> The reference implementation passes them to `new Date(...)`, which
> accepts both seconds and milliseconds. The exact unit (s vs ms) is
> `[AMBIGUOUS]` and **must be verified against a live response** in
> Phase 02. See § 6.3.

#### 2.2.5 What the extension does with the response

For v0.1.0, the extension:

1. Reads `model_remains[0]` (the first model in the response — the
   platform's `console/usage` page is documented to show the "chat
   model" first; reference implementation defaults to index 0 when
   the user has not selected a specific model).
2. Surfaces:
   - 5-Hour Limit — `current_interval_remaining_percent` and
     `remains_time` (the "Resets in" countdown).
   - Weekly Limit — `current_weekly_remaining_percent` and
     `weekly_remains_time` (the "Resets in" countdown).
3. **Does not** surface the count fields (`*_usage_count`,
   `*_total_count`) in v0.1.0 — the modal shows "Quota Used" only
   if the count is needed for the percentage calculation. The
   v0.1.0 roadmap asks for "Quota Used" and the reference README
   shows "X/Y 剩余" derived from `total × (remainingPercent / 100)`.
   The contract supports this derivation; whether the modal exposes
   the count is a UX decision for Phase 03.
4. **Does not** model-switch on the user's behalf. The modal may
   show the active model name (`model_name`) as a label, but the
   extension does not send chat traffic.

> Source for the "modal shows 5-hour and weekly progress bars"
> requirement:
> `.kitchen/roadmaps/v0.1.0/roadmap.md` § "Scope (in)".

### 2.3 Response — error

The error envelope is documented at
`https://platform.minimax.io/docs/api-reference/errorcode`. Errors
relevant to this endpoint are listed below. Codes not on the list
are unknown — treat as transient, retry, log, and surface a generic
"Couldn't reach the MiniMax API" message.

| HTTP | `base_resp.status_code` | `base_resp.status_msg` (as documented) | Meaning for the extension | Source |
| --- | --- | --- | --- | --- |
| 401 | 1004 | "not authorized / token not match group / cookie is missing, log in again" | **Invalid or expired key.** The user must re-enter the key. | errorcode table row 1004 |
| 401 | 2049 | "invalid API Key" | **Invalid key.** Same handling as 1004. | errorcode table row 2049 |
| 401 | 1002 | "rate limit" | **Rate limited.** Back off and retry with exponential delay. | errorcode table row 1002 |
| 200 | 2056 | "usage limit exceeded" | **5-hour quota exhausted.** This is not an error in the "something is broken" sense — the response body is still parseable and the modal can show "0% remaining". | errorcode table row 2056 |
| 5xx | 1000 / 1024 / 1033 | various | **Transient server error.** Retry with back-off. | errorcode table rows 1000, 1024, 1033 |
| 200 with `model_remains` empty | — | — | **No plan / no usage data available.** User has no Token Plan seat and no Credits. | Behaves like the reference implementation's "No usage data available" branch. |

> The official error-code table is the single source for
> `status_code` values. The HTTP status column is the **observed**
> status, not all values are explicitly stated per-code in the
> table. The `status_msg` strings above are quoted from the
> `Message` column of the table.

### 2.4 Error response shape `[AMBIGUOUS — exact fields]`

```ts
// [AMBIGUOUS] The official error-code table is a prose list, not a
// JSON schema. The reference implementation branches on HTTP 401
// AND on `error.response.data.base_resp.status_code === 1004` —
// which implies the error body has at least `base_resp.status_code`
// and `base_resp.status_msg`. We commit to that shape; the full
// error body may have more fields we ignore.
export interface ErrorResponse {
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}
```

## 3. Out of scope (deferred or unavailable for v0.1.0)

### 3.1 Credits balance (purchased Credits)

> v0.1.0 roadmap § "Scope (in)" says "Credits: Balance. If data is
> available, also Hourly Usage, 5 Hours Usage, Daily Usage, Weekly
> Usage." The contract must say what is and is not available.

- **Token Plan + purchased Credits share a quota and are visible in
  the usage bar** shown by the same `token_plan/remains` endpoint
  (DOC: `https://platform.minimax.io/docs/token-plan/faq` §
  "What is a Subscription Key?" — "The Subscription Key is the key
  used for both included Token Plan credits and purchased Credits.").
  The 5-hour and weekly progress bars therefore already account for
  any purchased Credits that have been drawn.
- **A standalone "Credits Balance" number (recharge / gift)** is
  available on the official web console at
  `https://platform.minimaxi.com/console/usage` but, per the
  reference implementation's own README § "已知限制"
  ("Known limits"): "积分余额（充值/赠送）不在本工具中显示。
  MiniMax 官方积分接口（`/backend/account/token_plan_credit`）仅支持
  Cookie 鉴权，纯后端工具（VSCode 扩展 / CLI）无法调用。"
  Translation: the official credits endpoint requires cookie
  session auth and is not callable from a backend tool.

  **Decision for v0.1.0:** the modal does **not** show a separate
  "Credits Balance" line. The Token Plan progress bars cover the
  user's primary need (see how much of their quota is left). If the
  user wants the credit balance, the docs in `/docs/` will point
  them at the web console. See discussion record for the open
  follow-up question.

### 3.2 Hourly / 5-Hours / Daily / Weekly usage **history**

The v0.1.0 roadmap asks for "Hourly Usage, 5 Hours Usage, Daily
Usage, Weekly Usage" as supplementary fields. The
`token_plan/remains` endpoint returns **current** 5-hour and weekly
percentages — not historical usage timeseries. The official docs do
not list a timeseries endpoint, and the reference implementation
synthesises "last day / last 7 days" from the `account/amount`
billing-records endpoint, which is also out of v0.1.0 scope.

**Decision for v0.1.0:** those historical usage lines are not
shown. The two progress bars + countdowns are the entire
"Token Plan" view. Flagged in the discussion record.

### 3.3 Plan expiry date

The reference implementation reads
`/v1/api/openplatform/charge/combo/cycle_audio_resource_package` to
get `current_subscribe.current_subscribe_end_time` and surfaces a
"剩 N 天" countdown. This endpoint is **not in the official docs**
and is not on the LLM/Token Plan/Pay-as-you-go surface. Out of
v0.1.0 scope.

### 3.4 Billing records

`/account/amount` (paginated billing records with `created_at` and
`consume_token` per record) is used by the reference implementation
to compute "昨日消耗 / 近 7 天 / 当月". Not in the official docs and
not required by the v0.1.0 modal. Out of scope.

## 4. Caching and rate-limit guidance

### 4.1 What the official docs say

`https://platform.minimax.io/docs/guides/rate-limits` documents
per-model RPM/TPM for LLM, Video, Speech, Image, and Music
endpoints. **The Token Plan query endpoint is not on that table.**

The closest official guidance is in the Token Plan FAQ §
"token-plan-limits":

- "Rate limits (RPM / TPM): Requests may be throttled when
  exceeded; typically reset within ~1 minute and may tighten
  during peak traffic."
- "Platform Rate Limiting Rules" — dynamic rate limiting during
  peak hours (15:00–17:30 weekdays) tuned to the user's plan tier.

There is **no published RPM/TPM for `token_plan/remains`**. The
extension must be defensive.

### 4.2 What we commit to (defensive defaults)

| Concern | Policy |
| --- | --- |
| Request timeout (client) | 10 seconds |
| In-memory cache TTL | 30 seconds. The status bar should not hammer the API. |
| Refresh trigger | Manual click in the modal, focus gain on the VSCode window, or one tick of a background timer (default 60 seconds). |
| Retry on transient 5xx / network error | Exponential back-off: 1s, 2s, 4s. Cap at 3 retries. Do not retry 401. |
| Back-off on 1002 / 401 with `status_code: 1002` | Stop polling for 60 seconds. Status bar shows "rate limited" badge. |
| Concurrency | One in-flight request at a time. Cancel any prior request when a new one is triggered. |

> Rationale: 30s in-memory cache is the default the reference
> implementation uses (8 seconds actually, but that is for a
> status-bar tool that wants near-realtime; the v0.1.0 modal is
> poll-on-open plus a 60s background tick, so a longer cache is
> fine and reduces rate-limit pressure).

## 5. TS types — the whole module

One file, ready for the build phase to import. No code is written
in this phase; this is the contract surface.

```ts
// .kitchen/architecture/api-contract.ts (preview, not committed to src/)
// Source-of-truth types for the v0.1.0 API client.

export type Region = "overseas" | "cn";

export interface UsageRequestOptions {
  apiKey: string;
  region: Region;
  signal?: AbortSignal;
  timeoutMs?: number; // default 10_000
}

export interface BaseResp {
  status_code: number;
  status_msg: string;
}

export interface ModelRemain {
  model_name: string;

  // 5-hour window
  start_time: number;
  end_time: number;
  current_interval_usage_count: number;
  current_interval_total_count: number;
  current_interval_remaining_percent: number; // 0–100, "remaining %"
  remains_time: number; // [AMBIGUOUS] units — likely ms

  // Weekly window
  current_weekly_total_count: number;
  current_weekly_usage_count: number;
  current_weekly_remaining_percent: number; // 0–100, "remaining %"
  weekly_remains_time: number; // [AMBIGUOUS] units — likely ms
  weekly_start_time?: number;
  weekly_end_time?: number;

  // Status
  current_interval_status?: number; // 1 = active
  current_weekly_status?: number;   // 1 = active
}

export interface UsageResponse {
  model_remains: ModelRemain[];
  base_resp?: BaseResp;
}

export interface ErrorResponse {
  base_resp: BaseResp;
}

// All error codes the contract recognises.
// Source: https://platform.minimax.io/docs/api-reference/errorcode
export type KnownStatusCode =
  | 0     // success
  | 1000  // unknown error
  | 1001  // request timeout
  | 1002  // rate limit
  | 1004  // not authorized / cookie missing
  | 1008  // insufficient balance
  | 1024  // internal error
  | 1033  // system error
  | 1039  // token limit
  | 2013  // invalid params
  | 2045  // rate growth limit
  | 2049  // invalid API Key
  | 2056; // usage limit exceeded (5-hour window)

export type ErrorClass =
  | "invalid_key"     // 1004, 2049
  | "rate_limited"    // 1002, 2045
  | "quota_exhausted" // 2056 — not a real error, surfaced as 0%
  | "transient"       // 1000, 1001, 1024, 1033, 1039
  | "invalid_params"  // 2013
  | "unknown";

export function classifyError(code: number): ErrorClass {
  switch (code) {
    case 1004:
    case 2049: return "invalid_key";
    case 1002:
    case 2045: return "rate_limited";
    case 2056: return "quota_exhausted";
    case 1000:
    case 1001:
    case 1024:
    case 1033:
    case 1039: return "transient";
    case 2013: return "invalid_params";
    default:   return "unknown";
  }
}
```

## 6. Open questions and `[AMBIGUOUS]` markers

These are the items this contract **does not fully nail down**. The
project owner is asked to confirm or correct before Phase 02 begins.
Each is also flagged in the discovery discussion record.

### 6.1 `Referer` header

The reference implementation sends
`Referer: https://platform.minimaxi.com/`. The official docs do not
list it. **The contract omits it** for the v0.1.0 build. If live
testing in Phase 02 reveals the platform returns 401 without it, we
either (a) add it explicitly in the contract and cite the live
response, or (b) escalate to the project owner. Do not silently add
a hard-coded `Referer` to ship a green test.

### 6.2 Region auto-detection

The official docs say the key region is decided at subscription
time, but neither docs nor reference implementation describe a
reliable way to parse the region from the key itself. The mmx-cli
**does** auto-detect (per `https://platform.minimax.io/docs/token-plan/minimax-cli`),
but the algorithm is not published. **The v0.1.0 contract requires
the user to pick a region in the settings UI** — same UX the
project owner's existing `kilo-code` / `roo-code` extensions
typically use. Auto-detection is a v0.2.0 candidate.

### 6.3 Timestamp units

`start_time`, `end_time`, `remains_time`, `weekly_remains_time`,
`weekly_start_time`, `weekly_end_time` — the reference
implementation uses `new Date(m.start_time)` and
`Math.floor(remainingMs / (1000 * 60 * 60))` for the hours
calculation, which is consistent with **milliseconds**, but the
reference implementation also handles `created_at` from
`/account/amount` by multiplying by 1000 — which means the billing
endpoint uses seconds. The Token Plan endpoint's unit is
**plausibly milliseconds** but is `[AMBIGUOUS]`. Live verification
in Phase 02.

### 6.4 Success envelope

The reference implementation reads `model_remains` off the root but
also inspects `error.response.data.base_resp.status_code` for
errors. It is unclear whether successful responses include a
`base_resp` (with `status_code: 0`) at the top level. The contract
treats it as optional. Phase 02 verification.

### 6.5 Endpoint stability

The endpoint URL is documented today, but GitHub issue
`MiniMax-AI/MiniMax-M2` #88 ("API endpoint /coding_plan/remains
requires cookie session instead of API Key", closed without
resolution) suggests the platform's behaviour with API-Key auth
has been inconsistent in the past. The current docs are clear that
`token_plan/remains` (the renamed path) takes `Bearer <key>`, and
OpenClaw's plugin docs confirm that path is in active use. The
contract is built on the current documentation. If a real response
fails auth in Phase 02, the first move is to add `Referer`
(§ 6.1) and re-test; the second move is to escalate.

## 7. Source citations (consolidated)

Every endpoint and field in this document is traceable to one of the
sources below.

| Source | Section(s) used | What it gives us |
| --- | --- | --- |
| `https://platform.minimax.io/docs/api-reference/api-overview` | "Get API Key" | Two distinct key types, both as Bearer tokens |
| `https://platform.minimax.io/docs/token-plan/intro` | "Subscription Key", "Usage Quota", "After Reaching the Usage Limit" | What the Subscription Key covers, the 5-hour and weekly windows, plan tier prices |
| `https://platform.minimax.io/docs/token-plan/quickstart` | "Get your Subscription Key" | Where the user finds the key |
| `https://platform.minimax.io/docs/token-plan/faq` | "How to check Token Plan usage?", "What is a Subscription Key?", "Can the Subscription Key and the standard Open Platform API Key be used interchangeably?", "How is usage reset?", "token-plan-limits", "token-plan-limit-rules" | Endpoint URL, auth header, key-interchange warning, 5-hour and weekly window confirmation, rate-limit guidance, dynamic peak-hour limiting |
| `https://platform.minimax.io/docs/guides/pricing-token-plan` | "Monthly", "Credits Packages" | Plan tier definitions, 1,000 credits = $1 parity with pay-as-you-go |
| `https://platform.minimax.io/docs/token-plan/migration` | § 6 (Weekly limits) | Confirmation that weekly limit is a unified grant/reset model; legacy no-weekly-limit accounts show ∞ |
| `https://platform.minimax.io/docs/api-reference/errorcode` | full table | Every `status_code` the contract recognises |
| `https://platform.minimax.io/docs/guides/rate-limits` | full table | Per-model RPM/TPM (informational — the Token Plan endpoint is not on this table) |
| `https://platform.minimax.io/docs/token-plan/minimax-cli` | "Sign in with an API Key", FAQ | Region concept, "overseas vs cn", 401-on-region-mismatch warning, `mmx quota` as the user-facing CLI equivalent |
| `https://docs.openclaw.ai/providers/minimax` | "Coding Plan usage API" | Third-party confirmation of `https://api.minimaxi.com/v1/token_plan/remains` and `https://api.minimax.io/v1/token_plan/remains`, the `model_remains` shape, and the explicit "fields are remaining quota, not consumed quota" note |
| Reference repo: `https://github.com/JochenYang/minimax-status` | `cli/api.js`, `vscode-extension/api.js` (behavioural reference only) | Field names not in DOC, error-handling pattern. MIT-licensed; used for behavioural reference per ADR 0003, no code or non-trivial structure copied. |

## 8. What the build phase will need from this contract

A short checklist for Phase 02 (architecture) and Phase 04 (build):

- [ ] `src/api/` module with the types in § 5.
- [ ] One function per region, both pointing at the same backend
      host. The region is the only knob.
- [ ] Subscription Key read from VSCode `SecretStorage`; never
      written to settings JSON, never logged.
- [ ] The `getUsage()` function returns `Promise<UsageResponse>` or
      throws a typed `UsageError` with a discriminated
      `kind: "invalid_key" | "rate_limited" | "quota_exhausted" | "transient" | "invalid_params" | "unknown"`.
- [ ] In-memory cache (30s) and refresh-on-focus; documented in
      `extension-architecture.md` in Phase 02.
- [ ] Status bar reads the first entry; modal surfaces the two
      progress bars + countdowns. Plan for `model_name` label
      visible in the modal (UX detail for Phase 03).
- [ ] Live verification checklist in Phase 02 to resolve every
      `[AMBIGUOUS]` marker in § 5 and § 6.

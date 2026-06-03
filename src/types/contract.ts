// DO NOT EDIT — copy from `.kitchen/architecture/api-contract.md` § 5.
// The contract is the source of truth; this file mirrors it so the
// TypeScript imports are stable. If the contract changes, this file
// changes too, in the same commit. A CI check (phase 06) flags drift.

export type Region = "overseas" | "cn";

export interface UsageRequestOptions {
  apiKey: string;
  region: Region;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface BaseResp {
  status_code: number;
  status_msg: string;
}

export interface ModelRemain {
  model_name: string;

  start_time: number;
  end_time: number;
  current_interval_usage_count: number;
  current_interval_total_count: number;
  current_interval_remaining_percent: number;
  remains_time: number;

  current_weekly_total_count: number;
  current_weekly_usage_count: number;
  current_weekly_remaining_percent: number;
  weekly_remains_time: number;
  weekly_start_time?: number;
  weekly_end_time?: number;

  current_interval_status?: number;
  current_weekly_status?: number;
}

export interface UsageResponse {
  model_remains: ModelRemain[];
  base_resp?: BaseResp;
}

export interface ErrorResponse {
  base_resp: BaseResp;
}

export type KnownStatusCode =
  | 0
  | 1000
  | 1001
  | 1002
  | 1004
  | 1008
  | 1024
  | 1033
  | 1039
  | 2013
  | 2045
  | 2049
  | 2056;

export type ErrorClass =
  | "invalid_key"
  | "rate_limited"
  | "quota_exhausted"
  | "transient"
  | "invalid_params"
  | "unknown";

export interface CreditBalanceResponse {
  base_resp?: BaseResp;
  [key: string]: unknown;
}

export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function classifyError(code: number): ErrorClass {
  switch (code) {
    case 1004:
    case 2049:
      return "invalid_key";
    case 1002:
    case 2045:
      return "rate_limited";
    case 2056:
      return "quota_exhausted";
    case 1000:
    case 1001:
    case 1024:
    case 1033:
    case 1039:
      return "transient";
    case 2013:
      return "invalid_params";
    default:
      return "unknown";
  }
}

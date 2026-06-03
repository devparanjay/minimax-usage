export type OcticonName =
  | "loading~spin"
  | "check"
  | "dash"
  | "warning"
  | "error"
  | "sync"
  | "gear"
  | "info"
  | "close";

export const OCTICON_BY_STATE: Readonly<Record<string, OcticonName>> = {
  "loading": "loading~spin",
  "idle": "loading~spin",
  "success": "check",
  "empty": "dash",
  "quota_exhausted": "warning",
  "error:invalid_key": "error",
  "error:rate_limited": "warning",
  "error:transient": "sync",
  "error:unavailable": "sync",
  "setup": "gear",
  "credits-unavailable": "dash"
} as const;

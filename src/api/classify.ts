import { classifyError, type ErrorClass, type BaseResp } from "../types/contract";

export type SourceKind = "http" | "network" | "body";

export interface ClassifyInput {
  httpStatus: number;
  baseResp?: BaseResp;
  source?: SourceKind;
  networkError?: boolean;
}

export function classifyHttpError(input: ClassifyInput): ErrorClass {
  const source = input.source ?? "http";

  if (source === "network" || input.networkError === true) {
    return "transient";
  }

  if (input.baseResp) {
    return classifyError(input.baseResp.status_code);
  }

  if (input.httpStatus === 401 || input.httpStatus === 403) {
    return "invalid_key";
  }
  if (input.httpStatus === 429) {
    return "rate_limited";
  }
  if (input.httpStatus >= 500 && input.httpStatus < 600) {
    return "transient";
  }

  return "unknown";
}

export function isRetryable(kind: ErrorClass): boolean {
  return kind === "transient" || kind === "unknown";
}

export function isFatal(kind: ErrorClass): boolean {
  return kind === "invalid_key" || kind === "rate_limited" || kind === "invalid_params";
}

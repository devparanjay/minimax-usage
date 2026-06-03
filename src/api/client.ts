import type {
  UsageResponse,
  CreditBalanceResponse,
  Region,
  ErrorClass,
  BaseResp
} from "../types/contract";
import { classifyError } from "../types/contract";
import { tokenPlanUrl, defaultCreditsUrl } from "./endpoints";
import { classifyHttpError } from "./classify";
import { withRetry, RetryAbortError } from "./retry";
import { createCacheStore, makeCacheKey, type CacheStore } from "./cache";
import { isAbortError } from "../util/abort";

export class UsageError extends Error {
  public readonly kind: ErrorClass;
  public readonly statusCode?: number;
  public readonly statusMsg?: string;
  public readonly httpStatus?: number;
  public readonly cause?: unknown;

  constructor(opts: {
    kind: ErrorClass;
    message: string;
    statusCode?: number;
    statusMsg?: string;
    httpStatus?: number;
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = "UsageError";
    this.kind = opts.kind;
    if (opts.statusCode !== undefined) {
      this.statusCode = opts.statusCode;
    }
    if (opts.statusMsg !== undefined) {
      this.statusMsg = opts.statusMsg;
    }
    if (opts.httpStatus !== undefined) {
      this.httpStatus = opts.httpStatus;
    }
    if (opts.cause !== undefined) {
      this.cause = opts.cause;
    }
  }
}

export interface UsageClientOptions {
  cache?: CacheStore;
  defaultTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface GetUsageOptions {
  apiKey: string;
  region: Region;
  signal?: AbortSignal;
  timeoutMs?: number;
  forceRefresh?: boolean;
}

export interface GetCreditBalanceOptions {
  apiKey: string;
  region: Region;
  signal?: AbortSignal;
  timeoutMs?: number;
  forceRefresh?: boolean;
}

interface RawResponse {
  status: number;
  body: string;
  ok: boolean;
}

interface FetchAttemptResult {
  raw?: RawResponse;
  networkError?: unknown;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_TTL_MS = 30_000;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_ATTEMPTS = 3;

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (!v || typeof v !== "object") {
    return undefined;
  }
  return v as Record<string, unknown>;
}

function readBaseResp(value: unknown): BaseResp | undefined {
  const r = asRecord(value);
  if (!r) {
    return undefined;
  }
  const br = asRecord(r["base_resp"]);
  if (!br) {
    return undefined;
  }
  const sc = br["status_code"];
  const sm = br["status_msg"];
  if (typeof sc !== "number" || typeof sm !== "string") {
    return undefined;
  }
  return { status_code: sc, status_msg: sm };
}

function isUsageResponseLike(v: unknown): v is UsageResponse {
  const r = asRecord(v);
  if (!r) {
    return false;
  }
  return Array.isArray(r["model_remains"]);
}

function isCreditBalanceResponseLike(v: unknown): v is CreditBalanceResponse {
  if (!v || typeof v !== "object") {
    return false;
  }
  return true;
}

function isAbortLike(err: unknown): boolean {
  return isAbortError(err) || err instanceof RetryAbortError;
}

export class UsageClient {
  private readonly cache: CacheStore;
  private readonly defaultTimeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: UsageClientOptions = {}) {
    this.cache = options.cache ?? createCacheStore();
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getUsage(opts: GetUsageOptions): Promise<UsageResponse> {
    const url = tokenPlanUrl(opts.region);
    const cacheKey = makeCacheKey(opts.region, "tokenPlan");
    if (opts.forceRefresh) {
      this.cache.invalidate(cacheKey);
    } else {
      const cached = this.cache.get<UsageResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;
    const headers = this.buildHeaders(opts.apiKey);

    const attempt = await this.fetchWithRetry(url, headers, opts.signal, timeoutMs);
    const parsed = parseResponseBody(attempt.raw?.body ?? "");

    if (attempt.raw?.ok) {
      if (!isUsageResponseLike(parsed)) {
        throw new UsageError({
          kind: "unknown",
          message: "Unexpected response shape",
          httpStatus: attempt.raw.status,
          cause: parsed
        });
      }
      const baseResp = readBaseResp(parsed);
      if (baseResp && baseResp.status_code === 2056) {
        this.cache.set(cacheKey, parsed, DEFAULT_TTL_MS);
        return parsed;
      }
      if (baseResp && baseResp.status_code !== 0) {
        const kind = classifyError(baseResp.status_code);
        if (kind === "quota_exhausted") {
          this.cache.set(cacheKey, parsed, DEFAULT_TTL_MS);
          return parsed;
        }
        throw new UsageError({
          kind,
          message: baseResp.status_msg,
          statusCode: baseResp.status_code,
          statusMsg: baseResp.status_msg,
          httpStatus: attempt.raw.status,
          cause: parsed
        });
      }
      this.cache.set(cacheKey, parsed, DEFAULT_TTL_MS);
      return parsed;
    }

    if (attempt.networkError) {
      throw new UsageError({
        kind: "transient",
        message:
          attempt.networkError instanceof Error
            ? attempt.networkError.message
            : String(attempt.networkError),
        cause: attempt.networkError
      });
    }

    const raw = attempt.raw as RawResponse;
    const baseResp = readBaseResp(parsed);
    const kind = classifyHttpError({
      httpStatus: raw.status,
      baseResp,
      source: baseResp ? "body" : "http"
    });
    throw new UsageError({
      kind,
      message: baseResp?.status_msg ?? `HTTP ${raw.status}`,
      statusCode: baseResp?.status_code,
      statusMsg: baseResp?.status_msg,
      httpStatus: raw.status,
      cause: parsed
    });
  }

  async getCreditBalance(opts: GetCreditBalanceOptions): Promise<CreditBalanceResponse> {
    const url = defaultCreditsUrl(opts.region);
    const cacheKey = makeCacheKey(opts.region, "credits");
    if (opts.forceRefresh) {
      this.cache.invalidate(cacheKey);
    } else {
      const cached = this.cache.get<CreditBalanceResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;
    const headers = this.buildHeaders(opts.apiKey);

    const attempt = await this.fetchWithRetry(url, headers, opts.signal, timeoutMs);
    const parsed = parseResponseBody(attempt.raw?.body ?? "");

    if (attempt.raw?.ok) {
      if (!isCreditBalanceResponseLike(parsed)) {
        throw new UsageError({
          kind: "unknown",
          message: "Unexpected response shape",
          httpStatus: attempt.raw.status,
          cause: parsed
        });
      }
      this.cache.set(cacheKey, parsed, DEFAULT_TTL_MS);
      return parsed;
    }

    if (attempt.networkError) {
      throw new UsageError({
        kind: "transient",
        message:
          attempt.networkError instanceof Error
            ? attempt.networkError.message
            : String(attempt.networkError),
        cause: attempt.networkError
      });
    }

    const raw = attempt.raw as RawResponse;
    const baseResp = readBaseResp(parsed);
    const kind = classifyHttpError({
      httpStatus: raw.status,
      baseResp,
      source: baseResp ? "body" : "http"
    });
    throw new UsageError({
      kind,
      message: baseResp?.status_msg ?? `HTTP ${raw.status}`,
      statusCode: baseResp?.status_code,
      statusMsg: baseResp?.status_msg,
      httpStatus: raw.status,
      cause: parsed
    });
  }

  private buildHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };
  }

  private async fetchWithRetry(
    url: string,
    headers: Record<string, string>,
    signal: AbortSignal | undefined,
    timeoutMs: number
  ): Promise<FetchAttemptResult> {
    let lastResult: FetchAttemptResult | undefined;
    try {
      const finalRaw = await withRetry(async () => {
        const result = await this.attemptOnce(url, headers, signal, timeoutMs);
        if (result.networkError) {
          throw result.networkError;
        }
        const raw = result.raw as RawResponse;
        const parsed = parseResponseBody(raw.body);
        const baseResp = readBaseResp(parsed);
        const kind = classifyHttpError({
          httpStatus: raw.status,
          baseResp,
          source: baseResp ? "body" : "http"
        });
        if (raw.ok) {
          if (baseResp && baseResp.status_code !== 0 && classifyError(baseResp.status_code) !== "quota_exhausted") {
            throw new UsageError({
              kind: classifyError(baseResp.status_code),
              message: baseResp.status_msg,
              statusCode: baseResp.status_code,
              statusMsg: baseResp.status_msg,
              httpStatus: raw.status,
              cause: parsed
            });
          }
          return raw;
        }
        if (kind !== "transient" && kind !== "unknown") {
          throw new UsageError({
            kind,
            message: baseResp?.status_msg ?? `HTTP ${raw.status}`,
            statusCode: baseResp?.status_code,
            statusMsg: baseResp?.status_msg,
            httpStatus: raw.status,
            cause: parsed
          });
        }
        lastResult = { raw };
        throw new UsageError({
          kind,
          message: baseResp?.status_msg ?? `HTTP ${raw.status}`,
          statusCode: baseResp?.status_code,
          statusMsg: baseResp?.status_msg,
          httpStatus: raw.status,
          cause: parsed
        });
      }, {
        isRetryable: (err: unknown) => {
          if (err instanceof UsageError) {
            return err.kind === "transient" || err.kind === "unknown";
          }
          return true;
        },
        signal,
        baseDelayMs: RETRY_BASE_DELAY_MS,
        maxAttempts: RETRY_MAX_ATTEMPTS
      });
      return { raw: finalRaw };
    } catch (err) {
      if (isAbortLike(err)) {
        throw new UsageError({
          kind: "transient",
          message: "request aborted",
          cause: err
        });
      }
      if (err instanceof UsageError) {
        if (lastResult && err.kind === "transient") {
          if (lastResult.networkError) {
            return { networkError: lastResult.networkError };
          }
          return { raw: lastResult.raw };
        }
        throw err;
      }
      throw new UsageError({
        kind: "transient",
        message: err instanceof Error ? err.message : String(err),
        cause: err
      });
    }
  }

  private async attemptOnce(
    url: string,
    headers: Record<string, string>,
    signal: AbortSignal | undefined,
    timeoutMs: number
  ): Promise<FetchAttemptResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = (): void => controller.abort();
    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }
    try {
      const res = await this.fetchImpl(url, {
        method: "GET",
        headers,
        signal: controller.signal
      });
      const body = await res.text();
      return { raw: { status: res.status, body, ok: res.ok } };
    } catch (err) {
      return { networkError: err };
    } finally {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }
  }

  getCacheStore(): CacheStore {
    return this.cache;
  }
}

function parseResponseBody(body: string): unknown {
  if (body.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export function isUsageErrorKind(err: unknown): err is UsageError {
  return err instanceof UsageError;
}

export function errorKindOf(err: unknown): ErrorClass | undefined {
  if (err instanceof UsageError) {
    return err.kind;
  }
  return undefined;
}

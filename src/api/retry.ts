import { sleep } from "../util/sleep";
import { isAbortError } from "../util/abort";

export interface RetryOptions {
  isRetryable: (err: unknown) => boolean;
  signal?: AbortSignal;
  baseDelayMs: number;
  maxAttempts: number;
  onAttempt?: (info: { attempt: number; delayMs: number }) => void;
}

export class RetryAbortError extends Error {
  constructor() {
    super("retry aborted");
    this.name = "RetryAbortError";
  }
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const { isRetryable, signal, baseDelayMs, maxAttempts, onAttempt } = opts;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new RetryAbortError();
    }
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (isAbortError(err) || signal?.aborted) {
        throw new RetryAbortError();
      }
      if (!isRetryable(err)) {
        throw err;
      }
      if (attempt >= maxAttempts) {
        break;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      if (onAttempt) {
        onAttempt({ attempt, delayMs: delay });
      }
      try {
        await sleep(delay, signal);
      } catch (sleepErr) {
        if (isAbortError(sleepErr) || signal?.aborted) {
          throw new RetryAbortError();
        }
        throw sleepErr;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

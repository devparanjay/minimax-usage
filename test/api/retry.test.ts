import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withRetry, RetryAbortError } from "../../src/api/retry";
import * as sleepModule from "../../src/util/sleep";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(async () => {
    vi.clearAllTimers();
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("returns the value on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, {
      isRetryable: () => true,
      baseDelayMs: 1_000,
      maxAttempts: 3
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries up to maxAttempts when isRetryable returns true", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) {
        throw new Error("boom");
      }
      return "ok";
    });
    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseDelayMs: 1_000,
      maxAttempts: 3
    });
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws immediately when isRetryable returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(
      withRetry(fn, {
        isRetryable: () => false,
        baseDelayMs: 1_000,
        maxAttempts: 3
      })
    ).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("uses exponential back-off (1s, 2s, 4s)", async () => {
    const delays: number[] = [];
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls <= 3) {
        throw new Error("boom");
      }
      return "ok";
    });
    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseDelayMs: 1_000,
      maxAttempts: 4,
      onAttempt: (info) => {
        delays.push(info.delayMs);
      }
    });
    await vi.advanceTimersByTimeAsync(10_000);
    await promise;
    expect(delays).toEqual([1_000, 2_000, 4_000]);
  });

  it("cancels retries when AbortSignal aborts before first attempt", async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(
      withRetry(fn, {
        isRetryable: () => true,
        baseDelayMs: 1_000,
        maxAttempts: 3,
        signal: controller.signal
      })
    ).rejects.toBeInstanceOf(RetryAbortError);
    expect(fn).not.toHaveBeenCalled();
  });

  it("cancels retries when AbortSignal aborts mid-flight", async () => {
    const controller = new AbortController();
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error("boom");
      }
      return "ok";
    });
    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseDelayMs: 1_000,
      maxAttempts: 3,
      signal: controller.signal
    });
    promise.catch(() => undefined);
    const handle = setTimeout(() => controller.abort(), 100);
    await vi.advanceTimersByTimeAsync(2_000);
    clearTimeout(handle);
    await expect(promise).rejects.toBeInstanceOf(RetryAbortError);
  });

  it("throws the last error when all attempts are exhausted", async () => {
    const err = new Error("final");
    const fn = vi.fn().mockImplementation(async () => {
      throw err;
    });
    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseDelayMs: 1_000,
      maxAttempts: 3
    });
    promise.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(promise).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("wraps non-Error last errors in an Error", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "string-only";
    });
    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseDelayMs: 1_000,
      maxAttempts: 2
    });
    promise.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(promise).rejects.toBeInstanceOf(Error);
    await expect(promise).rejects.toThrow("string-only");
  });

  it("isRetryable receives the error", async () => {
    const seen: unknown[] = [];
    const fn = vi.fn().mockRejectedValue(new Error("err1"));
    const promise = withRetry(
      fn,
      {
        isRetryable: (e) => {
          seen.push(e);
          return false;
        },
        baseDelayMs: 1_000,
        maxAttempts: 3
      }
    );
    await expect(promise).rejects.toThrow("err1");
    expect(seen.length).toBe(1);
    expect((seen[0] as Error).message).toBe("err1");
  });

  it("throws RetryAbortError when the inner function throws an AbortError", async () => {
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    const fn = vi.fn().mockRejectedValue(abortErr);
    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseDelayMs: 1_000,
      maxAttempts: 3
    });
    await expect(promise).rejects.toBeInstanceOf(RetryAbortError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws RetryAbortError when the inner function throws an error named AbortError", async () => {
    const err = Object.assign(new Error("aborted"), { name: "AbortError" });
    const fn = vi.fn().mockRejectedValue(err);
    const promise = withRetry(fn, {
      isRetryable: () => true,
      baseDelayMs: 1_000,
      maxAttempts: 3
    });
    await expect(promise).rejects.toBeInstanceOf(RetryAbortError);
  });

  it("rethrows non-abort sleep errors", async () => {
    const sleepErr = new Error("clock skew");
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const spy = vi.spyOn(sleepModule, "sleep").mockRejectedValueOnce(sleepErr);
    try {
      const promise = withRetry(fn, {
        isRetryable: () => true,
        baseDelayMs: 1_000,
        maxAttempts: 3
      });
      await expect(promise).rejects.toBe(sleepErr);
    } finally {
      spy.mockRestore();
    }
  });

  it("throws RetryAbortError when signal is already aborted during sleep catch", async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const sleepErr = new Error("clock skew");
    const spy = vi.spyOn(sleepModule, "sleep").mockImplementation(async () => {
      controller.abort();
      throw sleepErr;
    });
    try {
      const promise = withRetry(fn, {
        isRetryable: () => true,
        baseDelayMs: 1_000,
        maxAttempts: 3,
        signal: controller.signal
      });
      await expect(promise).rejects.toBeInstanceOf(RetryAbortError);
    } finally {
      spy.mockRestore();
    }
  });
});

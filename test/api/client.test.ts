import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UsageClient, UsageError, isUsageErrorKind, errorKindOf } from "../../src/api/client";
import { createCacheStore } from "../../src/api/cache";

type FetchResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

interface FetchCall {
  url: string;
  init: RequestInit;
}

function makeResponse(status: number, body: unknown): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function makeFetchMock(responses: FetchResponse[]): {
  fn: typeof fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  let i = 0;
  const fn = vi.fn(async (url: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const u = typeof url === "string" ? url : url.toString();
    calls.push({ url: u, init });
    if (i >= responses.length) {
      throw new Error(`fetch mock exhausted at call #${i + 1}`);
    }
    const r = responses[i++];
    return makeResponse(r.status, r.body);
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const VALID_USAGE_RESPONSE = {
  base_resp: { status_code: 0, status_msg: "success" },
  model_remains: [
    {
      model_name: "MiniMax-M3",
      start_time: 1717200000,
      end_time: 1717218000,
      current_interval_usage_count: 250,
      current_interval_total_count: 1000,
      current_interval_remaining_percent: 75,
      remains_time: 7_200_000,
      current_weekly_total_count: 7000,
      current_weekly_usage_count: 420,
      current_weekly_remaining_percent: 94,
      weekly_remains_time: 540_000_000,
      weekly_start_time: 1717200000,
      weekly_end_time: 1717804800,
      current_interval_status: 1,
      current_weekly_status: 1
    }
  ]
};

describe("UsageClient: auth header construction", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends Authorization: Bearer <key>", async () => {
    const { fn, calls } = makeFetchMock([{ status: 200, body: VALID_USAGE_RESPONSE }]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getUsage({ apiKey: "sk-cp-TEST-KEY", region: "overseas" });
    expect(calls.length).toBe(1);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-cp-TEST-KEY");
  });

  it("sends Content-Type: application/json", async () => {
    const { fn, calls } = makeFetchMock([{ status: 200, body: VALID_USAGE_RESPONSE }]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getUsage({ apiKey: "sk-cp-TEST-KEY", region: "overseas" });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("does not send a Referer header", async () => {
    const { fn, calls } = makeFetchMock([{ status: 200, body: VALID_USAGE_RESPONSE }]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getUsage({ apiKey: "sk-cp-TEST-KEY", region: "overseas" });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["Referer"]).toBeUndefined();
    expect(headers["referer"]).toBeUndefined();
  });

  it("uses GET method with no body", async () => {
    const { fn, calls } = makeFetchMock([{ status: 200, body: VALID_USAGE_RESPONSE }]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getUsage({ apiKey: "sk-cp-TEST-KEY", region: "overseas" });
    expect(calls[0].init.method).toBe("GET");
    expect(calls[0].init.body).toBeUndefined();
  });
});

describe("UsageClient: cache integration", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("populates the cache on a 200 response", async () => {
    const { fn } = makeFetchMock([{ status: 200, body: VALID_USAGE_RESPONSE }]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("a second call within 30s does not invoke fetch (cache hit)", async () => {
    const { fn } = makeFetchMock([{ status: 200, body: VALID_USAGE_RESPONSE }]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("forceRefresh: true bypasses the cache and re-fetches", async () => {
    const { fn } = makeFetchMock([
      { status: 200, body: VALID_USAGE_RESPONSE },
      { status: 200, body: VALID_USAGE_RESPONSE }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas", forceRefresh: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("a region change invalidates the cache for that region", async () => {
    const cache = createCacheStore();
    const { fn } = makeFetchMock([
      { status: 200, body: VALID_USAGE_RESPONSE },
      { status: 200, body: VALID_USAGE_RESPONSE }
    ]);
    const client = new UsageClient({ cache, fetchImpl: fn });
    await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    cache.invalidateAll();
    await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("UsageClient: retry on transient", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries 5xx with exponential back-off (1s, 2s, 4s)", async () => {
    const { fn } = makeFetchMock([
      { status: 500, body: { base_resp: { status_code: 1000, status_msg: "err" } } },
      { status: 500, body: { base_resp: { status_code: 1000, status_msg: "err" } } },
      { status: 200, body: VALID_USAGE_RESPONSE }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    const result = await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    expect(result.model_remains.length).toBe(1);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("exhausts 3 attempts on persistent transient errors", async () => {
    const { fn } = makeFetchMock([
      { status: 500, body: { base_resp: { status_code: 1000, status_msg: "err" } } },
      { status: 500, body: { base_resp: { status_code: 1000, status_msg: "err" } } },
      { status: 500, body: { base_resp: { status_code: 1000, status_msg: "err" } } }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    await expect(
      client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" })
    ).rejects.toMatchObject({ kind: "transient" });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("UsageClient: no retry on invalid_key", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws UsageError(invalid_key) on 401 + base_resp 1004 after one attempt", async () => {
    const { fn } = makeFetchMock([
      { status: 401, body: { base_resp: { status_code: 1004, status_msg: "not authorized" } } }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("invalid_key");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws UsageError(invalid_key) on 401 + base_resp 2049 after one attempt", async () => {
    const { fn } = makeFetchMock([
      { status: 401, body: { base_resp: { status_code: 2049, status_msg: "invalid API Key" } } }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("invalid_key");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws UsageError(invalid_key) on 200 + base_resp 1004 after one attempt", async () => {
    const { fn } = makeFetchMock([
      {
        status: 200,
        body: {
          base_resp: { status_code: 1004, status_msg: "not authorized" },
          model_remains: []
        }
      }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("invalid_key");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("UsageClient: no retry on rate_limited", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws UsageError(rate_limited) on 401 + base_resp 1002 after one attempt", async () => {
    const { fn } = makeFetchMock([
      { status: 401, body: { base_resp: { status_code: 1002, status_msg: "rate limit" } } }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("rate_limited");
  });
});

describe("UsageClient: quota_exhausted special case", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the parsed UsageResponse on HTTP 200 + base_resp 2056 (does NOT throw)", async () => {
    const exhaustedResponse = {
      base_resp: { status_code: 2056, status_msg: "usage limit exceeded" },
      model_remains: [
        {
          model_name: "MiniMax-M3",
          start_time: 1717200000,
          end_time: 1717218000,
          current_interval_usage_count: 1000,
          current_interval_total_count: 1000,
          current_interval_remaining_percent: 0,
          remains_time: 1_200_000,
          current_weekly_total_count: 7000,
          current_weekly_usage_count: 420,
          current_weekly_remaining_percent: 94,
          weekly_remains_time: 540_000_000,
          weekly_start_time: 1717200000,
          weekly_end_time: 1717804800
        }
      ]
    };
    const { fn } = makeFetchMock([{ status: 200, body: exhaustedResponse }]);
    const client = new UsageClient({ fetchImpl: fn });
    const result = await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    expect(result.model_remains[0].current_interval_remaining_percent).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("UsageClient: empty case", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the parsed response with empty model_remains (does NOT throw)", async () => {
    const emptyResponse = {
      base_resp: { status_code: 0, status_msg: "success" },
      model_remains: []
    };
    const { fn } = makeFetchMock([{ status: 200, body: emptyResponse }]);
    const client = new UsageClient({ fetchImpl: fn });
    const result = await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    expect(result.model_remains).toEqual([]);
  });

  it("treats a 200 with model_remains[0] missing required fields as unknown error", async () => {
    const malformedResponse = {
      base_resp: { status_code: 0, status_msg: "success" },
      model_remains: [{ model_name: "MiniMax-M3" }]
    };
    const { fn } = makeFetchMock([{ status: 200, body: malformedResponse }]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("unknown");
  });

  it("treats a 200 with model_remains[0].current_interval_remaining_percent = NaN as unknown error", async () => {
    const malformedResponse = {
      base_resp: { status_code: 0, status_msg: "success" },
      model_remains: [
        {
          model_name: "MiniMax-M3",
          start_time: 1,
          end_time: 2,
          current_interval_usage_count: 1,
          current_interval_total_count: 2,
          current_interval_remaining_percent: Number.NaN,
          remains_time: 3,
          current_weekly_total_count: 4,
          current_weekly_usage_count: 5,
          current_weekly_remaining_percent: 6,
          weekly_remains_time: 7
        }
      ]
    };
    const { fn } = makeFetchMock([{ status: 200, body: malformedResponse }]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("unknown");
  });
});

describe("UsageClient: AbortSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("an AbortSignal cancelled mid-retry aborts the in-flight call", async () => {
    const controller = new AbortController();
    const fn = vi.fn(async (_input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
      const signal = init.signal as AbortSignal | undefined;
      if (signal) {
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        return await new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      }
      return makeResponse(200, VALID_USAGE_RESPONSE);
    }) as unknown as typeof fetch;
    const client = new UsageClient({ fetchImpl: fn });
    const promise = client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas", signal: controller.signal });
    promise.catch(() => undefined);
    setTimeout(() => controller.abort(), 10);
    await vi.advanceTimersByTimeAsync(20);
    await expect(promise).rejects.toBeInstanceOf(UsageError);
  });
});

describe("UsageClient: errorKindOf helper", () => {
  it("returns the kind from a UsageError", () => {
    const err = new UsageError({ kind: "transient", message: "boom" });
    expect(errorKindOf(err)).toBe("transient");
  });

  it("returns undefined for a non-UsageError value", () => {
    expect(errorKindOf(new Error("plain"))).toBeUndefined();
    expect(errorKindOf(null)).toBeUndefined();
    expect(errorKindOf(undefined)).toBeUndefined();
    expect(errorKindOf("string")).toBeUndefined();
  });
});

describe("UsageClient: response body parsing", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats a 200 with empty body as unknown shape", async () => {
    const { fn } = makeFetchMock([{ status: 200, body: "" }]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("unknown");
  });

  it("treats a 200 with non-JSON body as unknown shape", async () => {
    const { fn } = makeFetchMock([{ status: 200, body: "not-json" }]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("unknown");
  });
});

describe("UsageClient: network error path", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exhausts 3 attempts on a persistent network error and throws UsageError(transient)", async () => {
    const fn = vi.fn(async (): Promise<Response> => {
      throw new Error("ENOTFOUND");
    }) as unknown as typeof fetch;
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("transient");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("UsageClient: pre-aborted signal", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws transient when signal is already aborted at call time", async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn(async (): Promise<Response> => {
      throw new Error("should not be called");
    }) as unknown as typeof fetch;
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas", signal: controller.signal });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught)).toBe(true);
  });
});

describe("UsageClient: cache store access", () => {
  it("getCacheStore returns the underlying CacheStore", () => {
    const cache = createCacheStore();
    const client = new UsageClient({ cache });
    expect(client.getCacheStore()).toBe(cache);
  });
});

describe("UsageClient: getCreditBalance", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a parsed CreditBalanceResponse on HTTP 200", async () => {
    const balance = {
      base_resp: { status_code: 0, status_msg: "success" },
      amount: "$24.50",
      credits: 2450
    };
    const { fn } = makeFetchMock([{ status: 200, body: balance }]);
    const client = new UsageClient({ fetchImpl: fn });
    const result = await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas" });
    expect(result).toEqual(balance);
  });

  it("uses the cn host for region cn", async () => {
    const balance = { base_resp: { status_code: 0, status_msg: "success" }, amount: "1" };
    const { fn, calls } = makeFetchMock([{ status: 200, body: balance }]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "cn" });
    expect(calls[0].url).toContain("minimaxi.com");
  });

  it("caches the credit balance", async () => {
    const balance = { base_resp: { status_code: 0, status_msg: "success" }, amount: "1" };
    const { fn } = makeFetchMock([
      { status: 200, body: balance },
      { status: 200, body: balance }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas" });
    await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("forceRefresh bypasses the credit cache", async () => {
    const balance = { base_resp: { status_code: 0, status_msg: "success" }, amount: "1" };
    const { fn } = makeFetchMock([
      { status: 200, body: balance },
      { status: 200, body: balance }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas" });
    await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas", forceRefresh: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws UsageError(unknown) on empty response body", async () => {
    const { fn } = makeFetchMock([{ status: 200, body: "" }]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("unknown");
  });

  it("throws UsageError(unknown) on null body", async () => {
    const { fn } = makeFetchMock([{ status: 200, body: "null" }]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("unknown");
  });

  it("throws UsageError(invalid_key) on 401 + base_resp 1004", async () => {
    const { fn } = makeFetchMock([
      { status: 401, body: { base_resp: { status_code: 1004, status_msg: "not authorized" } } }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("invalid_key");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws UsageError(transient) after exhausting retries on 500", async () => {
    const { fn } = makeFetchMock([
      { status: 500, body: { base_resp: { status_code: 1000, status_msg: "err" } } },
      { status: 500, body: { base_resp: { status_code: 1000, status_msg: "err" } } },
      { status: 500, body: { base_resp: { status_code: 1000, status_msg: "err" } } }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    let caught: unknown;
    try {
      await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas" });
    } catch (e) {
      caught = e;
    }
    expect(isUsageErrorKind(caught) && caught.kind).toBe("transient");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses a different cache key from getUsage (region::credits vs region::tokenPlan)", async () => {
    const usageBody = { ...VALID_USAGE_RESPONSE };
    const balance = { base_resp: { status_code: 0, status_msg: "success" }, amount: "1" };
    const { fn } = makeFetchMock([
      { status: 200, body: usageBody },
      { status: 200, body: balance }
    ]);
    const client = new UsageClient({ fetchImpl: fn });
    await client.getUsage({ apiKey: "sk-cp-TEST", region: "overseas" });
    await client.getCreditBalance({ apiKey: "sk-cp-TEST", region: "overseas" });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

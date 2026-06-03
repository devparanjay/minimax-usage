import { describe, it, expect, beforeEach, vi } from "vitest";
import { redact, formatError, createLogger, isUsageError, noopLogger } from "../../src/util/logger";

class MockChannel {
  lines: string[] = [];
  appendLine(s: string): void {
    this.lines.push(s);
  }
  dispose(): void {}
}

describe("logger redaction R1: Authorization header", () => {
  it("redacts Authorization header value", () => {
    const r = redact({ headers: { Authorization: "Bearer sk-cp-XXXX" } });
    expect(r).toEqual({ headers: { Authorization: "[redacted]" } });
  });

  it("redacts lowercase authorization header value", () => {
    const r = redact({ headers: { authorization: "Bearer sk-cp-XXXX" } });
    expect(r).toEqual({ headers: { authorization: "[redacted]" } });
  });

  it("leaves non-Authorization headers intact", () => {
    const r = redact({ headers: { "Content-Type": "application/json" } });
    expect(r).toEqual({ headers: { "Content-Type": "application/json" } });
  });

  it("leaves the Authorization key but redacts the value when called twice", () => {
    const inner = redact({ headers: { Authorization: "Bearer sk-cp-XXXX" } });
    const outer = redact(inner);
    expect(outer).toEqual({ headers: { Authorization: "[redacted]" } });
  });
});

describe("logger redaction R2: Subscription Key shape", () => {
  it("redacts sk-cp- shaped strings in plain text", () => {
    expect(redact("tried key sk-cp-XXXX on overseas host")).toBe("tried key [redacted] on overseas host");
  });

  it("redacts multiple sk-cp- shapes in one string", () => {
    expect(redact("a sk-cp-AAAA b sk-cp-BBBB c")).toBe("a [redacted] b [redacted] c");
  });

  it("redacts sk-cp- in nested objects", () => {
    const r = redact({ message: "key was sk-cp-DEAD" });
    expect(r).toEqual({ message: "key was [redacted]" });
  });

  it("does not redact strings that are not sk-cp-", () => {
    expect(redact("sk-xx-1234")).toBe("sk-xx-1234");
    expect(redact("hello world")).toBe("hello world");
  });
});

describe("logger redaction R3: SecretStorage value", () => {
  it("redacts the minimaxUsage.apiKey SecretStorage key", () => {
    const r = redact({ "minimaxUsage.apiKey": "sk-cp-XXXX" });
    expect(r).toEqual({ "minimaxUsage.apiKey": "[redacted]" });
  });

  it("redacts even when the value is not a key shape", () => {
    const r = redact({ "minimaxUsage.apiKey": "anything" });
    expect(r).toEqual({ "minimaxUsage.apiKey": "[redacted]" });
  });

  it("leaves other SecretStorage keys alone", () => {
    const r = redact({ "otherSecret": "value" });
    expect(r).toEqual({ "otherSecret": "value" });
  });
});

describe("logger redaction R4: request URL with key in query", () => {
  it("strips the key query parameter", () => {
    const url = "https://api.example.com/v1/foo?key=sk-cp-XXXX&other=1";
    const r = redact({ url });
    expect(r).toEqual({ url: "https://api.example.com/v1/foo?other=1" });
  });

  it("strips the api_key query parameter", () => {
    const url = "https://api.example.com/v1/foo?api_key=sk-cp-XXXX";
    const r = redact({ url });
    expect(r).toEqual({ url: "https://api.example.com/v1/foo" });
  });

  it("strips apikey and token query parameters", () => {
    expect(redact({ url: "https://h.com/?apikey=sk-cp-AAAA&token=sk-cp-BBBB" })).toEqual({
      url: "https://h.com/"
    });
  });

  it("leaves URLs without sensitive query params alone", () => {
    const url = "https://www.minimax.io/v1/token_plan/remains";
    const r = redact({ url });
    expect(r).toEqual({ url });
  });

  it("leaves invalid URLs alone", () => {
    const r = redact({ url: "not a url" });
    expect(r).toEqual({ url: "not a url" });
  });
});

describe("logger redaction R5: 401 body at error level", () => {
  it("emits only kind and status_code at error level for UsageError", () => {
    const err = { name: "UsageError", kind: "invalid_key", statusCode: 1004, statusMsg: "secret" };
    const out = formatError(err, "error", { reason: "test" });
    const parsed = JSON.parse(out);
    expect(parsed.kind).toBe("invalid_key");
    expect(parsed.status_code).toBe(1004);
    expect(parsed.statusMsg).toBeUndefined();
  });

  it("emits full body at warn level for UsageError (incl. statusMsg)", () => {
    const err = { name: "UsageError", kind: "invalid_key", statusCode: 1004, statusMsg: "not authorized" };
    const out = formatError(err, "warn", { reason: "test" });
    const parsed = JSON.parse(out);
    expect(parsed.kind).toBe("invalid_key");
    expect(parsed.statusCode).toBe(1004);
    expect(parsed.statusMsg).toBe("not authorized");
  });

  it("emits full body for non-UsageError events at error level", () => {
    const out = formatError({ extra: "field" }, "error");
    const parsed = JSON.parse(out);
    expect(parsed.extra).toBe("field");
  });

  it("Logger.error applies R5 when event is a UsageError-shaped object (kind=invalid_key)", () => {
    const channel = new MockChannel();
    const logger = createLogger(channel as unknown as import("vscode").OutputChannel);
    const err = {
      name: "UsageError",
      kind: "invalid_key",
      statusCode: 1004,
      statusMsg: "sk-cp-SECRET-KEY"
    };
    logger.error("usage.error", err as unknown as Record<string, unknown>);
    const line = channel.lines.find((l) => l.includes("usage.error"));
    expect(line).toBeDefined();
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("sk-cp-SECRET-KEY");
    expect(line).toContain("invalid_key");
    expect(line).toContain("1004");
  });

  it("Logger.warn keeps statusMsg for diagnostic purposes (R5 off at warn level)", () => {
    const channel = new MockChannel();
    const logger = createLogger(channel as unknown as import("vscode").OutputChannel);
    const err = {
      name: "UsageError",
      kind: "invalid_key",
      statusCode: 1004,
      statusMsg: "not authorized"
    };
    logger.warn("usage.error", err as unknown as Record<string, unknown>);
    const line = channel.lines.find((l) => l.includes("usage.error"));
    expect(line).toBeDefined();
    expect(line).toContain("not authorized");
  });

  it("Logger.error preserves R1 (Authorization header) on the error-level call", () => {
    const channel = new MockChannel();
    const logger = createLogger(channel as unknown as import("vscode").OutputChannel);
    const err = {
      name: "UsageError",
      kind: "invalid_key",
      statusCode: 1004,
      headers: { Authorization: "Bearer sk-cp-XXXX" }
    };
    logger.error("usage.error", err as unknown as Record<string, unknown>);
    const line = channel.lines.find((l) => l.includes("usage.error"));
    expect(line).toBeDefined();
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("sk-cp-XXXX");
  });

  it("Logger.error preserves R2 (sk-cp- shape) on the error-level call", () => {
    const channel = new MockChannel();
    const logger = createLogger(channel as unknown as import("vscode").OutputChannel);
    const err = {
      name: "UsageError",
      kind: "invalid_key",
      statusCode: 1004,
      message: "tried sk-cp-DEADBEEF on overseas host"
    };
    logger.error("usage.error", err as unknown as Record<string, unknown>);
    const line = channel.lines.find((l) => l.includes("usage.error"));
    expect(line).toBeDefined();
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("sk-cp-DEADBEEF");
  });
});

describe("logger output channel", () => {
  let channel: MockChannel;

  beforeEach(() => {
    channel = new MockChannel();
  });

  it("writes info messages to the channel", () => {
    const logger = createLogger(channel as unknown as import("vscode").OutputChannel);
    logger.info("hello");
    expect(channel.lines.some((l) => l.includes("hello"))).toBe(true);
  });

  it("renders the context when provided", () => {
    const logger = createLogger(channel as unknown as import("vscode").OutputChannel);
    logger.info("with-context", { extra: "field" });
    expect(channel.lines.some((l) => l.includes("extra"))).toBe(true);
  });

  it("writes warn messages to the channel", () => {
    const logger = createLogger(channel as unknown as import("vscode").OutputChannel);
    logger.warn("careful");
    expect(channel.lines.some((l) => l.includes("[warn]") && l.includes("careful"))).toBe(true);
  });

  it("writes error messages to the channel", () => {
    const logger = createLogger(channel as unknown as import("vscode").OutputChannel);
    logger.error("broken");
    expect(channel.lines.some((l) => l.includes("[error]") && l.includes("broken"))).toBe(true);
  });

  it("setChannel swaps the channel", () => {
    const logger = createLogger(channel as unknown as import("vscode").OutputChannel);
    const channel2 = new MockChannel();
    logger.setChannel(channel2 as unknown as import("vscode").OutputChannel);
    logger.info("after-swap");
    expect(channel2.lines.some((l) => l.includes("after-swap"))).toBe(true);
  });

  it("dispose calls the channel's dispose", () => {
    const disposeSpy = vi.fn();
    const ch = { ...channel, dispose: disposeSpy };
    const logger = createLogger(ch as unknown as import("vscode").OutputChannel);
    logger.dispose();
    expect(disposeSpy).toHaveBeenCalled();
  });
});

describe("isUsageError", () => {
  it("returns true for objects with name=UsageError", () => {
    expect(isUsageError({ name: "UsageError", kind: "invalid_key" })).toBe(true);
  });

  it("returns true for objects with a string kind", () => {
    expect(isUsageError({ kind: "transient" })).toBe(true);
  });

  it("returns false for null/undefined", () => {
    expect(isUsageError(null)).toBe(false);
    expect(isUsageError(undefined)).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isUsageError(42)).toBe(false);
    expect(isUsageError("string")).toBe(false);
  });
});

describe("redact: arrays", () => {
  it("redacts sk-cp- in string array items", () => {
    expect(redact(["sk-cp-AAAA", "sk-cp-BBBB", "safe"])).toEqual(["[redacted]", "[redacted]", "safe"]);
  });

  it("recursively redacts objects inside arrays", () => {
    const r = redact([{ headers: { Authorization: "Bearer sk-cp-X" } }, "plain"]);
    expect(r).toEqual([{ headers: { Authorization: "[redacted]" } }, "plain"]);
  });

  it("handles empty arrays", () => {
    expect(redact([])).toEqual([]);
  });
});

describe("redact: null-prototype objects", () => {
  it("redacts Authorization in a null-prototype object", () => {
    const o = Object.create(null) as Record<string, unknown>;
    o["headers"] = { Authorization: "Bearer sk-cp-X" };
    const r = redact(o);
    expect((r as { headers: { Authorization: string } }).headers.Authorization).toBe("[redacted]");
  });
});

describe("noopLogger", () => {
  it("does not throw on info/warn/error", () => {
    const logger = noopLogger();
    expect(() => logger.info("x")).not.toThrow();
    expect(() => logger.warn("x")).not.toThrow();
    expect(() => logger.error("x")).not.toThrow();
  });

  it("setChannel and dispose are no-ops", () => {
    const logger = noopLogger();
    expect(() => logger.setChannel({} as never)).not.toThrow();
    expect(() => logger.dispose()).not.toThrow();
  });
});

describe("formatError branches", () => {
  it("formats a string event", () => {
    const out = formatError("sk-cp-DEAD", "error");
    const parsed = JSON.parse(out);
    expect(parsed.message).toBe("[redacted]");
  });

  it("formats a number event", () => {
    const out = formatError(42, "error");
    const parsed = JSON.parse(out);
    expect(parsed.value).toBe(42);
  });

  it("formats an undefined event", () => {
    const out = formatError(undefined, "error");
    expect(out).toBe("{}");
  });
});

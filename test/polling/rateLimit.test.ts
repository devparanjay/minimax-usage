import { describe, it, expect } from "vitest";
import { createRateLimiter, RATE_LIMIT_WINDOW_MS } from "../../src/polling/rateLimit";

describe("createRateLimiter", () => {
  it("isSuppressed returns false before any suppress()", () => {
    const rl = createRateLimiter();
    expect(rl.isSuppressed(0)).toBe(false);
  });

  it("isSuppressed returns true within the suppression window", () => {
    const rl = createRateLimiter();
    const now = 1_000_000;
    rl.suppress(RATE_LIMIT_WINDOW_MS, now);
    expect(rl.isSuppressed(now)).toBe(true);
    expect(rl.isSuppressed(now + 30_000)).toBe(true);
    expect(rl.isSuppressed(now + 59_999)).toBe(true);
  });

  it("isSuppressed returns false after the suppression window expires", () => {
    const rl = createRateLimiter();
    const now = 1_000_000;
    rl.suppress(RATE_LIMIT_WINDOW_MS, now);
    expect(rl.isSuppressed(now + 60_001)).toBe(false);
  });

  it("suppressUntil reflects the current suppress value", () => {
    const rl = createRateLimiter();
    const now = 1_000_000;
    expect(rl.suppressUntil()).toBe(0);
    rl.suppress(60_000, now);
    expect(rl.suppressUntil()).toBe(now + 60_000);
  });

  it("clear() removes the suppression", () => {
    const rl = createRateLimiter();
    const now = 1_000_000;
    rl.suppress(60_000, now);
    rl.clear();
    expect(rl.isSuppressed(now)).toBe(false);
    expect(rl.suppressUntil()).toBe(0);
  });

  it("suppress with a custom duration uses that duration", () => {
    const rl = createRateLimiter();
    const now = 1_000_000;
    rl.suppress(5_000, now);
    expect(rl.isSuppressed(now + 4_999)).toBe(true);
    expect(rl.isSuppressed(now + 5_001)).toBe(false);
  });

  it("suppress with a later 'now' extends the window", () => {
    const rl = createRateLimiter();
    const t1 = 1_000_000;
    const t2 = 1_030_000;
    rl.suppress(60_000, t1);
    rl.suppress(60_000, t2);
    expect(rl.suppressUntil()).toBe(t2 + 60_000);
  });
});

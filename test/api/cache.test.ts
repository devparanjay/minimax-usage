import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createCacheStore, makeCacheKey } from "../../src/api/cache";

describe("createCacheStore", () => {
  let now = 0;
  const originalNow = Date.now;

  beforeEach(() => {
    now = 1_000_000;
    Date.now = () => now;
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  it("returns undefined on cache miss", () => {
    const cache = createCacheStore();
    expect(cache.get<string>("missing")).toBeUndefined();
  });

  it("returns cached value within TTL", () => {
    const cache = createCacheStore();
    cache.set("k", "v", 30_000);
    expect(cache.get<string>("k")).toBe("v");
  });

  it("returns undefined after TTL expires", () => {
    const cache = createCacheStore();
    cache.set("k", "v", 30_000);
    now += 30_001;
    expect(cache.get<string>("k")).toBeUndefined();
  });

  it("invalidate removes a key", () => {
    const cache = createCacheStore();
    cache.set("k", "v", 30_000);
    cache.invalidate("k");
    expect(cache.get<string>("k")).toBeUndefined();
  });

  it("invalidateAll removes all keys", () => {
    const cache = createCacheStore();
    cache.set("a", 1, 30_000);
    cache.set("b", 2, 30_000);
    cache.invalidateAll();
    expect(cache.size()).toBe(0);
  });

  it("has returns true for cached values within TTL", () => {
    const cache = createCacheStore();
    cache.set("k", "v", 30_000);
    expect(cache.has("k")).toBe(true);
  });

  it("has returns false for missing keys", () => {
    const cache = createCacheStore();
    expect(cache.has("nope")).toBe(false);
  });

  it("has returns false for expired keys", () => {
    const cache = createCacheStore();
    cache.set("k", "v", 30_000);
    now += 30_001;
    expect(cache.has("k")).toBe(false);
  });

  it("size reports the number of entries", () => {
    const cache = createCacheStore();
    expect(cache.size()).toBe(0);
    cache.set("a", 1, 30_000);
    cache.set("b", 2, 30_000);
    expect(cache.size()).toBe(2);
  });

  it("makeCacheKey composes region and endpoint", () => {
    expect(makeCacheKey("overseas", "tokenPlan")).toBe("overseas::tokenPlan");
    expect(makeCacheKey("cn", "credits")).toBe("cn::credits");
  });
});

export type CacheKey = string;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStore {
  get<T>(key: CacheKey): T | undefined;
  set<T>(key: CacheKey, value: T, ttlMs: number): void;
  invalidate(key: CacheKey): void;
  invalidateAll(): void;
  has(key: CacheKey): boolean;
  size(): number;
}

export function createCacheStore(): CacheStore {
  const map = new Map<CacheKey, CacheEntry<unknown>>();

  return {
    get<T>(key: CacheKey): T | undefined {
      const entry = map.get(key);
      if (!entry) {
        return undefined;
      }
      if (Date.now() >= entry.expiresAt) {
        map.delete(key);
        return undefined;
      }
      return entry.value as T;
    },
    set<T>(key: CacheKey, value: T, ttlMs: number): void {
      map.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    invalidate(key: CacheKey): void {
      map.delete(key);
    },
    invalidateAll(): void {
      map.clear();
    },
    has(key: CacheKey): boolean {
      return this.get(key) !== undefined;
    },
    size(): number {
      return map.size;
    }
  };
}

export function makeCacheKey(region: string, endpoint: string): CacheKey {
  return `${region}::${endpoint}`;
}

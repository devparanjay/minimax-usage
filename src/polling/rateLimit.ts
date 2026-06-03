export interface RateLimiter {
  isSuppressed(now: number): boolean;
  suppress(durationMs: number, now: number): void;
  clear(): void;
  suppressUntil(): number;
}

export function createRateLimiter(): RateLimiter {
  let until = 0;
  return {
    isSuppressed(now: number): boolean {
      return now < until;
    },
    suppress(durationMs: number, now: number): void {
      until = now + durationMs;
    },
    clear(): void {
      until = 0;
    },
    suppressUntil(): number {
      return until;
    }
  };
}

export const RATE_LIMIT_WINDOW_MS = 60_000;

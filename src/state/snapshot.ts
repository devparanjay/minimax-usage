import type { PersistedSnapshot } from "./types";
import { EMPTY_PERSISTED } from "./types";

export function emptySnapshot(): PersistedSnapshot {
  return { ...EMPTY_PERSISTED, lastError: null };
}

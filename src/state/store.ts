import type * as vscode from "vscode";
import type { PersistedSnapshot } from "./types";
import { EMPTY_PERSISTED } from "./types";
import type { UsageResponse } from "../types/contract";
import type { ErrorClass } from "../types/contract";
import type { Region, DisplayMode } from "../types/settings";

const KEY_LAST_KNOWN_GOOD = "minimaxUsage.lastKnownGood";
const KEY_LAST_SUCCESS_AT = "minimaxUsage.lastSuccessAt";
const KEY_LAST_ERROR = "minimaxUsage.lastError";
const KEY_REGION = "minimaxUsage.region";
const KEY_DISPLAY_MODE = "minimaxUsage.displayMode";
const KEY_CREDITS_AVAILABLE = "minimaxUsage.creditsAvailable";

export interface StateStore {
  read(): PersistedSnapshot;
  write(snapshot: PersistedSnapshot): Promise<void>;
  update(partial: Partial<PersistedSnapshot>): Promise<PersistedSnapshot>;
  setLastKnownGood(value: UsageResponse, at: number): Promise<void>;
  setError(kind: ErrorClass, statusCode?: number): Promise<void>;
  clearError(): Promise<void>;
  setRegion(region: Region): Promise<void>;
  setDisplayMode(displayMode: DisplayMode): Promise<void>;
  setCreditsAvailable(available: boolean): Promise<void>;
}

interface PersistedError {
  kind: ErrorClass;
  at: number;
  statusCode?: number;
}

function isPersistedError(v: unknown): v is PersistedError {
  if (!v || typeof v !== "object") {
    return false;
  }
  const o = v as Record<string, unknown>;
  return typeof o["kind"] === "string" && typeof o["at"] === "number";
}

function isUsageResponseLike(v: unknown): v is UsageResponse {
  if (!v || typeof v !== "object") {
    return false;
  }
  return Array.isArray((v as Record<string, unknown>)["model_remains"]);
}

function isRegionLike(v: unknown): v is Region {
  return v === "overseas" || v === "cn";
}

function isDisplayModeLike(v: unknown): v is DisplayMode {
  return v === "tokenPlan" || v === "credits" || v === "both";
}

async function updateKey(m: vscode.Memento, key: string, value: unknown): Promise<void> {
  await m.update(key, value);
}

export function createStateStore(memento: vscode.Memento): StateStore {
  async function write(snapshot: PersistedSnapshot): Promise<void> {
    await updateKey(memento, KEY_LAST_KNOWN_GOOD, snapshot.lastKnownGood);
    await updateKey(memento, KEY_LAST_SUCCESS_AT, snapshot.lastSuccessAt);
    await updateKey(memento, KEY_LAST_ERROR, snapshot.lastError);
    await updateKey(memento, KEY_REGION, snapshot.region);
    await updateKey(memento, KEY_DISPLAY_MODE, snapshot.displayMode);
    await updateKey(memento, KEY_CREDITS_AVAILABLE, snapshot.creditsAvailable);
  }

  function read(): PersistedSnapshot {
    const lastKnownGoodRaw = memento.get<unknown>(KEY_LAST_KNOWN_GOOD);
    const lastSuccessAtRaw = memento.get<unknown>(KEY_LAST_SUCCESS_AT);
    const lastErrorRaw = memento.get<unknown>(KEY_LAST_ERROR);
    const regionRaw = memento.get<unknown>(KEY_REGION);
    const displayModeRaw = memento.get<unknown>(KEY_DISPLAY_MODE);
    const creditsAvailableRaw = memento.get<unknown>(KEY_CREDITS_AVAILABLE);

    const lastSuccessAt =
      typeof lastSuccessAtRaw === "number" && Number.isFinite(lastSuccessAtRaw)
        ? lastSuccessAtRaw
        : null;

    return {
      lastKnownGood: isUsageResponseLike(lastKnownGoodRaw) ? lastKnownGoodRaw : null,
      lastSuccessAt,
      lastError: isPersistedError(lastErrorRaw) ? lastErrorRaw : null,
      region: isRegionLike(regionRaw) ? regionRaw : EMPTY_PERSISTED.region,
      displayMode: isDisplayModeLike(displayModeRaw)
        ? displayModeRaw
        : EMPTY_PERSISTED.displayMode,
      creditsAvailable:
        typeof creditsAvailableRaw === "boolean"
          ? creditsAvailableRaw
          : EMPTY_PERSISTED.creditsAvailable
    };
  }

  return {
    read,
    write,
    async update(partial): Promise<PersistedSnapshot> {
      const cur = read();
      const next: PersistedSnapshot = { ...cur, ...partial };
      await write(next);
      return next;
    },
    async setLastKnownGood(value, at): Promise<void> {
      await updateKey(memento, KEY_LAST_KNOWN_GOOD, value);
      await updateKey(memento, KEY_LAST_SUCCESS_AT, at);
    },
    async setError(kind, statusCode): Promise<void> {
      const err: PersistedError = { kind, at: Date.now() };
      if (statusCode !== undefined) {
        err.statusCode = statusCode;
      }
      await updateKey(memento, KEY_LAST_ERROR, err);
    },
    async clearError(): Promise<void> {
      await updateKey(memento, KEY_LAST_ERROR, null);
    },
    async setRegion(region): Promise<void> {
      await updateKey(memento, KEY_REGION, region);
    },
    async setDisplayMode(displayMode): Promise<void> {
      await updateKey(memento, KEY_DISPLAY_MODE, displayMode);
    },
    async setCreditsAvailable(available): Promise<void> {
      await updateKey(memento, KEY_CREDITS_AVAILABLE, available);
    }
  };
}

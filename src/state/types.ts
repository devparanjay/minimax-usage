import type { UsageResponse } from "../types/contract";
import type { ErrorClass } from "../types/contract";
import type { Region, DisplayMode } from "../types/settings";
import type { CreditBalanceResponse } from "../types/contract";

export interface PersistedSnapshot {
  lastKnownGood: UsageResponse | null;
  lastSuccessAt: number | null;
  lastError: { kind: ErrorClass; at: number; statusCode?: number } | null;
  region: Region;
  displayMode: DisplayMode;
  creditsAvailable: boolean;
  creditBalance: CreditBalanceResponse | null;
}

export interface InFlightState {
  currentRequestAbort?: () => void;
  rateLimitSuppressUntil: number;
  inflightCount: number;
}

export const EMPTY_PERSISTED: PersistedSnapshot = {
  lastKnownGood: null,
  lastSuccessAt: null,
  lastError: null,
  region: "overseas",
  displayMode: "tokenPlan",
  creditsAvailable: true,
  creditBalance: null
};

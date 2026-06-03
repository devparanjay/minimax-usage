import type { UsageResponse, CreditBalanceResponse, ErrorClass, Region } from "./contract";
import type { DisplayMode } from "./settings";

export type ModalState =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "quota_exhausted"
  | "error:invalid_key"
  | "error:rate_limited"
  | "error:transient"
  | "error:unavailable";

export interface ModalSnapshot {
  state: ModalState;
  region: Region;
  displayMode: DisplayMode;
  usage?: UsageResponse;
  creditBalance?: CreditBalanceResponse;
  creditsAvailable: boolean;
  lastSuccessAt?: number;
  lastError?: { kind: ErrorClass; at: number; statusCode?: number };
}

export type HostMessage =
  | { kind: "snapshot"; payload: ModalSnapshot }
  | { kind: "loading" };

export type WebviewMessage =
  | { kind: "ready" }
  | { kind: "openSettings" }
  | { kind: "dismiss" };

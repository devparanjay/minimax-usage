import { resolveHost } from "./hosts";
import type { Region } from "../types/contract";

export const TOKEN_PLAN_REMAINS_PATH = "/v1/token_plan/remains" as const;

export const CREDITS_BALANCE_CANDIDATES = {
  tokenPlanCredit: (baseHost: string): string =>
    `${baseHost}/backend/account/token_plan_credit`,
  v1AccountCredit: (baseHost: string): string => `${baseHost}/v1/account/credit`
} as const;

export function tokenPlanUrl(region: Region): string {
  return `${resolveHost(region)}${TOKEN_PLAN_REMAINS_PATH}`;
}

export const DEFAULT_CREDITS_ENDPOINT_KEY: keyof typeof CREDITS_BALANCE_CANDIDATES =
  "tokenPlanCredit";

export function defaultCreditsUrl(region: Region): string {
  return CREDITS_BALANCE_CANDIDATES[DEFAULT_CREDITS_ENDPOINT_KEY](resolveHost(region));
}

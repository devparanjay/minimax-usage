export type { Region } from "./contract";

import type { Region } from "./contract";

export type DisplayMode = "tokenPlan" | "credits" | "both";

export const REGION_VALUES: readonly Region[] = ["overseas", "cn"] as const;
export const DISPLAY_MODE_VALUES: readonly DisplayMode[] = [
  "tokenPlan",
  "credits",
  "both"
] as const;

export const SETTINGS_REGION_KEY = "minimaxUsage.region" as const;
export const SETTINGS_DISPLAY_MODE_KEY = "minimaxUsage.displayMode" as const;

export function isRegion(value: unknown): value is Region {
  return value === "overseas" || value === "cn";
}

export function isDisplayMode(value: unknown): value is DisplayMode {
  return (
    value === "tokenPlan" || value === "credits" || value === "both"
  );
}

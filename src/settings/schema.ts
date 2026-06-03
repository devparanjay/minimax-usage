import type { Region, DisplayMode } from "../types/settings";

export interface ConfigurationSchema {
  [key: string]: unknown;
  "minimaxUsage.region": Region;
  "minimaxUsage.displayMode": DisplayMode;
}

export const REGION_KEY = "minimaxUsage.region" as const;
export const DISPLAY_MODE_KEY = "minimaxUsage.displayMode" as const;

export const DEFAULT_REGION: Region = "overseas";
export const DEFAULT_DISPLAY_MODE: DisplayMode = "tokenPlan";

export function regionMarkdownDescription(): string {
  return "Which MiniMax platform the Subscription Key is bound to. **Overseas** users have keys from `platform.minimax.io`; **Mainland China** users have keys from `platform.minimaxi.com`. If you subscribed on a different platform, change this setting — a wrong region will surface as 'invalid key'.";
}

export function regionEnumDescriptions(): [string, string] {
  return [
    "Overseas platform — `platform.minimax.io` (default).",
    "Mainland China platform — `platform.minimaxi.com`."
  ];
}

export function displayModeMarkdownDescription(): string {
  return "What the status bar and modal show.";
}

export function displayModeEnumDescriptions(): [string, string, string] {
  return [
    "Token Plan — 5-Hour and Weekly progress bars",
    "Credits — Balance only",
    "Both — Token Plan and Credits side by side"
  ];
}
